
import React, { useState, useEffect } from 'react';
import { Employee, HRMSRole as Role, LeaveType, LeaveStatus } from '../../../shared/types';
import { X, Mail, Briefcase, Calendar, DollarSign, User, Clock, Shield, MapPin, Edit2, Save, FileText, Hash } from 'lucide-react';
import { MOCK_ATTENDANCE, MOCK_LEAVES, MOCK_EMPLOYEES } from '../../../shared/constants/app.constants';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useEmployees } from '../../../shared/contexts/EmployeeContext';

interface EmployeeDetailsModalProps {
  employee: Employee | null;
  onClose: () => void;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ employee, onClose }) => {
  const { user } = useAuth();
  const { updateEmployee } = useEmployees();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (employee) {
      setFormData(employee);
      setIsEditing(false);
    }
  }, [employee]);

  if (!employee) return null;

  // Mock data filtering for the selected employee
  const recentAttendance = MOCK_ATTENDANCE.filter(a => a.employeeId === employee.id).slice(0, 3);
  const recentLeaves = MOCK_LEAVES.filter(l => l.employeeId === employee.id).slice(0, 3);
  const manager = MOCK_EMPLOYEES.find(e => e.id === (isEditing ? formData.managerId : employee.managerId));

  // Permission check for editing and sensitive info
  const canEdit = user?.role === Role.HR || user?.role === Role.ADMIN;
  const canViewSensitive = user?.role === Role.HR || user?.role === Role.ADMIN || user?.role === Role.FINANCE;
  const canGenerateReports = user?.role === Role.HR || user?.role === Role.ADMIN;

  const handleSave = () => {
    if (employee.id) {
        updateEmployee(employee.id, formData);
        setIsEditing(false);
    }
  };

  const handleChange = (field: keyof Employee, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateReport = (type: 'attendance' | 'leaves') => {
    if (!employee) return;
    
    let content = '';
    let filename = '';

    if (type === 'attendance') {
      filename = `${employee.name.replace(/\s+/g, '_')}_Attendance_Report.csv`;
      const records = MOCK_ATTENDANCE.filter(a => a.employeeId === employee.id);
      const totalDays = records.length;
      const lateDays = records.filter(r => r.status === 'Late').length;
      const avgHours = records.reduce((acc, curr) => acc + (curr.durationHours || 0), 0) / (totalDays || 1);

      content = `Employee,Date,CheckIn,CheckOut,Status,Duration (Hrs)\n`;
      content += records.map(r => `${employee.name},${r.date},${r.checkIn},${r.checkOut || '-'},${r.status},${r.durationHours}`).join('\n');
      content += `\n\nSUMMARY\nTotal Working Days,${totalDays}\nLate Marks,${lateDays}\nAverage Work Hours,${avgHours.toFixed(2)}`;
    } else {
      filename = `${employee.name.replace(/\s+/g, '_')}_Leave_Report.csv`;
      const leaves = MOCK_LEAVES.filter(l => l.employeeId === employee.id);
      
      // Mock entitlements and calculating used leaves
      const entitlements = { [LeaveType.SICK]: 12, [LeaveType.CASUAL]: 12, [LeaveType.EARNED]: 15 };
      const used = leaves.reduce((acc, l) => {
         if (l.status === LeaveStatus.APPROVED) {
            acc[l.type] = (acc[l.type] || 0) + 1; // Simplified: Assuming 1 record = 1 day for mock purposes
         }
         return acc;
      }, {} as Record<string, number>);

      content = `Leave Type,Entitled,Used,Balance\n`;
      Object.keys(entitlements).forEach(key => {
        const type = key as LeaveType;
        content += `${type},${entitlements[type]},${used[type] || 0},${entitlements[type] - (used[type] || 0)}\n`;
      });
      
      content += `\n\nLEAVE HISTORY\nType,Start Date,End Date,Reason,Status\n`;
      content += leaves.map(l => `${l.type},${l.startDate},${l.endDate},"${l.reason}",${l.status}`).join('\n');
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
           <div className="absolute top-4 right-4 flex gap-2">
              {canEdit && !isEditing && (
                <button 
                 onClick={() => setIsEditing(true)}
                 className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors backdrop-blur-md flex items-center gap-2 px-3"
                >
                  <Edit2 size={16} /> <span className="text-sm font-medium">Edit</span>
                </button>
              )}
              {isEditing && (
                <button 
                 onClick={handleSave}
                 className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-full transition-colors shadow-lg flex items-center gap-2 px-3"
                >
                  <Save size={16} /> <span className="text-sm font-medium">Save</span>
                </button>
              )}
              <button 
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors backdrop-blur-md"
              >
                <X size={20} />
              </button>
           </div>
        </div>

        {/* Profile Header */}
        <div className="px-8 relative pb-6 border-b border-grx-primary-50">
           <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 mb-4 gap-6">
              <img 
                src={employee.avatar} 
                alt={employee.name} 
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white object-cover"
              />
              <div className="flex-1 mb-2 w-full">
                {isEditing ? (
                    <div className="space-y-2">
                        <input 
                            className="text-2xl font-bold text-grx-text border-b border-grx-primary-100 focus:border-indigo-500 outline-none bg-transparent w-full"
                            value={formData.name || ''}
                            onChange={e => handleChange('name', e.target.value)}
                            placeholder="Employee Name"
                        />
                         <input 
                            className="text-grx-muted font-medium border-b border-grx-primary-100 focus:border-indigo-500 outline-none bg-transparent w-full"
                            value={formData.designation || ''}
                            onChange={e => handleChange('designation', e.target.value)}
                            placeholder="Designation"
                        />
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-grx-text">{employee.name}</h2>
                        <p className="text-grx-muted font-medium">{employee.designation}</p>
                    </>
                )}
              </div>
              <div className="flex gap-3 mb-2">
                 {isEditing ? (
                    <>
                       <select 
                        className="text-xs rounded-lg border border-grx-primary-100 p-1.5 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.status}
                        onChange={e => handleChange('status', e.target.value)}
                       >
                           <option value="Active">Active</option>
                           <option value="Exited">Exited</option>
                       </select>
                       <select 
                        className="text-xs rounded-lg border border-grx-primary-100 p-1.5 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.role}
                        onChange={e => handleChange('role', e.target.value)}
                       >
                           {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                    </>
                 ) : (
                    <>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        employee.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                        {employee.status}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-grx-primary-50 text-grx-muted border border-grx-primary-100">
                        {employee.role}
                        </span>
                    </>
                 )}
              </div>
           </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Personal Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-grx-text flex items-center gap-2">
                <User size={20} className="text-indigo-600" />
                Personal Details
              </h3>
              <div className="space-y-4">
                 <div className="flex items-center gap-3 text-grx-muted">
                   <Hash size={18} className="text-grx-muted" />
                   <span>ID: <span className="font-mono text-grx-text">{employee.id}</span></span>
                 </div>
                 <div className="flex items-center gap-3 text-grx-muted">
                   <Mail size={18} className="text-grx-muted" />
                   <span>{employee.email}</span>
                 </div>
                 <div className="flex items-center gap-3 text-grx-muted">
                   <Briefcase size={18} className="text-grx-muted" />
                   {isEditing ? (
                       <input 
                        className="border-b border-grx-primary-100 focus:border-indigo-500 outline-none bg-transparent flex-1"
                        value={formData.department || ''}
                        onChange={e => handleChange('department', e.target.value)}
                        placeholder="Department"
                       />
                   ) : (
                       <span>{employee.department}</span>
                   )}
                 </div>
                 <div className="flex items-center gap-3 text-grx-muted">
                   <Calendar size={18} className="text-grx-muted" />
                   <span>Joined {new Date(employee.joinDate).toLocaleDateString()}</span>
                 </div>
                 <div className="flex items-center gap-3 text-grx-muted">
                   <MapPin size={18} className="text-grx-muted" />
                   <span>Headquarters (San Francisco)</span>
                 </div>
                 {manager && !isEditing && (
                    <div className="flex items-center gap-3 text-grx-muted">
                      <Shield size={18} className="text-grx-muted" />
                      <span>Reports to: <span className="font-medium text-grx-text">{manager.name}</span></span>
                    </div>
                 )}
              </div>

              {/* Compensation (Restricted) */}
              {canViewSensitive && (
                <div className="pt-6 border-t border-grx-primary-50">
                   <h3 className="text-sm font-bold text-grx-text flex items-center gap-2 mb-3">
                      <DollarSign size={16} className="text-emerald-600" />
                      Compensation
                   </h3>
                   <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                      <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Annual CTC</p>
                      {isEditing ? (
                          <div className="flex items-center">
                              <span className="text-emerald-900 font-bold text-xl mr-1">$</span>
                              <input 
                                type="number"
                                className="text-xl font-bold text-emerald-900 bg-transparent border-b border-emerald-300 focus:border-emerald-600 outline-none w-full placeholder-emerald-300"
                                value={formData.salary}
                                onChange={e => handleChange('salary', parseInt(e.target.value) || 0)}
                             />
                          </div>
                      ) : (
                          <p className="text-xl font-bold text-emerald-900">${(employee.salary || 0).toLocaleString()}</p>
                      )}
                   </div>
                </div>
              )}

              {/* Reports (HR/Admin Only) */}
              {canGenerateReports && (
                <div className="pt-6 border-t border-grx-primary-50">
                   <h3 className="text-sm font-bold text-grx-text flex items-center gap-2 mb-3">
                      <FileText size={16} className="text-blue-600" />
                      Generate Reports
                   </h3>
                   <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => generateReport('attendance')}
                        className="flex flex-col items-center justify-center p-3 border border-grx-primary-100 rounded-lg hover:bg-grx-bg transition-colors group"
                      >
                         <Clock size={20} className="text-grx-muted group-hover:text-blue-600 mb-1" />
                         <span className="text-xs font-medium text-grx-muted group-hover:text-grx-text">Attendance CSV</span>
                      </button>
                      <button 
                        onClick={() => generateReport('leaves')}
                        className="flex flex-col items-center justify-center p-3 border border-grx-primary-100 rounded-lg hover:bg-grx-bg transition-colors group"
                      >
                         <Calendar size={20} className="text-grx-muted group-hover:text-blue-600 mb-1" />
                         <span className="text-xs font-medium text-grx-muted group-hover:text-grx-text">Leave CSV</span>
                      </button>
                   </div>
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-grx-text flex items-center gap-2">
                <Clock size={20} className="text-indigo-600" />
                Recent Activity
              </h3>
              
              <div className="space-y-4">
                 {/* Attendance Snippet */}
                 <div className="bg-grx-bg rounded-xl p-4 border border-grx-primary-50">
                    <h4 className="text-sm font-semibold text-grx-text mb-3">Last 3 Days Attendance</h4>
                    {recentAttendance.length > 0 ? (
                      <div className="space-y-2">
                        {recentAttendance.map(rec => (
                          <div key={rec.id} className="flex justify-between text-sm">
                             <span className="text-grx-muted">{rec.date}</span>
                             <span className="font-mono text-grx-text">{rec.checkIn} - {rec.checkOut || 'Active'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-grx-muted italic">No recent records found.</p>
                    )}
                 </div>

                 {/* Leaves Snippet */}
                 <div className="bg-grx-bg rounded-xl p-4 border border-grx-primary-50">
                    <h4 className="text-sm font-semibold text-grx-text mb-3">Recent Leave Requests</h4>
                    {recentLeaves.length > 0 ? (
                      <div className="space-y-2">
                        {recentLeaves.map(leave => (
                          <div key={leave.id} className="flex justify-between items-center text-sm">
                             <div className="flex flex-col">
                               <span className="text-grx-text font-medium">{leave.type}</span>
                               <span className="text-xs text-grx-muted">{leave.startDate}</span>
                             </div>
                             <span className={`px-2 py-0.5 rounded text-xs ${
                               leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                             }`}>
                               {leave.status}
                             </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-grx-muted italic">No recent leave requests.</p>
                    )}
                 </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
