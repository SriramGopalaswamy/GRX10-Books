
import React, { useState } from 'react';
import { UploadCloud, Check, Loader2, AlertTriangle } from 'lucide-react';
import { Invoice } from '../types';

interface MigrationProps {
  onImport: (newInvoices: Invoice[]) => void;
}

const Migration: React.FC<MigrationProps> = ({ onImport }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'mapping' | 'success'>('idle');
  const [fileType, setFileType] = useState('invoices');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  };

  const simulateMigration = () => {
    if(!file) return;
    setStatus('uploading');
    setTimeout(() => {
      setStatus('mapping');
      setTimeout(() => {
        const importedInvoices: Invoice[] = [
            { id: 'inv_import_01', number: 'ZB-INV-901', date: '2024-01-15', dueDate: '2024-02-01', customerId: 'c99', customerName: 'Imported Customer Ltd', status: 'Paid' as any, subTotal: 15000, taxTotal: 2700, total: 17700, items: [] }
        ];
        if(fileType === 'invoices') onImport(importedInvoices);
        setStatus('success');
      }, 2000);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-800">Migrate from Zoho Books</h2>
        <p className="text-slate-500">Import Customers, Invoices, Expenses, or Bank History.</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        {status === 'idle' && (
          <div className="p-12 border-2 border-dashed m-4 rounded-lg flex flex-col items-center justify-center transition-colors border-slate-300 bg-slate-50"
             onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
             
             <div className="w-full max-w-xs mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Data Type to Import</label>
                <select className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white" value={fileType} onChange={e => setFileType(e.target.value)}>
                   <option value="invoices">Invoices (Sales)</option>
                   <option value="customers">Customer Master</option>
                   <option value="vendors">Vendor Bills</option>
                   <option value="banking">Bank Statements</option>
                </select>
             </div>

             <UploadCloud size={32} className="text-indigo-500 mb-4" />
             
             {file ? (
               <div className="text-center space-y-3">
                 <p className="font-medium text-slate-800">{file.name}</p>
                 <button onClick={simulateMigration} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700">Start Migration</button>
               </div>
             ) : (
               <div className="text-center">
                 <p className="text-lg font-medium text-slate-700">Drag & drop Zoho export file</p>
                 <input id="file-upload" type="file" className="hidden" onChange={e => e.target.files && setFile(e.target.files[0])} accept=".csv,.json,.xls,.xlsx" />
                 <label htmlFor="file-upload" className="cursor-pointer text-emerald-600 font-semibold hover:underline mt-2 inline-block">Browse files</label>
               </div>
             )}
          </div>
        )}
        
        {status === 'success' && (
           <div className="p-12 text-center">
              <Check size={48} className="text-emerald-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-800">Import Successful</h3>
              <p className="text-slate-500 mt-2 mb-6">Data from {file?.name} has been mapped to {fileType}.</p>
              <button onClick={() => { setStatus('idle'); setFile(null); }} className="bg-slate-900 text-white px-6 py-2 rounded-lg">Import More</button>
           </div>
        )}
        {(status === 'uploading' || status === 'mapping') && (
           <div className="p-16 flex flex-col items-center">
             <Loader2 className="animate-spin text-emerald-600 mb-4" size={32} />
             <p className="text-slate-600 font-medium">Processing your data...</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default Migration;
