
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useRegularization } from '../../../shared/contexts/RegularizationContext';
import { HRMSRole as Role, RegularizationType, LeaveStatus } from '../../../shared/types';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, FileText, AlertCircle, Check, X, Loader2 } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  durationHours: number | null;
  Employee?: {
    id: string;
    name: string;
    email: string;
  };
}

export const Attendance: React.FC = () => {
  const { user } = useAuth();
  const { requests: regRequests, addRequest, updateRequestStatus } = useRegularization();
  const [activeTab, setActiveTab] = useState<'logs' | 'requests' | 'approvals'>('logs');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Shift timing info (P2-08)
  const [shiftInfo, setShiftInfo] = useState<{ name: string; startTime: string; endTime: string; graceMinutes: number } | null>(null);

  // Regularization State
  const [showRegModal, setShowRegModal] = useState(false);
  const [newReg, setNewReg] = useState({
    date: '',
    type: RegularizationType.MISSING_PUNCH,
    newCheckIn: '',
    newCheckOut: '',
    reason: ''
  });

  // P2-08: Fetch shift timing info
  useEffect(() => {
    const fetchShiftInfo = async () => {
      try {
        const response = await fetch('/api/hrms/shift-timings');
        if (response.ok) {
          const shifts = await response.json();
          const defaultShift = shifts.find((s: any) => s.isDefault) || shifts[0];
          if (defaultShift) {
            setShiftInfo({
              name: defaultShift.name,
              startTime: defaultShift.startTime,
              endTime: defaultShift.endTime,
              graceMinutes: defaultShift.graceMinutes || 15
            });
          }
        }
      } catch (err) {
        console.error('Error fetching shift info:', err);
      }
    };
    fetchShiftInfo();
  }, []);

  // Fetch today's attendance status
  useEffect(() => {
    if (!user) return;

    const fetchTodayStatus = async () => {
      try {
        const response = await fetch(`/api/hrms/attendance/today/${user.id}`);
        if (response.status === 404) {
          // No attendance record for today
          setIsCheckedIn(false);
          setIsCheckedOut(false);
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch attendance status');
        const data = await response.json();
        setIsCheckedIn(!!data.checkIn && !data.checkOut);
        setIsCheckedOut(!!data.checkOut);
      } catch (err) {
        console.error('Error fetching today status:', err);
        setIsCheckedIn(false);
        setIsCheckedOut(false);
      }
    };

    fetchTodayStatus();
  }, [user]);

  // Fetch attendance logs
  useEffect(() => {
    if (!user) return;
    
    const fetchAttendanceLogs = async () => {
      setLoading(true);
      try {
        let url = '/api/hrms/attendance';
        
        // Role-based filtering
        if (user.role === Role.ADMIN || user.role === Role.HR) {
          // Admin/HR: See all attendance records
          url = '/api/hrms/attendance';
        } else if (user.role === Role.MANAGER) {
          // Manager: Get employee record first to find their ID, then get reportees' attendance
          try {
            const empResponse = await fetch('/api/hrms/employees');
            if (empResponse.ok) {
              const employees = await empResponse.json();
              const currentEmployee = Array.isArray(employees) 
                ? employees.find((e: any) => e.email === user.email || e.id === user.id) 
                : null;
              if (currentEmployee && currentEmployee.id) {
                // Fetch attendance for reportees (employees with this manager's ID)
                url = `/api/hrms/attendance?managerId=${currentEmployee.id}`;
              } else {
                // Fallback: try using user.id as employeeId
                url = `/api/hrms/attendance?employeeId=${user.id}`;
              }
            } else {
              // Fallback: try using user.id as employeeId
              url = `/api/hrms/attendance?employeeId=${user.id}`;
            }
          } catch (err) {
            // Fallback: try using user.id as employeeId
            url = `/api/hrms/attendance?employeeId=${user.id}`;
          }
        } else {
          // Employee: See only their own records
          // Try to find employee record by email or use user.id
          try {
            const empResponse = await fetch('/api/hrms/employees');
            if (empResponse.ok) {
              const employees = await empResponse.json();
              const currentEmployee = Array.isArray(employees) 
                ? employees.find((e: any) => e.email === user.email || e.id === user.id) 
                : null;
              if (currentEmployee && currentEmployee.id) {
                url = `/api/hrms/attendance?employeeId=${currentEmployee.id}`;
              } else {
                url = `/api/hrms/attendance?employeeId=${user.id}`;
              }
            } else {
              url = `/api/hrms/attendance?employeeId=${user.id}`;
            }
          } catch (err) {
            url = `/api/hrms/attendance?employeeId=${user.id}`;
          }
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch attendance logs');
        const data = await response.json();
        setAttendanceLogs(data);
      } catch (err) {
        setError('Failed to load attendance logs');
        console.error('Error fetching attendance logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceLogs();
  }, [user]);

  // Filter logic
  const myRequests = user ? regRequests.filter(r => r.employeeId === user.id) : [];
  
  // Approval logic: HR/Admin see all pending, Managers see pending for their team (mocked here as all others)
  const pendingApprovals = user ? regRequests.filter(r => {
    if (r.status !== LeaveStatus.PENDING) return false;
    if (user.role === Role.HR || user.role === Role.ADMIN) return true;
    if (user.role === Role.MANAGER) return r.employeeId !== user.id; // Simplified: Manager sees everyone else's
    return false;
  }) : [];

  const handleCheckIn = async () => {
    if (!user) return;
    
    setCheckInLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/hrms/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: user.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check in/out');
      }

      const data = await response.json();
      
      if (data.action === 'checked-in') {
        setIsCheckedIn(true);
        setIsCheckedOut(false);
      } else if (data.action === 'checked-out') {
        setIsCheckedIn(true);
        setIsCheckedOut(true);
      }

      // Refresh attendance logs
      const logsResponse = await fetch(`/api/hrms/attendance?employeeId=${user.id}`);
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setAttendanceLogs(logsData);
      }

      // Show success message (you can add a toast notification here)
      alert(data.message);
    } catch (err: any) {
      setError(err.message || 'Failed to check in/out');
      console.error('Error checking in/out:', err);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleSubmitRegularization = () => {
    if (!user) return;
    const request = {
      id: `REG${Date.now()}`,
      employeeId: user.id,
      employeeName: user.name,
      date: newReg.date,
      type: newReg.type,
      reason: newReg.reason,
      status: LeaveStatus.PENDING,
      appliedOn: new Date().toISOString().split('T')[0],
      newCheckIn: newReg.newCheckIn,
      newCheckOut: newReg.newCheckOut
    };
    addRequest(request);
    setShowRegModal(false);
    setActiveTab('requests');
    // Reset form
    setNewReg({
      date: '',
      type: RegularizationType.MISSING_PUNCH,
      newCheckIn: '',
      newCheckOut: '',
      reason: ''
    });
  };

  const handleApproval = (id: string, status: LeaveStatus) => {
    updateRequestStatus(id, status);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Attendance Management</h2>
          <p className="text-slate-500 dark:text-slate-400">Track attendance and manage regularization</p>
        </div>
        
        {user && (
          <div className="bg-white dark:bg-slate-800 px-5 py-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-6">
            <div>
               <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wide">Current Time</p>
               <p className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 leading-none mt-1">
                 {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </p>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
            <button 
              onClick={handleCheckIn}
              disabled={checkInLoading || isCheckedOut || !user}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
                isCheckedIn && !isCheckedOut
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300' 
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {checkInLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : isCheckedOut ? (
                'Already Checked Out'
              ) : isCheckedIn ? (
                'Check Out'
              ) : (
                'Check In'
              )}
            </button>
          </div>
        )}
      </div>

      {/* P2-08: Shift Timing Info */}
      {shiftInfo && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg px-4 py-2.5 flex items-center gap-4 text-sm">
          <Clock size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="text-indigo-700 dark:text-indigo-300">
            <span className="font-medium">{shiftInfo.name}:</span> {shiftInfo.startTime} - {shiftInfo.endTime}
            <span className="text-indigo-500 dark:text-indigo-400 ml-2">({shiftInfo.graceMinutes} min grace period)</span>
          </span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 flex gap-6">
        <button 
          onClick={() => setActiveTab('logs')}
          className={`pb-3 font-medium text-sm transition-colors relative ${
            activeTab === 'logs' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {user?.role === Role.ADMIN || user?.role === Role.HR 
            ? 'All Attendance Logs' 
            : user?.role === Role.MANAGER 
            ? 'Team Attendance Logs' 
            : 'My Attendance Logs'}
          {activeTab === 'logs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`pb-3 font-medium text-sm transition-colors relative ${
            activeTab === 'requests' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Regularization Requests
          {activeTab === 'requests' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
        </button>
        {user && (user.role === Role.MANAGER || user.role === Role.HR || user.role === Role.ADMIN) && (
          <button 
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 font-medium text-sm transition-colors relative ${
              activeTab === 'approvals' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Approvals
            {pendingApprovals.length > 0 && (
              <span className="ml-2 bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingApprovals.length}</span>
            )}
            {activeTab === 'approvals' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></div>}
          </button>
        )}
      </div>

      {/* Tab Content: My Attendance Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
              <p className="text-slate-500 mt-2">Loading attendance logs...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600">{error}</div>
          ) : attendanceLogs.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-slate-500 dark:text-slate-400 mb-4">No attendance records found.</div>
              <div className="text-sm text-slate-400 dark:text-slate-500">
                {user ? 'Click "Check In" above to start tracking your attendance.' : 'Please log in to view attendance records.'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                    {(user?.role === Role.ADMIN || user?.role === Role.HR || user?.role === Role.MANAGER) && (
                      <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-300 text-sm">Employee</th>
                    )}
                    <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-300 text-sm">Date</th>
                    <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-300 text-sm">First Punch</th>
                    <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-300 text-sm">Last Punch</th>
                    <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-300 text-sm">Total Hours</th>
                    <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-300 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {attendanceLogs.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      {(user?.role === Role.ADMIN || user?.role === Role.HR || user?.role === Role.MANAGER) && (
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {record.Employee?.name || record.employeeId}
                        </td>
                      )}
                      <td className="px-6 py-4 flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
                        <CalendarIcon size={16} className="text-slate-400" />
                        {record.date}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">{record.checkIn || '--:--'}</td>
                      <td className="px-6 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">{record.checkOut || '--:--'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-slate-400" />
                          {record.durationHours ? `${record.durationHours} hrs` : '--'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'Present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' : 
                          record.status === 'Late' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' : 
                          'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300'
                        }`}>
                          {record.status === 'Present' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: My Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button 
              onClick={() => setShowRegModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <FileText size={16} />
              New Request
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {myRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No regularization requests found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-4 font-medium text-slate-500 text-sm">Date</th>
                      <th className="px-6 py-4 font-medium text-slate-500 text-sm">Type</th>
                      <th className="px-6 py-4 font-medium text-slate-500 text-sm">Details</th>
                      <th className="px-6 py-4 font-medium text-slate-500 text-sm">Reason</th>
                      <th className="px-6 py-4 font-medium text-slate-500 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {myRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">{req.date}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs font-medium text-slate-700 dark:text-slate-300">{req.type}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 font-mono">
                          {req.type === RegularizationType.WFH ? 'N/A' : `${req.newCheckIn} - ${req.newCheckOut}`}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">{req.reason}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            req.status === LeaveStatus.APPROVED ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                            req.status === LeaveStatus.REJECTED ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' :
                            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Approvals */}
      {activeTab === 'approvals' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">No pending approvals. Good job!</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-sm">Employee</th>
                  <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-sm">Date & Type</th>
                  <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-sm">Correction</th>
                  <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-sm">Reason</th>
                  <th className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {pendingApprovals.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{req.employeeName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">ID: {req.employeeId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-slate-100">{req.date}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{req.type}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600 dark:text-slate-300">
                      {req.type === RegularizationType.WFH ? 'Work From Home' : `${req.newCheckIn} -> ${req.newCheckOut}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs">{req.reason}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleApproval(req.id, LeaveStatus.APPROVED)}
                          className="p-1.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                          title="Approve"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => handleApproval(req.id, LeaveStatus.REJECTED)}
                          className="p-1.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors"
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {showRegModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-slate-100">Request Regularization</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                   <input 
                    type="date" 
                    className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newReg.date}
                    onChange={e => setNewReg({...newReg, date: e.target.value})}
                   />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select 
                    className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newReg.type}
                    onChange={e => setNewReg({...newReg, type: e.target.value as RegularizationType})}
                  >
                    {Object.values(RegularizationType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {newReg.type !== RegularizationType.WFH && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                     <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Correct Check-in</label>
                     <input 
                      type="time" 
                      className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-sm"
                      value={newReg.newCheckIn}
                      onChange={e => setNewReg({...newReg, newCheckIn: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Correct Check-out</label>
                     <input 
                      type="time" 
                      className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-sm"
                      value={newReg.newCheckOut}
                      onChange={e => setNewReg({...newReg, newCheckOut: e.target.value})}
                     />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                <textarea 
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-3 text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                  placeholder="Please explain why regularisation is needed..."
                  value={newReg.reason}
                  onChange={e => setNewReg({...newReg, reason: e.target.value})}
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowRegModal(false)} 
                  className="flex-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitRegularization} 
                  disabled={!newReg.date || !newReg.reason}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
