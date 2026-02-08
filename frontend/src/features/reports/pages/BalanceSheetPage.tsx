import React, { useState, useEffect } from 'react';
import { Download, Calendar, Loader2 } from 'lucide-react';

interface BalanceSheetItem {
  code: string;
  name: string;
  balance: number;
}

interface BalanceSheetData {
  asOfDate: string;
  assets: {
    items: BalanceSheetItem[];
    total: number;
  };
  liabilities: {
    items: BalanceSheetItem[];
    total: number;
  };
  equity: {
    items: BalanceSheetItem[];
    netIncome: number;
    total: number;
  };
  totals: {
    totalAssets: number;
    totalLiabilitiesAndEquity: number;
    balanced: boolean;
  };
}

export const BalanceSheetPage: React.FC = () => {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  const fetchBalanceSheet = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/balance-sheet?asOfDate=${asOfDate}`);
      if (!response.ok) throw new Error('Failed to fetch balance sheet');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load balance sheet');
      console.error('Error fetching balance sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheet();
  }, [asOfDate]);

  const handleDownload = () => {
    if (!data) return;

    const csvContent = [
      ['Balance Sheet', `As of ${data.asOfDate}`],
      [],
      ['ASSETS'],
      ['Account Code', 'Account Name', 'Balance'],
      ...data.assets.items.map(item => [item.code, item.name, item.balance.toFixed(2)]),
      ['', 'Total Assets', data.assets.total.toFixed(2)],
      [],
      ['LIABILITIES'],
      ['Account Code', 'Account Name', 'Balance'],
      ...data.liabilities.items.map(item => [item.code, item.name, item.balance.toFixed(2)]),
      ['', 'Total Liabilities', data.liabilities.total.toFixed(2)],
      [],
      ['EQUITY'],
      ['Account Code', 'Account Name', 'Balance'],
      ...data.equity.items.map(item => [item.code, item.name, item.balance.toFixed(2)]),
      ['', 'Net Income', data.equity.netIncome.toFixed(2)],
      ['', 'Total Equity', data.equity.total.toFixed(2)],
      [],
      ['Total Liabilities & Equity', data.totals.totalLiabilitiesAndEquity.toFixed(2)]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Balance_Sheet_${asOfDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Balance Sheet</h2>
          <p className="text-grx-muted dark:text-grx-muted">Financial position as of a specific date</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-grx-muted" />
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
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
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <span className="ml-2 text-grx-muted">Loading balance sheet...</span>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 overflow-hidden">
            <div className="p-4 border-b border-grx-primary-100 dark:border-grx-primary-800 bg-blue-50 dark:bg-blue-900/20">
              <h3 className="font-bold text-blue-900 dark:text-blue-300">ASSETS</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted">Account</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
                  {data.assets.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                      <td className="px-4 py-3 text-grx-text dark:text-white">{item.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-grx-text dark:text-grx-primary-200">
                        {item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-grx-bg dark:bg-grx-dark font-bold border-t-2 border-grx-primary-100 dark:border-grx-primary-700">
                    <td className="px-4 py-3 text-grx-text dark:text-white">Total Assets</td>
                    <td className="px-4 py-3 text-right font-mono text-grx-text dark:text-white">
                      {data.assets.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 overflow-hidden">
            <div className="p-4 border-b border-grx-primary-100 dark:border-grx-primary-800 bg-red-50 dark:bg-red-900/20">
              <h3 className="font-bold text-red-900 dark:text-red-300">LIABILITIES & EQUITY</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted">Account</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
                  {/* Liabilities */}
                  <tr>
                    <td colSpan={2} className="px-4 py-2 font-semibold text-grx-text dark:text-grx-primary-200 bg-grx-primary-50 dark:bg-grx-dark">
                      Liabilities
                    </td>
                  </tr>
                  {data.liabilities.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                      <td className="px-4 py-3 text-grx-text dark:text-white pl-6">{item.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-grx-text dark:text-grx-primary-200">
                        {item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-grx-bg dark:bg-grx-dark">
                    <td className="px-4 py-2 pl-6 font-semibold text-grx-text dark:text-white">Total Liabilities</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-grx-text dark:text-white">
                      {data.liabilities.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Equity */}
                  <tr>
                    <td colSpan={2} className="px-4 py-2 font-semibold text-grx-text dark:text-grx-primary-200 bg-grx-primary-50 dark:bg-grx-dark">
                      Equity
                    </td>
                  </tr>
                  {data.equity.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                      <td className="px-4 py-3 text-grx-text dark:text-white pl-6">{item.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-grx-text dark:text-grx-primary-200">
                        {item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                    <td className="px-4 py-3 text-grx-text dark:text-white pl-6">Net Income</td>
                    <td className="px-4 py-3 text-right font-mono text-grx-text dark:text-grx-primary-200">
                      {data.equity.netIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-grx-bg dark:bg-grx-dark">
                    <td className="px-4 py-2 pl-6 font-semibold text-grx-text dark:text-white">Total Equity</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold text-grx-text dark:text-white">
                      {data.equity.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-indigo-50 dark:bg-indigo-900/20 font-bold border-t-2 border-indigo-300 dark:border-indigo-700">
                    <td className="px-4 py-3 text-grx-text dark:text-white">Total Liabilities & Equity</td>
                    <td className="px-4 py-3 text-right font-mono text-grx-text dark:text-white">
                      {data.totals.totalLiabilitiesAndEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 p-8 text-center text-grx-muted">
          No data available. Please ensure transactions are recorded.
        </div>
      )}

      {data && (
        <div className={`p-4 rounded-lg ${
          data.totals.balanced 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
        }`}>
          <p className={`text-sm font-medium ${
            data.totals.balanced 
              ? 'text-emerald-700 dark:text-emerald-300' 
              : 'text-amber-700 dark:text-amber-300'
          }`}>
            {data.totals.balanced 
              ? '✓ Balance Sheet is balanced' 
              : `⚠ Balance Sheet is not balanced. Difference: ₹${Math.abs(data.totals.totalAssets - data.totals.totalLiabilitiesAndEquity).toFixed(2)}`}
          </p>
        </div>
      )}
    </div>
  );
};

