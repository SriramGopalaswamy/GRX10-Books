import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, Loader2 } from 'lucide-react';
import { useConfiguration } from '../../../shared/contexts/ConfigurationContext';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  durationHours: number;
  Employee?: {
    id: string;
    name: string;
    email: string;
    department: string;
    designation: string;
  };
}

interface AttendanceReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  filters: {
    employeeId?: string;
    department?: string;
  };
  summary: {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    totalHours: number;
  };
  records: AttendanceRecord[];
}

export const AttendanceReportPage: React.FC = () => {
  const { getActiveDepartments } = useConfiguration();
  const [data, setData] = useState<AttendanceReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('');
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
      if (department) params.append('department', department);

      const response = await fetch(`/api/reports/hr/attendance?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch attendance report');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance report');
      console.error('Error fetching attendance report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, department]);

  const handleDownload = () => {
    if (!data) return;

    const csvContent = [
      ['Attendance Report', `${data.period.startDate} to ${data.period.endDate}`],
      [],
      ['Summary'],
      ['Total Days', 'Present', 'Absent', 'Late', 'Half Day', 'Total Hours'],
      [
        data.summary.totalDays,
        data.summary.present,
        data.summary.absent,
        data.summary.late,
        data.summary.halfDay,
        data.summary.totalHours.toFixed(2)
      ],
      [],
      ['Details'],
      ['Date', 'Employee Name', 'Department', 'Check In', 'Check Out', 'Status', 'Duration (Hours)'],
      ...data.records.map(record => [
        record.date,
        record.Employee?.name || 'N/A',
        record.Employee?.department || 'N/A',
        record.checkIn || '-',
        record.checkOut || '-',
        record.status,
        record.durationHours?.toFixed(2) || '0.00'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Attendance Report</h2>
          <p className="text-grx-muted dark:text-grx-muted">Employee attendance records and statistics</p>
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
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Department</label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
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
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <span className="ml-2 text-grx-muted">Loading attendance report...</span>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-grx-dark-surface p-4 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800">
              <p className="text-sm text-grx-muted dark:text-grx-muted mb-1">Total Days</p>
              <p className="text-2xl font-bold text-grx-text dark:text-white">{data.summary.totalDays}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">Present</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{data.summary.present}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800">
              <p className="text-sm text-rose-700 dark:text-rose-300 mb-1">Absent</p>
              <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">{data.summary.absent}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-1">Late</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{data.summary.late}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Total Hours</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{data.summary.totalHours.toFixed(1)}</p>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
                  {data.records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-grx-muted">No attendance records found</td>
                    </tr>
                  ) : (
                    data.records.map(record => (
                      <tr key={record.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{record.date}</td>
                        <td className="px-6 py-4 text-grx-text dark:text-white">{record.Employee?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{record.Employee?.department || 'N/A'}</td>
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{record.checkIn || '-'}</td>
                        <td className="px-6 py-4 text-grx-text dark:text-grx-primary-200">{record.checkOut || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            record.status === 'Present' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            record.status === 'Absent' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                            record.status === 'Late' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-grx-primary-200">
                          {record.durationHours?.toFixed(2) || '0.00'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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

