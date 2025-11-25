
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Migration from './pages/Migration';
import AiAssistant from './pages/AiAssistant';
import Documents from './pages/Documents';
import Accounting from './pages/Accounting';
import Banking from './pages/Banking';
import Vendors from './pages/Vendors';
import Customers from './pages/Customers';
import CashFlow from './pages/CashFlow';
import { View, Invoice } from './types';
import { MOCK_INVOICES } from './constants';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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
      case View.DASHBOARD: return <Dashboard invoices={invoices} />;
      case View.INVOICES: return <Invoices invoices={invoices} onCreateInvoice={handleAddInvoice} initialTemplateId={selectedTemplate} />;
      case View.MIGRATION: return <Migration onImport={handleImport} />;
      case View.ASSISTANT: return <AiAssistant invoices={invoices} />;
      case View.DOCUMENTS: return <Documents onUseTemplate={handleUseTemplate} />;
      case View.ACCOUNTING: return <Accounting />;
      case View.BANKING: return <Banking />;
      case View.VENDORS: return <Vendors />;
      case View.CUSTOMERS: return <Customers />;
      case View.CASHFLOW: return <CashFlow />;
      default: return <Dashboard invoices={invoices} />;
    }
  };

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
