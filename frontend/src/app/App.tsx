
import React, { useState, useEffect } from 'react';
import Sidebar from '../shared/components/layout/Sidebar';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
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
// HRMS Pages
import { Dashboard as HRMSDashboard } from '../features/hrms/pages/Dashboard';
import { Employees } from '../features/hrms/pages/Employees';
import { Attendance } from '../features/hrms/pages/Attendance';
import { Leaves } from '../features/hrms/pages/Leaves';
import { Payroll } from '../features/hrms/pages/Payroll';
import { PolicyChat } from '../features/hrms/pages/PolicyChat';
import { HRMSProvider } from '../features/hrms/components/HRMSProvider';
// OS Pages
import { OSDashboardPage } from '../features/os/pages/OSDashboardPage';
import { GoalsPage } from '../features/os/pages/GoalsPage';
import { MemosPage } from '../features/os/pages/MemosPage';
import { View, Invoice } from '../shared/types';
import { MOCK_INVOICES } from '../shared/constants/app.constants';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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

  const renderContent = () => {
    switch (currentView) {
      case View.DASHBOARD: return <DashboardPage invoices={invoices} />;
      case View.INVOICES: return <InvoicesPage invoices={invoices} onCreateInvoice={handleAddInvoice} initialTemplateId={selectedTemplate} />;
      case View.MIGRATION: return <MigrationPage onImport={handleImport} />;
      case View.ASSISTANT: return <AiAssistantPage invoices={invoices} />;
      case View.DOCUMENTS: return <DocumentsPage onUseTemplate={handleUseTemplate} />;
      case View.ACCOUNTING: return <AccountingPage />;
      case View.BANKING: return <BankingPage />;
      case View.VENDORS: return <VendorsPage />;
      case View.CUSTOMERS: return <CustomersPage />;
      case View.CASHFLOW: return <CashFlowPage />;
      // HRMS Views (wrapped with HRMSProvider for context)
      case View.HRMS_DASHBOARD: return <HRMSProvider><HRMSDashboard /></HRMSProvider>;
      case View.EMPLOYEES: return <HRMSProvider><Employees /></HRMSProvider>;
      case View.ATTENDANCE: return <HRMSProvider><Attendance /></HRMSProvider>;
      case View.LEAVES: return <HRMSProvider><Leaves /></HRMSProvider>;
      case View.PAYROLL: return <HRMSProvider><Payroll /></HRMSProvider>;
      case View.POLICY_CHAT: return <HRMSProvider><PolicyChat /></HRMSProvider>;
      // OS Views
      case View.OS_DASHBOARD: return <OSDashboardPage />;
      case View.GOALS: return <GoalsPage />;
      case View.MEMOS: return <MemosPage />;
      default: return <DashboardPage invoices={invoices} />;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      <main className="flex-1 ml-64 p-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
