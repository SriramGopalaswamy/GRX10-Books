import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Migration from './pages/Migration';
import AiAssistant from './pages/AiAssistant';
import { View, Invoice } from './types';
import { MOCK_INVOICES } from './constants';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);

  const handleImport = (newInvoices: Invoice[]) => {
    setInvoices(prev => [...prev, ...newInvoices]);
    // Optional: Switch view or show toast
    alert(`Successfully imported ${newInvoices.length} records.`);
  };

  const renderContent = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard invoices={invoices} />;
      case View.INVOICES:
        return <Invoices invoices={invoices} />;
      case View.MIGRATION:
        return <Migration onImport={handleImport} />;
      case View.ASSISTANT:
        return <AiAssistant invoices={invoices} />;
      case View.BANKING:
      case View.REPORTS:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <div className="w-16 h-16 border-2 border-slate-200 rounded-full flex items-center justify-center mb-4 border-dashed">
              <span className="text-2xl font-bold">?</span>
            </div>
            <h3 className="text-lg font-medium text-slate-600">Module Under Development</h3>
            <p>This feature is part of the Phase 2 rollout.</p>
          </div>
        );
      default:
        return <Dashboard invoices={invoices} />;
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