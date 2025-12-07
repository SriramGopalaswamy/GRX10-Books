import React, { useState } from 'react';
import { MOCK_LEAVES } from '../../../shared/constants/app.constants';
import { LeaveType, LeaveStatus } from '../../../shared/types';
import { Plus, AlertCircle } from 'lucide-react';

export const Leaves: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Leave Management</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Apply Leave
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-sm mb-1">Sick Leave</p>
          <p className="text-2xl font-bold text-slate-900">5 <span className="text-sm font-normal text-slate-400">/ 12</span></p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-rose-500 h-full" style={{width: '41%'}}></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-sm mb-1">Casual Leave</p>
          <p className="text-2xl font-bold text-slate-900">8 <span className="text-sm font-normal text-slate-400">/ 12</span></p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-full" style={{width: '66%'}}></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-slate-500 text-sm mb-1">Earned Leave</p>
          <p className="text-2xl font-bold text-slate-900">3 <span className="text-sm font-normal text-slate-400">/ 15</span></p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{width: '20%'}}></div>
          </div>
        </div>
      </div>

      {/* Leave History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-medium text-slate-700">Request History</div>
        <table className="w-full text-left">
          <thead>
             <tr className="bg-slate-50 text-slate-500 text-sm">
               <th className="px-6 py-3">Type</th>
               <th className="px-6 py-3">Dates</th>
               <th className="px-6 py-3">Reason</th>
               <th className="px-6 py-3">Applied On</th>
               <th className="px-6 py-3">Status</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_LEAVES.map((leave) => (
              <tr key={leave.id} className="text-sm hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{leave.type}</td>
                <td className="px-6 py-4 text-slate-600">{leave.startDate} to {leave.endDate}</td>
                <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{leave.reason}</td>
                <td className="px-6 py-4 text-slate-500">{leave.appliedOn}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    leave.status === LeaveStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' :
                    leave.status === LeaveStatus.REJECTED ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {leave.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
       {/* Simple Modal for Leave Application */}
       {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Apply for Leave</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                <select className="w-full border border-slate-300 rounded-lg p-2">
                  {Object.values(LeaveType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                   <input type="date" className="w-full border border-slate-300 rounded-lg p-2" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                   <input type="date" className="w-full border border-slate-300 rounded-lg p-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea className="w-full border border-slate-300 rounded-lg p-2 h-24" placeholder="Enter reason..."></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200">Cancel</button>
                <button onClick={() => setShowModal(false)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Submit</button>
              </div>
            </div>
          </div>
        </div>
       )}
    </div>
  );
};