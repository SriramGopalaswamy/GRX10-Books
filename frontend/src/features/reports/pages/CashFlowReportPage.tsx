import React, { useState, useEffect } from 'react';
import {
  Download,
  Calendar,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Banknote,
  Building2,
  Wallet,
} from 'lucide-react';

interface CashFlowLineItem {
  description: string;
  amount: number;
}

interface CashFlowSection {
  items: CashFlowLineItem[];
  total: number;
}

interface CashFlowData {
  period: {
    startDate: string;
    endDate: string;
  };
  method: 'direct' | 'indirect';
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netChangeInCash: number;
  beginningCashBalance: number;
  endingCashBalance: number;
}

const CashFlowReportPage: React.FC = () => {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'direct' | 'indirect'>('indirect');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchCashFlow = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        method,
      });
      const response = await fetch(`/api/reports/cashflow?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch cash flow statement');
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load cash flow statement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, [startDate, endDate, method]);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const handleDownload = () => {
    if (!data) return;

    const csvContent = [
      ['Cash Flow Statement', `${data.period.startDate} to ${data.period.endDate}`],
      [`Method: ${data.method === 'direct' ? 'Direct' : 'Indirect'}`],
      [],
      ['OPERATING ACTIVITIES'],
      ['Description', 'Amount'],
      ...data.operating.items.map((item) => [item.description, item.amount.toFixed(2)]),
      ['Net Cash from Operating Activities', data.operating.total.toFixed(2)],
      [],
      ['INVESTING ACTIVITIES'],
      ['Description', 'Amount'],
      ...data.investing.items.map((item) => [item.description, item.amount.toFixed(2)]),
      ['Net Cash from Investing Activities', data.investing.total.toFixed(2)],
      [],
      ['FINANCING ACTIVITIES'],
      ['Description', 'Amount'],
      ...data.financing.items.map((item) => [item.description, item.amount.toFixed(2)]),
      ['Net Cash from Financing Activities', data.financing.total.toFixed(2)],
      [],
      ['Net Change in Cash', data.netChangeInCash.toFixed(2)],
      ['Beginning Cash Balance', data.beginningCashBalance.toFixed(2)],
      ['Ending Cash Balance', data.endingCashBalance.toFixed(2)],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cash_Flow_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const renderSection = (
    title: string,
    section: CashFlowSection,
    icon: React.ReactNode,
    bgClass: string,
    textClass: string
  ) => (
    <div className="grx-glass-card rounded-xl overflow-hidden">
      <div className={`p-4 border-b border-grx-primary-100 dark:border-grx-primary-800 ${bgClass}`}>
        <h3 className={`font-bold flex items-center gap-2 ${textClass}`}>
          {icon}
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
            <tr>
              <th className="px-6 py-2 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted">
                Description
              </th>
              <th className="px-6 py-2 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
            {section.items.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="px-6 py-6 text-center text-grx-muted dark:text-grx-muted"
                >
                  No items in this section
                </td>
              </tr>
            ) : (
              section.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                  <td className="px-6 py-3 text-grx-text dark:text-white">
                    {item.description}
                  </td>
                  <td
                    className={`px-6 py-3 text-right font-mono ${
                      item.amount >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {formatINR(item.amount)}
                  </td>
                </tr>
              ))
            )}
            <tr className="bg-grx-bg dark:bg-grx-dark font-bold border-t-2 border-grx-primary-100 dark:border-grx-primary-700">
              <td className="px-6 py-3 text-grx-text dark:text-white">
                Net Cash from {title}
              </td>
              <td
                className={`px-6 py-3 text-right font-mono ${
                  section.total >= 0
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {formatINR(section.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">
            Cash Flow Statement
          </h2>
          <p className="text-grx-muted dark:text-grx-muted">
            Sources and uses of cash for a period
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Method Toggle */}
          <div className="flex bg-grx-primary-50 dark:bg-grx-dark-surface p-1 rounded-lg">
            <button
              onClick={() => setMethod('indirect')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                method === 'indirect'
                  ? 'bg-white dark:bg-grx-primary-800 shadow-sm text-grx-text dark:text-white'
                  : 'text-grx-muted dark:text-grx-muted'
              }`}
            >
              Indirect
            </button>
            <button
              onClick={() => setMethod('direct')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                method === 'direct'
                  ? 'bg-white dark:bg-grx-primary-800 shadow-sm text-grx-text dark:text-white'
                  : 'text-grx-muted dark:text-grx-muted'
              }`}
            >
              Direct
            </button>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-grx-muted" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none text-sm"
            />
            <span className="text-grx-muted dark:text-grx-muted">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none text-sm"
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

      {/* Error */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-grx-primary-600" size={32} />
          <span className="ml-2 text-grx-muted dark:text-grx-muted">
            Loading cash flow statement...
          </span>
        </div>
      ) : data ? (
        <div className="space-y-6 grx-animate-fade-in-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                <Wallet size={16} /> Operating
              </p>
              <p
                className={`text-xl font-bold ${
                  data.operating.total >= 0
                    ? 'text-blue-900 dark:text-blue-100'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {formatINR(data.operating.total)}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                <Building2 size={16} /> Investing
              </p>
              <p
                className={`text-xl font-bold ${
                  data.investing.total >= 0
                    ? 'text-purple-900 dark:text-purple-100'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {formatINR(data.investing.total)}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                <Banknote size={16} /> Financing
              </p>
              <p
                className={`text-xl font-bold ${
                  data.financing.total >= 0
                    ? 'text-amber-900 dark:text-amber-100'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {formatINR(data.financing.total)}
              </p>
            </div>
            <div
              className={`p-5 rounded-xl border ${
                data.netChangeInCash >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
              }`}
            >
              <p
                className={`text-sm mb-1 flex items-center gap-1 ${
                  data.netChangeInCash >= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-700 dark:text-rose-300'
                }`}
              >
                <ArrowRightLeft size={16} /> Net Change
              </p>
              <p
                className={`text-xl font-bold flex items-center gap-2 ${
                  data.netChangeInCash >= 0
                    ? 'text-emerald-900 dark:text-emerald-100'
                    : 'text-rose-900 dark:text-rose-100'
                }`}
              >
                {data.netChangeInCash >= 0 ? (
                  <TrendingUp size={20} />
                ) : (
                  <TrendingDown size={20} />
                )}
                {formatINR(data.netChangeInCash)}
              </p>
            </div>
          </div>

          {/* Sections */}
          {renderSection(
            'Operating Activities',
            data.operating,
            <Wallet size={18} />,
            'bg-blue-50 dark:bg-blue-900/20',
            'text-blue-900 dark:text-blue-300'
          )}

          {renderSection(
            'Investing Activities',
            data.investing,
            <Building2 size={18} />,
            'bg-purple-50 dark:bg-purple-900/20',
            'text-purple-900 dark:text-purple-300'
          )}

          {renderSection(
            'Financing Activities',
            data.financing,
            <Banknote size={18} />,
            'bg-amber-50 dark:bg-amber-900/20',
            'text-amber-900 dark:text-amber-300'
          )}

          {/* Net Change in Cash Summary */}
          <div className="grx-glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-grx-primary-100 dark:border-grx-primary-800 bg-grx-bg dark:bg-grx-dark">
              <h3 className="font-bold text-grx-text dark:text-white">Cash Summary</h3>
            </div>
            <div className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
              <div className="flex justify-between items-center px-6 py-4">
                <span className="text-grx-text dark:text-grx-primary-200">
                  Net Cash from Operating Activities
                </span>
                <span
                  className={`font-mono font-semibold ${
                    data.operating.total >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {formatINR(data.operating.total)}
                </span>
              </div>
              <div className="flex justify-between items-center px-6 py-4">
                <span className="text-grx-text dark:text-grx-primary-200">
                  Net Cash from Investing Activities
                </span>
                <span
                  className={`font-mono font-semibold ${
                    data.investing.total >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {formatINR(data.investing.total)}
                </span>
              </div>
              <div className="flex justify-between items-center px-6 py-4">
                <span className="text-grx-text dark:text-grx-primary-200">
                  Net Cash from Financing Activities
                </span>
                <span
                  className={`font-mono font-semibold ${
                    data.financing.total >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {formatINR(data.financing.total)}
                </span>
              </div>
              <div className="flex justify-between items-center px-6 py-4 bg-grx-primary-50 dark:bg-grx-primary-900/20 font-bold border-t-2 border-grx-primary-200 dark:border-grx-primary-800">
                <span className="text-grx-text dark:text-white">Net Change in Cash</span>
                <span
                  className={`font-mono ${
                    data.netChangeInCash >= 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {formatINR(data.netChangeInCash)}
                </span>
              </div>
              <div className="flex justify-between items-center px-6 py-4">
                <span className="text-grx-text dark:text-grx-primary-200">Beginning Cash Balance</span>
                <span className="font-mono font-semibold text-grx-text dark:text-grx-primary-200">
                  {formatINR(data.beginningCashBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center px-6 py-4 bg-grx-bg dark:bg-grx-dark font-bold">
                <span className="text-grx-text dark:text-white">Ending Cash Balance</span>
                <span className="font-mono text-lg text-grx-text dark:text-white">
                  {formatINR(data.endingCashBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grx-glass-card rounded-xl p-8 text-center text-grx-muted dark:text-grx-muted">
          No data available. Please ensure transactions are recorded.
        </div>
      )}
    </div>
  );
};

export default CashFlowReportPage;
