
import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, RefreshCcw, Loader2 } from 'lucide-react';
import { BankTransaction } from '../types';
import { MOCK_BANK_TXNS } from '../constants';
import { GeminiService } from '../services/geminiService';

const Banking: React.FC = () => {
  const [transactions, setTransactions] = useState<BankTransaction[]>(MOCK_BANK_TXNS);
  const [isUploading, setIsUploading] = useState(false);
  const geminiRef = useRef<GeminiService | null>(null);

  useEffect(() => { geminiRef.current = new GeminiService(); }, []);

  const handleStatementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files?.[0]) return;
     const file = e.target.files[0];
     setIsUploading(true);

     const reader = new FileReader();
     reader.readAsDataURL(file);
     reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
           const parsedTxns = await geminiRef.current!.parseBankStatement(base64, file.type);
           const newTxns: BankTransaction[] = parsedTxns.map((t: any) => ({
              id: Math.random().toString(36),
              date: t.date,
              description: t.description,
              withdrawal: t.withdrawal || 0,
              deposit: t.deposit || 0,
              status: 'Unreconciled'
           }));
           setTransactions([...newTxns, ...transactions]);
           alert(`Imported ${newTxns.length} transactions from statement.`);
        } catch (err) {
           alert('Error parsing statement');
        } finally {
           setIsUploading(false);
        }
     };
  };

  const reconcile = (id: string) => {
     setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'Reconciled' } : t));
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Banking & Reconciliation</h2>
          <div className="relative">
             <input type="file" className="hidden" id="bank-upload" onChange={handleStatementUpload} accept=".pdf,.csv,.jpg" />
             <label htmlFor="bank-upload" className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 cursor-pointer">
                {isUploading ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18}/>}
                Import Statement
             </label>
          </div>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                   <th className="px-6 py-4">Date</th>
                   <th className="px-6 py-4">Description</th>
                   <th className="px-6 py-4 text-right text-red-600">Withdrawal</th>
                   <th className="px-6 py-4 text-right text-emerald-600">Deposit</th>
                   <th className="px-6 py-4">Status</th>
                   <th className="px-6 py-4">Action</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {transactions.map(t => (
                   <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-500">{t.date}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{t.description}</td>
                      <td className="px-6 py-4 text-right">{t.withdrawal > 0 ? `₹${t.withdrawal}` : '-'}</td>
                      <td className="px-6 py-4 text-right">{t.deposit > 0 ? `₹${t.deposit}` : '-'}</td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.status === 'Reconciled' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {t.status}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                         {t.status === 'Unreconciled' && (
                            <button onClick={() => reconcile(t.id)} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-xs font-semibold">
                               <RefreshCcw size={14} /> Match
                            </button>
                         )}
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default Banking;
