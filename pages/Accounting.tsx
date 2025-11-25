
import React, { useState } from 'react';
import { Book, Plus, RefreshCw, FileText } from 'lucide-react';
import { Account, JournalEntry } from '../types';
import { MOCK_ACCOUNTS } from '../constants';

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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
           <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase">
              <tr>
                 <th className="px-6 py-4">Code</th>
                 <th className="px-6 py-4">Account Name</th>
                 <th className="px-6 py-4">Type</th>
                 <th className="px-6 py-4 text-right">Balance (₹)</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100">
              {accounts.map(acc => (
                 <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-slate-500">{acc.code}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{acc.name}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded text-xs font-semibold
                          ${acc.type === 'Asset' ? 'bg-blue-100 text-blue-700' :
                            acc.type === 'Liability' ? 'bg-red-100 text-red-700' :
                            acc.type === 'Income' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-orange-100 text-orange-700'
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="font-semibold text-slate-800 mb-4">Post Manual Journal</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                 <label className="text-xs font-semibold text-slate-500">Date</label>
                 <input type="date" className="w-full border rounded p-2 text-sm" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                 <label className="text-xs font-semibold text-slate-500">Description</label>
                 <input 
                   type="text" 
                   className="w-full border rounded p-2 text-sm" 
                   placeholder="e.g. Depreciation Adjustment" 
                   value={journalDesc} 
                   onChange={e => setJournalDesc(e.target.value)} 
                 />
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded border border-slate-100">
              <div>
                 <label className="text-xs font-semibold text-slate-500">Debit Account</label>
                 <select className="w-full border rounded p-2 text-sm" value={drAccount} onChange={e => setDrAccount(e.target.value)}>
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="text-xs font-semibold text-slate-500">Credit Account</label>
                 <select className="w-full border rounded p-2 text-sm" value={crAccount} onChange={e => setCrAccount(e.target.value)}>
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                 </select>
              </div>
              <div>
                 <label className="text-xs font-semibold text-slate-500">Amount (₹)</label>
                 <input type="number" className="w-full border rounded p-2 text-sm" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
           </div>
           
           <div className="flex justify-end">
              <button onClick={handlePostJournal} className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-medium text-sm">Post Entry</button>
           </div>
        </div>

        <div className="space-y-2">
           <h3 className="font-semibold text-slate-800">Recent Journals</h3>
           {journals.length === 0 ? <p className="text-slate-400 text-sm">No recent entries posted.</p> : 
             journals.map(j => (
                <div key={j.id} className="bg-white p-4 rounded border border-slate-200 text-sm">
                   <div className="flex justify-between mb-2">
                      <span className="font-semibold">{j.description}</span>
                      <span className="text-slate-500">{j.date}</span>
                   </div>
                   <div className="flex justify-between text-xs text-slate-600">
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
         <h2 className="text-2xl font-bold text-slate-800">Accounting</h2>
         <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setActiveTab('coa')} className={`px-4 py-1.5 rounded text-sm font-medium ${activeTab === 'coa' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Chart of Accounts</button>
            <button onClick={() => setActiveTab('journal')} className={`px-4 py-1.5 rounded text-sm font-medium ${activeTab === 'journal' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Manual Journals</button>
         </div>
      </div>
      {activeTab === 'coa' ? renderCoA() : renderJournal()}
    </div>
  );
};

export default Accounting;
