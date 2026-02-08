import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Loader2,
  ChevronDown,
  ChevronRight,
  Shield,
  Calendar,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string;
  description: string;
  previousValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
}

const ACTION_STYLES: Record<string, string> = {
  INSERT: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  UPDATE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  DELETE: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (tableFilter) params.append('tableName', tableFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (searchTerm) params.append('search', searchTerm);
      const response = await fetch(`/api/accounting/audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const result = await response.json();
      setLogs(result.logs || result);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [dateFrom, dateTo, tableFilter, actionFilter]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderJsonDiff = (
    previous: Record<string, any> | null,
    current: Record<string, any> | null
  ) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-grx-bg dark:bg-grx-dark border-t border-grx-primary-100 dark:border-grx-primary-800">
        <div>
          <h4 className="text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase mb-2">
            Previous Values
          </h4>
          {previous ? (
            <pre className="text-xs bg-white dark:bg-grx-dark-surface p-3 rounded-lg border border-grx-primary-100 dark:border-grx-primary-800 overflow-x-auto text-grx-text dark:text-grx-primary-200 max-h-48 overflow-y-auto">
              {JSON.stringify(previous, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-grx-muted dark:text-grx-muted italic">N/A</p>
          )}
        </div>
        <div>
          <h4 className="text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase mb-2">
            New Values
          </h4>
          {current ? (
            <pre className="text-xs bg-white dark:bg-grx-dark-surface p-3 rounded-lg border border-grx-primary-100 dark:border-grx-primary-800 overflow-x-auto text-grx-text dark:text-grx-primary-200 max-h-48 overflow-y-auto">
              {JSON.stringify(current, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-grx-muted dark:text-grx-muted italic">N/A</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Audit Log</h2>
          <p className="text-grx-muted dark:text-grx-muted">
            Complete history of data changes across the system
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="grx-glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-grx-primary-50 dark:border-grx-primary-800 bg-grx-bg/50 dark:bg-grx-dark/50">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted" size={18} />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-grx-muted" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
              />
              <span className="text-grx-muted dark:text-grx-muted text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-grx-muted" />
              <input
                type="text"
                placeholder="Table name"
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white w-40"
              />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
              >
                <option value="">All Actions</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Log entries */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-grx-primary-600" size={32} />
            <span className="ml-2 text-grx-muted dark:text-grx-muted">Loading audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={48} className="mx-auto text-grx-primary-200 dark:text-grx-muted mb-4" />
            <p className="text-grx-muted dark:text-grx-muted">No audit log entries found.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-grx-muted dark:text-grx-muted uppercase bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-50 dark:border-grx-primary-800">
              <tr>
                <th className="px-4 py-4 w-8"></th>
                <th className="px-4 py-4">Timestamp</th>
                <th className="px-4 py-4">User</th>
                <th className="px-4 py-4">Action</th>
                <th className="px-4 py-4">Table</th>
                <th className="px-4 py-4">Record ID</th>
                <th className="px-4 py-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grx-primary-50 dark:divide-grx-primary-800 bg-white dark:bg-grx-dark-surface">
              {logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr
                    className="hover:bg-grx-bg dark:hover:bg-grx-primary-800 cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <td className="px-4 py-4 text-grx-muted">
                      {expandedId === log.id ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </td>
                    <td className="px-4 py-4 text-grx-muted dark:text-grx-muted whitespace-nowrap font-mono text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-grx-text dark:text-white font-medium">
                      {log.userName}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_STYLES[log.action] || ''}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-grx-muted dark:text-grx-primary-200">
                      {log.tableName}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-grx-muted dark:text-grx-muted">
                      {log.recordId}
                    </td>
                    <td className="px-4 py-4 text-grx-text dark:text-grx-primary-200 max-w-xs truncate">
                      {log.description}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        {renderJsonDiff(log.previousValues, log.newValues)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;
