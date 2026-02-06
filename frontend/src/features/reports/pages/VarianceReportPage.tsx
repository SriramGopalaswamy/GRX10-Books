import React, { useState, useEffect } from 'react';
import { Download, Calendar, Loader2, FileSpreadsheet, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VarianceItem {
  accountCode: string;
  accountName: string;
  accountType: string;
  currentPeriod: number;
  previousPeriod: number;
  change: number;
  changePercent: number;
  direction: 'Increase' | 'Decrease' | 'NoChange';
}

interface VarianceData {
  currentPeriodStart: string;
  currentPeriodEnd: string;
  previousPeriodStart: string;
  previousPeriodEnd: string;
  items: VarianceItem[];
  totals: {
    currentPeriodTotal: number;
    previousPeriodTotal: number;
    totalChange: number;
    changePercent: number;
  };
}

export const VarianceReportPage: React.FC = () => {
  const [data, setData] = useState<VarianceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Period selectors
  const [currentStart, setCurrentStart] = useState('');
  const [currentEnd, setCurrentEnd] = useState('');
  const [previousStart, setPreviousStart] = useState('');
  const [previousEnd, setPreviousEnd] = useState('');

  useEffect(() => {
    // Set default dates - current month vs previous month
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    setCurrentStart(currentMonthStart.toISOString().split('T')[0]);
    setCurrentEnd(currentMonthEnd.toISOString().split('T')[0]);
    setPreviousStart(previousMonthStart.toISOString().split('T')[0]);
    setPreviousEnd(previousMonthEnd.toISOString().split('T')[0]);
  }, []);

  const fetchVarianceReport = async () => {
    if (!currentStart || !currentEnd || !previousStart || !previousEnd) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
      });
      const response = await fetch(`/api/reports/variance?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch variance report');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load variance report');
      console.error('Error fetching variance report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStart && currentEnd && previousStart && previousEnd) {
      fetchVarianceReport();
    }
  }, [currentStart, currentEnd, previousStart, previousEnd]);

  const formatINR = (val: number) =>
    val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleDownload = () => {
    if (!data) return;

    const csvContent = [
      ['Variance Analysis Report'],
      [
        `Current Period: ${data.currentPeriodStart} to ${data.currentPeriodEnd}`,
        `Previous Period: ${data.previousPeriodStart} to ${data.previousPeriodEnd}`,
      ],
      [],
      [
        'Account Code',
        'Account Name',
        'Account Type',
        'Current Period',
        'Previous Period',
        'Change',
        'Change %',
        'Direction',
      ],
      ...data.items.map((item) => [
        item.accountCode,
        item.accountName,
        item.accountType,
        item.currentPeriod.toFixed(2),
        item.previousPeriod.toFixed(2),
        item.change.toFixed(2),
        item.changePercent.toFixed(2) + '%',
        item.direction,
      ]),
      [],
      [
        'TOTAL',
        '',
        '',
        data.totals.currentPeriodTotal.toFixed(2),
        data.totals.previousPeriodTotal.toFixed(2),
        data.totals.totalChange.toFixed(2),
        data.totals.changePercent.toFixed(2) + '%',
        '',
      ],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Variance_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Variance Analysis</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Compare financial performance across periods
          </p>
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

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Period Selector */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Current Period
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={currentStart}
                  onChange={(e) => setCurrentStart(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={currentEnd}
                  onChange={(e) => setCurrentEnd(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Comparison Period
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={previousStart}
                  onChange={(e) => setPreviousStart(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={previousEnd}
                  onChange={(e) => setPreviousEnd(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current Period</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ₹{formatINR(data.totals.currentPeriodTotal)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Previous Period</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ₹{formatINR(data.totals.previousPeriodTotal)}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Change</p>
              <p
                className={`text-2xl font-bold ${
                  data.totals.totalChange >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {data.totals.totalChange >= 0 ? '+' : ''}₹{formatINR(Math.abs(data.totals.totalChange))}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Change %</p>
              <p
                className={`text-2xl font-bold ${
                  data.totals.changePercent >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {data.totals.changePercent >= 0 ? '+' : ''}
                {data.totals.changePercent.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Variance Analysis
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Current: {data.currentPeriodStart} to {data.currentPeriodEnd} | Previous:{' '}
                    {data.previousPeriodStart} to {data.previousPeriodEnd}
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Current Period (₹)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Previous Period (₹)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Change (₹)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Change %
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      Direction
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
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.accountType === 'Asset'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : item.accountType === 'Liability'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : item.accountType === 'Income'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : item.accountType === 'Expense'
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          }`}
                        >
                          {item.accountType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatINR(item.currentPeriod)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatINR(item.previousPeriod)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-mono font-semibold ${
                          item.change >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {item.change >= 0 ? '+' : ''}
                        {formatINR(item.change)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-mono font-semibold ${
                          item.changePercent >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {item.changePercent >= 0 ? '+' : ''}
                        {item.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          {item.direction === 'Increase' ? (
                            <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-400" />
                          ) : item.direction === 'Decrease' ? (
                            <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
                          ) : (
                            <Minus size={18} className="text-slate-400" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-900 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={3} className="px-6 py-4 text-slate-900 dark:text-slate-100">
                      TOTAL
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatINR(data.totals.currentPeriodTotal)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatINR(data.totals.previousPeriodTotal)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-mono ${
                        data.totals.totalChange >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {data.totals.totalChange >= 0 ? '+' : ''}
                      {formatINR(data.totals.totalChange)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-mono ${
                        data.totals.changePercent >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {data.totals.changePercent >= 0 ? '+' : ''}
                      {data.totals.changePercent.toFixed(2)}%
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
            Please select period dates to view the variance analysis.
          </p>
        </div>
      )}
    </div>
  );
};

export default VarianceReportPage;
