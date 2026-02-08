import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { HRMSRole as Role } from '../../../shared/types';
import { Download, FileText, DollarSign, Loader2, Plus } from 'lucide-react';

interface Payslip {
  id: string;
  employeeId: string;
  month: string;
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  netPay: number;
  generatedDate: string;
  Employee?: {
    id: string;
    name: string;
    email: string;
  };
  breakdown?: {
    earnings: {
      basic: number;
      hra: number;
      specialAllowance: number;
      otherAllowances: number;
      grossSalary: number;
    };
    deductions: {
      pfEmployee: number;
      esiEmployee: number;
      tds: number;
      professionalTax: number;
      otherDeductions: number;
      totalDeductions: number;
    };
    netPay: number;
  };
}

export const Payroll: React.FC = () => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [salaryStructure, setSalaryStructure] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMonth, setGenerateMonth] = useState('');

  // Fetch payslips
  useEffect(() => {
    if (!user) return;
    
    const fetchPayslips = async () => {
      setLoading(true);
      try {
        let url = '/api/hrms/payslips';
        
        // Role-based filtering
        if (user.role === Role.ADMIN || user.role === Role.HR || user.role === Role.FINANCE) {
          // Admin/HR/Finance: See all payslips
          url = '/api/hrms/payslips';
        } else if (user.role === Role.MANAGER) {
          // Manager: Get employee record first to find their ID, then get reportees' payslips
          try {
            const empResponse = await fetch('/api/hrms/employees');
            if (empResponse.ok) {
              const employees = await empResponse.json();
              const currentEmployee = Array.isArray(employees) 
                ? employees.find((e: any) => e.email === user.email || e.id === user.id) 
                : null;
              if (currentEmployee && currentEmployee.id) {
                url = `/api/hrms/payslips?managerId=${currentEmployee.id}`;
              } else {
                url = `/api/hrms/payslips?employeeId=${user.id}`;
              }
            } else {
              url = `/api/hrms/payslips?employeeId=${user.id}`;
            }
          } catch (err) {
            url = `/api/hrms/payslips?employeeId=${user.id}`;
          }
        } else {
          // Employee: See only their own records
          try {
            const empResponse = await fetch('/api/hrms/employees');
            if (empResponse.ok) {
              const employees = await empResponse.json();
              const currentEmployee = Array.isArray(employees) 
                ? employees.find((e: any) => e.email === user.email || e.id === user.id) 
                : null;
              if (currentEmployee && currentEmployee.id) {
                url = `/api/hrms/payslips?employeeId=${currentEmployee.id}`;
              } else {
                url = `/api/hrms/payslips?employeeId=${user.id}`;
              }
            } else {
              url = `/api/hrms/payslips?employeeId=${user.id}`;
            }
          } catch (err) {
            url = `/api/hrms/payslips?employeeId=${user.id}`;
          }
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch payslips');
        const data = await response.json();
        setPayslips(data);
      } catch (err) {
        setError('Failed to load payslips');
        console.error('Error fetching payslips:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayslips();
  }, [user]);

  // Fetch employee salary structure
  useEffect(() => {
    if (!user) return;
    
    const fetchSalaryStructure = async () => {
      try {
        const response = await fetch(`/api/hrms/employees/${user.id}`);
        if (response.ok) {
          const employee = await response.json();
          setSalaryStructure({
            annualCTC: employee.salary || 0,
            monthlyGross: (employee.salary || 0) / 12,
            breakdown: employee.salaryBreakdown ? 
              (typeof employee.salaryBreakdown === 'string' ? JSON.parse(employee.salaryBreakdown) : employee.salaryBreakdown) 
              : {}
          });
        }
      } catch (err) {
        console.error('Error fetching salary structure:', err);
      }
    };

    fetchSalaryStructure();
  }, [user]);

  const handleGeneratePayslip = async () => {
    if (!user) return;

    // Validate form
    const validationRules = {
      generateMonth: { 
        required: true,
        custom: (value: string) => {
          if (!value) return 'Month is required';
          const [year, month] = value.split('-');
          const selectedDate = new Date(parseInt(year), parseInt(month) - 1);
          const now = new Date();
          const currentMonth = new Date(now.getFullYear(), now.getMonth());
          if (selectedDate > currentMonth) {
            return 'Cannot generate payslip for future months';
          }
          return null;
        }
      }
    };

    const validationErrors = validateForm({ generateMonth }, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setError(validationErrors.generateMonth || 'Please select a valid month');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/hrms/payslips/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.id,
          month: generateMonth
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate payslip');
      }

      // Refresh payslips
      const payslipsRes = await fetch(`/api/hrms/payslips?employeeId=${user.id}`);
      if (payslipsRes.ok) {
        const data = await payslipsRes.json();
        setPayslips(data);
      }

      setShowGenerateModal(false);
      setGenerateMonth('');
      alert('Payslip generated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate payslip');
      console.error('Error generating payslip:', err);
    } finally {
      setGenerating(false);
    }
  };

  const fetchPayslipDetails = async (payslipId: string) => {
    try {
      const response = await fetch(`/api/hrms/payslips/${payslipId}`);
      if (!response.ok) throw new Error('Failed to fetch payslip details');
      return await response.json();
    } catch (err) {
      console.error('Error fetching payslip details:', err);
      return null;
    }
  };

  const handleDownload = async (payslip: Payslip) => {
    // Fetch detailed payslip if breakdown not available
    let detailedPayslip = payslip;
    if (!payslip.breakdown) {
      const details = await fetchPayslipDetails(payslip.id);
      if (details) detailedPayslip = details;
    }

    const [year, monthNum] = payslip.month.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[parseInt(monthNum) - 1];
    
    const breakdown = detailedPayslip.breakdown || {
      earnings: { basic: payslip.basic, hra: payslip.hra, specialAllowance: payslip.allowances, otherAllowances: 0, grossSalary: payslip.basic + payslip.hra + payslip.allowances },
      deductions: { pfEmployee: 0, esiEmployee: 0, tds: 0, professionalTax: 0, otherDeductions: 0, totalDeductions: payslip.deductions },
      netPay: payslip.netPay
    };
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
              Bank: ${user?.bankName || 'N/A'}<br/>
              Acct: ${user?.bankAccountNumber ? 'XXXXXX' + user.bankAccountNumber.slice(-4) : 'N/A'}<br/>
              Date: ${payslip.generatedDate}<br/>
              Days Payable: 30
            </div>
          </div>

          <table>
            <tr><th>Description</th><th style="text-align:right">Amount (USD)</th></tr>
            <tr><td>Basic Salary</td><td class="amount">₹${breakdown.earnings.basic.toLocaleString('en-IN')}.00</td></tr>
            <tr><td>House Rent Allowance (HRA)</td><td class="amount">₹${breakdown.earnings.hra.toLocaleString('en-IN')}.00</td></tr>
            <tr><td>Special Allowance</td><td class="amount">₹${breakdown.earnings.specialAllowance.toLocaleString('en-IN')}.00</td></tr>
            ${breakdown.earnings.otherAllowances > 0 ? `<tr><td>Other Allowances</td><td class="amount">₹${breakdown.earnings.otherAllowances.toLocaleString('en-IN')}.00</td></tr>` : ''}
            <tr><td colspan="2" style="padding-top: 15px; border-top: 1px solid #e5e7eb;"><strong>Gross Salary</strong></td></tr>
            <tr><td><i>Less: Provident Fund (PF)</i></td><td class="amount deduction">-₹${breakdown.deductions.pfEmployee.toLocaleString('en-IN')}.00</td></tr>
            ${breakdown.deductions.esiEmployee > 0 ? `<tr><td><i>Less: ESI</i></td><td class="amount deduction">-₹${breakdown.deductions.esiEmployee.toLocaleString('en-IN')}.00</td></tr>` : ''}
            <tr><td><i>Less: Income Tax (TDS)</i></td><td class="amount deduction">-₹${breakdown.deductions.tds.toLocaleString('en-IN')}.00</td></tr>
            <tr><td><i>Less: Professional Tax</i></td><td class="amount deduction">-₹${breakdown.deductions.professionalTax.toLocaleString('en-IN')}.00</td></tr>
            ${breakdown.deductions.otherDeductions > 0 ? `<tr><td><i>Less: Other Deductions</i></td><td class="amount deduction">-₹${breakdown.deductions.otherDeductions.toLocaleString('en-IN')}.00</td></tr>` : ''}
            <tr class="total-row">
              <td>NET PAYABLE</td>
              <td class="amount">₹${breakdown.netPay.toLocaleString('en-IN')}.00</td>
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
    a.download = `Payslip_${month}_${year}_${user?.name || 'Employee'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-grx-text dark:text-white">Payroll & Compensation</h2>
        <button
          onClick={() => {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            setGenerateMonth(currentMonth);
            setShowGenerateModal(true);
          }}
          className="bg-grx-primary-600 text-white px-4 py-2 rounded-lg hover:bg-grx-primary-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Generate Payslip
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {user?.role === Role.FINANCE && (
         <div className="bg-grx-primary-900 rounded-xl p-6 text-white mb-8">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-semibold">Finance Overview</h3>
             <button className="bg-grx-primary-600 hover:bg-grx-primary-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
               Run Payroll Batch
             </button>
           </div>
           <div className="grid grid-cols-3 gap-8">
             <div>
               <p className="text-grx-primary-300 text-sm">Total Payroll Cost</p>
               <p className="text-2xl font-bold mt-1">$142,500</p>
             </div>
             <div>
               <p className="text-grx-primary-300 text-sm">Pending Approvals</p>
               <p className="text-2xl font-bold mt-1">4</p>
             </div>
             <div>
               <p className="text-grx-primary-300 text-sm">Tax Deductions</p>
               <p className="text-2xl font-bold mt-1">$22,400</p>
             </div>
           </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Salary Structure Card */}
        <div className="grx-glass-card p-6 rounded-xl lg:col-span-1">
          <h3 className="font-semibold text-grx-text dark:text-white mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-500" />
            Current Salary Structure
          </h3>
          {salaryStructure ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-grx-muted dark:text-grx-muted">Annual CTC</span>
                <span className="font-medium text-grx-text dark:text-white">₹{salaryStructure.annualCTC.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-grx-muted dark:text-grx-muted">Monthly Gross</span>
                <span className="font-medium text-grx-text dark:text-white">₹{Math.round(salaryStructure.monthlyGross).toLocaleString('en-IN')}</span>
              </div>
              <div className="h-px bg-grx-primary-50 dark:bg-grx-primary-800 my-2"></div>
              <div className="text-xs text-grx-muted">
                Breakdown calculated automatically based on CTC
              </div>
            </div>
          ) : (
            <div className="text-sm text-grx-muted">Loading salary structure...</div>
          )}
        </div>

        {/* Payslips List */}
        <div className="grx-glass-card rounded-xl lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-grx-primary-50 dark:border-grx-primary-800 font-semibold text-grx-text dark:text-white">Recent Payslips</div>
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin text-grx-primary-600 mx-auto" size={32} />
              <p className="text-grx-muted mt-2">Loading payslips...</p>
            </div>
          ) : payslips.length === 0 ? (
            <div className="p-8 text-center text-grx-muted">No payslips found. Generate your first payslip to get started.</div>
          ) : (
            <div className="divide-y divide-grx-primary-50 dark:divide-grx-primary-800">
              {payslips.map((slip) => {
                const [year, monthNum] = slip.month.split('-');
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                   'July', 'August', 'September', 'October', 'November', 'December'];
                const month = monthNames[parseInt(monthNum) - 1];
                
                return (
                  <div key={slip.id} className="p-4 flex items-center justify-between hover:bg-grx-bg dark:hover:bg-grx-primary-800 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-grx-primary-50 dark:bg-grx-primary-900/20 rounded-lg flex items-center justify-center text-grx-primary-600 dark:text-grx-primary-400">
                        <FileText size={20} />
                      </div>
                      <div>
                        {(user?.role === Role.ADMIN || user?.role === Role.HR || user?.role === Role.FINANCE || user?.role === Role.MANAGER) && (
                          <p className="text-xs text-grx-muted dark:text-grx-muted mb-1">
                            {slip.Employee?.name || slip.employeeId}
                          </p>
                        )}
                        <p className="font-medium text-grx-text dark:text-white">{month} {year}</p>
                        <p className="text-xs text-grx-muted dark:text-grx-muted">Generated on {slip.generatedDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-mono font-medium text-grx-text dark:text-grx-primary-200">₹{slip.netPay.toLocaleString('en-IN')}</span>
                      <button 
                        onClick={() => handleDownload(slip)}
                        className="text-grx-primary-600 dark:text-grx-primary-400 hover:bg-grx-primary-50 dark:hover:bg-grx-primary-900/20 p-2 rounded-full transition-colors"
                        title="Download Payslip"
                      >
                        <Download size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Generate Payslip Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 grx-modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="grx-glass-card rounded-xl w-full max-w-md p-6 shadow-2xl grx-modal-enter">
            <h3 className="text-lg font-bold mb-4 text-grx-text dark:text-white">Generate Payslip</h3>
            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">Month *</label>
                <input
                  type="month"
                  className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg p-2.5 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
                  value={generateMonth}
                  onChange={e => setGenerateMonth(e.target.value)}
                  max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setError(null);
                    setGenerateMonth('');
                  }}
                  className="flex-1 bg-grx-primary-50 dark:bg-grx-primary-800 text-grx-text dark:text-grx-primary-200 py-2.5 rounded-lg hover:bg-grx-primary-100 dark:hover:bg-grx-primary-700 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGeneratePayslip}
                  disabled={generating || !generateMonth}
                  className="flex-1 bg-grx-primary-600 text-white py-2.5 rounded-lg hover:bg-grx-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};