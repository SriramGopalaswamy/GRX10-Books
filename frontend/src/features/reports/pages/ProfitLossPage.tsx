import React, { useState, useEffect } from 'react';
import { Download, Calendar, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface PLItem {
  code: string;
  name: string;
  amount: number;
}

interface ProfitLossData {
  period: {
    startDate: string;
    endDate: string;
  };
  income: {
    items: PLItem[];
    total: number;
  };
  expenses: {
    items: PLItem[];
    total: number;
  };
  netProfit: number;
  netLoss: number;
}

export const ProfitLossPage: React.FC = () => {
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  const fetchProfitLoss = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Failed to fetch profit & loss');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load profit & loss statement');
      console.error('Error fetching profit & loss:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitLoss();
  }, [startDate, endDate]);

  const handleDownload = () => {
    if (!data) return;

    const csvContent = [
      ['Profit & Loss Statement', `${data.period.startDate} to ${data.period.endDate}`],
      [],
      ['INCOME'],
      ['Account Code', 'Account Name', 'Amount'],
      ...data.income.items.map(item => [item.code, item.name, item.amount.toFixed(2)]),
      ['', 'Total Income', data.income.total.toFixed(2)],
      [],
      ['EXPENSES'],
      ['Account Code', 'Account Name', 'Amount'],
      ...data.expenses.items.map(item => [item.code, item.name, item.amount.toFixed(2)]),
      ['', 'Total Expenses', data.expenses.total.toFixed(2)],
      [],
      ['Net Profit', data.netProfit > 0 ? data.netProfit.toFixed(2) : '0.00'],
      ['Net Loss', data.netLoss > 0 ? data.netLoss.toFixed(2) : '0.00']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Profit_Loss_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Profit & Loss Statement</h2>
          <p className="text-grx-muted dark:text-grx-muted">Income and expenses for a period</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-grx-muted" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
            />
            <span className="text-grx-muted">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
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
          <span className="ml-2 text-grx-muted">Loading profit & loss statement...</span>
        </div>
      ) : data ? (
        <div className="space-y-6 grx-animate-fade-in-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 grx-stagger">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">Total Income</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                ₹{data.income.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-xl border border-rose-200 dark:border-rose-800">
              <p className="text-sm text-rose-700 dark:text-rose-300 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">
                ₹{data.expenses.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`p-6 rounded-xl border ${
              data.netProfit > 0 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
            }`}>
              <p className={`text-sm mb-1 ${
                data.netProfit > 0 
                  ? 'text-emerald-700 dark:text-emerald-300' 
                  : 'text-rose-700 dark:text-rose-300'
              }`}>
                {data.netProfit > 0 ? 'Net Profit' : 'Net Loss'}
              </p>
              <p className={`text-2xl font-bold flex items-center gap-2 ${
                data.netProfit > 0 
                  ? 'text-emerald-900 dark:text-emerald-100' 
                  : 'text-rose-900 dark:text-rose-100'
              }`}>
                {data.netProfit > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                ₹{Math.abs(data.netProfit || data.netLoss).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income */}
            <div className="grx-glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-grx-primary-100 dark:border-grx-primary-800 bg-emerald-50 dark:bg-emerald-900/20">
                <h3 className="font-bold text-emerald-900 dark:text-emerald-300">INCOME</h3>
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
                    {data.income.items.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-grx-muted">No income recorded</td>
                      </tr>
                    ) : (
                      data.income.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                          <td className="px-4 py-3 text-grx-text dark:text-white">{item.name}</td>
                          <td className="px-4 py-3 text-right font-mono text-grx-text dark:text-grx-primary-200">
                            {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-grx-bg dark:bg-grx-dark font-bold border-t-2 border-grx-primary-100 dark:border-grx-primary-700">
                      <td className="px-4 py-3 text-grx-text dark:text-white">Total Income</td>
                      <td className="px-4 py-3 text-right font-mono text-grx-text dark:text-white">
                        {data.income.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expenses */}
            <div className="grx-glass-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-grx-primary-100 dark:border-grx-primary-800 bg-rose-50 dark:bg-rose-900/20">
                <h3 className="font-bold text-rose-900 dark:text-rose-300">EXPENSES</h3>
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
                    {data.expenses.items.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-grx-muted">No expenses recorded</td>
                      </tr>
                    ) : (
                      data.expenses.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                          <td className="px-4 py-3 text-grx-text dark:text-white">{item.name}</td>
                          <td className="px-4 py-3 text-right font-mono text-grx-text dark:text-grx-primary-200">
                            {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-grx-bg dark:bg-grx-dark font-bold border-t-2 border-grx-primary-100 dark:border-grx-primary-700">
                      <td className="px-4 py-3 text-grx-text dark:text-white">Total Expenses</td>
                      <td className="px-4 py-3 text-right font-mono text-grx-text dark:text-white">
                        {data.expenses.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
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

