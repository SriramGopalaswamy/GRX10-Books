import React, { useState } from 'react';
import { HRMSRole as Role, Employee } from '../../../shared/types';
import { X, Upload, UserPlus, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useEmployees } from '../../../shared/contexts/EmployeeContext';
import { useConfiguration } from '../../../shared/contexts/ConfigurationContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<Employee>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, initialData }) => {
  const { addEmployee, employees } = useEmployees();
  const { getActiveDepartments, getActivePositions, getActiveEmployeeTypes, getActiveRoles } = useConfiguration();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    email: '',
    designation: '',
    department: '',
    role: Role.EMPLOYEE,
    salary: 0,
    joinDate: new Date().toISOString().split('T')[0],
    managerId: '',
    ...initialData
  });
  const [offerLetter, setOfferLetter] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const newEmployee: Employee = {
        id: `EMP${Math.floor(Math.random() * 10000)}`, // Will be replaced by backend
        avatar: `https://ui-avatars.com/api/?name=${formData.name}&background=random`,
        status: 'Active', // Ensure status is set
        ...formData as Employee
      };
      await addEmployee(newEmployee);
      onClose();
      // Reset form
      setStep(1);
      setFormData({
        name: '',
        email: '',
        designation: '',
        department: '',
        role: Role.EMPLOYEE,
        salary: 0,
        joinDate: new Date().toISOString().split('T')[0],
        managerId: ''
      });
      setOfferLetter(null);
    } catch (error: any) {
      alert(error.message || 'Failed to create employee. Please try again.');
    }
  };

  // Refined manager filtering: Active status AND (Manager OR HR OR Admin)
  const managers = employees.filter(e => 
    e.status === 'Active' && 
    (e.role === Role.MANAGER || e.role === Role.HR || e.role === Role.ADMIN)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus size={20} className="text-indigo-600" />
              Onboard New Employee
            </h3>
            <p className="text-xs text-slate-500">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Progress Bar */}
          <div className="flex gap-2 mb-6">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
          </div>

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h4 className="font-semibold text-slate-900">Personal Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.name || ''}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.email || ''}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="john.doe@grx10.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Joining Date</label>
                  <input 
                    type="date" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.joinDate}
                    onChange={e => handleChange('joinDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h4 className="font-semibold text-slate-900">Role & Department</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.department || ''}
                    onChange={e => handleChange('department', e.target.value)}
                  >
                    <option value="">Select Department</option>
                    {getActiveDepartments().map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.designation || ''}
                    onChange={e => handleChange('designation', e.target.value)}
                    placeholder="e.g. Senior Developer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">System Role</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.role}
                    onChange={e => handleChange('role', e.target.value)}
                  >
                    {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Manager</label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.managerId || ''}
                    onChange={e => handleChange('managerId', e.target.value)}
                  >
                    <option value="">Select Manager</option>
                    {managers.length === 0 && <option disabled>No valid managers found</option>}
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.designation})</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h4 className="font-semibold text-slate-900">Compensation & Documents</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Annual CTC (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input 
                      type="number" 
                      className="w-full border border-slate-300 rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.salary || ''}
                      onChange={e => handleChange('salary', parseInt(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={e => setOfferLetter(e.target.files?.[0] || null)}
                  />
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                      <Upload size={24} />
                    </div>
                    {offerLetter ? (
                      <p className="font-medium text-indigo-600">{offerLetter.name}</p>
                    ) : (
                      <>
                        <p className="font-medium">Upload Offer Letter</p>
                        <p className="text-xs">PDF or DOCX up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between">
          {step > 1 ? (
            <button 
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-slate-600 font-medium hover:text-slate-900 flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <div></div>
          )}

          {step < 3 ? (
             <button 
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !formData.name} // Simple validation check
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 transition-colors shadow-lg shadow-emerald-200"
            >
              <Check size={16} /> Complete Onboarding
            </button>
          )}
        </div>
      </div>
    </div>
  );
};