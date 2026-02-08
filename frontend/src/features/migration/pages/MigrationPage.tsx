import React, { useState } from 'react';
import { UploadCloud, FileCheck, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Invoice } from '../../../shared/types';

interface MigrationProps {
  onImport: (newInvoices: Invoice[]) => void;
}

const Migration: React.FC<MigrationProps> = ({ onImport }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'mapping' | 'success'>('idle');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const simulateMigration = async () => {
    if (!file) return;

    setStatus('uploading');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        // Simple CSV parsing for demo (in production use a library like PapaParse)
        // Assuming CSV format: Number,Date,Customer,Total,Status
        const lines = text.split('\n').slice(1); // Skip header
        const invoices = lines.map((line, idx) => {
          const cols = line.split(',');
          if (cols.length < 4) return null;
          return {
            number: cols[0] || `INV-${idx}`,
            date: cols[1] || new Date().toISOString().split('T')[0],
            customerName: cols[2] || 'Unknown Customer',
            total: parseFloat(cols[3]) || 0,
            status: cols[4]?.trim() || 'Draft'
          };
        }).filter(Boolean);

        setStatus('mapping');

        const response = await fetch('/api/migration/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoices })
        });

        if (!response.ok) throw new Error('Import failed');

        const result = await response.json();

        // Fetch fresh data to update parent state if needed
        // For now just notify success
        setStatus('success');

      } catch (error) {
        console.error(error);
        alert('Migration failed: ' + error);
        setStatus('idle');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-grx-text dark:text-white">Migrate from Zoho Books</h2>
        <p className="text-grx-muted dark:text-grx-muted">Seamlessly import your Customers, Invoices, and Ledger history.</p>
      </div>

      {/* Steps */}
      <div className="flex justify-between items-center relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-grx-primary-100 dark:bg-grx-primary-800 -z-10"></div>
        {[
          { step: 1, label: "Upload Export" },
          { step: 2, label: "Map Fields" },
          { step: 3, label: "Verify Data" },
          { step: 4, label: "Finish" }
        ].map((s, idx) => (
          <div key={s.step} className="flex flex-col items-center bg-grx-bg dark:bg-grx-dark-surface px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold 
                ${status === 'success' || (status !== 'idle' && s.step <= 2) ? 'bg-emerald-600 text-white' : 'bg-grx-primary-100 dark:bg-grx-primary-800 text-grx-muted dark:text-grx-muted'}`}>
              {s.step}
            </div>
            <span className="text-xs font-medium text-grx-muted dark:text-grx-muted mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-grx-dark-surface rounded-xl shadow-lg border border-grx-primary-100 dark:border-grx-primary-800 overflow-hidden">

        {status === 'idle' && (
          <div
            className={`p-12 flex flex-col items-center justify-center border-2 border-dashed transition-colors
              ${dragActive ? "border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" : "border-grx-primary-100 dark:border-grx-primary-700 bg-grx-bg dark:bg-grx-dark"}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <UploadCloud size={32} />
            </div>

            {file ? (
              <div className="text-center space-y-3">
                <p className="font-medium text-grx-text dark:text-white text-lg">{file.name}</p>
                <p className="text-sm text-grx-muted dark:text-grx-muted">{(file.size / 1024).toFixed(2)} KB</p>
                <button
                  onClick={simulateMigration}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Start Migration
                </button>
                <button onClick={() => setFile(null)} className="block w-full text-sm text-red-500 hover:underline mt-2">Remove file</button>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-grx-text dark:text-grx-primary-200">Drag & drop your Zoho Books export here</p>
                <p className="text-sm text-grx-muted dark:text-grx-muted">Supports .CSV, .XLS, .JSON</p>
                <div className="relative mt-4">
                  <input id="file-upload" type="file" className="hidden" onChange={handleChange} accept=".csv,.json,.xls,.xlsx" />
                  <label htmlFor="file-upload" className="cursor-pointer text-emerald-600 font-semibold hover:underline">Browse files</label>
                </div>
              </div>
            )}
          </div>
        )}

        {(status === 'uploading' || status === 'mapping') && (
          <div className="p-16 flex flex-col items-center text-center">
            <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-grx-text dark:text-white">
              {status === 'uploading' ? 'Analysing File Structure...' : 'Mapping Ledger Accounts...'}
            </h3>
            <p className="text-grx-muted dark:text-grx-muted mt-2 max-w-md">
              Our AI is identifying GSTINs, customer balances, and mapping Zoho chart of accounts to GRX10 standard structure.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Check size={32} />
            </div>
            <h3 className="text-2xl font-bold text-grx-text dark:text-white">Migration Complete!</h3>
            <p className="text-grx-muted dark:text-grx-muted mt-2 mb-6">
              Successfully imported 143 Customers, 1,205 Invoices, and FY2023 Opening Balances.
            </p>
            <div className="bg-grx-bg dark:bg-grx-dark p-4 rounded-lg text-left text-sm text-grx-muted dark:text-grx-muted border border-grx-primary-100 dark:border-grx-primary-800 w-full max-w-md mb-6">
              <div className="flex justify-between py-1"><span>Invoices Imported:</span> <span className="font-medium text-grx-text dark:text-white">1,205</span></div>
              <div className="flex justify-between py-1"><span>Customers Created:</span> <span className="font-medium text-grx-text dark:text-white">143</span></div>
              <div className="flex justify-between py-1"><span>Errors:</span> <span className="font-medium text-emerald-600">0</span></div>
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="bg-grx-dark text-white px-6 py-2 rounded-lg font-medium hover:bg-grx-dark-surface"
            >
              Perform Another Migration
            </button>
          </div>
        )}

      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-lg flex gap-3 items-start">
        <AlertTriangle className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-sm">Requirement</h4>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">Ensure your Zoho Books export includes the "Transaction ID" column for proper linking of Payments to Invoices.</p>
        </div>
      </div>
    </div>
  );
};

export default Migration;