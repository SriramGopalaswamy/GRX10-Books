
import React, { useState } from 'react';
import { useConfiguration } from '../../../shared/contexts/ConfigurationContext';
import { Book, Plus, RefreshCw, FileText } from 'lucide-react';
import { Account, JournalEntry } from '../../../shared/types';
import { MOCK_ACCOUNTS } from '../../../shared/constants/app.constants';

const Accounting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'coa' | 'journal'>('coa');
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  
  // Journal Form
  const [journalDesc, setJournalDesc] = useState('');
  const [drAccount, setDrAccount] = useState('');
  const [crAccount, setCrAccount] = useState('');
  const [amount, setAmount] = useState('');

  const handlePostJournal = () => {
     if(!journalDesc || !drAccount || !crAccount || !amount) return;
     
     const amt = parseFloat(amount);
     const newJournal: JournalEntry = {
         id: Math.random().toString(36).substring(2, 9),
         date: new Date().toISOString().split('T')[0],
         description: journalDesc,
         debits: [{ accountId: drAccount, amount: amt }],
         credits: [{ accountId: crAccount, amount: amt }],
         total: amt
     };
     setJournals([newJournal, ...journals]);
     setJournalDesc(''); setAmount('');
     alert('Journal Posted Successfully');
  };

  const renderCoA = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm text-left">
           <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase">
              <tr>
                 <th className="px-6 py-4">Code</th>
                 <th className="px-6 py-4">Account Name</th>
                 <th className="px-6 py-4">Type</th>
                 <th className="px-6 py-4 text-right">Balance (₹)</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {accounts.map(acc => (
                 <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">{acc.code}</td>
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">{acc.name}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded text-xs font-semibold
                          ${acc.type === 'Asset' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                            acc.type === 'Liability' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            acc.type === 'Income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                          }`}>
                          {acc.type}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{acc.balance.toLocaleString('en-IN')}</td>
                 </tr>
              ))}
           </tbody>
        </table>
    </div>
  );

  const renderJournal = () => (
     <div className="space-y-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
           <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Post Manual Journal</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date</label>
                 <input type="date" className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 text-sm" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Description</label>
                 <input 
                   type="text" 
                   className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 text-sm" 
                   placeholder="e.g. Depreciation Adjustment" 
                   value={journalDesc} 
                   onChange={e => setJournalDesc(e.target.value)} 
                 />
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700">
              <div>
                 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Debit Account</label>
                 <select className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 text-sm" value={drAccount} onChange={e => setDrAccount(e.target.value)}>
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Credit Account</label>
                 <select className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 text-sm" value={crAccount} onChange={e => setCrAccount(e.target.value)}>
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Amount (₹)</label>
                 <input type="number" className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 text-sm" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
           </div>
           
           <div className="flex justify-end">
              <button onClick={handlePostJournal} className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-medium text-sm">Post Entry</button>
           </div>
        </div>

        <div className="space-y-2">
           <h3 className="font-semibold text-slate-800 dark:text-slate-100">Recent Journals</h3>
           {journals.length === 0 ? <p className="text-slate-400 dark:text-slate-500 text-sm">No recent entries posted.</p> : 
             journals.map(j => (
                <div key={j.id} className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 text-sm">
                   <div className="flex justify-between mb-2">
                      <span className="font-semibold">{j.description}</span>
                      <span className="text-slate-500 dark:text-slate-400">{j.date}</span>
                   </div>
                   <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Total: ₹{j.total}</span>
                      <span>ID: {j.id}</span>
                   </div>
                </div>
             ))
           }
        </div>
     </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Accounting</h2>
         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button onClick={() => setActiveTab('coa')} className={`px-4 py-1.5 rounded text-sm font-medium ${activeTab === 'coa' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>Chart of Accounts</button>
            <button onClick={() => setActiveTab('journal')} className={`px-4 py-1.5 rounded text-sm font-medium ${activeTab === 'journal' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>Manual Journals</button>
         </div>
      </div>
      {activeTab === 'coa' ? renderCoA() : renderJournal()}
    </div>
  );
};

export default Accounting;
