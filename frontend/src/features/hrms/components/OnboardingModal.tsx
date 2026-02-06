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
  const [tempPassword, setTempPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user types
    if (validationErrors[field]) {
      setValidationErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Name is required';
    if (!formData.email?.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.joinDate) errors.joinDate = 'Joining date is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.department) errors.department = 'Department is required';
    if (!formData.designation?.trim()) errors.designation = 'Designation is required';
    if (!formData.managerId) errors.managerId = 'Reporting manager is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.salary || formData.salary <= 0) errors.salary = 'Salary must be greater than 0';
    if (!tempPassword || tempPassword.length < 8) errors.password = 'Password must be at least 8 characters';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    try {
      const newEmployee: Employee = {
        id: `EMP${Math.floor(Math.random() * 10000)}`, // Will be replaced by backend
        avatar: `https://ui-avatars.com/api/?name=${formData.name}&background=random`,
        status: 'Active',
        password: tempPassword,
        isNewUser: true,
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none ${validationErrors.name ? 'border-red-400' : 'border-slate-300'}`}
                    value={formData.name || ''}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="e.g. John Doe"
                    maxLength={100}
                  />
                  {validationErrors.name && <p className="text-xs text-red-500 mt-1">{validationErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none ${validationErrors.email ? 'border-red-400' : 'border-slate-300'}`}
                    value={formData.email || ''}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="john.doe@grx10.com"
                  />
                  {validationErrors.email && <p className="text-xs text-red-500 mt-1">{validationErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Joining Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none ${validationErrors.joinDate ? 'border-red-400' : 'border-slate-300'}`}
                    value={formData.joinDate}
                    min="2000-01-01"
                    max="2099-12-31"
                    onChange={e => handleChange('joinDate', e.target.value)}
                  />
                  {validationErrors.joinDate && <p className="text-xs text-red-500 mt-1">{validationErrors.joinDate}</p>}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h4 className="font-semibold text-slate-900">Role & Department</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                  <select
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none ${validationErrors.department ? 'border-red-400' : 'border-slate-300'}`}
                    value={formData.department || ''}
                    onChange={e => handleChange('department', e.target.value)}
                  >
                    <option value="">Select Department</option>
                    {getActiveDepartments().map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                  {validationErrors.department && <p className="text-xs text-red-500 mt-1">{validationErrors.department}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Designation <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none ${validationErrors.designation ? 'border-red-400' : 'border-slate-300'}`}
                    value={formData.designation || ''}
                    onChange={e => handleChange('designation', e.target.value)}
                    placeholder="e.g. Senior Developer"
                    maxLength={100}
                  />
                  {validationErrors.designation && <p className="text-xs text-red-500 mt-1">{validationErrors.designation}</p>}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Manager <span className="text-red-500">*</span></label>
                  <select
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none ${validationErrors.managerId ? 'border-red-400' : 'border-slate-300'}`}
                    value={formData.managerId || ''}
                    onChange={e => handleChange('managerId', e.target.value)}
                  >
                    <option value="">Select Manager</option>
                    {managers.length === 0 && <option disabled>No valid managers found</option>}
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.designation})</option>)}
                  </select>
                  {validationErrors.managerId && <p className="text-xs text-red-500 mt-1">{validationErrors.managerId}</p>}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h4 className="font-semibold text-slate-900">Compensation & Credentials</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Annual CTC (INR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">&#8377;</span>
                    <input
                      type="number"
                      className={`w-full border rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none ${validationErrors.salary ? 'border-red-400' : 'border-slate-300'}`}
                      value={formData.salary || ''}
                      onChange={e => handleChange('salary', parseInt(e.target.value) || 0)}
                      min={1}
                      placeholder="e.g. 600000"
                    />
                  </div>
                  {validationErrors.salary && <p className="text-xs text-red-500 mt-1">{validationErrors.salary}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none ${validationErrors.password ? 'border-red-400' : 'border-slate-300'}`}
                    value={tempPassword}
                    onChange={e => { setTempPassword(e.target.value); if (validationErrors.password) setValidationErrors(prev => { const n = { ...prev }; delete n.password; return n; }); }}
                    placeholder="Min 8 characters"
                    minLength={8}
                  />
                  {validationErrors.password && <p className="text-xs text-red-500 mt-1">{validationErrors.password}</p>}
                  <p className="text-xs text-slate-400 mt-1">Employee will be prompted to change this on first login.</p>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".pdf,.docx"
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
              onClick={handleNext}
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