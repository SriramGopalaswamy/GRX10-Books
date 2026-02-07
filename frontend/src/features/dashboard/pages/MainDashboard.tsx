import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Briefcase,
  Receipt,
  BarChart3,
  ArrowRight,
  UserPlus,
  CalendarCheck,
  Wallet
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { View } from '../../../shared/types';
import { SkeletonDashboard } from '../../../shared/design-system/SkeletonLoader';

interface DashboardStats {
  hrms: {
    totalEmployees: number;
    newEmployeesThisMonth: number;
    attendanceRate: number;
    presentCount: number;
    absentCount: number;
    pendingLeaves: number;
    totalGrossSalary: number;
    totalNetPay: number;
    totalDeductions: number;
    payslipCount: number;
  };
  financial: {
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    totalReceivables: number;
    revenueThisMonth: number;
  };
  os: {
    totalGoals: number;
    completedGoals: number;
    inProgressGoals: number;
    goalCompletionRate: number;
    totalMemos: number;
    pendingMemos: number;
  };
  recentActivity: {
    leaves: Array<{
      id: string;
      employeeName: string;
      type: string;
      startDate: string;
      endDate: string;
      status: string;
      createdAt: string;
    }>;
    attendance: Array<{
      id: string;
      employeeName: string;
      date: string;
      status: string;
      checkIn: string;
      checkOut: string;
    }>;
  };
}

