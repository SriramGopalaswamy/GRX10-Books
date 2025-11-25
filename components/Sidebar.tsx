
import React from 'react';
import { LayoutDashboard, FileText, Briefcase, Upload, MessageSquare, PieChart, Settings, Landmark, LogOut, FileStack, Users, Calculator, TrendingUp } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const menuItems = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: View.CUSTOMERS, label: 'Customers', icon: Users },
    { id: View.INVOICES, label: 'Invoices (GST)', icon: FileText },
    { id: View.VENDORS, label: 'Vendors & Bills', icon: Briefcase },
    { id: View.BANKING, label: 'Banking', icon: Landmark },
    { id: View.CASHFLOW, label: 'Cash Flow', icon: TrendingUp },
    { id: View.ACCOUNTING, label: 'Accounting', icon: Calculator },
    { id: View.DOCUMENTS, label: 'Documents', icon: FileStack },
    { id: View.MIGRATION, label: 'Zoho Migration', icon: Upload },
    { id: View.ASSISTANT, label: 'AI Assistant', icon: MessageSquare },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 shadow-xl z-10 overflow-y-auto">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-emerald-400 tracking-tight">GRX10</h1>
        <p className="text-xs text-slate-400 mt-1">Financial Suite</p>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
                ${isActive 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white text-sm font-medium hover:bg-slate-800 rounded-lg transition-colors">
          <Settings size={18} />
          Settings
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 text-sm font-medium hover:bg-slate-800 rounded-lg mt-1 transition-colors">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
