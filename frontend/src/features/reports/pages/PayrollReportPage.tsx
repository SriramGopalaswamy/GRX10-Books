import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, Loader2 } from 'lucide-react';
import { useConfiguration } from '../../../shared/contexts/ConfigurationContext';

interface PayslipRecord {
  id: string;
  employeeId: string;
  month: string;
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  netPay: number;
  Employee?: {
    id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    employeeType: string;
  };
}

interface PayrollReportData {
  month: string;
  filters: {
    department?: string;
    employeeId?: string;
  };
  summary: {
    totalEmployees: number;
    totalGrossSalary: number;
    totalDeductions: number;
    totalNetPay: number;
    byDepartment: Record<string, { count: number; totalNetPay: number }>;
  };
  payslips: PayslipRecord[];
}

export const PayrollReportPage: React.FC = () => {
  const { getActiveDepartments } = useConfiguration();
  const [data, setData] = useState<PayrollReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const [department, setDepartment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    if (!month) return;
    
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ month });
      if (department) params.append('department', department);

      const response = await fetch(`/api/reports/hr/payroll?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch payroll report');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load payroll report');
      console.error('Error fetching payroll report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, department]);

  const handleDownload = () => {
    if (!data) return;

    const csvContent = [
      ['Payroll Report', data.month],
      [],
      ['Summary'],
      ['Total Employees', 'Total Gross Salary', 'Total Deductions', 'Total Net Pay'],
      [
        data.summary.totalEmployees,
        data.summary.totalGrossSalary.toFixed(2),
        data.summary.totalDeductions.toFixed(2),
        data.summary.totalNetPay.toFixed(2)
      ],
      [],
      ['By Department'],
      ['Department', 'Employees', 'Total Net Pay'],
      ...Object.entries(data.summary.byDepartment).map(([dept, stats]) => [
        dept,
        stats.count,
        stats.totalNetPay.toFixed(2)
      ]),
      [],
      ['Details'],
      ['Employee', 'Department', 'Employee Type', 'Basic', 'HRA', 'Allowances', 'Deductions', 'Net Pay'],
      ...data.payslips.map(payslip => [
        payslip.Employee?.name || 'N/A',
        payslip.Employee?.department || 'N/A',
        payslip.Employee?.employeeType || 'N/A',
        payslip.basic.toFixed(2),
        payslip.hra.toFixed(2),
        payslip.allowances.toFixed(2),
        payslip.deductions.toFixed(2),
        payslip.netPay.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_Report_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Payroll Report</h2>
          <p className="text-grx-muted dark:text-grx-muted">Monthly payroll summary and details</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={!data}
          className="bg-grx-primary-600 text-white px-4 py-2 rounded-lg hover:bg-grx-primary-700 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grx-glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-grx-muted" />
          <h3 className="font-semibold text-grx-text dark:text-white">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 grx-stagger">
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Month</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Department</label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
            >
              <option value="">All Departments</option>
              {getActiveDepartments().map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
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
          <Loader2 className="animate-spin text-grx-primary-600" size={32} />
          <span className="ml-2 text-grx-muted">Loading payroll report...</span>
        </div>
      ) : data ? (
        <div className="space-y-6 grx-animate-fade-in-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="grx-glass-card p-4 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800">
              <p className="text-sm text-grx-muted dark:text-grx-muted mb-1">Total Employees</p>
              <p className="text-2xl font-bold text-grx-text dark:text-white">{data.summary.totalEmployees}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Total Gross Salary</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                ₹{data.summary.totalGrossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800">
              <p className="text-sm text-rose-700 dark:text-rose-300 mb-1">Total Deductions</p>
              <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">
                ₹{data.summary.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">Total Net Pay</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                ₹{data.summary.totalNetPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* By Department Summary */}
          {Object.keys(data.summary.byDepartment).length > 0 && (
            <div className="grx-glass-card rounded-xl p-4">
              <h3 className="font-semibold text-grx-text dark:text-white mb-4">By Department</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 grx-stagger">
                {Object.entries(data.summary.byDepartment).map(([dept, stats]) => (
                  <div key={dept} className="p-4 bg-grx-bg dark:bg-grx-dark rounded-lg">
                    <p className="text-sm text-grx-muted dark:text-grx-muted">{dept}</p>
                    <p className="text-lg font-bold text-grx-text dark:text-white">{stats.count} employees</p>
                    <p className="text-sm text-grx-muted dark:text-grx-muted">
                      ₹{stats.totalNetPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Records Table */}
          <div className="grx-glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Basic</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">HRA</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Allowances</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Deductions</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
                  {data.payslips.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-grx-muted">No payslips found for this month</td>
                    </tr>
                  ) : (
                    data.payslips.map(payslip => (
                      <tr key={payslip.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                        <td className="px-6 py-4 text-grx-text dark:text-white">{payslip.Employee?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{payslip.Employee?.department || 'N/A'}</td>
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{payslip.Employee?.employeeType || 'N/A'}</td>
                        <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-grx-primary-200">
                          ₹{payslip.basic.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-grx-primary-200">
                          ₹{payslip.hra.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-grx-primary-200">
                          ₹{payslip.allowances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-grx-primary-200">
                          ₹{payslip.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold text-grx-text dark:text-white">
                          ₹{payslip.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                  {data.payslips.length > 0 && (
                    <tr className="bg-grx-bg dark:bg-grx-dark font-bold border-t-2 border-grx-primary-100 dark:border-grx-primary-700">
                      <td colSpan={3} className="px-6 py-4 text-grx-text dark:text-white">TOTAL</td>
                      <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-white">
                        ₹{data.payslips.reduce((sum, p) => sum + p.basic, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-white">
                        ₹{data.payslips.reduce((sum, p) => sum + p.hra, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-white">
                        ₹{data.payslips.reduce((sum, p) => sum + p.allowances, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-white">
                        ₹{data.payslips.reduce((sum, p) => sum + p.deductions, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-white">
                        ₹{data.summary.totalNetPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grx-glass-card rounded-xl p-8 text-center text-grx-muted">
          No data available.
        </div>
      )}
    </div>
  );
};

