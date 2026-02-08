
import React, { useState, useRef } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useEmployees } from '../../../shared/contexts/EmployeeContext';
import { HRMSRole as Role, Employee, View } from '../../../shared/types';
import { Search, Plus, Briefcase, Mail, FileText, Upload, ArrowLeft } from 'lucide-react';
import { generateJobDescription } from '../../../shared/services/gemini/geminiService';
import { OnboardingModal } from '../components/OnboardingModal';

interface EmployeesProps {
  onViewChange?: (view: View, employeeId?: string) => void;
}

export const Employees: React.FC<EmployeesProps> = ({ onViewChange }) => {
  const { user } = useAuth();
  const { employees, addEmployee } = useEmployees();
  const [searchTerm, setSearchTerm] = useState('');
  const [showJDModal, setShowJDModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // JD Generator State
  const [jdRole, setJdRole] = useState('');
  const [jdDept, setJdDept] = useState('');
  const [jdSkills, setJdSkills] = useState('');
  const [generatedJD, setGeneratedJD] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGenerateJD = async () => {
    setIsGenerating(true);
    const result = await generateJobDescription(jdRole, jdDept, jdSkills);
    setGeneratedJD(result);
    setIsGenerating(false);
  };

  const handleRowClick = (employeeId: string) => {
    if (onViewChange) {
      onViewChange(View.EMPLOYEE_DETAILS, employeeId);
    }
  };

  const handleImportEmployees = () => {
    fileInputRef.current?.click();
  };

  const parseCSV = (text: string): Partial<Employee>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const importedEmployees: Partial<Employee>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length < 2) continue;

      const nameIndex = headers.findIndex(h => h.includes('name'));
      const emailIndex = headers.findIndex(h => h.includes('email'));
      const designationIndex = headers.findIndex(h => h.includes('designation') || h.includes('position'));
      const deptIndex = headers.findIndex(h => h.includes('department') || h.includes('dept'));
      const roleIndex = headers.findIndex(h => h === 'role' && !h.includes('designation') && !h.includes('position'));
      const statusIndex = headers.findIndex(h => h.includes('status'));
      const joinDateIndex = headers.findIndex(h => h.includes('join') || h.includes('date'));
      const salaryIndex = headers.findIndex(h => h.includes('salary') || h.includes('ctc'));

      const employeeData: Partial<Employee> = {
        name: values[nameIndex] || `Employee ${i}`,
        email: values[emailIndex] || `emp${i}@grx10.com`,
        designation: values[designationIndex] || 'Employee',
        department: values[deptIndex] || 'General',
        role: (values[roleIndex] as Role) || Role.EMPLOYEE,
        status: (values[statusIndex] || 'Active') as 'Active' | 'Exited',
        joinDate: values[joinDateIndex] || new Date().toISOString().split('T')[0],
        salary: values[salaryIndex] ? parseFloat(values[salaryIndex]) : 0,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(values[nameIndex] || `Employee ${i}`)}&background=random`,
        managerId: ''
      };

      importedEmployees.push(employeeData);
    }
    
    return importedEmployees;
  };

  const parseExcel = async (file: File): Promise<Partial<Employee>[]> => {
    // Dynamic import of xlsx library
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) return [];
    
    const headers = (jsonData[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
    const importedEmployees: Partial<Employee>[] = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] || [];
      if (row.length < 2) continue;

      const nameIndex = headers.findIndex(h => h.includes('name'));
      const emailIndex = headers.findIndex(h => h.includes('email'));
      const designationIndex = headers.findIndex(h => h.includes('designation') || h.includes('position'));
      const deptIndex = headers.findIndex(h => h.includes('department') || h.includes('dept'));
      const roleIndex = headers.findIndex(h => h === 'role' && !h.includes('designation') && !h.includes('position'));
      const statusIndex = headers.findIndex(h => h.includes('status'));
      const joinDateIndex = headers.findIndex(h => h.includes('join') || h.includes('date'));
      const salaryIndex = headers.findIndex(h => h.includes('salary') || h.includes('ctc'));

      const getValue = (index: number) => {
        if (index === -1 || !row[index]) return '';
        const val = row[index];
        if (val instanceof Date) {
          return val.toISOString().split('T')[0];
        }
        return String(val || '').trim();
      };

      const employeeData: Partial<Employee> = {
        name: getValue(nameIndex) || `Employee ${i}`,
        email: getValue(emailIndex) || `emp${i}@grx10.com`,
        designation: getValue(designationIndex) || 'Employee',
        department: getValue(deptIndex) || 'General',
        role: (getValue(roleIndex) as Role) || Role.EMPLOYEE,
        status: (getValue(statusIndex) || 'Active') as 'Active' | 'Exited',
        joinDate: getValue(joinDateIndex) || new Date().toISOString().split('T')[0],
        salary: getValue(salaryIndex) ? parseFloat(getValue(salaryIndex)) : 0,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(getValue(nameIndex) || `Employee ${i}`)}&background=random`,
        managerId: ''
      };

      importedEmployees.push(employeeData);
    }
    
    return importedEmployees;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let importedEmployees: Partial<Employee>[] = [];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        // Parse CSV
        const text = await file.text();
        importedEmployees = parseCSV(text);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel
        importedEmployees = await parseExcel(file);
      } else {
        alert('Unsupported file format. Please use CSV or Excel (.xlsx, .xls) files.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      if (importedEmployees.length === 0) {
        alert('No valid employee data found in the file. Please check the file format.');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Import employees via backend API
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const empData of importedEmployees) {
        try {
          await addEmployee(empData as Employee);
          successCount++;
        } catch (err: any) {
          console.error('Error importing employee:', empData.email, err);
          errorCount++;
          errors.push(`${empData.email || empData.name}: ${err.message || 'Unknown error'}`);
        }
      }

      if (successCount > 0) {
        const message = `Successfully imported ${successCount} employee(s).${errorCount > 0 ? `\n\n${errorCount} failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}` : ''}`;
        alert(message);
      } else {
        alert(`Failed to import employees. Errors:\n${errors.slice(0, 10).join('\n')}`);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Failed to import employees: ${error.message || 'Unknown error'}. Please check the file format.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-grx-text dark:text-white">Employee Directory</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowOnboarding(true)}
            className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            New Employee
          </button>
          <button 
            onClick={handleImportEmployees}
            className="bg-white dark:bg-grx-dark-surface border border-grx-primary-100 dark:border-grx-primary-800 text-grx-text dark:text-grx-primary-200 px-4 py-2 rounded-lg hover:bg-grx-bg dark:hover:bg-grx-primary-800 flex items-center gap-2 transition-colors"
          >
            <Upload size={18} />
            Import Employees
          </button>
          {(user?.role === Role.HR || user?.role === Role.ADMIN) && (
            <button 
              onClick={() => setShowJDModal(true)}
              className="bg-white dark:bg-grx-dark-surface border border-grx-primary-100 dark:border-grx-primary-800 text-grx-text dark:text-grx-primary-200 px-4 py-2 rounded-lg hover:bg-grx-bg dark:hover:bg-grx-primary-800 flex items-center gap-2 transition-colors"
            >
              <FileText size={18} />
              Generate JD
            </button>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xlsx,.xls"
        className="hidden"
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-grx-muted dark:text-grx-muted" size={20} />
        <input 
          type="text" 
          placeholder="Search by name, email, department, or designation..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800 bg-white dark:bg-grx-dark-surface text-grx-text dark:text-white placeholder:text-grx-muted dark:placeholder:text-grx-muted focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table View */}
      <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase tracking-wider">Join Date</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-grx-dark-surface divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-grx-muted dark:text-grx-muted">
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr 
                    key={emp.id} 
                    onClick={() => handleRowClick(emp.id)}
                    className="hover:bg-indigo-50 dark:hover:bg-grx-primary-800 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover mr-3" />
                        <div>
                          <div className="text-sm font-medium text-grx-text dark:text-white">{emp.name}</div>
                          <div className="text-sm text-grx-muted dark:text-grx-muted">{emp.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-grx-muted dark:text-grx-primary-200">
                        <Briefcase size={16} className="mr-2 text-grx-muted dark:text-grx-muted" />
                        {emp.department}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-grx-muted dark:text-grx-primary-200">
                        <Mail size={16} className="mr-2 text-grx-muted dark:text-grx-muted" />
                        {emp.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-md bg-grx-primary-50 dark:bg-grx-primary-800 text-grx-text dark:text-grx-primary-200">
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.status === 'Active' 
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-grx-muted dark:text-grx-primary-200">
                      {new Date(emp.joinDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />

      {/* JD Generator Modal */}
      {showJDModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-grx-dark-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4 text-grx-text dark:text-white">AI Job Description Generator</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">Role Title</label>
                <input 
                  className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2" 
                  value={jdRole} 
                  onChange={e => setJdRole(e.target.value)} 
                  placeholder="e.g. Senior React Dev"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">Department</label>
                <input 
                  className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2" 
                  value={jdDept} 
                  onChange={e => setJdDept(e.target.value)} 
                  placeholder="e.g. Engineering"
                />
              </div>
            </div>
            <div className="mb-4">
               <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">Key Skills</label>
               <input 
                  className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2" 
                  value={jdSkills} 
                  onChange={e => setJdSkills(e.target.value)} 
                  placeholder="e.g. React, TypeScript, Node.js, AWS"
                />
            </div>

            <div className="flex justify-end gap-2 mb-4">
              <button onClick={() => setShowJDModal(false)} className="text-grx-muted dark:text-grx-muted px-4 py-2">Cancel</button>
              <button 
                onClick={handleGenerateJD} 
                disabled={isGenerating || !jdRole}
                className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate with Gemini'}
              </button>
            </div>

            {generatedJD && (
              <div className="bg-grx-bg dark:bg-grx-dark p-4 rounded-lg border border-grx-primary-100 dark:border-grx-primary-800 mt-4">
                <pre className="whitespace-pre-wrap text-sm font-mono text-grx-text dark:text-grx-primary-200">{generatedJD}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
