import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Receipt,
  AlertCircle,
  BarChart3,
  Wallet,
  CreditCard,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { View } from '../../../shared/types';

interface FinanceStats {
  financial: {
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalReceivables: number;
    revenueThisMonth: number;
  };
}

interface FinanceDashboardProps {
  onChangeView: (view: View) => void;
}

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ onChangeView }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/dashboard/summary', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Dashboard API error:', res.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-grx-muted dark:text-grx-muted">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-400">Failed to load dashboard data</div>
      </div>
    );
  }

  const collectionRate = stats.financial.totalInvoices > 0 
    ? ((stats.financial.paidInvoices / stats.financial.totalInvoices) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-grx-text dark:text-white">Financial Dashboard</h2>
          <p className="text-grx-muted dark:text-grx-muted mt-1">Financial overview and key metrics</p>
        </div>
        <div className="text-sm text-grx-muted dark:text-grx-muted">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 grx-stagger">
        {/* Total Receivables */}
        <div 
          className="grx-glass-card p-5 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => onChangeView(View.INVOICES)}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-medium text-grx-muted dark:text-grx-muted">Total Receivables</p>
              <h3 className="text-2xl font-bold text-grx-text dark:text-white mt-1">{formatINR(stats.financial.totalReceivables)}</h3>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <Receipt size={20} />
            </div>
          </div>
          <div className="flex items-center text-xs text-grx-muted dark:text-grx-muted">
            <AlertCircle size={12} className="mr-1 text-amber-500" />
            <span>{stats.financial.overdueInvoices} overdue invoices</span>
          </div>
        </div>

        {/* Revenue This Month */}
        <div 
          className="grx-glass-card p-5 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => onChangeView(View.ACCOUNTING)}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-medium text-grx-muted dark:text-grx-muted">Revenue (This Month)</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(stats.financial.revenueThisMonth)}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex items-center text-xs text-grx-muted dark:text-grx-muted">
            <BarChart3 size={12} className="mr-1" />
            <span>{stats.financial.paidInvoices} paid invoices</span>
          </div>
        </div>

        {/* Total Invoices */}
        <div 
          className="grx-glass-card p-5 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => onChangeView(View.INVOICES)}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-medium text-grx-muted dark:text-grx-muted">Total Invoices</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.financial.totalInvoices}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <FileText size={20} />
            </div>
          </div>
          <div className="flex items-center text-xs text-grx-muted dark:text-grx-muted">
            <span>{stats.financial.pendingInvoices} pending</span>
          </div>
        </div>

        {/* Collection Rate */}
        <div 
          className="grx-glass-card p-5 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => onChangeView(View.INVOICES)}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-medium text-grx-muted dark:text-grx-muted">Collection Rate</p>
              <h3 className="text-2xl font-bold text-grx-primary-600 dark:text-grx-primary-400 mt-1">{collectionRate}%</h3>
            </div>
            <div className="p-2.5 bg-grx-primary-50 dark:bg-grx-primary-900/30 rounded-lg text-grx-primary-600 dark:text-grx-primary-400 group-hover:scale-110 transition-transform">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="flex items-center text-xs text-grx-muted dark:text-grx-muted">
            <span>{stats.financial.paidInvoices} of {stats.financial.totalInvoices} collected</span>
          </div>
        </div>
      </div>

      {/* Secondary Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 grx-stagger">
        {/* Paid Invoices */}
        <div 
          className="grx-glass-card p-5 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => onChangeView(View.INVOICES)}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-grx-muted dark:text-grx-muted">Paid Invoices</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.financial.paidInvoices}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>

        {/* Pending Invoices */}
        <div 
          className="grx-glass-card p-5 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => onChangeView(View.INVOICES)}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-grx-muted dark:text-grx-muted">Pending Invoices</p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.financial.pendingInvoices}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Overdue Invoices */}
        <div 
          className="grx-glass-card p-5 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800 hover:shadow-md transition-all cursor-pointer group"
          onClick={() => onChangeView(View.INVOICES)}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-grx-muted dark:text-grx-muted">Overdue Invoices</p>
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.financial.overdueInvoices}</h3>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <AlertCircle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grx-glass-card p-6 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-grx-text dark:text-white">Quick Actions</h3>
          <DollarSign size={18} className="text-grx-muted dark:text-grx-muted" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onChangeView(View.INVOICES)}
            className="p-4 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg text-left transition-colors group"
          >
            <FileText size={20} className="text-purple-600 dark:text-purple-400 mb-2" />
            <p className="text-sm font-medium text-grx-text dark:text-white">Create Invoice</p>
            <p className="text-xs text-grx-muted dark:text-grx-muted mt-1">Generate new invoice</p>
          </button>

          <button
            onClick={() => onChangeView(View.CUSTOMERS)}
            className="p-4 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-left transition-colors group"
          >
            <Users size={20} className="text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-sm font-medium text-grx-text dark:text-white">Manage Customers</p>
            <p className="text-xs text-grx-muted dark:text-grx-muted mt-1">View customer list</p>
          </button>

          <button
            onClick={() => onChangeView(View.ACCOUNTING)}
            className="p-4 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-left transition-colors group"
          >
            <BarChart3 size={20} className="text-emerald-600 dark:text-emerald-400 mb-2" />
            <p className="text-sm font-medium text-grx-text dark:text-white">View Reports</p>
            <p className="text-xs text-grx-muted dark:text-grx-muted mt-1">Financial reports</p>
          </button>

          <button
            onClick={() => onChangeView(View.BANKING)}
            className="p-4 bg-grx-primary-50 dark:bg-grx-primary-900/30 hover:bg-grx-primary-100 dark:hover:bg-grx-primary-900/50 rounded-lg text-left transition-colors group"
          >
            <Wallet size={20} className="text-grx-primary-600 dark:text-grx-primary-400 mb-2" />
            <p className="text-sm font-medium text-grx-text dark:text-white">Banking</p>
            <p className="text-xs text-grx-muted dark:text-grx-muted mt-1">Bank transactions</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;

