
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, Plus } from 'lucide-react';
import { Vendor, Bill } from '../../../shared/types';
import { MOCK_VENDORS, MOCK_BILLS } from '../../../shared/constants/app.constants';
import { GeminiService } from '../../../shared/services/gemini/geminiService';

const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [bills, setBills] = useState<Bill[]>(MOCK_BILLS);
  const [isProcessing, setIsProcessing] = useState(false);
  const geminiRef = useRef<GeminiService | null>(null);

  useEffect(() => {
     geminiRef.current = new GeminiService();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files?.[0]) return;
     const file = e.target.files[0];
     setIsProcessing(true);

     // Convert to Base64
     const reader = new FileReader();
     reader.readAsDataURL(file);
     reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
           const extracted = await geminiRef.current!.parseDocument(base64, file.type);
           
           // Auto-create bill from extraction
           const newBill: Bill = {
              id: Math.random().toString(36).substring(2, 9),
              vendorId: 'v_new',
              vendorName: extracted.vendor_name || 'Unknown Vendor',
              billNumber: 'AUTO-' + Math.floor(Math.random() * 1000),
              date: extracted.invoice_date || new Date().toISOString().split('T')[0],
              dueDate: new Date().toISOString().split('T')[0],
              amount: extracted.total_amount || 0,
              status: 'Open',
           };
           
           // If vendor doesn't exist, maybe add? For now just add bill.
           setBills([newBill, ...bills]);
           alert(`Bill processed! Vendor: ${newBill.vendorName}, Amount: ₹${newBill.amount}`);
        } catch (err) {
           console.error(err);
           alert('Failed to process bill');
        } finally {
           setIsProcessing(false);
        }
     };
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold text-grx-text dark:text-white">Vendors & Bills</h2>
            <p className="text-grx-muted dark:text-grx-muted">Manage expenses and supplier payments</p>
         </div>
         <div className="flex gap-2">
            <button className="bg-white dark:bg-grx-dark-surface border border-grx-primary-100 dark:border-grx-primary-700 text-grx-text dark:text-grx-primary-200 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-grx-bg dark:hover:bg-grx-primary-800 relative overflow-hidden">
               <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*,application/pdf" />
               {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
               Upload Bill (AI)
            </button>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
               <Plus size={18} /> Add Vendor
            </button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vendors List */}
          <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 overflow-hidden">
             <div className="p-4 bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-50 dark:border-grx-primary-800 font-semibold text-grx-text dark:text-grx-primary-200">Your Vendors</div>
             <div className="divide-y divide-grx-primary-50 dark:divide-grx-primary-800">
                {vendors.map(v => (
                   <div key={v.id} className="p-4 flex justify-between items-center hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                      <div>
                         <h4 className="font-medium text-grx-text dark:text-white">{v.name}</h4>
                         <p className="text-xs text-grx-muted dark:text-grx-muted">GSTIN: {v.gstin}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-xs text-grx-muted dark:text-grx-muted">Payable</span>
                         <p className="font-semibold text-grx-text dark:text-white">₹{v.balance.toLocaleString('en-IN')}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Bills List */}
          <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-sm border border-grx-primary-100 dark:border-grx-primary-800 overflow-hidden">
             <div className="p-4 bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-50 dark:border-grx-primary-800 font-semibold text-grx-text dark:text-grx-primary-200 flex justify-between">
                <span>Recent Bills</span>
             </div>
             <div className="divide-y divide-grx-primary-50 dark:divide-grx-primary-800 max-h-[400px] overflow-y-auto">
                {bills.map(b => (
                   <div key={b.id} className="p-4 hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                      <div className="flex justify-between mb-1">
                         <span className="font-medium text-grx-text dark:text-white">{b.vendorName}</span>
                         <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status === 'Paid' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>{b.status}</span>
                      </div>
                      <div className="flex justify-between text-sm text-grx-muted dark:text-grx-muted">
                         <span>#{b.billNumber} • {b.date}</span>
                         <span className="font-semibold">₹{b.amount.toLocaleString('en-IN')}</span>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
};

export default Vendors;
