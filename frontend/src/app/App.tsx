
import React, { useState, useEffect } from 'react';
import Sidebar from '../shared/components/layout/Sidebar';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import MainDashboard from '../features/dashboard/pages/MainDashboard';
import FinanceDashboard from '../features/dashboard/pages/FinanceDashboard';
import InvoicesPage from '../features/invoices/pages/InvoicesPage';
import MigrationPage from '../features/migration/pages/MigrationPage';
import AiAssistantPage from '../features/ai-assistant/pages/AiAssistantPage';
import DocumentsPage from '../features/documents/pages/DocumentsPage';
import AccountingPage from '../features/accounting/pages/AccountingPage';
import BankingPage from '../features/banking/pages/BankingPage';
import VendorsPage from '../features/vendors/pages/VendorsPage';
import CustomersPage from '../features/customers/pages/CustomersPage';
import CashFlowPage from '../features/cashflow/pages/CashFlowPage';
import Login from '../shared/components/auth/Login';
// Finance Module Pages
import JournalEntriesPage from '../features/accounting/pages/JournalEntriesPage';
import FiscalYearsPage from '../features/accounting/pages/FiscalYearsPage';
import AuditLogPage from '../features/accounting/pages/AuditLogPage';
import BudgetsPage from '../features/accounting/pages/BudgetsPage';
import BillsPage from '../features/billing/pages/BillsPage';
import PaymentsPage from '../features/payments/pages/PaymentsPage';
import EstimatesPage from '../features/invoices/pages/EstimatesPage';
import SalesOrdersPage from '../features/invoices/pages/SalesOrdersPage';
import CreditNotesPage from '../features/invoices/pages/CreditNotesPage';
import VendorCreditsPage from '../features/billing/pages/VendorCreditsPage';
import BankReconciliationPage from '../features/banking/pages/BankReconciliationPage';
import CashFlowReportPage from '../features/reports/pages/CashFlowReportPage';
import BudgetVsActualPage from '../features/reports/pages/BudgetVsActualPage';
import VarianceReportPage from '../features/reports/pages/VarianceReportPage';
// HRMS Pages
import { Dashboard as HRMSDashboard } from '../features/hrms/pages/Dashboard';
import { Employees } from '../features/hrms/pages/Employees';
import { EmployeeDetails } from '../features/hrms/pages/EmployeeDetails';
import { Attendance } from '../features/hrms/pages/Attendance';
import { Leaves } from '../features/hrms/pages/Leaves';
import { Payroll } from '../features/hrms/pages/Payroll';
import { PolicyChat } from '../features/hrms/pages/PolicyChat';
import { HRMSProvider } from '../features/hrms/components/HRMSProvider';
// OS Pages
import { OSDashboardPage } from '../features/os/pages/OSDashboardPage';
import { GoalsPage } from '../features/os/pages/GoalsPage';
import { MemosPage } from '../features/os/pages/MemosPage';
// Configuration Pages
import { OrganizationsPage } from '../features/config/pages/OrganizationsPage';
import { DepartmentsPage } from '../features/config/pages/DepartmentsPage';
import { PositionsPage } from '../features/config/pages/PositionsPage';
import { RolesPage as ConfigRolesPage } from '../features/config/pages/RolesPage';
import { EmployeeTypesPage } from '../features/config/pages/EmployeeTypesPage';
import { HolidaysPage } from '../features/config/pages/HolidaysPage';
import { LeaveTypesPage } from '../features/config/pages/LeaveTypesPage';
import { WorkLocationsPage } from '../features/config/pages/WorkLocationsPage';
import { SkillsPage } from '../features/config/pages/SkillsPage';
import { LanguagesPage } from '../features/config/pages/LanguagesPage';
import { ChartOfAccountsPage } from '../features/config/pages/ChartOfAccountsPage';
// Security Pages
import { RolesPage } from '../features/security/pages/RolesPage';
import { PermissionsPage } from '../features/security/pages/PermissionsPage';
import { UserRolesPage } from '../features/security/pages/UserRolesPage';
import { ApprovalWorkflowsPage } from '../features/security/pages/ApprovalWorkflowsPage';
// Reports Pages
import { TrialBalancePage } from '../features/reports/pages/TrialBalancePage';
import { BalanceSheetPage } from '../features/reports/pages/BalanceSheetPage';
import { ProfitLossPage } from '../features/reports/pages/ProfitLossPage';
import { EmployeeDirectoryReportPage } from '../features/reports/pages/EmployeeDirectoryReportPage';
import { AttendanceReportPage } from '../features/reports/pages/AttendanceReportPage';
import { LeaveReportPage } from '../features/reports/pages/LeaveReportPage';
import { PayrollReportPage } from '../features/reports/pages/PayrollReportPage';
import { View, Invoice } from '../shared/types';
import { MOCK_INVOICES } from '../shared/constants/app.constants';
import { Loader2 } from 'lucide-react';
import { NotificationBell } from '../shared/components/NotificationBell';
import { ConfigurationProvider } from '../shared/contexts/ConfigurationContext';
import { ThemeProvider } from '../shared/contexts/ThemeContext';
import { AuthProvider } from '../shared/contexts/AuthContext';
import { EmployeeProvider } from '../shared/contexts/EmployeeContext';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      if (data.isAuthenticated) {
        setIsAuthenticated(true);
        setUser(data.user);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check failed", error);
      setIsAuthenticated(false);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleImport = (newInvoices: Invoice[]) => {
    setInvoices(prev => [...prev, ...newInvoices]);
    alert(`Successfully imported ${newInvoices.length} records.`);
  };

  const handleAddInvoice = (newInvoice: Invoice) => {
    setInvoices(prev => [newInvoice, ...prev]);
    setSelectedTemplate(null);
  };

  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setCurrentView(View.INVOICES);
  };

  const handleViewChange = (view: View, employeeId?: string) => {
    setCurrentView(view);
    if (employeeId) {
      setSelectedEmployeeId(employeeId);
    } else {
      setSelectedEmployeeId(null);
    }
  };

  const handleBackToEmployees = () => {
    setCurrentView(View.EMPLOYEES);
    setSelectedEmployeeId(null);
  };

  const renderContent = () => {
    // Show Finance Dashboard for Finance users, Main Dashboard for others
    const isFinanceUser = user?.role === 'Finance';
    
    switch (currentView) {
      case View.DASHBOARD: 
        return isFinanceUser 
          ? <FinanceDashboard onChangeView={setCurrentView} />
          : <MainDashboard onChangeView={setCurrentView} />;
      case View.INVOICES: return <InvoicesPage invoices={invoices} onCreateInvoice={handleAddInvoice} initialTemplateId={selectedTemplate} />;
      case View.MIGRATION: return <MigrationPage onImport={handleImport} />;
      case View.ASSISTANT: return <AiAssistantPage invoices={invoices} />;
      case View.DOCUMENTS: return <DocumentsPage onUseTemplate={handleUseTemplate} />;
      case View.ACCOUNTING: return <AccountingPage />;
      case View.BANKING: return <BankingPage />;
      case View.VENDORS: return <VendorsPage />;
      case View.CUSTOMERS: return <CustomersPage />;
      case View.CASHFLOW: return <CashFlowPage />;
      // Finance Module Views
      case View.ESTIMATES: return <EstimatesPage />;
      case View.SALES_ORDERS: return <SalesOrdersPage />;
      case View.CREDIT_NOTES: return <CreditNotesPage />;
      case View.BILLS: return <BillsPage />;
      case View.VENDOR_CREDITS: return <VendorCreditsPage />;
      case View.PAYMENTS: return <PaymentsPage />;
      case View.JOURNAL_ENTRIES: return <JournalEntriesPage />;
      case View.BANK_RECONCILIATION: return <BankReconciliationPage />;
      case View.FISCAL_YEARS: return <FiscalYearsPage />;
      case View.BUDGETS: return <BudgetsPage />;
      case View.AUDIT_LOG: return <AuditLogPage />;
      // HRMS Views (wrapped with HRMSProvider for context)
      case View.HRMS_DASHBOARD: return <HRMSProvider><HRMSDashboard /></HRMSProvider>;
      case View.EMPLOYEES: return <HRMSProvider><Employees onViewChange={handleViewChange} /></HRMSProvider>;
      case View.EMPLOYEE_DETAILS: return selectedEmployeeId ? (
        <HRMSProvider>
          <EmployeeDetails 
            employeeId={selectedEmployeeId} 
            onBack={handleBackToEmployees}
            onViewChange={handleViewChange}
          />
        </HRMSProvider>
      ) : (
        <HRMSProvider><Employees onViewChange={handleViewChange} /></HRMSProvider>
      );
      case View.ATTENDANCE: return <HRMSProvider><Attendance /></HRMSProvider>;
      case View.LEAVES: return <HRMSProvider><Leaves /></HRMSProvider>;
      case View.PAYROLL: return <HRMSProvider><Payroll /></HRMSProvider>;
      case View.POLICY_CHAT: return <HRMSProvider><PolicyChat /></HRMSProvider>;
      // OS Views
      case View.OS_DASHBOARD: return <OSDashboardPage />;
      case View.GOALS: return <HRMSProvider><GoalsPage /></HRMSProvider>;
      case View.MEMOS: return <MemosPage />;
      // Configuration Views
      case View.CONFIG_ORGANIZATIONS: return <OrganizationsPage />;
      case View.CONFIG_DEPARTMENTS: return <DepartmentsPage />;
      case View.CONFIG_POSITIONS: return <PositionsPage />;
      case View.CONFIG_ROLES: return <RolesPage />;
      case View.CONFIG_EMPLOYEE_TYPES: return <EmployeeTypesPage />;
      case View.CONFIG_HOLIDAYS: return <HolidaysPage />;
      case View.CONFIG_LEAVE_TYPES: return <LeaveTypesPage />;
      case View.CONFIG_WORK_LOCATIONS: return <WorkLocationsPage />;
      case View.CONFIG_SKILLS: return <SkillsPage />;
      case View.CONFIG_LANGUAGES: return <LanguagesPage />;
      case View.CONFIG_CHART_OF_ACCOUNTS: return <ChartOfAccountsPage />;
      // Security Views
      case View.SECURITY_ROLES: return <RolesPage />;
      case View.SECURITY_PERMISSIONS: return <PermissionsPage />;
      case View.SECURITY_USER_ROLES: return <UserRolesPage />;
      case View.SECURITY_APPROVAL_WORKFLOWS: return <ApprovalWorkflowsPage />;
      case View.SECURITY_APPROVAL_REQUESTS: return <div className="p-8"><h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Approval Requests</h2><p className="text-slate-600 dark:text-slate-400 mt-2">Approval requests page coming soon...</p></div>;
      // Reports Views
      case View.REPORT_TRIAL_BALANCE: return <TrialBalancePage />;
      case View.REPORT_BALANCE_SHEET: return <BalanceSheetPage />;
      case View.REPORT_PROFIT_LOSS: return <ProfitLossPage />;
      case View.REPORT_EMPLOYEE_DIRECTORY: return <EmployeeDirectoryReportPage />;
      case View.REPORT_ATTENDANCE: return <AttendanceReportPage />;
      case View.REPORT_LEAVES: return <LeaveReportPage />;
      case View.REPORT_PAYROLL: return <PayrollReportPage />;
      case View.REPORT_CASHFLOW: return <CashFlowReportPage />;
      case View.REPORT_BUDGET_VS_ACTUAL: return <BudgetVsActualPage />;
      case View.REPORT_VARIANCE: return <VarianceReportPage />;
      default: return <DashboardPage invoices={invoices} />;
    }
  };

  if (isAuthLoading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={48} />
        </div>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <Login />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <EmployeeProvider>
        <AuthProvider>
          <ConfigurationProvider>
            <div className="flex min-h-screen bg-[#f8fafc] dark:bg-slate-900">
              <Sidebar 
                currentView={currentView} 
                onChangeView={setCurrentView}
                onCollapseChange={setIsSidebarCollapsed}
              />
              <main className={`flex-1 transition-all duration-300 bg-slate-50 dark:bg-slate-900 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
                <div className="flex justify-end items-center px-8 pt-4 pb-0">
                  <NotificationBell />
                </div>
                <div className="p-8 pt-2">
                  {renderContent()}
                </div>
              </main>
            </div>
          </ConfigurationProvider>
        </AuthProvider>
      </EmployeeProvider>
    </ThemeProvider>
  );
};

export default App;
