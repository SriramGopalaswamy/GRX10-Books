import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, Loader2 } from 'lucide-react';
import { useConfiguration } from '../../../shared/contexts/ConfigurationContext';

interface LeaveRecord {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  appliedOn: string;
  days: number;
  Employee?: {
    id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
  };
}

interface LeaveReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  filters: {
    employeeId?: string;
    department?: string;
    status?: string;
    leaveType?: string;
  };
  summary: {
    totalRequests: number;
    approved: number;
    pending: number;
    rejected: number;
    totalDays: number;
    byType: Record<string, { count: number; days: number }>;
  };
  leaves: LeaveRecord[];
}

export const LeaveReportPage: React.FC = () => {
  const { getActiveDepartments, getActiveLeaveTypes } = useConfiguration();
  const [data, setData] = useState<LeaveReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    leaveType: ''
  });
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate
      });
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      if (filters.leaveType) params.append('leaveType', filters.leaveType);

      const response = await fetch(`/api/reports/hr/leaves?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch leave report');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load leave report');
      console.error('Error fetching leave report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, filters]);

  const handleDownload = () => {
    if (!data) return;

    const csvContent = [
      ['Leave Report', `${data.period.startDate} to ${data.period.endDate}`],
      [],
      ['Summary'],
      ['Total Requests', 'Approved', 'Pending', 'Rejected', 'Total Days'],
      [
        data.summary.totalRequests,
        data.summary.approved,
        data.summary.pending,
        data.summary.rejected,
        data.summary.totalDays
      ],
      [],
      ['By Leave Type'],
      ['Type', 'Count', 'Days'],
      ...Object.entries(data.summary.byType).map(([type, stats]) => [
        type,
        stats.count,
        stats.days
      ]),
      [],
      ['Details'],
      ['Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'],
      ...data.leaves.map(leave => [
        leave.Employee?.name || 'N/A',
        leave.Employee?.department || 'N/A',
        leave.type,
        leave.startDate,
        leave.endDate,
        leave.days,
        leave.status,
        leave.reason
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Leave_Report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Leave Report</h2>
          <p className="text-grx-muted dark:text-grx-muted">Employee leave requests and statistics</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Department</label>
            <select
              value={filters.department}
              onChange={e => setFilters({ ...filters, department: e.target.value })}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
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
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
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
          <span className="ml-2 text-grx-muted">Loading leave report...</span>
        </div>
      ) : data ? (
        <div className="space-y-6 grx-animate-fade-in-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="grx-glass-card p-4 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800">
              <p className="text-sm text-grx-muted dark:text-grx-muted mb-1">Total Requests</p>
              <p className="text-2xl font-bold text-grx-text dark:text-white">{data.summary.totalRequests}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">Approved</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{data.summary.approved}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{data.summary.pending}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800">
              <p className="text-sm text-rose-700 dark:text-rose-300 mb-1">Rejected</p>
              <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">{data.summary.rejected}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Total Days</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{data.summary.totalDays}</p>
            </div>
          </div>

          {/* By Type Summary */}
          {Object.keys(data.summary.byType).length > 0 && (
            <div className="grx-glass-card rounded-xl p-4">
              <h3 className="font-semibold text-grx-text dark:text-white mb-4">By Leave Type</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(data.summary.byType).map(([type, stats]) => (
                  <div key={type} className="p-3 bg-grx-bg dark:bg-grx-dark rounded-lg">
                    <p className="text-sm text-grx-muted dark:text-grx-muted">{type}</p>
                    <p className="text-lg font-bold text-grx-text dark:text-white">{stats.count} requests</p>
                    <p className="text-xs text-grx-muted dark:text-grx-muted">{stats.days} days</p>
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">End Date</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
                  {data.leaves.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-grx-muted">No leave requests found</td>
                    </tr>
                  ) : (
                    data.leaves.map(leave => (
                      <tr key={leave.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                        <td className="px-6 py-4 text-grx-text dark:text-white">{leave.Employee?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{leave.Employee?.department || 'N/A'}</td>
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{leave.type}</td>
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{leave.startDate}</td>
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{leave.endDate}</td>
                        <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-grx-primary-200">{leave.days}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            leave.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            leave.status === 'Pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200 max-w-xs truncate">{leave.reason}</td>
                      </tr>
                    ))
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

