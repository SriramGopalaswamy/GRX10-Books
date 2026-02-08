import React, { useState, useEffect } from 'react';
import { Download, Filter, Loader2 } from 'lucide-react';
import { useConfiguration } from '../../../shared/contexts/ConfigurationContext';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  employeePosition: string;
  employeeType: string;
  status: string;
  joinDate: string;
  workLocation: string;
  managerId: string;
}

interface EmployeeDirectoryData {
  filters: {
    department?: string;
    status?: string;
    employeeType?: string;
  };
  totalEmployees: number;
  employees: Employee[];
}

export const EmployeeDirectoryReportPage: React.FC = () => {
  const { getActiveDepartments, getActiveEmployeeTypes } = useConfiguration();
  const [data, setData] = useState<EmployeeDirectoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    employeeType: ''
  });
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      if (filters.employeeType) params.append('employeeType', filters.employeeType);

      const response = await fetch(`/api/reports/hr/employee-directory?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch employee directory');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load employee directory');
      console.error('Error fetching employee directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const handleDownload = () => {
    if (!data) return;

    const csvContent = [
      ['Employee Directory Report'],
      [],
      ['Employee ID', 'Name', 'Email', 'Department', 'Designation', 'Position', 'Employee Type', 'Status', 'Join Date', 'Work Location'],
      ...data.employees.map(emp => [
        emp.id,
        emp.name,
        emp.email,
        emp.department,
        emp.designation,
        emp.employeePosition,
        emp.employeeType,
        emp.status,
        emp.joinDate,
        emp.workLocation
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Employee_Directory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Employee Directory Report</h2>
          <p className="text-grx-muted dark:text-grx-muted">Complete list of employees with filters</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={!data}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-grx-muted" />
          <h3 className="font-semibold text-grx-text dark:text-white">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Department</label>
            <select
              value={filters.department}
              onChange={e => setFilters({ ...filters, department: e.target.value })}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Departments</option>
              {getActiveDepartments().map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Employee Type</label>
            <select
              value={filters.employeeType}
              onChange={e => setFilters({ ...filters, employeeType: e.target.value })}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Types</option>
              {getActiveEmployeeTypes().map(type => (
                <option key={type.id} value={type.name}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <span className="ml-2 text-grx-muted">Loading employee directory...</span>
        </div>
      ) : data ? (
        <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 overflow-hidden">
          <div className="p-4 border-b border-grx-primary-100 dark:border-grx-primary-800 bg-grx-bg dark:bg-grx-dark">
            <p className="text-sm text-grx-muted dark:text-grx-muted">
              Total Employees: <span className="font-semibold text-grx-text dark:text-white">{data.totalEmployees}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Join Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
                {data.employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-grx-muted">No employees found</td>
                  </tr>
                ) : (
                  data.employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                      <td className="px-6 py-4 font-mono text-grx-muted dark:text-grx-primary-200">{emp.id}</td>
                      <td className="px-6 py-4 text-grx-text dark:text-white">{emp.name}</td>
                      <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{emp.email}</td>
                      <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{emp.department}</td>
                      <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{emp.designation}</td>
                      <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{emp.employeeType}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          emp.status === 'Active' 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{emp.joinDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 p-8 text-center text-grx-muted">
          No data available.
        </div>
      )}
    </div>
  );
};

