import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { HRMSRole as Role, LeaveStatus } from '../../../shared/types';
import { Plus, AlertCircle, Loader2 } from 'lucide-react';
import { validateForm, ValidationErrors, commonRules } from '../../../shared/utils/validation';

interface LeaveBalance {
  entitlement: number;
  used: number;
  balance: number;
  maxDays: number;
  isPaid: boolean;
  code?: string;
}

interface LeaveBalances {
  [key: string]: LeaveBalance;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  appliedOn: string;
  Employee?: {
    id: string;
    name: string;
    email: string;
  };
}

export const Leaves: React.FC = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalances>({});
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  
  // Leave request form state
  const [newLeave, setNewLeave] = useState({
    type: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Fetch leave types from configuration
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const response = await fetch('/api/config/leave-types?activeOnly=true');
        if (response.ok) {
          const data = await response.json();
          setLeaveTypes(data);
          if (data.length > 0 && !newLeave.type) {
            setNewLeave(prev => ({ ...prev, type: data[0].name }));
          }
        }
      } catch (err) {
        console.error('Error fetching leave types:', err);
      }
    };
    fetchLeaveTypes();
  }, []);

  // Fetch leave balances
  useEffect(() => {
    if (!user) return;
    
    const fetchLeaveBalances = async () => {
      setBalanceLoading(true);
      try {
        const response = await fetch(`/api/hrms/leaves/balance/${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch leave balances');
        const data = await response.json();
        // API returns { balances: { type: { entitlement, used, balance, ... } }, summary: {...} }
        if (data && data.balances && typeof data.balances === 'object') {
          setLeaveBalances(data.balances);
        } else if (Array.isArray(data)) {
          // Fallback: legacy array format
          const balancesObj: LeaveBalances = {};
          data.forEach((item: any) => {
            balancesObj[item.type] = {
              entitlement: item.entitlement || 0,
              used: item.used || 0,
              balance: item.balance || 0,
              maxDays: item.entitlement || 0,
              isPaid: true
            };
          });
          setLeaveBalances(balancesObj);
        } else {
          setLeaveBalances({});
        }
      } catch (err) {
        console.error('Error fetching leave balances:', err);
        setLeaveBalances({});
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchLeaveBalances();
  }, [user]);

  // Fetch leave requests
  useEffect(() => {
    if (!user) return;
    
    const fetchLeaveRequests = async () => {
      setLoading(true);
      try {
        let url = '/api/hrms/leaves';
        
        // Role-based filtering
        if (user.role === Role.ADMIN || user.role === Role.HR) {
          // Admin/HR: See all leave requests
          url = '/api/hrms/leaves';
        } else if (user.role === Role.MANAGER) {
          // Manager: Get employee record first to find their ID, then get reportees' leaves
          try {
            const empResponse = await fetch('/api/hrms/employees');
            if (empResponse.ok) {
              const employees = await empResponse.json();
              const currentEmployee = Array.isArray(employees) 
                ? employees.find((e: any) => e.email === user.email || e.id === user.id) 
                : null;
              if (currentEmployee && currentEmployee.id) {
                url = `/api/hrms/leaves?managerId=${currentEmployee.id}`;
              } else {
                url = `/api/hrms/leaves?employeeId=${user.id}`;
              }
            } else {
              url = `/api/hrms/leaves?employeeId=${user.id}`;
            }
          } catch (err) {
            url = `/api/hrms/leaves?employeeId=${user.id}`;
          }
        } else {
          // Employee: See only their own records
          try {
            const empResponse = await fetch('/api/hrms/employees');
            if (empResponse.ok) {
              const employees = await empResponse.json();
              const currentEmployee = Array.isArray(employees) 
                ? employees.find((e: any) => e.email === user.email || e.id === user.id) 
                : null;
              if (currentEmployee && currentEmployee.id) {
                url = `/api/hrms/leaves?employeeId=${currentEmployee.id}`;
              } else {
                url = `/api/hrms/leaves?employeeId=${user.id}`;
              }
            } else {
              url = `/api/hrms/leaves?employeeId=${user.id}`;
            }
          } catch (err) {
            url = `/api/hrms/leaves?employeeId=${user.id}`;
          }
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch leave requests');
        const data = await response.json();
        setLeaveRequests(data);
      } catch (err) {
        setError('Failed to load leave requests');
        console.error('Error fetching leave requests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveRequests();
  }, [user]);

  const handleSubmitLeave = async () => {
    if (!user) {
      setError('Please log in to apply for leave');
      return;
    }

    // Validate form
    const validationRules = {
      type: { required: true },
      startDate: { required: true, date: true },
      endDate: { 
        required: true, 
        date: true,
        custom: (value: string) => {
          if (!newLeave.startDate) return null;
          const startDate = new Date(newLeave.startDate);
          const endDate = new Date(value);
          if (endDate < startDate) {
            return 'End date must be after start date';
          }
          return null;
        }
      }
    };

    const validationErrors = validateForm(newLeave, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setFormErrors({});
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/hrms/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.id,
          type: newLeave.type,
          startDate: newLeave.startDate,
          endDate: newLeave.endDate,
          reason: newLeave.reason,
          status: 'Pending'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit leave request');
      }

      // Refresh leave requests and balances
      const [requestsRes, balanceRes] = await Promise.all([
        fetch(`/api/hrms/leaves?employeeId=${user.id}`),
        fetch(`/api/hrms/leaves/balance/${user.id}`)
      ]);

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setLeaveRequests(requestsData);
      }

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setLeaveBalances(balanceData.balances || {});
      }

      // Reset form and close modal
      setNewLeave({ type: leaveTypes[0]?.name || '', startDate: '', endDate: '', reason: '' });
      setFormErrors({});
      setShowModal(false);
      alert('Leave request submitted successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
      console.error('Error submitting leave request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Leave Management</h2>
        {user && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Apply Leave
          </button>
        )}
      </div>

      {/* Balance Cards */}
      {!user ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400">Please log in to view your leave balances.</p>
        </div>
      ) : balanceLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <span className="ml-2 text-slate-500 dark:text-slate-400">Loading leave balances...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(leaveBalances).length === 0 ? (
            <div className="col-span-full text-center text-slate-500 dark:text-slate-400 p-4">
              No leave balances available. Please contact HR to set up your leave entitlements.
            </div>
          ) : (
            Object.entries(leaveBalances).map(([leaveType, balance]) => {
              const percentage = balance.entitlement > 0 
                ? (balance.used / balance.entitlement) * 100 
                : 0;
              const colorClass = percentage > 80 ? 'bg-rose-500' : 
                                percentage > 50 ? 'bg-orange-500' : 
                                'bg-emerald-500';
              
              return (
                <div key={leaveType} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">{leaveType}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {balance.balance} <span className="text-sm font-normal text-slate-400">/ {balance.entitlement}</span>
                  </p>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className={`${colorClass} h-full transition-all`} style={{width: `${Math.min(percentage, 100)}%`}}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Used: {balance.used} days</p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Leave History */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">Request History</div>
        {!user ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">Please log in to view your leave requests.</div>
        ) : loading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
            <p className="text-slate-500 dark:text-slate-400 mt-2">Loading leave requests...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 dark:text-rose-400">{error}</div>
        ) : leaveRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">No leave requests found.</div>
        ) : (
          <table className="w-full text-left">
            <thead>
               <tr className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-sm">
                 {(user?.role === Role.ADMIN || user?.role === Role.HR || user?.role === Role.MANAGER) && (
                   <th className="px-6 py-3">Employee</th>
                 )}
                 <th className="px-6 py-3">Type</th>
                 <th className="px-6 py-3">Dates</th>
                 <th className="px-6 py-3">Reason</th>
                 <th className="px-6 py-3">Applied On</th>
                 <th className="px-6 py-3">Status</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {leaveRequests.map((leave) => (
                <tr key={leave.id} className="text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
                  {(user?.role === Role.ADMIN || user?.role === Role.HR || user?.role === Role.MANAGER) && (
                    <td className="px-6 py-4 text-slate-900 dark:text-slate-100">
                      {leave.Employee?.name || leave.employeeId}
                    </td>
                  )}
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{leave.type}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{leave.startDate} to {leave.endDate}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">{leave.reason || '-'}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{leave.appliedOn}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      leave.status === LeaveStatus.APPROVED ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' :
                      leave.status === LeaveStatus.REJECTED ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300' :
                      leave.status === LeaveStatus.CANCELLED ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                    }`}>
                      {leave.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
       {/* Leave Application Modal */}
       {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-slate-100">Apply for Leave</h3>
            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Leave Type *</label>
                <select 
                  className={`w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none ${
                    formErrors.type 
                      ? 'border-red-300 dark:border-red-700' 
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                  value={newLeave.type}
                  onChange={e => {
                    setNewLeave({...newLeave, type: e.target.value});
                    if (formErrors.type) {
                      const newErrors = { ...formErrors };
                      delete newErrors.type;
                      setFormErrors(newErrors);
                    }
                  }}
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.name}>
                      {lt.name} {leaveBalances[lt.name] && `(${leaveBalances[lt.name].balance} days available)`}
                    </option>
                  ))}
                </select>
                {formErrors.type && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle size={14} />
                    <span>{formErrors.type}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                   <input 
                    type="date" 
                    className={`w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none ${
                      formErrors.startDate 
                        ? 'border-red-300 dark:border-red-700' 
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                    value={newLeave.startDate}
                    onChange={e => {
                      setNewLeave({...newLeave, startDate: e.target.value});
                      if (formErrors.startDate) {
                        const newErrors = { ...formErrors };
                        delete newErrors.startDate;
                        setFormErrors(newErrors);
                      }
                    }}
                    min={new Date().toISOString().split('T')[0]}
                   />
                   {formErrors.startDate && (
                     <div className="mt-1 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                       <AlertCircle size={14} />
                       <span>{formErrors.startDate}</span>
                     </div>
                   )}
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
                   <input 
                    type="date" 
                    className={`w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none ${
                      formErrors.endDate 
                        ? 'border-red-300 dark:border-red-700' 
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                    value={newLeave.endDate}
                    onChange={e => {
                      setNewLeave({...newLeave, endDate: e.target.value});
                      if (formErrors.endDate) {
                        const newErrors = { ...formErrors };
                        delete newErrors.endDate;
                        setFormErrors(newErrors);
                      }
                    }}
                    min={newLeave.startDate || new Date().toISOString().split('T')[0]}
                   />
                   {formErrors.endDate && (
                     <div className="mt-1 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                       <AlertCircle size={14} />
                       <span>{formErrors.endDate}</span>
                     </div>
                   )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                <textarea 
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 h-24 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                  placeholder="Enter reason for leave..."
                  value={newLeave.reason}
                  onChange={e => setNewLeave({...newLeave, reason: e.target.value})}
                ></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                    setFormErrors({});
                    setNewLeave({ type: leaveTypes[0]?.name || '', startDate: '', endDate: '', reason: '' });
                  }}
                  className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitLeave}
                  disabled={loading || !newLeave.type || !newLeave.startDate || !newLeave.endDate}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
       )}
    </div>
  );
};