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

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  onCollapseChange?: (collapsed: boolean) => void;
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

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onCollapseChange }) => {
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['financial', 'hrms', 'os', 'config', 'security', 'reports']));

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
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
      className={`bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 shadow-xl z-40 overflow-y-auto transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className={`border-b border-slate-800 transition-all duration-300 ${isCollapsed ? 'p-4' : 'p-6'}`}>
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <button
              onClick={() => onChangeView(View.DASHBOARD)}
              className="text-left hover:opacity-80 transition-opacity cursor-pointer"
            >
              <h1 className="text-2xl font-bold text-emerald-400 tracking-tight">GRX10</h1>
              <p className="text-xs text-slate-400 mt-1">Financial Suite</p>
            </button>
            <button
              onClick={handleToggle}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => onChangeView(View.DASHBOARD)}
              className="text-xl font-bold text-emerald-400 tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
            >
              G
            </button>
            <button
              onClick={handleToggle}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Expand sidebar"
            >
              <Menu size={18} />
            </button>
          </div>
        )}
      </div>

        {/* Navigation Sections */}
        <nav className={`flex-1 py-6 space-y-2 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {menuSections.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = isSectionExpanded(section.id);
            const hasActiveItem = section.items.some(item => isItemActive(item.id));

            if (isCollapsed) {
              // Collapsed view: Show only icons, no sections
              return (
                <div key={section.id} className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(item.id);
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => onChangeView(item.id)}
                        className={`w-full flex items-center justify-center p-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                        title={item.label}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  })}
                </div>
              );
            }

            // Expanded view: Show sections with labels
            return (
              <div key={section.id} className="space-y-1">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    hasActiveItem
                      ? 'bg-slate-800 text-emerald-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <SectionIcon size={18} />
                    <span>{section.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-slate-500" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-500" />
                  )}
                </button>

                {/* Section Items (Second Level) */}
                {isExpanded && (
                  <div className="ml-4 space-y-1 border-l-2 border-slate-800 pl-2">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isItemActive(item.id);
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => onChangeView(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Icon size={16} />
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
        <div className={`border-t border-slate-800 ${isCollapsed ? 'p-2' : 'p-4'} space-y-1`}>
          <button 
            onClick={toggleTheme}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 text-slate-400 hover:text-white text-sm font-medium hover:bg-slate-800 rounded-lg transition-colors`}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button 
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 text-slate-400 hover:text-white text-sm font-medium hover:bg-slate-800 rounded-lg transition-colors`}
            title="Settings"
          >
            <Settings size={18} />
            {!isCollapsed && <span>Settings</span>}
          </button>
          <button 
            onClick={async () => {
              await logout();
              window.location.reload();
            }}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 text-red-400 hover:text-red-300 text-sm font-medium hover:bg-slate-800 rounded-lg transition-colors`}
            title="Logout"
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
  );
};

export default Sidebar;
