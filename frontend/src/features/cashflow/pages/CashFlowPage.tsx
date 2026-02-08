
import React, { useState } from 'react';
import { MOCK_CASHFLOW_FORECAST } from '../../../shared/constants/app.constants';
import { TrendingUp, Edit2, Save } from 'lucide-react';

const CashFlow: React.FC = () => {
  const [data, setData] = useState(MOCK_CASHFLOW_FORECAST);
  const [editing, setEditing] = useState(false);

  const totalInflow = data.inflows.reduce((acc, curr) => acc + curr.projected, 0);
  const totalOutflow = data.outflows.reduce((acc, curr) => acc + curr.projected, 0);

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
       <div className="flex justify-between items-center">
          <div>
             <h2 className="text-2xl font-bold text-grx-text dark:text-white">Cash Flow Planner</h2>
             <p className="text-grx-muted dark:text-grx-muted">Forecast for {data.month}</p>
          </div>
          <button onClick={() => setEditing(!editing)} className="text-grx-primary-600 bg-grx-primary-50 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-grx-primary-100">
             {editing ? <Save size={18}/> : <Edit2 size={18}/>} {editing ? 'Save Plan' : 'Edit Forecast'}
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 grx-stagger">
           <div className="bg-emerald-500 text-white p-6 rounded-xl shadow-lg shadow-emerald-200">
              <p className="text-emerald-100 font-medium">Projected Inflow</p>
              <h3 className="text-3xl font-bold mt-2">₹{totalInflow.toLocaleString()}</h3>
           </div>
           <div className="bg-red-500 text-white p-6 rounded-xl shadow-lg shadow-red-200">
              <p className="text-red-100 font-medium">Projected Outflow</p>
              <h3 className="text-3xl font-bold mt-2">₹{totalOutflow.toLocaleString()}</h3>
           </div>
           <div className="bg-grx-dark-surface text-white p-6 rounded-xl shadow-lg shadow-grx-primary-300">
              <p className="text-grx-muted font-medium">Net Position</p>
              <h3 className="text-3xl font-bold mt-2">₹{(totalInflow - totalOutflow).toLocaleString()}</h3>
           </div>
       </div>

       <div className="grx-glass-card rounded-xl p-6">
          <h3 className="font-bold text-grx-text dark:text-white mb-4 text-lg">Detailed Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Inflows */}
             <div>
                <h4 className="text-emerald-600 font-semibold mb-3 border-b border-emerald-100 pb-2">Cash In</h4>
                <div className="space-y-3">
                   {data.inflows.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                         <span className="text-grx-muted dark:text-grx-muted">{item.category}</span>
                         {editing ? (
                            <input type="number" className="border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded w-24 text-right p-1" defaultValue={item.projected} />
                         ) : (
                            <span className="font-medium text-grx-text dark:text-white">₹{item.projected.toLocaleString()}</span>
                         )}
                      </div>
                   ))}
                </div>
             </div>
             
             {/* Outflows */}
             <div>
                <h4 className="text-red-600 font-semibold mb-3 border-b border-red-100 pb-2">Cash Out</h4>
                 <div className="space-y-3">
                   {data.outflows.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                         <span className="text-grx-muted dark:text-grx-muted">{item.category}</span>
                         {editing ? (
                            <input type="number" className="border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded w-24 text-right p-1" defaultValue={item.projected} />
                         ) : (
                            <span className="font-medium text-grx-text dark:text-white">₹{item.projected.toLocaleString()}</span>
                         )}
                      </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default CashFlow;
