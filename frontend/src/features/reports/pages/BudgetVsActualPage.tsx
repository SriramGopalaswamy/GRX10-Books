import React, { useState, useEffect } from 'react';
import { Download, Calendar, Loader2, FileSpreadsheet, TrendingUp, TrendingDown } from 'lucide-react';

interface BudgetVsActualItem {
  accountCode: string;
  accountName: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercent: number;
  status: 'Favorable' | 'Unfavorable' | 'On Track';
}

interface BudgetVsActualData {
  fiscalYearId: string;
  fiscalYearName: string;
  periodStart: string;
  periodEnd: string;
  items: BudgetVsActualItem[];
  totals: {
    totalBudget: number;
    totalActual: number;
    totalVariance: number;
    variancePercent: number;
  };
}

export const BudgetVsActualPage: React.FC = () => {
  const [data, setData] = useState<BudgetVsActualData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [fiscalYears, setFiscalYears] = useState<{ id: string; name: string }[]>([]);

  const fetchFiscalYears = async () => {
    try {
      const response = await fetch('/api/accounting/fiscal-years');
      if (response.ok) {
        const result = await response.json();
        const years = result.fiscalYears || result;
        setFiscalYears(years);
        if (years.length > 0 && !fiscalYearId) {
          setFiscalYearId(years[0].id);
        }
      }
    } catch {
      // Optional
    }
  };

  const fetchBudgetVsActual = async () => {
    if (!fiscalYearId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/budget-vs-actual?fiscalYearId=${fiscalYearId}`);
      if (!response.ok) throw new Error('Failed to fetch budget vs actual report');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load budget vs actual report');
      console.error('Error fetching budget vs actual:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiscalYears();
  }, []);

  useEffect(() => {
    if (fiscalYearId) {
      fetchBudgetVsActual();
    }
  }, [fiscalYearId]);

  const formatINR = (val: number) =>
    val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleDownload = () => {
    if (!data) return;

    const csvContent = [
      ['Budget vs Actual Report', data.fiscalYearName],
      [`Period: ${data.periodStart} to ${data.periodEnd}`],
      [],
      ['Account Code', 'Account Name', 'Budget Amount', 'Actual Amount', 'Variance', 'Variance %', 'Status'],
      ...data.items.map(item => [
        item.accountCode,
        item.accountName,
        item.budgetAmount.toFixed(2),
        item.actualAmount.toFixed(2),
        item.variance.toFixed(2),
        item.variancePercent.toFixed(2) + '%',
        item.status
      ]),
      [],
      ['TOTAL', '', data.totals.totalBudget.toFixed(2), data.totals.totalActual.toFixed(2), data.totals.totalVariance.toFixed(2), data.totals.variancePercent.toFixed(2) + '%', '']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Budget_vs_Actual_${data.fiscalYearName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Budget vs Actual</h2>
          <p className="text-slate-500 dark:text-slate-400">Compare budgeted and actual amounts</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <select
              value={fiscalYearId}
              onChange={(e) => setFiscalYearId(e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            >
              <option value="">Select fiscal year</option>
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDownload}
            disabled={!data}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <Download size={18} />
            Export CSV
          </button>
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
          <span className="ml-2 text-slate-500 dark:text-slate-400">Loading report...</span>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ₹{formatINR(data.totals.totalBudget)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Actual</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ₹{formatINR(data.totals.totalActual)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Variance</p>
              <p
                className={`text-2xl font-bold ${
                  data.totals.totalVariance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                ₹{formatINR(Math.abs(data.totals.totalVariance))}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Variance %</p>
              <p
                className={`text-2xl font-bold ${
                  data.totals.variancePercent >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {data.totals.variancePercent.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {data.fiscalYearName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {data.periodStart} to {data.periodEnd}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Account Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Account Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Budget Amount (₹)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Actual Amount (₹)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Variance (₹)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Variance %
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {data.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">
                        {item.accountCode}
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-slate-100">
                        {item.accountName}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatINR(item.budgetAmount)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatINR(item.actualAmount)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-mono font-semibold ${
                          item.variance >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {item.variance >= 0 ? '+' : ''}
                        {formatINR(item.variance)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-mono font-semibold ${
                          item.variancePercent >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {item.variancePercent >= 0 ? '+' : ''}
                        {item.variancePercent.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.status === 'Favorable' ? (
                            <>
                              <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                Favorable
                              </span>
                            </>
                          ) : item.status === 'Unfavorable' ? (
                            <>
                              <TrendingDown size={14} className="text-red-600 dark:text-red-400" />
                              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                Unfavorable
                              </span>
                            </>
                          ) : (
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              On Track
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-900 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={2} className="px-6 py-4 text-slate-900 dark:text-slate-100">
                      TOTAL
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatINR(data.totals.totalBudget)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatINR(data.totals.totalActual)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-mono ${
                        data.totals.totalVariance >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {data.totals.totalVariance >= 0 ? '+' : ''}
                      {formatINR(data.totals.totalVariance)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-mono ${
                        data.totals.variancePercent >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {data.totals.variancePercent >= 0 ? '+' : ''}
                      {data.totals.variancePercent.toFixed(2)}%
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
          <FileSpreadsheet size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            {fiscalYearId
              ? 'No data available. Please ensure a budget exists for this fiscal year.'
              : 'Please select a fiscal year to view the report.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BudgetVsActualPage;
