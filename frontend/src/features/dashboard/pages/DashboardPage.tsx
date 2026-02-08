import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { MOCK_CASHFLOW, MOCK_INVOICES } from '../../../shared/constants/app.constants';
import { Invoice, InvoiceStatus } from '../../../shared/types';

interface DashboardProps {
  invoices: Invoice[];
}

const Dashboard: React.FC<DashboardProps> = ({ invoices }) => {
  
  const totalReceivables = invoices
    .filter(i => i.status !== InvoiceStatus.PAID)
    .reduce((acc, curr) => acc + curr.total, 0);

  const totalOverdue = invoices
    .filter(i => i.status === InvoiceStatus.OVERDUE)
    .reduce((acc, curr) => acc + curr.total, 0);

  const revenueThisMonth = invoices
    .filter(i => i.status === InvoiceStatus.PAID) // Simplified logic
    .reduce((acc, curr) => acc + curr.total, 0);

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Dashboard</h2>
          <p className="text-grx-muted dark:text-grx-muted">Financial Overview for FY 2024-25</p>
        </div>
        <div className="flex gap-2">
             <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">GST Compliant</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-grx-dark-surface p-6 rounded-xl shadow-sm border border-grx-primary-50 dark:border-grx-primary-800 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-grx-muted dark:text-grx-muted mb-1">Total Receivables</p>
              <h3 className="text-2xl font-bold text-grx-text dark:text-white">{formatINR(totalReceivables)}</h3>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-grx-muted dark:text-grx-muted">
            <span className="text-emerald-500 dark:text-emerald-400 font-medium flex items-center gap-1 mr-2">
              <TrendingUp size={12} /> +12.5%
            </span>
            from last month
          </div>
        </div>

        <div className="bg-white dark:bg-grx-dark-surface p-6 rounded-xl shadow-sm border border-grx-primary-50 dark:border-grx-primary-800 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-grx-muted dark:text-grx-muted mb-1">Total Overdue</p>
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{formatINR(totalOverdue)}</h3>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <AlertCircle size={20} />
            </div>
          </div>
           <div className="mt-4 flex items-center text-xs text-grx-muted dark:text-grx-muted">
            <span className="text-red-500 dark:text-red-400 font-medium flex items-center gap-1 mr-2">
              <TrendingUp size={12} /> +2.1%
            </span>
            action needed
          </div>
        </div>

        <div className="bg-white dark:bg-grx-dark-surface p-6 rounded-xl shadow-sm border border-grx-primary-50 dark:border-grx-primary-800 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-grx-muted dark:text-grx-muted mb-1">Revenue (YTD)</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatINR(revenueThisMonth * 12.4)}</h3>
            </div>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-grx-muted dark:text-grx-muted">
             On track for FY targets
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <div className="bg-white dark:bg-grx-dark-surface p-6 rounded-xl shadow-sm border border-grx-primary-50 dark:border-grx-primary-800">
          <h3 className="text-lg font-semibold text-grx-text dark:text-white mb-6">Cash Flow</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_CASHFLOW}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-grx-primary-800" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} className="dark:text-grx-muted" />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} tickFormatter={(val) => `₹${val/1000}k`} className="dark:text-grx-muted" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => formatINR(val)}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown (Mock Bar Chart) */}
        <div className="bg-white dark:bg-grx-dark-surface p-6 rounded-xl shadow-sm border border-grx-primary-50 dark:border-grx-primary-800">
          <h3 className="text-lg font-semibold text-grx-text dark:text-white mb-6">Income vs Expense</h3>
           <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_CASHFLOW}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-grx-primary-800" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} className="dark:text-grx-muted" />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} className="dark:text-grx-muted" />
                <Tooltip 
                   cursor={{fill: '#f1f5f9'}}
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                <Bar dataKey="income" name="Income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;