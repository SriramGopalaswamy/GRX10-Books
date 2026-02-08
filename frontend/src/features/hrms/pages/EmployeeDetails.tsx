
import React, { useState, useEffect } from 'react';
import { Employee, HRMSRole as Role, LeaveType, LeaveStatus, View, EducationDetail, ExperienceDetail, SalaryBreakdown, LeaveEntitlement, Certification, HiringHistory, Dependent, TaxDeclaration } from '../../../shared/types';
import { ArrowLeft, Mail, Briefcase, Calendar, DollarSign, User, Clock, Shield, MapPin, Edit2, Save, FileText, Hash, X, Phone, Home, CreditCard, GraduationCap, Briefcase as BriefcaseIcon, Award, Plus, Trash2, Building2, Heart, Users, Banknote, Languages, Code, History, AlertCircle } from 'lucide-react';
import { MOCK_ATTENDANCE, MOCK_LEAVES, MOCK_EMPLOYEES } from '../../../shared/constants/app.constants';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useEmployees } from '../../../shared/contexts/EmployeeContext';
import { useConfiguration } from '../../../shared/contexts/ConfigurationContext';

interface EmployeeDetailsProps {
  employeeId: string;
  onBack?: () => void;
  onViewChange?: (view: View) => void;
}

export const EmployeeDetails: React.FC<EmployeeDetailsProps> = ({ employeeId, onBack, onViewChange }) => {
  const { user } = useAuth();
  const { employees, updateEmployee } = useEmployees();
  const { 
    getActiveDepartments, 
    getActivePositions, 
    getActiveEmployeeTypes, 
    getActiveRoles,
    getActiveWorkLocations 
  } = useConfiguration();
  
  const employee = employees.find(emp => emp.id === employeeId);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [activeSection, setActiveSection] = useState<string>('org');

  useEffect(() => {
    if (employee) {
      // Parse JSON fields if they exist as strings
      const parsedEmployee = {
        ...employee,
        educationDetails: employee.educationDetails 
          ? (typeof employee.educationDetails === 'string' 
              ? JSON.parse(employee.educationDetails) 
              : employee.educationDetails)
          : [],
        experienceDetails: employee.experienceDetails
          ? (typeof employee.experienceDetails === 'string'
              ? JSON.parse(employee.experienceDetails)
              : employee.experienceDetails)
          : [],
        salaryBreakdown: employee.salaryBreakdown
          ? (typeof employee.salaryBreakdown === 'string'
              ? JSON.parse(employee.salaryBreakdown)
              : employee.salaryBreakdown)
          : undefined,
        leaveEntitlements: employee.leaveEntitlements
          ? (typeof employee.leaveEntitlements === 'string'
              ? JSON.parse(employee.leaveEntitlements)
              : employee.leaveEntitlements)
          : undefined,
        certifications: employee.certifications
          ? (typeof employee.certifications === 'string'
              ? JSON.parse(employee.certifications)
              : employee.certifications)
          : [],
        skills: employee.skills
          ? (typeof employee.skills === 'string'
              ? JSON.parse(employee.skills)
              : employee.skills)
          : [],
        languages: employee.languages
          ? (typeof employee.languages === 'string'
              ? JSON.parse(employee.languages)
              : employee.languages)
          : [],
        dependents: employee.dependents
          ? (typeof employee.dependents === 'string'
              ? JSON.parse(employee.dependents)
              : employee.dependents)
          : [],
        taxDeclarations: employee.taxDeclarations
          ? (typeof employee.taxDeclarations === 'string'
              ? JSON.parse(employee.taxDeclarations)
              : employee.taxDeclarations)
          : undefined
      };
      setFormData(parsedEmployee);
      setIsEditing(false);
    }
  }, [employee]);

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-grx-muted dark:text-grx-muted mb-4">Employee not found</p>
          {onBack && (
            <button
              onClick={onBack}
              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={18} />
              Back to Employees
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mock data filtering for the selected employee
  const recentAttendance = MOCK_ATTENDANCE.filter(a => a.employeeId === employee.id).slice(0, 3);
  const recentLeaves = MOCK_LEAVES.filter(l => l.employeeId === employee.id).slice(0, 3);
  const manager = employees.find(e => e.id === (isEditing ? formData.managerId : employee.managerId));

  // Permission check for editing and sensitive info
  const canEdit = user?.role === Role.HR || user?.role === Role.ADMIN;
  const canViewSensitive = user?.role === Role.HR || user?.role === Role.ADMIN || user?.role === Role.FINANCE;

  const handleSave = async () => {
    if (employee.id) {
      try {
        // Stringify JSON fields before sending to backend
        const dataToSave = {
          ...formData,
          educationDetails: formData.educationDetails ? JSON.stringify(formData.educationDetails) : null,
          experienceDetails: formData.experienceDetails ? JSON.stringify(formData.experienceDetails) : null,
          salaryBreakdown: formData.salaryBreakdown ? JSON.stringify(formData.salaryBreakdown) : null,
          leaveEntitlements: formData.leaveEntitlements ? JSON.stringify(formData.leaveEntitlements) : null,
          certifications: formData.certifications ? JSON.stringify(formData.certifications) : null,
          skills: formData.skills ? JSON.stringify(formData.skills) : null,
          languages: formData.languages ? JSON.stringify(formData.languages) : null,
          dependents: formData.dependents ? JSON.stringify(formData.dependents) : null,
          taxDeclarations: formData.taxDeclarations ? JSON.stringify(formData.taxDeclarations) : null
        };
        await updateEmployee(employee.id, dataToSave);
        setIsEditing(false);
      } catch (error: any) {
        alert(error.message || 'Failed to update employee. Please try again.');
      }
    }
  };

  const handleChange = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (field: keyof Employee, index: number, nestedField: string, value: any) => {
    setFormData(prev => {
      const array = prev[field] as any[] || [];
      const updated = [...array];
      updated[index] = { ...updated[index], [nestedField]: value };
      return { ...prev, [field]: updated };
    });
  };

  const handleAddEducation = () => {
    const newEducation: EducationDetail = {
      level: 'Degree',
      institution: '',
      field: '',
      year: ''
    };
    setFormData(prev => ({
      ...prev,
      educationDetails: [...(prev.educationDetails || []), newEducation]
    }));
  };

  const handleRemoveEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      educationDetails: (prev.educationDetails || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddExperience = () => {
    const newExperience: ExperienceDetail = {
      company: '',
      position: '',
      startDate: '',
      endDate: ''
    };
    setFormData(prev => ({
      ...prev,
      experienceDetails: [...(prev.experienceDetails || []), newExperience]
    }));
  };

  const handleRemoveExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experienceDetails: (prev.experienceDetails || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddCertification = () => {
    const newCert: Certification = {
      name: '',
      issuer: '',
      issueDate: '',
      isMandatory: false
    };
    setFormData(prev => ({
      ...prev,
      certifications: [...(prev.certifications || []), newCert]
    }));
  };

  const handleRemoveCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: (prev.certifications || []).filter((_, i) => i !== index)
    }));
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onViewChange) {
      onViewChange(View.EMPLOYEES);
    }
  };

  const sections = [
    { id: 'org', label: 'Organization', icon: Briefcase },
    { id: 'personal', label: 'Personal Details', icon: User },
    { id: 'contact', label: 'Emergency & Bank', icon: AlertCircle },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'experience', label: 'Experience', icon: BriefcaseIcon },
    { id: 'salary', label: 'Salary Details', icon: DollarSign },
    { id: 'leave', label: 'Leave Details', icon: Calendar },
    { id: 'certifications', label: 'Certifications', icon: Award },
    { id: 'additional', label: 'Additional Info', icon: FileText },
    { id: 'history', label: 'Hiring History', icon: History }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'org':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Employee ID</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.id || ''}
                    disabled
                  />
                ) : (
                  <p className="text-grx-text dark:text-white font-mono">{employee.id}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Department</label>
                {isEditing ? (
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.department || ''}
                    onChange={e => handleChange('department', e.target.value)}
                  >
                    <option value="">Select Department</option>
                    {getActiveDepartments().map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-grx-text dark:text-white">{employee.department}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Employee Position/Role</label>
                {isEditing ? (
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.employeePosition || ''}
                    onChange={e => handleChange('employeePosition', e.target.value)}
                  >
                    <option value="">Select Position</option>
                    {getActivePositions().map(pos => (
                      <option key={pos.id} value={pos.name}>{pos.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.employeePosition || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Designation</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.designation || ''}
                    onChange={e => handleChange('designation', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{employee.designation}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Employee Type</label>
                {isEditing ? (
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.employeeType || ''}
                    onChange={e => handleChange('employeeType', e.target.value)}
                  >
                    <option value="">Select Employee Type</option>
                    {getActiveEmployeeTypes().map(type => (
                      <option key={type.id} value={type.name}>{type.name}</option>
                    ))}
                    {/* Fallback if no types configured */}
                    {getActiveEmployeeTypes().length === 0 && (
                      <>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Contract">Contract</option>
                      </>
                    )}
                  </select>
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.employeeType || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Status</label>
                {isEditing ? (
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.status || 'Active'}
                    onChange={e => handleChange('status', e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                ) : (
                  <p className="text-grx-text dark:text-white">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      formData.status === 'Active' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {formData.status || 'Active'}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Joining Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.joinDate || ''}
                    onChange={e => handleChange('joinDate', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.joinDate ? new Date(formData.joinDate).toLocaleDateString() : 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Termination Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.terminationDate || ''}
                    onChange={e => handleChange('terminationDate', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.terminationDate ? new Date(formData.terminationDate).toLocaleDateString() : 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Manager</label>
                {isEditing ? (
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.managerId || ''}
                    onChange={e => handleChange('managerId', e.target.value)}
                  >
                    <option value="">Select Manager</option>
                    {employees.filter(e => e.id !== employee.id && e.status === 'Active').map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.designation})</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-grx-text dark:text-white">{manager?.name || 'Not assigned'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Work Location</label>
                {isEditing ? (
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.workLocation || ''}
                    onChange={e => handleChange('workLocation', e.target.value)}
                  >
                    <option value="">Select Work Location</option>
                    {getActiveWorkLocations().map(loc => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.workLocation || 'Not provided'}</p>
                )}
              </div>
              {formData.isRehired && (
                <div className="md:col-span-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={18} className="text-amber-600" />
                      <span className="font-semibold text-amber-900">Rehired Employee</span>
                    </div>
                    <p className="text-sm text-amber-700">
                      This employee was previously terminated and has been rehired. Previous Employee ID: {formData.previousEmployeeId || 'N/A'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'personal':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.name || ''}
                    onChange={e => handleChange('name', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{employee.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.dateOfBirth || ''}
                    onChange={e => handleChange('dateOfBirth', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.dateOfBirth || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.email || ''}
                    onChange={e => handleChange('email', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{employee.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.phone || ''}
                    onChange={e => handleChange('phone', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.phone || 'Not provided'}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Address</label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.address || ''}
                    onChange={e => handleChange('address', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.address || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">PAN</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full border border-grx-primary-100 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                    value={formData.pan || ''}
                    onChange={e => handleChange('pan', e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.pan || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Aadhar</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.aadhar || ''}
                    onChange={e => handleChange('aadhar', e.target.value)}
                    maxLength={12}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.aadhar || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">PF Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.pfNumber || ''}
                    onChange={e => handleChange('pfNumber', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.pfNumber || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'education':
        return (
          <div className="space-y-4">
            {(formData.educationDetails || []).map((edu, index) => (
              <div key={index} className="border border-grx-primary-100 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-semibold text-grx-text">Education {index + 1}</h4>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveEducation(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Level</label>
                    {isEditing ? (
                      <select
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={edu.level}
                        onChange={e => handleNestedChange('educationDetails', index, 'level', e.target.value)}
                      >
                        <option value="10th">10th</option>
                        <option value="12th">12th</option>
                        <option value="Degree">Degree</option>
                        <option value="Post Graduate">Post Graduate</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="text-grx-text dark:text-white">{edu.level}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Institution</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={edu.institution}
                        onChange={e => handleNestedChange('educationDetails', index, 'institution', e.target.value)}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{edu.institution}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Field of Study</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={edu.field}
                        onChange={e => handleNestedChange('educationDetails', index, 'field', e.target.value)}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{edu.field}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Year</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={edu.year}
                        onChange={e => handleNestedChange('educationDetails', index, 'year', e.target.value)}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{edu.year}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Percentage/Grade</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={edu.percentage || edu.grade || ''}
                        onChange={e => {
                          const isNumeric = !isNaN(parseFloat(e.target.value));
                          if (isNumeric) {
                            handleNestedChange('educationDetails', index, 'percentage', parseFloat(e.target.value));
                          } else {
                            handleNestedChange('educationDetails', index, 'grade', e.target.value);
                          }
                        }}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{edu.percentage ? `${edu.percentage}%` : edu.grade || 'N/A'}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isEditing && (
              <button
                onClick={handleAddEducation}
                className="w-full border-2 border-dashed border-grx-primary-100 rounded-lg p-4 text-grx-muted hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add Education
              </button>
            )}
            {(!formData.educationDetails || formData.educationDetails.length === 0) && !isEditing && (
              <p className="text-grx-muted text-center py-8">No education details added</p>
            )}
          </div>
        );

      case 'experience':
        return (
          <div className="space-y-4">
            {(formData.experienceDetails || []).map((exp, index) => (
              <div key={index} className="border border-grx-primary-100 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-semibold text-grx-text">Experience {index + 1}</h4>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveExperience(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Company</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={exp.company}
                        onChange={e => handleNestedChange('experienceDetails', index, 'company', e.target.value)}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{exp.company}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Position</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={exp.position}
                        onChange={e => handleNestedChange('experienceDetails', index, 'position', e.target.value)}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{exp.position}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Start Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={exp.startDate}
                        onChange={e => handleNestedChange('experienceDetails', index, 'startDate', e.target.value)}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{exp.startDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">End Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={exp.endDate}
                        onChange={e => handleNestedChange('experienceDetails', index, 'endDate', e.target.value)}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{exp.endDate}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Responsibilities</label>
                    {isEditing ? (
                      <textarea
                        rows={3}
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={exp.responsibilities || ''}
                        onChange={e => handleNestedChange('experienceDetails', index, 'responsibilities', e.target.value)}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{exp.responsibilities || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isEditing && (
              <button
                onClick={handleAddExperience}
                className="w-full border-2 border-dashed border-grx-primary-100 rounded-lg p-4 text-grx-muted hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add Experience
              </button>
            )}
            {(!formData.experienceDetails || formData.experienceDetails.length === 0) && !isEditing && (
              <p className="text-grx-muted text-center py-8">No experience details added</p>
            )}
          </div>
        );

      case 'salary':
        return (
          <div className="space-y-6">
            {canViewSensitive ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Base Salary</label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted">₹</span>
                      <input
                        type="number"
                        className="w-full border border-grx-primary-100 rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.salaryBreakdown?.base || ''}
                        onChange={e => handleChange('salaryBreakdown', {
                          ...formData.salaryBreakdown,
                          base: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                  ) : (
                    <p className="text-grx-text dark:text-white">₹{formData.salaryBreakdown?.base?.toLocaleString() || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">HRA</label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted">₹</span>
                      <input
                        type="number"
                        className="w-full border border-grx-primary-100 rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.salaryBreakdown?.hra || ''}
                        onChange={e => handleChange('salaryBreakdown', {
                          ...formData.salaryBreakdown,
                          hra: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                  ) : (
                    <p className="text-grx-text dark:text-white">₹{formData.salaryBreakdown?.hra?.toLocaleString() || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Special Allowance</label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted">₹</span>
                      <input
                        type="number"
                        className="w-full border border-grx-primary-100 rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.salaryBreakdown?.specialAllowance || ''}
                        onChange={e => handleChange('salaryBreakdown', {
                          ...formData.salaryBreakdown,
                          specialAllowance: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                  ) : (
                    <p className="text-grx-text dark:text-white">₹{formData.salaryBreakdown?.specialAllowance?.toLocaleString() || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">PF</label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted">₹</span>
                      <input
                        type="number"
                        className="w-full border border-grx-primary-100 rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.salaryBreakdown?.pf || ''}
                        onChange={e => handleChange('salaryBreakdown', {
                          ...formData.salaryBreakdown,
                          pf: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                  ) : (
                    <p className="text-grx-text dark:text-white">₹{formData.salaryBreakdown?.pf?.toLocaleString() || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">ESI (if applicable)</label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted">₹</span>
                      <input
                        type="number"
                        className="w-full border border-grx-primary-100 rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.salaryBreakdown?.esi || ''}
                        onChange={e => handleChange('salaryBreakdown', {
                          ...formData.salaryBreakdown,
                          esi: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                  ) : (
                    <p className="text-grx-text dark:text-white">₹{formData.salaryBreakdown?.esi?.toLocaleString() || 'Not applicable'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Professional Tax</label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted">₹</span>
                      <input
                        type="number"
                        className="w-full border border-grx-primary-100 rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.salaryBreakdown?.professionalTax || ''}
                        onChange={e => handleChange('salaryBreakdown', {
                          ...formData.salaryBreakdown,
                          professionalTax: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                  ) : (
                    <p className="text-grx-text dark:text-white">₹{formData.salaryBreakdown?.professionalTax?.toLocaleString() || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Other Deductions</label>
                  {isEditing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted">₹</span>
                      <input
                        type="number"
                        className="w-full border border-grx-primary-100 rounded-lg pl-8 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.salaryBreakdown?.otherDeductions || ''}
                        onChange={e => handleChange('salaryBreakdown', {
                          ...formData.salaryBreakdown,
                          otherDeductions: parseFloat(e.target.value) || 0
                        })}
                      />
                    </div>
                  ) : (
                    <p className="text-grx-text dark:text-white">₹{formData.salaryBreakdown?.otherDeductions?.toLocaleString() || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Gross Salary</label>
                  <p className="text-grx-text font-semibold">
                    ₹{((formData.salaryBreakdown?.base || 0) + (formData.salaryBreakdown?.hra || 0) + (formData.salaryBreakdown?.specialAllowance || 0)).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Net Salary</label>
                  <p className="text-grx-text font-semibold">
                    ₹{((formData.salaryBreakdown?.base || 0) + (formData.salaryBreakdown?.hra || 0) + (formData.salaryBreakdown?.specialAllowance || 0) - (formData.salaryBreakdown?.pf || 0) - (formData.salaryBreakdown?.esi || 0) - (formData.salaryBreakdown?.professionalTax || 0) - (formData.salaryBreakdown?.otherDeductions || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-grx-muted text-center py-8">You don't have permission to view salary details</p>
            )}
          </div>
        );

      case 'leave':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Casual Leave</label>
                {isEditing ? (
                  <input
                    type="number"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.leaveEntitlements?.casual || ''}
                    onChange={e => handleChange('leaveEntitlements', {
                      ...formData.leaveEntitlements,
                      casual: parseInt(e.target.value) || 0
                    })}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.leaveEntitlements?.casual || 0} days</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Sick Leave</label>
                {isEditing ? (
                  <input
                    type="number"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.leaveEntitlements?.sick || ''}
                    onChange={e => handleChange('leaveEntitlements', {
                      ...formData.leaveEntitlements,
                      sick: parseInt(e.target.value) || 0
                    })}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.leaveEntitlements?.sick || 0} days</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Earned Leave</label>
                {isEditing ? (
                  <input
                    type="number"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.leaveEntitlements?.earned || ''}
                    onChange={e => handleChange('leaveEntitlements', {
                      ...formData.leaveEntitlements,
                      earned: parseInt(e.target.value) || 0
                    })}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.leaveEntitlements?.earned || 0} days</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Maternity Leave</label>
                {isEditing ? (
                  <input
                    type="number"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.leaveEntitlements?.maternity || ''}
                    onChange={e => handleChange('leaveEntitlements', {
                      ...formData.leaveEntitlements,
                      maternity: parseInt(e.target.value) || 0
                    })}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.leaveEntitlements?.maternity || 0} days</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Paternity Leave</label>
                {isEditing ? (
                  <input
                    type="number"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.leaveEntitlements?.paternity || ''}
                    onChange={e => handleChange('leaveEntitlements', {
                      ...formData.leaveEntitlements,
                      paternity: parseInt(e.target.value) || 0
                    })}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.leaveEntitlements?.paternity || 0} days</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Comp Off</label>
                {isEditing ? (
                  <input
                    type="number"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.leaveEntitlements?.compOff || ''}
                    onChange={e => handleChange('leaveEntitlements', {
                      ...formData.leaveEntitlements,
                      compOff: parseInt(e.target.value) || 0
                    })}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.leaveEntitlements?.compOff || 0} days</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'certifications':
        return (
          <div className="space-y-4">
            {(formData.certifications || []).map((cert, index) => (
              <div key={index} className="border border-grx-primary-100 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-grx-text">{cert.name || 'Untitled Certification'}</h4>
                    {cert.isMandatory && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Mandatory</span>
                    )}
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveCertification(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Certification Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={cert.name}
                        onChange={e => {
                          const updated = [...(formData.certifications || [])];
                          updated[index] = { ...updated[index], name: e.target.value };
                          handleChange('certifications', updated);
                        }}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{cert.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Issuer</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={cert.issuer}
                        onChange={e => {
                          const updated = [...(formData.certifications || [])];
                          updated[index] = { ...updated[index], issuer: e.target.value };
                          handleChange('certifications', updated);
                        }}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{cert.issuer}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Issue Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={cert.issueDate}
                        onChange={e => {
                          const updated = [...(formData.certifications || [])];
                          updated[index] = { ...updated[index], issueDate: e.target.value };
                          handleChange('certifications', updated);
                        }}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{cert.issueDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Expiry Date (if applicable)</label>
                    {isEditing ? (
                      <input
                        type="date"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={cert.expiryDate || ''}
                        onChange={e => {
                          const updated = [...(formData.certifications || [])];
                          updated[index] = { ...updated[index], expiryDate: e.target.value };
                          handleChange('certifications', updated);
                        }}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{cert.expiryDate || 'No expiry'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Certificate Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                        value={cert.certificateNumber || ''}
                        onChange={e => {
                          const updated = [...(formData.certifications || [])];
                          updated[index] = { ...updated[index], certificateNumber: e.target.value };
                          handleChange('certifications', updated);
                        }}
                      />
                    ) : (
                      <p className="text-grx-text dark:text-white">{cert.certificateNumber || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Mandatory</label>
                    {isEditing ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          checked={cert.isMandatory}
                          onChange={e => {
                            const updated = [...(formData.certifications || [])];
                            updated[index] = { ...updated[index], isMandatory: e.target.checked };
                            handleChange('certifications', updated);
                          }}
                        />
                        <span className="text-sm text-grx-text">Required for role</span>
                      </label>
                    ) : (
                      <p className="text-grx-text dark:text-white">{cert.isMandatory ? 'Yes' : 'No'}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isEditing && (
              <button
                onClick={handleAddCertification}
                className="w-full border-2 border-dashed border-grx-primary-100 rounded-lg p-4 text-grx-muted hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                Add Certification
              </button>
            )}
            {(!formData.certifications || formData.certifications.length === 0) && !isEditing && (
              <p className="text-grx-muted text-center py-8">No certifications added</p>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-semibold text-grx-text mb-4 flex items-center gap-2">
                <AlertCircle size={18} />
                Emergency Contact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Contact Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                      value={formData.emergencyContactName || ''}
                      onChange={e => handleChange('emergencyContactName', e.target.value)}
                    />
                  ) : (
                    <p className="text-grx-text dark:text-white">{formData.emergencyContactName || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Relationship</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                      value={formData.emergencyContactRelation || ''}
                      onChange={e => handleChange('emergencyContactRelation', e.target.value)}
                      placeholder="e.g. Spouse, Parent, Sibling"
                    />
                  ) : (
                    <p className="text-grx-text dark:text-white">{formData.emergencyContactRelation || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Contact Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                      value={formData.emergencyContactPhone || ''}
                      onChange={e => handleChange('emergencyContactPhone', e.target.value)}
                    />
                  ) : (
                    <p className="text-grx-text dark:text-white">{formData.emergencyContactPhone || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold text-grx-text mb-4 flex items-center gap-2">
                <Banknote size={18} />
                Bank Account Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Account Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                      value={formData.bankAccountNumber || ''}
                      onChange={e => handleChange('bankAccountNumber', e.target.value)}
                    />
                  ) : (
                    <p className="text-grx-text font-mono">{formData.bankAccountNumber || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">IFSC Code</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full border border-grx-primary-100 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                      value={formData.bankIFSC || ''}
                      onChange={e => handleChange('bankIFSC', e.target.value.toUpperCase())}
                      maxLength={11}
                    />
                  ) : (
                    <p className="text-grx-text font-mono">{formData.bankIFSC || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Bank Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                      value={formData.bankName || ''}
                      onChange={e => handleChange('bankName', e.target.value)}
                    />
                  ) : (
                    <p className="text-grx-text dark:text-white">{formData.bankName || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Branch</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                      value={formData.bankBranch || ''}
                      onChange={e => handleChange('bankBranch', e.target.value)}
                    />
                  ) : (
                    <p className="text-grx-text dark:text-white">{formData.bankBranch || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'additional':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Blood Group</label>
                {isEditing ? (
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.bloodGroup || ''}
                    onChange={e => handleChange('bloodGroup', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.bloodGroup || 'Not provided'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Marital Status</label>
                {isEditing ? (
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.maritalStatus || ''}
                    onChange={e => handleChange('maritalStatus', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.maritalStatus || 'Not provided'}</p>
                )}
              </div>
              {formData.maritalStatus === 'Married' && (
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Spouse Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                      value={formData.spouseName || ''}
                      onChange={e => handleChange('spouseName', e.target.value)}
                    />
                  ) : (
                    <p className="text-grx-text dark:text-white">{formData.spouseName || 'Not provided'}</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Probation End Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.probationEndDate || ''}
                    onChange={e => handleChange('probationEndDate', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.probationEndDate ? new Date(formData.probationEndDate).toLocaleDateString() : 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Notice Period (Days)</label>
                {isEditing ? (
                  <input
                    type="number"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.noticePeriod || 30}
                    onChange={e => handleChange('noticePeriod', parseInt(e.target.value) || 30)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.noticePeriod || 30} days</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Last Working Day</label>
                {isEditing ? (
                  <input
                    type="date"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.lastWorkingDay || ''}
                    onChange={e => handleChange('lastWorkingDay', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.lastWorkingDay ? new Date(formData.lastWorkingDay).toLocaleDateString() : 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Exit Interview Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.exitInterviewDate || ''}
                    onChange={e => handleChange('exitInterviewDate', e.target.value)}
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{formData.exitInterviewDate ? new Date(formData.exitInterviewDate).toLocaleDateString() : 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Referred By</label>
                {isEditing ? (
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData.employeeReferralId || ''}
                    onChange={e => handleChange('employeeReferralId', e.target.value)}
                  >
                    <option value="">None</option>
                    {employees.filter(e => e.id !== employee.id).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-grx-text dark:text-white">
                    {formData.employeeReferralId 
                      ? employees.find(e => e.id === formData.employeeReferralId)?.name || 'Unknown'
                      : 'None'}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Skills</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={(formData.skills || []).join(', ')}
                    onChange={e => handleChange('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="e.g. React, Node.js, Python (comma separated)"
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{(formData.skills || []).join(', ') || 'Not provided'}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Languages Known</label>
                {isEditing ? (
                  <input
                    type="text"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={(formData.languages || []).join(', ')}
                    onChange={e => handleChange('languages', e.target.value.split(',').map(l => l.trim()).filter(Boolean))}
                    placeholder="e.g. English, Hindi, Tamil (comma separated)"
                  />
                ) : (
                  <p className="text-grx-text dark:text-white">{(formData.languages || []).join(', ') || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="space-y-4">
            {formData.isRehired && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <History size={18} className="text-blue-600" />
                  <span className="font-semibold text-blue-900">Rehired Employee</span>
                </div>
                <p className="text-sm text-blue-700">
                  This employee has been rehired. Previous employment history is preserved below.
                </p>
              </div>
            )}
            {(formData.hiringHistory || []).length > 0 ? (
              <div className="space-y-4">
                {formData.hiringHistory?.map((history, index) => (
                  <div key={index} className="border border-grx-primary-100 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-grx-text">
                          {history.isRehire ? 'Rehire' : 'Initial Hire'} - {history.department}
                        </h4>
                        <p className="text-sm text-grx-muted">{history.employeePosition} - {history.designation}</p>
                      </div>
                      {history.isRehire && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Rehire</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-grx-muted">Hire Date:</span>
                        <span className="ml-2 text-grx-text">{new Date(history.hireDate).toLocaleDateString()}</span>
                      </div>
                      {history.terminationDate && (
                        <div>
                          <span className="text-grx-muted">Termination Date:</span>
                          <span className="ml-2 text-grx-text">{new Date(history.terminationDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-grx-muted">Employee Type:</span>
                        <span className="ml-2 text-grx-text">{history.employeeType}</span>
                      </div>
                      {history.salary && (
                        <div>
                          <span className="text-grx-muted">Salary:</span>
                          <span className="ml-2 text-grx-text">₹{history.salary.toLocaleString()}</span>
                        </div>
                      )}
                      {history.reasonForTermination && (
                        <div className="md:col-span-2">
                          <span className="text-grx-muted">Termination Reason:</span>
                          <span className="ml-2 text-grx-text">{history.reasonForTermination}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-grx-muted text-center py-8">No hiring history available</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-grx-muted hover:text-grx-text transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Employees</span>
        </button>
        {canEdit && (
          <div className="flex gap-2">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Edit2 size={18} />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data
                    const parsedEmployee = {
                      ...employee,
                      educationDetails: employee.educationDetails 
                        ? (typeof employee.educationDetails === 'string' 
                            ? JSON.parse(employee.educationDetails) 
                            : employee.educationDetails)
                        : [],
                      experienceDetails: employee.experienceDetails
                        ? (typeof employee.experienceDetails === 'string'
                            ? JSON.parse(employee.experienceDetails)
                            : employee.experienceDetails)
                        : [],
                      salaryBreakdown: employee.salaryBreakdown
                        ? (typeof employee.salaryBreakdown === 'string'
                            ? JSON.parse(employee.salaryBreakdown)
                            : employee.salaryBreakdown)
                        : undefined,
                      leaveEntitlements: employee.leaveEntitlements
                        ? (typeof employee.leaveEntitlements === 'string'
                            ? JSON.parse(employee.leaveEntitlements)
                            : employee.leaveEntitlements)
                        : undefined,
                      certifications: employee.certifications
                        ? (typeof employee.certifications === 'string'
                            ? JSON.parse(employee.certifications)
                            : employee.certifications)
                        : []
                    };
                    setFormData(parsedEmployee);
                  }}
                  className="bg-grx-primary-100 dark:bg-grx-primary-800 hover:bg-grx-primary-200 dark:hover:bg-grx-primary-700 text-grx-text dark:text-grx-primary-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <X size={18} />
                  <span>Cancel</span>
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save size={18} />
                  <span>Save</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
          <img 
            src={employee.avatar} 
            alt={employee.name} 
            className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white object-cover"
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{employee.name}</h2>
            <p className="text-lg text-white/90">{employee.designation}</p>
          </div>
          <div className="flex gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
              employee.status === 'Active' 
                ? 'bg-emerald-500/20 text-white border-emerald-300/50' 
                : 'bg-rose-500/20 text-white border-rose-300/50'
            }`}>
              {employee.status}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
              {employee.role}
            </span>
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 p-4">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-grx-primary-50 dark:bg-grx-primary-800 text-grx-text dark:text-grx-primary-200 hover:bg-grx-primary-100 dark:hover:bg-grx-primary-700'
                }`}
              >
                <Icon size={18} />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Content */}
      <div className="bg-white rounded-xl shadow-sm border border-grx-primary-100 p-6">
        <h3 className="text-lg font-bold text-grx-text dark:text-white mb-6 flex items-center gap-2">
          {React.createElement(sections.find(s => s.id === activeSection)?.icon || User, { size: 20, className: "text-indigo-600" })}
          {sections.find(s => s.id === activeSection)?.label}
        </h3>
        {renderSection()}
      </div>
    </div>
  );
};
