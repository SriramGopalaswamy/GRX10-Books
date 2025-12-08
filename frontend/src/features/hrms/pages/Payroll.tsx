import React from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { HRMSRole as Role } from '../../../shared/types';
import { Download, FileText, DollarSign } from 'lucide-react';

export const Payroll: React.FC = () => {
  const { user } = useAuth();

  const mockPayslips = [
    { month: 'October', year: '2023', net: 85000, generated: '2023-10-31' },
    { month: 'September', year: '2023', net: 85000, generated: '2023-09-30' },
    { month: 'August', year: '2023', net: 85000, generated: '2023-08-31' },
  ];

  const handleDownload = (month: string, year: string, netPay: number) => {
     const htmlContent = `
      <html>
        <head>
          <title>Payslip - ${month} ${year}</title>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; background: #fff; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .company { font-size: 28px; font-weight: bold; color: #4f46e5; }
            .title { font-size: 18px; color: #666; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .box { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .box strong { display: block; margin-bottom: 10px; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { padding: 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
            .amount { text-align: right; font-family: monospace; font-size: 15px; }
            .deduction { color: #dc2626; }
            .total-row td { border-top: 2px solid #374151; font-weight: bold; font-size: 18px; color: #111; padding-top: 15px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">GRX10 Systems</div>
            <div class="title">Payslip for ${month} ${year}</div>
          </div>
          
          <div class="grid">
            <div class="box">
              <strong>Employee Details</strong>
              Name: ${user?.name}<br/>
              ID: ${user?.id}<br/>
              Dept: ${user?.department}<br/>
              Designation: ${user?.designation}
            </div>
            <div class="box">
              <strong>Payment Details</strong>
              Bank: HDFC Bank<br/>
              Acct: XXXXXX1234<br/>
              Date: 30 ${month} ${year}<br/>
              Days Payable: 30
            </div>
          </div>

          <table>
            <tr><th>Description</th><th style="text-align:right">Amount (USD)</th></tr>
            <tr><td>Basic Salary</td><td class="amount">50,000.00</td></tr>
            <tr><td>House Rent Allowance (HRA)</td><td class="amount">20,000.00</td></tr>
            <tr><td>Special Allowances</td><td class="amount">15,000.00</td></tr>
            <tr><td><i>Less: Income Tax</i></td><td class="amount deduction">-2,500.00</td></tr>
            <tr><td><i>Less: Provident Fund</i></td><td class="amount deduction">-1,800.00</td></tr>
            <tr class="total-row">
              <td>NET PAYABLE</td>
              <td class="amount">$${netPay.toLocaleString()}.00</td>
            </tr>
          </table>
          
          <div class="footer">
            This is a computer-generated document. No signature is required.<br/>
            GRX10 Systems Pvt Ltd. | 123 Tech Park, Silicon Valley
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payslip_${month}_${year}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Payroll & Compensation</h2>

      {user?.role === Role.FINANCE && (
         <div className="bg-indigo-900 rounded-xl p-6 text-white mb-8">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-semibold">Finance Overview</h3>
             <button className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
               Run Payroll Batch
             </button>
           </div>
           <div className="grid grid-cols-3 gap-8">
             <div>
               <p className="text-indigo-300 text-sm">Total Payroll Cost</p>
               <p className="text-2xl font-bold mt-1">$142,500</p>
             </div>
             <div>
               <p className="text-indigo-300 text-sm">Pending Approvals</p>
               <p className="text-2xl font-bold mt-1">4</p>
             </div>
             <div>
               <p className="text-indigo-300 text-sm">Tax Deductions</p>
               <p className="text-2xl font-bold mt-1">$22,400</p>
             </div>
           </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Salary Structure Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-500" />
            Current Salary Structure
          </h3>
          <div className="space-y-3 text-sm">
             <div className="flex justify-between">
               <span className="text-slate-500">Basic Salary</span>
               <span className="font-medium text-slate-900 dark:text-slate-100">$50,000</span>
             </div>
             <div className="flex justify-between">
               <span className="text-slate-500">HRA</span>
               <span className="font-medium text-slate-900 dark:text-slate-100">$20,000</span>
             </div>
             <div className="flex justify-between">
               <span className="text-slate-500">Special Allowance</span>
               <span className="font-medium text-slate-900 dark:text-slate-100">$15,000</span>
             </div>
             <div className="h-px bg-slate-100 my-2"></div>
             <div className="flex justify-between font-bold">
               <span className="text-slate-700">Gross Salary</span>
               <span className="text-slate-900 dark:text-slate-100">$85,000</span>
             </div>
          </div>
        </div>

        {/* Payslips List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100">Recent Payslips</div>
          <div className="divide-y divide-slate-100">
            {mockPayslips.map((slip, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{slip.month} {slip.year}</p>
                    <p className="text-xs text-slate-500">Generated on {slip.generated}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-mono font-medium text-slate-700">${slip.net.toLocaleString()}</span>
                  <button 
                    onClick={() => handleDownload(slip.month, slip.year, slip.net)}
                    className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors"
                    title="Download Payslip"
                  >
                    <Download size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};