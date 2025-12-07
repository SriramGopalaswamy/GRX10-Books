
import React, { useState } from 'react';
import { X, UserMinus, AlertTriangle } from 'lucide-react';
import { useEmployees } from '../../../shared/contexts/EmployeeContext';
import { Employee } from '../../../shared/types';

interface OffboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OffboardingModal: React.FC<OffboardingModalProps> = ({ isOpen, onClose }) => {
  const { employees, updateEmployee } = useEmployees();
  const [selectedId, setSelectedId] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);

  if (!isOpen) return null;

  const activeEmployees = employees.filter(e => e.status === 'Active');

  const handleSubmit = () => {
    if (!selectedId || !exitDate || !confirm) return;
    
    updateEmployee(selectedId, { status: 'Exited' });
    alert(`Employee has been offboarded. Relieving letter generated.`);
    onClose();
    
    // Reset
    setSelectedId('');
    setExitDate('');
    setReason('');
    setConfirm(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-50">
          <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
            <UserMinus size={20} />
            Offboard Employee
          </h3>
          <button onClick={onClose} className="text-rose-400 hover:text-rose-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Employee</label>
            <select 
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 outline-none"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
            >
              <option value="">-- Search Employee --</option>
              {activeEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Working Day</label>
            <input 
              type="date" 
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 outline-none"
              value={exitDate}
              onChange={e => setExitDate(e.target.value)}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Exit</label>
             <textarea 
               className="w-full border border-slate-300 rounded-lg p-2.5 h-24 resize-none focus:ring-2 focus:ring-rose-500 outline-none"
               placeholder="Resignation, Termination, etc."
               value={reason}
               onChange={e => setReason(e.target.value)}
             />
          </div>

          <div className="bg-rose-50 p-3 rounded-lg flex items-start gap-2 border border-rose-100">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800">
              <p className="font-bold">Warning: Irreversible Action</p>
              <p>This will revoke system access and mark the employee as 'Exited'. A relieving letter will be auto-generated.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="confirm" 
              checked={confirm} 
              onChange={e => setConfirm(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500" 
            />
            <label htmlFor="confirm" className="text-sm text-slate-700">I confirm this offboarding action.</label>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
          <button 
            onClick={handleSubmit}
            disabled={!selectedId || !exitDate || !confirm}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors font-medium"
          >
            Complete Offboarding
          </button>
        </div>
      </div>
    </div>
  );
};
