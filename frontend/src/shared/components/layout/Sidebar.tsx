import React, { useState } from 'react';
import {
  LayoutDashboard, FileText, Briefcase, Upload, MessageSquare, Settings, Landmark, LogOut,
  FileStack, Users, Calculator, TrendingUp, CalendarCheck, Banknote, Bot, Target,
  FileText as MemoIcon, ChevronDown, ChevronRight, ChevronLeft, Menu, Building2,
  FolderTree, UserCog, Calendar, MapPin, Code, Globe, BookOpen, Shield, Key,
  Workflow, CheckCircle2, UserCheck, Sun, Moon, BarChart3, FileSpreadsheet
} from 'lucide-react';
import { View } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { GRX10Logo } from '../../design-system/GRX10Logo';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  onCollapseChange?: (collapsed: boolean) => void;
  isCollapsed?: boolean;
}

interface MenuItem {
  id: View;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface MenuSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  items: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onCollapseChange, isCollapsed: externalCollapsed }) => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['financial', 'hrms', 'os', 'config', 'security', 'reports']));

  const handleToggle = () => {
    const newState = !isCollapsed;
    setInternalCollapsed(newState);
    onCollapseChange?.(newState);
  };

  const menuSections: MenuSection[] = [
    {
      id: 'financial',
      label: 'Financial Suite',
      icon: Calculator,
      items: [
        { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
        { id: View.CUSTOMERS, label: 'Customers', icon: Users },
        { id: View.ESTIMATES, label: 'Estimates', icon: FileText },
        { id: View.SALES_ORDERS, label: 'Sales Orders', icon: FileText },
        { id: View.INVOICES, label: 'Invoices (GST)', icon: FileText },
        { id: View.CREDIT_NOTES, label: 'Credit Notes', icon: FileText },
        { id: View.PAYMENTS, label: 'Payments', icon: Banknote },
        { id: View.VENDORS, label: 'Vendors', icon: Briefcase },
        { id: View.BILLS, label: 'Bills', icon: FileText },
        { id: View.VENDOR_CREDITS, label: 'Vendor Credits', icon: FileText },
        { id: View.JOURNAL_ENTRIES, label: 'Journal Entries', icon: BookOpen },
        { id: View.BANKING, label: 'Banking', icon: Landmark },
        { id: View.BANK_RECONCILIATION, label: 'Reconciliation', icon: CheckCircle2 },
        { id: View.ACCOUNTING, label: 'Accounting', icon: Calculator },
        { id: View.DOCUMENTS, label: 'Documents', icon: FileStack },
        { id: View.MIGRATION, label: 'Zoho Migration', icon: Upload },
        { id: View.ASSISTANT, label: 'AI Assistant', icon: MessageSquare },
      ]
    },
    {
      id: 'hrms',
      label: 'HRMS',
      icon: Users,
      items: [
        { id: View.HRMS_DASHBOARD, label: 'HR Dashboard', icon: LayoutDashboard },
        { id: View.EMPLOYEES, label: 'Employees', icon: Users },
        { id: View.ATTENDANCE, label: 'Attendance', icon: CalendarCheck },
        { id: View.LEAVES, label: 'Leaves', icon: Briefcase },
        { id: View.PAYROLL, label: 'Payroll', icon: Banknote },
        { id: View.POLICY_CHAT, label: 'HR Assistant', icon: Bot },
      ]
    },
    {
      id: 'os',
      label: 'Performance OS',
      icon: Target,
      items: [
        { id: View.OS_DASHBOARD, label: 'OS Dashboard', icon: LayoutDashboard },
        { id: View.GOALS, label: 'Goals', icon: Target },
        { id: View.MEMOS, label: 'Memos', icon: MemoIcon },
      ]
    },
    {
      id: 'config',
      label: 'Configuration',
      icon: Settings,
      items: [
        { id: View.CONFIG_ORGANIZATIONS, label: 'Organizations', icon: Building2 },
        { id: View.CONFIG_DEPARTMENTS, label: 'Departments', icon: FolderTree },
        { id: View.CONFIG_POSITIONS, label: 'Positions', icon: Briefcase },
        { id: View.CONFIG_ROLES, label: 'HRMS Roles', icon: UserCog },
        { id: View.CONFIG_EMPLOYEE_TYPES, label: 'Employee Types', icon: Users },
        { id: View.CONFIG_HOLIDAYS, label: 'Holidays', icon: Calendar },
        { id: View.CONFIG_LEAVE_TYPES, label: 'Leave Types', icon: CalendarCheck },
        { id: View.CONFIG_WORK_LOCATIONS, label: 'Work Locations', icon: MapPin },
        { id: View.CONFIG_SKILLS, label: 'Skills', icon: Code },
        { id: View.CONFIG_LANGUAGES, label: 'Languages', icon: Globe },
        { id: View.CONFIG_CHART_OF_ACCOUNTS, label: 'Chart of Accounts', icon: BookOpen },
      ]
    },
    {
      id: 'security',
      label: 'Security & Approvals',
      icon: Shield,
      items: [
        { id: View.SECURITY_ROLES, label: 'Roles', icon: UserCog },
        { id: View.SECURITY_PERMISSIONS, label: 'Permissions', icon: Key },
        { id: View.SECURITY_USER_ROLES, label: 'User Roles', icon: UserCheck },
        { id: View.SECURITY_APPROVAL_WORKFLOWS, label: 'Approval Workflows', icon: Workflow },
        { id: View.SECURITY_APPROVAL_REQUESTS, label: 'Approval Requests', icon: CheckCircle2 },
      ]
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      items: [
        { id: View.REPORT_TRIAL_BALANCE, label: 'Trial Balance', icon: FileSpreadsheet },
        { id: View.REPORT_BALANCE_SHEET, label: 'Balance Sheet', icon: FileSpreadsheet },
        { id: View.REPORT_PROFIT_LOSS, label: 'Profit & Loss', icon: FileSpreadsheet },
        { id: View.REPORT_CASHFLOW, label: 'Cash Flow', icon: FileSpreadsheet },
        { id: View.REPORT_BUDGET_VS_ACTUAL, label: 'Budget vs Actual', icon: FileSpreadsheet },
        { id: View.REPORT_VARIANCE, label: 'Variance Analysis', icon: FileSpreadsheet },
        { id: View.REPORT_EMPLOYEE_DIRECTORY, label: 'Employee Directory', icon: FileSpreadsheet },
        { id: View.REPORT_ATTENDANCE, label: 'Attendance Report', icon: FileSpreadsheet },
        { id: View.REPORT_LEAVES, label: 'Leave Report', icon: FileSpreadsheet },
        { id: View.REPORT_PAYROLL, label: 'Payroll Report', icon: FileSpreadsheet },
      ]
    }
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const isSectionExpanded = (sectionId: string) => expandedSections.has(sectionId);
  const isItemActive = (viewId: View) => currentView === viewId;

  return (
    <div
      className={`bg-grx-primary dark:bg-grx-primary-900 text-white h-screen flex flex-col fixed left-0 top-16 z-40 overflow-y-auto transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      style={{ boxShadow: '1px 0 0 rgba(255,255,255,0.06)' }}
    >
      {/* Navigation Sections */}
      <nav className={`flex-1 py-4 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {menuSections.map((section) => {
          const SectionIcon = section.icon;
          const isExpanded = isSectionExpanded(section.id);
          const hasActiveItem = section.items.some(item => isItemActive(item.id));

          if (isCollapsed) {
            return (
              <div key={section.id} className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => onChangeView(item.id)}
                      className={`w-full flex items-center justify-center p-2.5 rounded-lg transition-all duration-200 grx-btn-press grx-focus-ring ${
                        isActive
                          ? 'bg-grx-accent text-white shadow-md'
                          : 'text-grx-primary-200 hover:bg-white/10 hover:text-white'
                      }`}
                      title={item.label}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={section.id} className="space-y-0.5">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 grx-focus-ring ${
                  hasActiveItem
                    ? 'bg-white/10 text-grx-accent-200'
                    : 'text-grx-primary-200 hover:bg-white/5 hover:text-grx-primary-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <SectionIcon size={16} />
                  <span>{section.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown size={14} className="text-grx-primary-300" />
                ) : (
                  <ChevronRight size={14} className="text-grx-primary-300" />
                )}
              </button>

              {/* Section Items */}
              {isExpanded && (
                <div className="ml-3 space-y-0.5 border-l-2 border-grx-primary-600 pl-2 grx-animate-expand">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(item.id);

                    return (
                      <button
                        key={item.id}
                        onClick={() => onChangeView(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 grx-btn-press grx-focus-ring ${
                          isActive
                            ? 'bg-grx-accent text-white shadow-md'
                            : 'text-grx-primary-100 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon size={15} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-grx-primary-600 ${isCollapsed ? 'p-2' : 'p-3'} space-y-0.5`}>
        <button
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-3 py-2 text-grx-primary-200 hover:text-white text-sm font-medium hover:bg-white/10 rounded-lg transition-colors grx-btn-press grx-focus-ring`}
          title="Settings"
        >
          <Settings size={16} />
          {!isCollapsed && <span>Settings</span>}
        </button>
        <button
          onClick={async () => {
            await logout();
            window.location.reload();
          }}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-3 py-2 text-grx-accent-200 hover:text-grx-accent text-sm font-medium hover:bg-white/10 rounded-lg transition-colors grx-btn-press grx-focus-ring`}
          title="Logout"
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
