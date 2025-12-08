
import React, { useState } from 'react';
import { MOCK_ATTENDANCE } from '../../../shared/constants/app.constants';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useRegularization } from '../../../shared/contexts/RegularizationContext';
import { HRMSRole as Role, RegularizationType, LeaveStatus } from '../../../shared/types';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, FileText, AlertCircle, Check, X } from 'lucide-react';

export const Attendance: React.FC = () => {
  const { user } = useAuth();
  const { requests: regRequests, addRequest, updateRequestStatus } = useRegularization();
  const [activeTab, setActiveTab] = useState<'logs' | 'requests' | 'approvals'>('logs');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  
  // Regularization State
  const [showRegModal, setShowRegModal] = useState(false);
  const [newReg, setNewReg] = useState({
    date: '',
    type: RegularizationType.MISSING_PUNCH,
    newCheckIn: '',
    newCheckOut: '',
    reason: ''
  });

  if (!user) return null;

  // Filter logic
  const myRequests = regRequests.filter(r => r.employeeId === user.id);
  
  // Approval logic: HR/Admin see all pending, Managers see pending for their team (mocked here as all others)
  const pendingApprovals = regRequests.filter(r => {
    if (r.status !== LeaveStatus.PENDING) return false;
    if (user.role === Role.HR || user.role === Role.ADMIN) return true;
    if (user.role === Role.MANAGER) return r.employeeId !== user.id; // Simplified: Manager sees everyone else's
    return false;
  });

  const handleCheckIn = () => {
    setIsCheckedIn(!isCheckedIn);
  };

  const handleSubmitRegularization = () => {
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
          <p className="text-slate-500">Track attendance and manage regularization</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 px-5 py-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-6">
          <div>
             <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Current Time</p>
             <p className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 leading-none mt-1">
               {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </p>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <button 
            onClick={handleCheckIn}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              isCheckedIn 
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            {isCheckedIn ? 'Check Out' : 'Check In'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6">
        <button 
          onClick={() => setActiveTab('logs')}
          className={`pb-3 font-medium text-sm transition-colors relative ${
            activeTab === 'logs' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          My Attendance Logs
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
        {(user.role === Role.MANAGER || user.role === Role.HR || user.role === Role.ADMIN) && (
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
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-medium text-slate-500 text-sm">Date</th>
                  <th className="px-6 py-4 font-medium text-slate-500 text-sm">First Punch</th>
                  <th className="px-6 py-4 font-medium text-slate-500 text-sm">Last Punch</th>
                  <th className="px-6 py-4 font-medium text-slate-500 text-sm">Total Hours</th>
                  <th className="px-6 py-4 font-medium text-slate-500 text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_ATTENDANCE.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100">
                      <CalendarIcon size={16} className="text-slate-400" />
                      {record.date}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{record.checkIn}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{record.checkOut || '--:--'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" />
                        {record.durationHours} hrs
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record.status === 'Present' ? 'bg-emerald-100 text-emerald-800' : 
                        record.status === 'Late' ? 'bg-orange-100 text-orange-800' : 
                        'bg-rose-100 text-rose-800'
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
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 font-medium text-slate-500 text-sm">Date</th>
                      <th className="px-6 py-4 font-medium text-slate-500 text-sm">Type</th>
                      <th className="px-6 py-4 font-medium text-slate-500 text-sm">Details</th>
                      <th className="px-6 py-4 font-medium text-slate-500 text-sm">Reason</th>
                      <th className="px-6 py-4 font-medium text-slate-500 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">{req.date}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">{req.type}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                          {req.type === RegularizationType.WFH ? 'N/A' : `${req.newCheckIn} - ${req.newCheckOut}`}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{req.reason}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            req.status === LeaveStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' :
                            req.status === LeaveStatus.REJECTED ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
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
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No pending approvals. Good job!</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 font-medium text-slate-500 text-sm">Employee</th>
                  <th className="px-6 py-4 font-medium text-slate-500 text-sm">Date & Type</th>
                  <th className="px-6 py-4 font-medium text-slate-500 text-sm">Correction</th>
                  <th className="px-6 py-4 font-medium text-slate-500 text-sm">Reason</th>
                  <th className="px-6 py-4 font-medium text-slate-500 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingApprovals.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-slate-900">{req.employeeName}</div>
                      <div className="text-xs text-slate-500">ID: {req.employeeId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">{req.date}</div>
                      <div className="text-xs text-slate-500">{req.type}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">
                      {req.type === RegularizationType.WFH ? 'Work From Home' : `${req.newCheckIn} -> ${req.newCheckOut}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs">{req.reason}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleApproval(req.id, LeaveStatus.APPROVED)}
                          className="p-1.5 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                          title="Approve"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => handleApproval(req.id, LeaveStatus.REJECTED)}
                          className="p-1.5 rounded bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
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
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-slate-900">Request Regularization</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                   <input 
                    type="date" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newReg.date}
                    onChange={e => setNewReg({...newReg, date: e.target.value})}
                   />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newReg.type}
                    onChange={e => setNewReg({...newReg, type: e.target.value as RegularizationType})}
                  >
                    {Object.values(RegularizationType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {newReg.type !== RegularizationType.WFH && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                     <label className="block text-xs font-medium text-slate-500 mb-1">Correct Check-in</label>
                     <input 
                      type="time" 
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                      value={newReg.newCheckIn}
                      onChange={e => setNewReg({...newReg, newCheckIn: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-slate-500 mb-1">Correct Check-out</label>
                     <input 
                      type="time" 
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                      value={newReg.newCheckOut}
                      onChange={e => setNewReg({...newReg, newCheckOut: e.target.value})}
                     />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                  placeholder="Please explain why regularisation is needed..."
                  value={newReg.reason}
                  onChange={e => setNewReg({...newReg, reason: e.target.value})}
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowRegModal(false)} 
                  className="flex-1 bg-white border border-slate-300 text-slate-700 py-2.5 rounded-lg hover:bg-slate-50 font-medium transition-colors"
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
