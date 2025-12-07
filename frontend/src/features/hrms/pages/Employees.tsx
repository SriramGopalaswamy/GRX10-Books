
import React, { useState } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useEmployees } from '../../../shared/contexts/EmployeeContext';
import { HRMSRole as Role, Employee } from '../../../shared/types';
import { Search, Plus, Briefcase, MapPin, Mail, FileText, ChevronRight } from 'lucide-react';
import { generateJobDescription } from '../../../shared/services/gemini/geminiService';
import { OnboardingModal } from '../components/OnboardingModal';
import { EmployeeDetailsModal } from '../components/EmployeeDetailsModal';

export const Employees: React.FC = () => {
  const { user } = useAuth();
  const { employees } = useEmployees();
  const [searchTerm, setSearchTerm] = useState('');
  const [showJDModal, setShowJDModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // JD Generator State
  const [jdRole, setJdRole] = useState('');
  const [jdDept, setJdDept] = useState('');
  const [jdSkills, setJdSkills] = useState('');
  const [generatedJD, setGeneratedJD] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGenerateJD = async () => {
    setIsGenerating(true);
    const result = await generateJobDescription(jdRole, jdDept, jdSkills);
    setGeneratedJD(result);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Employee Directory</h2>
        <div className="flex gap-2">
          {(user?.role === Role.HR || user?.role === Role.ADMIN) && (
            <>
              <button 
                onClick={() => setShowJDModal(true)}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <FileText size={18} />
                Generate JD
              </button>
              <button 
                onClick={() => setShowOnboarding(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
              >
                <Plus size={18} />
                Add Employee
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or department..." 
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map(emp => (
          <div 
            key={emp.id} 
            onClick={() => setSelectedEmployee(emp)}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group flex flex-col"
          >
            <div className="flex items-start gap-4 flex-1">
              <img src={emp.avatar} alt={emp.name} className="w-12 h-12 rounded-full object-cover" />
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{emp.name}</h3>
                <p className="text-sm text-slate-500">{emp.designation}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                  {emp.role}
                </span>
              </div>
            </div>
            
            <div className="mt-6 space-y-2 text-sm text-slate-600 flex-1">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-slate-400" />
                {emp.department}
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />
                {emp.email}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-slate-400" />
                Office HQ
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
               <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                 emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
               }`}>
                 {emp.status}
               </span>
               <button className="text-indigo-600 text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                 View Details <ChevronRight size={16} />
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />

      {/* Employee Details Modal */}
      <EmployeeDetailsModal 
        employee={selectedEmployee} 
        onClose={() => setSelectedEmployee(null)} 
      />

      {/* JD Generator Modal */}
      {showJDModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-bold mb-4">AI Job Description Generator</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role Title</label>
                <input 
                  className="w-full border rounded-lg p-2" 
                  value={jdRole} 
                  onChange={e => setJdRole(e.target.value)} 
                  placeholder="e.g. Senior React Dev"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input 
                  className="w-full border rounded-lg p-2" 
                  value={jdDept} 
                  onChange={e => setJdDept(e.target.value)} 
                  placeholder="e.g. Engineering"
                />
              </div>
            </div>
            <div className="mb-4">
               <label className="block text-sm font-medium text-slate-700 mb-1">Key Skills</label>
               <input 
                  className="w-full border rounded-lg p-2" 
                  value={jdSkills} 
                  onChange={e => setJdSkills(e.target.value)} 
                  placeholder="e.g. React, TypeScript, Node.js, AWS"
                />
            </div>

            <div className="flex justify-end gap-2 mb-4">
              <button onClick={() => setShowJDModal(false)} className="text-slate-600 px-4 py-2">Cancel</button>
              <button 
                onClick={handleGenerateJD} 
                disabled={isGenerating || !jdRole}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate with Gemini'}
              </button>
            </div>

            {generatedJD && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                <pre className="whitespace-pre-wrap text-sm font-mono text-slate-700">{generatedJD}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