interface MainDashboardProps {
  onChangeView: (view: View) => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ onChangeView }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const userRole = user?.role || 'Employee';
  const isAdmin = userRole === 'Admin' || userRole === 'HR' || userRole === 'Finance';
  const isManager = userRole === 'Manager';
  const isEmployee = userRole === 'Employee';

  const getHeaderMessage = () => {
    if (isAdmin) return "Here's what's happening with your business today";
    if (isManager) return "Here's what's happening with your team today";
    return "Here's your personal dashboard";
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96 grx-animate-fade-in">
        <div className="text-center">
          <AlertCircle size={40} className="text-grx-accent mx-auto mb-3" />
          <p className="text-grx-muted font-medium">Failed to load dashboard data</p>
          <button
            onClick={() => { setLoading(true); fetchDashboardStats(); }}
            className="mt-3 px-4 py-2 bg-grx-primary text-white rounded-lg text-sm grx-btn-press grx-focus-ring hover:bg-grx-primary-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-grx-text dark:text-white">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h2>
          <p className="text-grx-muted mt-1">{getHeaderMessage()}</p>
        </div>
        <div className="text-sm text-grx-muted">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 grx-stagger">
        {/* Total Employees */}
        {(isAdmin || isManager) && (
          <div
            className="bg-white dark:bg-grx-dark-surface p-5 rounded-xl border border-slate-100 dark:border-grx-primary-800 hover:border-grx-primary-200 dark:hover:border-grx-primary-600 transition-all duration-200 cursor-pointer group"
            style={{ boxShadow: 'var(--shadow-sm)' }}
            onClick={() => onChangeView(View.EMPLOYEES)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-medium text-grx-muted">
                  {isManager ? 'Team Members' : 'Total Employees'}
                </p>
                <h3 className="text-2xl font-bold text-grx-text dark:text-white mt-1">{stats.hrms.totalEmployees}</h3>
              </div>
              <div className="p-2.5 bg-grx-primary-50 dark:bg-grx-primary-800 rounded-lg text-grx-primary dark:text-grx-primary-300 group-hover:scale-110 transition-transform duration-200">
                <Users size={20} />
              </div>
            </div>
            <div className="flex items-center text-xs text-grx-muted">
              <UserPlus size={12} className="mr-1" />
              <span>{stats.hrms.newEmployeesThisMonth} new this month</span>
            </div>
          </div>
        )}

        {/* Attendance Rate */}
        <div
          className="bg-white dark:bg-grx-dark-surface p-5 rounded-xl border border-slate-100 dark:border-grx-primary-800 hover:border-grx-primary-200 dark:hover:border-grx-primary-600 transition-all duration-200 cursor-pointer group"
          style={{ boxShadow: 'var(--shadow-sm)' }}
          onClick={() => onChangeView(View.ATTENDANCE)}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-medium text-grx-muted">
                {isEmployee ? 'My Attendance' : isManager ? 'Team Attendance' : 'Attendance Rate'}
              </p>
              <h3 className="text-2xl font-bold text-grx-text dark:text-white mt-1">{stats.hrms.attendanceRate}%</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-200">
              <CalendarCheck size={20} />
            </div>
          </div>
          <div className="flex items-center text-xs text-grx-muted">
            <CheckCircle size={12} className="mr-1 text-emerald-500" />
            <span>{stats.hrms.presentCount} present, {stats.hrms.absentCount} absent</span>
          </div>
        </div>

        {/* Total Receivables */}
        {isAdmin && (
          <div
            className="bg-white dark:bg-grx-dark-surface p-5 rounded-xl border border-slate-100 dark:border-grx-primary-800 hover:border-grx-primary-200 dark:hover:border-grx-primary-600 transition-all duration-200 cursor-pointer group"
            style={{ boxShadow: 'var(--shadow-sm)' }}
            onClick={() => onChangeView(View.INVOICES)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-medium text-grx-muted">Total Receivables</p>
                <h3 className="text-2xl font-bold text-grx-text dark:text-white mt-1">{formatINR(stats.financial.totalReceivables)}</h3>
              </div>
              <div className="p-2.5 bg-grx-accent-50 dark:bg-grx-accent-900/20 rounded-lg text-grx-accent dark:text-grx-accent-300 group-hover:scale-110 transition-transform duration-200">
                <Receipt size={20} />
              </div>
            </div>
            <div className="flex items-center text-xs text-grx-muted">
              <AlertCircle size={12} className="mr-1 text-amber-500" />
              <span>{stats.financial.overdueInvoices} overdue invoices</span>
            </div>
          </div>
        )}

        {/* Revenue This Month */}
        {isAdmin && (
          <div
            className="bg-white dark:bg-grx-dark-surface p-5 rounded-xl border border-slate-100 dark:border-grx-primary-800 hover:border-grx-primary-200 dark:hover:border-grx-primary-600 transition-all duration-200 cursor-pointer group"
            style={{ boxShadow: 'var(--shadow-sm)' }}
            onClick={() => onChangeView(View.ACCOUNTING)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-medium text-grx-muted">Revenue (This Month)</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(stats.financial.revenueThisMonth)}</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-200">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="flex items-center text-xs text-grx-muted">
              <BarChart3 size={12} className="mr-1" />
              <span>{stats.financial.paidInvoices} paid invoices</span>
            </div>
          </div>
        )}

        {/* My Leave Balance */}
        {isEmployee && (
          <div
            className="bg-white dark:bg-grx-dark-surface p-5 rounded-xl border border-slate-100 dark:border-grx-primary-800 hover:border-grx-primary-200 dark:hover:border-grx-primary-600 transition-all duration-200 cursor-pointer group"
            style={{ boxShadow: 'var(--shadow-sm)' }}
            onClick={() => onChangeView(View.LEAVES)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-medium text-grx-muted">My Leave Balance</p>
                <h3 className="text-2xl font-bold text-grx-primary dark:text-grx-primary-300 mt-1">{stats.hrms.pendingLeaves}</h3>
              </div>
              <div className="p-2.5 bg-grx-primary-50 dark:bg-grx-primary-800 rounded-lg text-grx-primary dark:text-grx-primary-300 group-hover:scale-110 transition-transform duration-200">
                <Calendar size={20} />
              </div>
            </div>
            <div className="flex items-center text-xs text-grx-muted">
              <Clock size={12} className="mr-1" />
              <span>Pending requests</span>
            </div>
          </div>
        )}

        {/* My Payroll */}
        {isEmployee && (
          <div
            className="bg-white dark:bg-grx-dark-surface p-5 rounded-xl border border-slate-100 dark:border-grx-primary-800 hover:border-grx-primary-200 dark:hover:border-grx-primary-600 transition-all duration-200 cursor-pointer group"
            style={{ boxShadow: 'var(--shadow-sm)' }}
            onClick={() => onChangeView(View.PAYROLL)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-medium text-grx-muted">My Payroll</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(stats.hrms.totalNetPay)}</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-200">
                <Wallet size={20} />
              </div>
            </div>
            <div className="flex items-center text-xs text-grx-muted">
              <span>This month</span>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 grx-stagger">
        {/* Pending Leaves */}
        {(isAdmin || isManager) && (
          <div
            className="bg-white dark:bg-grx-dark-surface p-5 rounded-xl border border-slate-100 dark:border-grx-primary-800 hover:border-grx-primary-200 dark:hover:border-grx-primary-600 transition-all duration-200 cursor-pointer group"
            style={{ boxShadow: 'var(--shadow-sm)' }}
            onClick={() => onChangeView(View.LEAVES)}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-grx-muted">
                  {isManager ? 'Team Leave Requests' : 'Pending Leave Requests'}
                </p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.hrms.pendingLeaves}</h3>
              </div>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                <Clock size={20} />
              </div>
            </div>
          </div>
        )}

        {/* Payroll This Month */}
        {(isAdmin || isManager) && (
          <div
            className="bg-white dark:bg-grx-dark-surface p-5 rounded-xl border border-slate-100 dark:border-grx-primary-800 hover:border-grx-primary-200 dark:hover:border-grx-primary-600 transition-all duration-200 cursor-pointer group"
            style={{ boxShadow: 'var(--shadow-sm)' }}
            onClick={() => onChangeView(View.PAYROLL)}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-grx-muted">
                  {isManager ? 'Team Payroll' : 'Payroll (This Month)'}
                </p>
                <h3 className="text-2xl font-bold text-grx-primary dark:text-grx-primary-300 mt-1">{formatINR(stats.hrms.totalNetPay)}</h3>
              </div>
              <div className="p-2.5 bg-grx-primary-50 dark:bg-grx-primary-800 rounded-lg text-grx-primary dark:text-grx-primary-300">
                <Wallet size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-grx-muted">
              {stats.hrms.payslipCount} payslips processed
            </div>
          </div>
        )}

        {/* Goal Completion */}
        <div
          className="bg-white dark:bg-grx-dark-surface p-5 rounded-xl border border-slate-100 dark:border-grx-primary-800 hover:border-grx-primary-200 dark:hover:border-grx-primary-600 transition-all duration-200 cursor-pointer group"
          style={{ boxShadow: 'var(--shadow-sm)' }}
          onClick={() => onChangeView(View.GOALS)}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-grx-muted">
                {isEmployee ? 'My Goals' : isManager ? 'Team Goals' : 'Goal Completion'}
              </p>
              <h3 className="text-2xl font-bold text-grx-accent dark:text-grx-accent-300 mt-1">{stats.os.goalCompletionRate}%</h3>
            </div>
            <div className="p-2.5 bg-grx-accent-50 dark:bg-grx-accent-900/20 rounded-lg text-grx-accent dark:text-grx-accent-300">
              <Target size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-grx-muted">
            {stats.os.completedGoals} of {stats.os.totalGoals} completed
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-grx-dark-surface p-6 rounded-xl border border-slate-100 dark:border-grx-primary-800" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-grx-text dark:text-white">Recent Activity</h3>
            <Clock size={18} className="text-grx-muted" />
          </div>

          <div className="space-y-3">
            {stats.recentActivity.leaves.slice(0, 3).map((leave) => (
              <div key={leave.id} className="flex items-center justify-between p-3 bg-grx-bg dark:bg-grx-primary-800/50 rounded-lg transition-colors hover:bg-grx-primary-50 dark:hover:bg-grx-primary-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-grx-primary-50 dark:bg-grx-primary-800 rounded-lg">
                    <Calendar size={16} className="text-grx-primary dark:text-grx-primary-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-grx-text dark:text-white">
                      {leave.employeeName} - {leave.type}
                    </p>
                    <p className="text-xs text-grx-muted">
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  leave.status === 'Approved'
                    ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : leave.status === 'Pending'
                    ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}>
                  {leave.status}
                </span>
              </div>
            ))}

            {stats.recentActivity.leaves.length === 0 && (
              <div className="text-center py-8 text-grx-muted text-sm">
                No recent leave requests
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-grx-dark-surface p-6 rounded-xl border border-slate-100 dark:border-grx-primary-800" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-grx-text dark:text-white">Quick Actions</h3>
            <Briefcase size={18} className="text-grx-muted" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isAdmin && (
              <button
                onClick={() => onChangeView(View.EMPLOYEES)}
                className="p-4 bg-grx-primary-50 dark:bg-grx-primary-800/50 hover:bg-grx-primary-100 dark:hover:bg-grx-primary-800 rounded-lg text-left transition-colors duration-200 group grx-btn-press grx-focus-ring"
              >
                <UserPlus size={20} className="text-grx-primary dark:text-grx-primary-300 mb-2" />
                <p className="text-sm font-medium text-grx-text dark:text-white">Add Employee</p>
                <p className="text-xs text-grx-muted mt-1">Onboard new team member</p>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => onChangeView(View.INVOICES)}
                className="p-4 bg-grx-accent-50 dark:bg-grx-accent-900/10 hover:bg-grx-accent-100 dark:hover:bg-grx-accent-900/20 rounded-lg text-left transition-colors duration-200 group grx-btn-press grx-focus-ring"
              >
                <FileText size={20} className="text-grx-accent dark:text-grx-accent-300 mb-2" />
                <p className="text-sm font-medium text-grx-text dark:text-white">Create Invoice</p>
                <p className="text-xs text-grx-muted mt-1">Generate new invoice</p>
              </button>
            )}

            <button
              onClick={() => onChangeView(View.ATTENDANCE)}
              className="p-4 bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-lg text-left transition-colors duration-200 group grx-btn-press grx-focus-ring"
            >
              <CalendarCheck size={20} className="text-emerald-600 dark:text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-grx-text dark:text-white">
                {isEmployee ? 'My Attendance' : 'Check Attendance'}
              </p>
              <p className="text-xs text-grx-muted mt-1">View attendance logs</p>
            </button>

            {isEmployee && (
              <button
                onClick={() => onChangeView(View.LEAVES)}
                className="p-4 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 rounded-lg text-left transition-colors duration-200 group grx-btn-press grx-focus-ring"
              >
                <Calendar size={20} className="text-amber-600 dark:text-amber-400 mb-2" />
                <p className="text-sm font-medium text-grx-text dark:text-white">Request Leave</p>
                <p className="text-xs text-grx-muted mt-1">Apply for leave</p>
              </button>
            )}

            <button
              onClick={() => onChangeView(View.GOALS)}
              className="p-4 bg-grx-primary-50 dark:bg-grx-primary-800/50 hover:bg-grx-primary-100 dark:hover:bg-grx-primary-800 rounded-lg text-left transition-colors duration-200 group grx-btn-press grx-focus-ring"
            >
              <Target size={20} className="text-grx-primary dark:text-grx-primary-300 mb-2" />
              <p className="text-sm font-medium text-grx-text dark:text-white">Set Goals</p>
              <p className="text-xs text-grx-muted mt-1">Create new goals</p>
            </button>

            {isManager && (
              <button
                onClick={() => onChangeView(View.EMPLOYEES)}
                className="p-4 bg-grx-primary-50 dark:bg-grx-primary-800/50 hover:bg-grx-primary-100 dark:hover:bg-grx-primary-800 rounded-lg text-left transition-colors duration-200 group grx-btn-press grx-focus-ring"
              >
                <Users size={20} className="text-grx-primary dark:text-grx-primary-300 mb-2" />
                <p className="text-sm font-medium text-grx-text dark:text-white">View Team</p>
                <p className="text-xs text-grx-muted mt-1">Manage team members</p>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
