import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ArrowLeft,
  Save,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface BillLineItem {
  id: string;
  description: string;
  accountId: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Bill {
  id: string;
  billNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  dueDate: string;
  status: 'Draft' | 'Approved' | 'Paid' | 'Overdue' | 'Void';
  subTotal: number;
  taxTotal: number;
  total: number;
  lineItems: BillLineItem[];
}

interface AgingSummary {
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyDays: number;
  overNinety: number;
  total: number;
}

interface FormLineItem {
  id: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
}

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  Approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  Paid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  Overdue: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  Void: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
};

const BillsPage: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [aging, setAging] = useState<AgingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formVendorId, setFormVendorId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formLines, setFormLines] = useState<FormLineItem[]>([
    { id: '1', description: '', accountId: '', quantity: '1', unitPrice: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; code: string; name: string }[]>([]);

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      const response = await fetch(`/api/billing/bills?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch bills');
      const result = await response.json();
      setBills(result.bills || result);
      if (result.aging) setAging(result.aging);
    } catch (err: any) {
      setError(err.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchAging = async () => {
    try {
      const response = await fetch('/api/billing/bills/aging');
      if (response.ok) {
        const result = await response.json();
        setAging(result);
      }
    } catch {
      // Aging is supplementary; no need to block the page
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const result = await response.json();
        setVendors(result.vendors || result);
      }
    } catch {
      // Optional
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounting/accounts');
      if (response.ok) {
        const result = await response.json();
        setAccounts(result.accounts || result);
      }
    } catch {
      // Optional
    }
  };

  useEffect(() => {
    fetchBills();
    fetchAging();
    fetchVendors();
    fetchAccounts();
  }, []);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const formSubTotal = formLines.reduce(
    (sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0),
    0
  );

  const addLine = () => {
    setFormLines([
      ...formLines,
      { id: Date.now().toString(), description: '', accountId: '', quantity: '1', unitPrice: '' },
    ]);
  };

  const removeLine = (id: string) => {
    if (formLines.length <= 1) return;
    setFormLines(formLines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof FormLineItem, value: string) => {
    setFormLines(formLines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!formVendorId) {
      setFormError('Please select a vendor.');
      return;
    }
    if (formSubTotal <= 0) {
      setFormError('Bill must have at least one line item with a positive amount.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vendorId: formVendorId,
        date: formDate,
        dueDate: formDueDate,
        lineItems: formLines
          .filter((l) => (parseFloat(l.unitPrice) || 0) > 0)
          .map((l) => ({
            description: l.description,
            accountId: l.accountId,
            quantity: parseFloat(l.quantity) || 1,
            unitPrice: parseFloat(l.unitPrice) || 0,
          })),
      };
      const response = await fetch('/api/billing/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create bill');
      setIsCreating(false);
      resetForm();
      fetchBills();
      fetchAging();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create bill');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormVendorId('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDueDate('');
    setFormLines([{ id: '1', description: '', accountId: '', quantity: '1', unitPrice: '' }]);
    setFormError(null);
  };

  const handleAction = async (id: string, action: 'approve' | 'void') => {
    try {
      const response = await fetch(`/api/billing/bills/${id}/${action}`, { method: 'POST' });
      if (!response.ok) throw new Error(`Failed to ${action} bill`);
      fetchBills();
      fetchAging();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Create form view
  if (isCreating) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setIsCreating(false);
              resetForm();
            }}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">New Bill</h2>
            <p className="text-slate-500 dark:text-slate-400">Record a new vendor bill</p>
          </div>
        </div>

        {formError && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle size={18} />
            {formError}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Vendor
              </label>
              <select
                value={formVendorId}
                onChange={(e) => setFormVendorId(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bill Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Line Items
              </h3>
              <button
                onClick={addLine}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium flex items-center gap-1"
              >
                <Plus size={16} /> Add Line
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Description
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Account
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Unit Price
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Amount
                    </th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {formLines.map((line) => {
                    const lineAmount =
                      (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
                    return (
                      <tr key={line.id}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) =>
                              updateLine(line.id, 'description', e.target.value)
                            }
                            placeholder="Item description"
                            className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={line.accountId}
                            onChange={(e) =>
                              updateLine(line.id, 'accountId', e.target.value)
                            }
                            className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          >
                            <option value="">Select account</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} - {a.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                            min="1"
                            className="w-20 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(line.id, 'unitPrice', e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-28 border border-slate-300 dark:border-slate-600 rounded px-2 py-1.5 text-sm text-right bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                          {formatINR(lineAmount)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => removeLine(line.id)}
                            disabled={formLines.length <= 1}
                            className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-600">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-sm font-bold text-right text-slate-900 dark:text-slate-100">
                      Subtotal
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatINR(formSubTotal)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setIsCreating(false);
                resetForm();
              }}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || formSubTotal <= 0}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Bill
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bills</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Manage vendor bills and accounts payable
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={18} /> New Bill
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* AP Aging Summary */}
      {aging && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Current</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {formatINR(aging.current)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">1-30 Days</p>
            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              {formatINR(aging.thirtyDays)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">31-60 Days</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {formatINR(aging.sixtyDays)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">61-90 Days</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatINR(aging.ninetyDays)}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">90+ Days</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">
              {formatINR(aging.overNinety)}
            </p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">Total AP</p>
            <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
              {formatINR(aging.total)}
            </p>
          </div>
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchBills()}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <span className="ml-2 text-slate-500 dark:text-slate-400">Loading bills...</span>
          </div>
        ) : bills.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No bills found.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Bill #</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 font-medium text-indigo-600 dark:text-indigo-400">
                    {bill.billNumber}
                  </td>
                  <td className="px-6 py-4 text-slate-800 dark:text-slate-100 font-medium">
                    {bill.vendorName}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{bill.date}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      {bill.status === 'Overdue' && (
                        <Clock size={14} className="text-red-500" />
                      )}
                      {bill.dueDate}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[bill.status] || ''}`}
                    >
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                    {formatINR(bill.total)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {bill.status === 'Draft' && (
                        <button
                          onClick={() => handleAction(bill.id, 'approve')}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                      )}
                      {(bill.status === 'Draft' || bill.status === 'Approved') && (
                        <button
                          onClick={() => handleAction(bill.id, 'void')}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <XCircle size={14} /> Void
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BillsPage;
