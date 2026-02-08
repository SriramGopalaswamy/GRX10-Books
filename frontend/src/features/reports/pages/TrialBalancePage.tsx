import React, { useState, useEffect } from 'react';
import { Download, Calendar, Loader2, FileSpreadsheet } from 'lucide-react';

interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

interface TrialBalanceData {
  asOfDate: string;
  accounts: TrialBalanceAccount[];
  totals: {
    totalDebits: number;
    totalCredits: number;
    difference: number;
  };
}

export const TrialBalancePage: React.FC = () => {
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  const fetchTrialBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/trial-balance?asOfDate=${asOfDate}`);
      if (!response.ok) throw new Error('Failed to fetch trial balance');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load trial balance');
      console.error('Error fetching trial balance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, [asOfDate]);

  const handleDownload = () => {
    if (!data) return;

    const csvContent = [
      ['Trial Balance', `As of ${data.asOfDate}`],
      [],
      ['Account Code', 'Account Name', 'Account Type', 'Debit', 'Credit', 'Balance'],
      ...data.accounts.map(acc => [
        acc.accountCode,
        acc.accountName,
        acc.accountType,
        acc.debit.toFixed(2),
        acc.credit.toFixed(2),
        acc.balance.toFixed(2)
      ]),
      [],
      ['Total', '', '', data.totals.totalDebits.toFixed(2), data.totals.totalCredits.toFixed(2), data.totals.difference.toFixed(2)]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trial_Balance_${asOfDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Trial Balance</h2>
          <p className="text-grx-muted dark:text-grx-muted">Summary of all account balances</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-grx-muted" />
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
            />
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
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-grx-primary-600" size={32} />
          <span className="ml-2 text-grx-muted">Loading trial balance...</span>
        </div>
      ) : data ? (
        <div className="grx-glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-grx-primary-100 dark:border-grx-primary-800 bg-grx-bg dark:bg-grx-dark">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-grx-text dark:text-white">Trial Balance</h3>
                <p className="text-sm text-grx-muted dark:text-grx-muted">As of {data.asOfDate}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-grx-muted dark:text-grx-muted">Difference</p>
                <p className={`text-lg font-bold ${Math.abs(data.totals.difference) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{data.totals.difference.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Account Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Account Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Debit (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Credit (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
                {data.accounts.map((account, idx) => (
                  <tr key={idx} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                    <td className="px-6 py-4 font-mono text-grx-muted dark:text-grx-primary-200">{account.accountCode}</td>
                    <td className="px-6 py-4 text-grx-text dark:text-white">{account.accountName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        account.accountType === 'Asset' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        account.accountType === 'Liability' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        account.accountType === 'Income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                        account.accountType === 'Expense' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                        'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                      }`}>
                        {account.accountType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-grx-primary-200">
                      {account.debit > 0 ? account.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-grx-primary-200">
                      {account.credit > 0 ? account.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-grx-text dark:text-white">
                      {account.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr className="bg-grx-bg dark:bg-grx-dark font-bold border-t-2 border-grx-primary-100 dark:border-grx-primary-700">
                  <td colSpan={3} className="px-6 py-4 text-grx-text dark:text-white">TOTAL</td>
                  <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-white">
                    {data.totals.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-white">
                    {data.totals.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-white">
                    {data.totals.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grx-glass-card rounded-xl p-8 text-center text-grx-muted">
          No data available. Please ensure transactions are recorded.
        </div>
      )}
    </div>
  );
};

