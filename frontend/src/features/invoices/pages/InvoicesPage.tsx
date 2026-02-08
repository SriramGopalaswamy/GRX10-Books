
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Download, Printer, ArrowLeft, Save } from 'lucide-react';
import { Invoice, InvoiceStatus } from '../../../shared/types';
import { MOCK_CUSTOMERS } from '../../../shared/constants/app.constants';

interface InvoicesProps {
  invoices: Invoice[];
  onCreateInvoice?: (invoice: Invoice) => void;
  initialTemplateId?: string | null;
}

const Invoices: React.FC<InvoicesProps> = ({ invoices, onCreateInvoice, initialTemplateId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [formCustomer, setFormCustomer] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState('');
  const [taxType, setTaxType] = useState<'INTRA' | 'INTER'>('INTRA');

  useEffect(() => {
    if (initialTemplateId) setIsCreating(true);
  }, [initialTemplateId]);

  const filteredInvoices = invoices.filter(inv => 
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const handleSaveInvoice = () => {
     if (!onCreateInvoice) return;
     const amount = parseFloat(formAmount) || 0;
     const cust = MOCK_CUSTOMERS.find(c => c.id === formCustomer);
     const newInvoice: Invoice = {
        id: Math.random().toString(36).substring(2, 9),
        number: `INV-2024-${(invoices.length + 1).toString().padStart(3, '0')}`,
        date: formDate,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        customerId: formCustomer,
        customerName: cust ? cust.name : 'Unknown Customer',
        status: InvoiceStatus.SENT,
        subTotal: amount,
        taxTotal: amount * 0.18,
        total: amount * 1.18,
        items: [],
        taxType: taxType
     };
     onCreateInvoice(newInvoice);
     setIsCreating(false);
     setFormAmount(''); setFormCustomer('');
  };

  if (isCreating) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
         <div className="flex items-center gap-4">
            <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-grx-primary-100 rounded-full transition-colors">
               <ArrowLeft size={20} />
            </button>
            <div>
               <h2 className="text-2xl font-bold text-grx-text dark:text-white">Create New Invoice</h2>
               <p className="text-grx-muted dark:text-grx-muted">{initialTemplateId ? `Template: ${initialTemplateId}` : 'Standard GST Invoice'}</p>
            </div>
         </div>

         <div className="grx-glass-card rounded-xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 grx-stagger">
               <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">Customer</label>
                  <select className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white" value={formCustomer} onChange={e => setFormCustomer(e.target.value)}>
                     <option value="">Select Customer</option>
                     {MOCK_CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">GST Treatment</label>
                  <select className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white" value={taxType} onChange={e => setTaxType(e.target.value as any)}>
                     <option value="INTRA">Intra-State (CGST + SGST)</option>
                     <option value="INTER">Inter-State (IGST)</option>
                  </select>
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 grx-stagger">
                <div>
                   <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">Date</label>
                   <input type="date" className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white" value={formDate} onChange={e => setFormDate(e.target.value)}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">Taxable Amount (₹)</label>
                  <input type="number" className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white" value={formAmount} onChange={e => setFormAmount(e.target.value)}/>
                </div>
            </div>

            <div className="bg-grx-bg dark:bg-grx-dark p-4 rounded-lg flex justify-between items-center text-sm">
                <span className="text-grx-muted dark:text-grx-muted">Total Tax (18%):</span>
                <span className="font-bold text-grx-text dark:text-white">{formatINR((parseFloat(formAmount)||0) * 0.18)}</span>
            </div>

            <div className="pt-4 flex justify-end gap-3">
               <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-grx-muted dark:text-grx-muted font-medium hover:bg-grx-bg dark:hover:bg-grx-primary-800 rounded-lg">Cancel</button>
               <button onClick={handleSaveInvoice} disabled={!formCustomer || !formAmount} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
                 <Save size={18} /> Save Invoice
               </button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Sales Invoices</h2>
          <p className="text-grx-muted dark:text-grx-muted">Manage your billing and GST returns</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm shadow-emerald-200">
          <Plus size={18} /> New Invoice
        </button>
      </div>

      <div className="grx-glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-grx-primary-50 dark:border-grx-primary-800 flex flex-wrap gap-4 justify-between items-center bg-grx-bg/50 dark:bg-grx-dark/50">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted" size={18} />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none text-sm" />
          </div>
        </div>

        <table className="w-full text-sm text-left">
            <thead className="text-xs text-grx-muted dark:text-grx-muted uppercase bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-50 dark:border-grx-primary-800">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tax Type</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grx-primary-50 dark:divide-grx-primary-800 bg-white dark:bg-grx-dark-surface">
              {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                    <td className="px-6 py-4 text-grx-muted dark:text-grx-muted">{inv.date}</td>
                    <td className="px-6 py-4 font-medium text-emerald-600 dark:text-emerald-400">{inv.number}</td>
                    <td className="px-6 py-4 text-grx-text dark:text-white font-medium">{inv.customerName}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.status==='Paid'?'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400':inv.status==='Overdue'?'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400':'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>{inv.status}</span></td>
                    <td className="px-6 py-4 text-xs text-grx-muted dark:text-grx-muted">{inv.taxType || 'INTRA'}</td>
                    <td className="px-6 py-4 text-right font-semibold text-grx-text dark:text-grx-primary-200">{formatINR(inv.total)}</td>
                  </tr>
              ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default Invoices;
