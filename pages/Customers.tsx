
import React, { useState } from 'react';
import { UserPlus, Search, Mail, Phone, MapPin } from 'lucide-react';
import { Customer } from '../types';
import { MOCK_CUSTOMERS } from '../constants';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', gstin: '', email: '', phone: '', address: '' });

  const handleAdd = () => {
    const cust: Customer = {
      id: Math.random().toString(),
      name: newCust.name,
      gstin: newCust.gstin,
      email: newCust.email,
      phone: newCust.phone,
      address: newCust.address,
      balance: 0
    };
    setCustomers([...customers, cust]);
    setShowAddModal(false);
    setNewCust({ name: '', gstin: '', email: '', phone: '', address: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
        <button onClick={() => setShowAddModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700">
          <UserPlus size={18} /> Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map(cust => (
          <div key={cust.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
             <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                   {cust.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-right">
                   <p className="text-xs text-slate-500">Outstanding</p>
                   <p className="font-bold text-slate-800">₹{cust.balance.toLocaleString('en-IN')}</p>
                </div>
             </div>
             <h3 className="font-semibold text-lg text-slate-800 mb-1">{cust.name}</h3>
             <p className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded w-fit mb-4">GSTIN: {cust.gstin}</p>
             
             <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {cust.email}</div>
                {cust.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {cust.phone}</div>}
                {cust.address && <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> {cust.address}</div>}
             </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
             <h3 className="text-lg font-bold mb-4">New Customer</h3>
             <div className="space-y-3">
               <input placeholder="Company Name" className="w-full border p-2 rounded" value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} />
               <input placeholder="GSTIN" className="w-full border p-2 rounded" value={newCust.gstin} onChange={e => setNewCust({...newCust, gstin: e.target.value})} />
               <input placeholder="Email" className="w-full border p-2 rounded" value={newCust.email} onChange={e => setNewCust({...newCust, email: e.target.value})} />
               <input placeholder="Phone" className="w-full border p-2 rounded" value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} />
               <input placeholder="Address" className="w-full border p-2 rounded" value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})} />
             </div>
             <div className="flex justify-end gap-3 mt-6">
               <button onClick={() => setShowAddModal(false)} className="text-slate-500 font-medium">Cancel</button>
               <button onClick={handleAdd} className="bg-emerald-600 text-white px-4 py-2 rounded font-medium">Save Customer</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
