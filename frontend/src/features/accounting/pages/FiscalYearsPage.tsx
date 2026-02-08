import React, { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  Loader2,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Save,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';

interface AccountingPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Open' | 'Closed' | 'Locked';
}

interface FiscalYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Closed' | 'Locked';
  periods: AccountingPeriod[];
}

const PERIOD_STATUS_STYLES: Record<string, string> = {
  Open: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  Closed: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  Locked: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const FY_STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  Closed: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  Locked: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const FiscalYearsPage: React.FC = () => {
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchFiscalYears = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/accounting/fiscal-years');
      if (!response.ok) throw new Error('Failed to fetch fiscal years');
      const result = await response.json();
      setFiscalYears(result.fiscalYears || result);
    } catch (err: any) {
      setError(err.message || 'Failed to load fiscal years');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiscalYears();
  }, []);

  const handleCreateFiscalYear = async () => {
    setFormError(null);
    if (!formName.trim() || !formStartDate || !formEndDate) {
      setFormError('All fields are required.');
      return;
    }
    if (new Date(formEndDate) <= new Date(formStartDate)) {
      setFormError('End date must be after start date.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/accounting/fiscal-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          startDate: formStartDate,
          endDate: formEndDate,
        }),
      });
      if (!response.ok) throw new Error('Failed to create fiscal year');
      setIsCreating(false);
      setFormName('');
      setFormStartDate('');
      setFormEndDate('');
      fetchFiscalYears();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create fiscal year');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePeriodAction = async (
    fiscalYearId: string,
    periodId: string,
    action: 'close' | 'lock' | 'reopen'
  ) => {
    try {
      const response = await fetch(
        `/api/accounting/fiscal-years/${fiscalYearId}/periods/${periodId}/${action}`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error(`Failed to ${action} period`);
      fetchFiscalYears();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Create form view
  if (isCreating) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCreating(false)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              New Fiscal Year
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Define the fiscal year and its accounting periods
            </p>
          </div>
        </div>

        {formError && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle size={18} />
            {formError}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Fiscal Year Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. FY 2025-26"
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFiscalYear}
              disabled={submitting}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Create Fiscal Year
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Fiscal Years</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Manage fiscal years and accounting periods
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={18} /> New Fiscal Year
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <span className="ml-2 text-slate-500 dark:text-slate-400">Loading fiscal years...</span>
        </div>
      ) : fiscalYears.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            No fiscal years configured. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fiscalYears.map((fy) => (
            <div
              key={fy.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Fiscal Year Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => toggleExpand(fy.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === fy.id ? (
                    <ChevronDown size={20} className="text-slate-400" />
                  ) : (
                    <ChevronRight size={20} className="text-slate-400" />
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{fy.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {fy.startDate} to {fy.endDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {fy.periods?.length || 0} periods
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${FY_STATUS_STYLES[fy.status] || ''}`}
                  >
                    {fy.status}
                  </span>
                </div>
              </div>

              {/* Periods Table (expanded) */}
              {expandedId === fy.id && fy.periods && fy.periods.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Period
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Start Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          End Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {fy.periods.map((period) => (
                        <tr
                          key={period.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                            {period.name}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                            {period.startDate}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                            {period.endDate}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${PERIOD_STATUS_STYLES[period.status] || ''}`}
                            >
                              {period.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {period.status === 'Open' && (
                                <button
                                  onClick={() =>
                                    handlePeriodAction(fy.id, period.id, 'close')
                                  }
                                  className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold flex items-center gap-1"
                                >
                                  <XCircle size={14} /> Close
                                </button>
                              )}
                              {period.status === 'Closed' && (
                                <>
                                  <button
                                    onClick={() =>
                                      handlePeriodAction(fy.id, period.id, 'lock')
                                    }
                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-semibold flex items-center gap-1"
                                  >
                                    <Lock size={14} /> Lock
                                  </button>
                                  <button
                                    onClick={() =>
                                      handlePeriodAction(fy.id, period.id, 'reopen')
                                    }
                                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-semibold flex items-center gap-1"
                                  >
                                    <Unlock size={14} /> Reopen
                                  </button>
                                </>
                              )}
                              {period.status === 'Locked' && (
                                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                  <Lock size={14} /> Permanently locked
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {expandedId === fy.id && (!fy.periods || fy.periods.length === 0) && (
                <div className="border-t border-slate-200 dark:border-slate-700 p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No accounting periods defined for this fiscal year.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FiscalYearsPage;
