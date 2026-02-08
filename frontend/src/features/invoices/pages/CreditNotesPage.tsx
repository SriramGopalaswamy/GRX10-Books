import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ArrowLeft,
  Save,
  Loader2,
  Trash2,
  FileText,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface CreditNoteLineItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
}

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  date: string;
  reason: string;
  status: 'Draft' | 'Approved' | 'Applied' | 'Void';
  subTotal: number;
  taxTotal: number;
  total: number;
  lineItems: CreditNoteLineItem[];
}

interface FormLineItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: string;
  rate: string;
  taxRate: string;
}

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  Approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  Applied: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  Void: 'bg-grx-primary-50 dark:bg-grx-primary-800 text-grx-muted dark:text-grx-muted',
};

export const CreditNotesPage: React.FC = () => {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formInvoiceId, setFormInvoiceId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formReason, setFormReason] = useState('');
  const [formLines, setFormLines] = useState<FormLineItem[]>([
    { id: '1', description: '', hsnCode: '', quantity: '1', rate: '', taxRate: '18' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [invoices, setInvoices] = useState<{ id: string; number: string; customerId: string }[]>([]);

  const fetchCreditNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      const response = await fetch(`/api/invoices/credit-notes?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch credit notes');
      const result = await response.json();
      setCreditNotes(result.creditNotes || result);
    } catch (err: any) {
      setError(err.message || 'Failed to load credit notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const result = await response.json();
        setCustomers(result.customers || result);
      }
    } catch {
      // Optional
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const result = await response.json();
        setInvoices(result.invoices || result);
      }
    } catch {
      // Optional
    }
  };

  useEffect(() => {
    fetchCreditNotes();
    fetchCustomers();
    fetchInvoices();
  }, []);

  const formatINR = (val: number) =>
    val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formSubTotal = formLines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const rate = parseFloat(l.rate) || 0;
    return sum + qty * rate;
  }, 0);

  const formTaxTotal = formLines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const rate = parseFloat(l.rate) || 0;
    const taxRate = parseFloat(l.taxRate) || 0;
    return sum + (qty * rate * taxRate) / 100;
  }, 0);

  const formTotal = formSubTotal + formTaxTotal;

  const addLine = () => {
    setFormLines([
      ...formLines,
      { id: Date.now().toString(), description: '', hsnCode: '', quantity: '1', rate: '', taxRate: '18' },
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
    if (!formCustomerId) {
      setFormError('Please select a customer.');
      return;
    }
    if (!formReason.trim()) {
      setFormError('Please provide a reason for the credit note.');
      return;
    }
    if (formTotal <= 0) {
      setFormError('Credit note must have at least one line item with a positive amount.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: formCustomerId,
        invoiceId: formInvoiceId || undefined,
        date: formDate,
        reason: formReason,
        lineItems: formLines
          .filter((l) => (parseFloat(l.rate) || 0) > 0)
          .map((l) => ({
            description: l.description,
            hsnCode: l.hsnCode,
            quantity: parseFloat(l.quantity) || 1,
            rate: parseFloat(l.rate) || 0,
            taxRate: parseFloat(l.taxRate) || 0,
          })),
      };
      const response = await fetch('/api/invoices/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create credit note');
      setIsCreating(false);
      resetForm();
      fetchCreditNotes();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create credit note');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormCustomerId('');
    setFormInvoiceId('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormReason('');
    setFormLines([{ id: '1', description: '', hsnCode: '', quantity: '1', rate: '', taxRate: '18' }]);
    setFormError(null);
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/credit-notes/${id}/approve`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to approve credit note');
      fetchCreditNotes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredInvoices = invoices.filter(inv => !formCustomerId || inv.customerId === formCustomerId);

  // Create form view
  if (isCreating) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setIsCreating(false);
              resetForm();
            }}
            className="p-2 hover:bg-grx-primary-100 dark:hover:bg-grx-primary-800 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-grx-muted dark:text-grx-primary-200" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-grx-text dark:text-white">New Credit Note</h2>
            <p className="text-grx-muted dark:text-grx-muted">Issue a credit note to customer</p>
          </div>
        </div>

        {formError && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle size={18} />
            {formError}
          </div>
        )}

        <div className="grx-glass-card rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 grx-stagger">
            <div>
              <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
                Customer
              </label>
              <select
                value={formCustomerId}
                onChange={(e) => setFormCustomerId(e.target.value)}
                className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
                Linked Invoice (Optional)
              </label>
              <select
                value={formInvoiceId}
                onChange={(e) => setFormInvoiceId(e.target.value)}
                disabled={!formCustomerId}
                className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none disabled:opacity-50"
              >
                <option value="">None</option>
                {filteredInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 grx-stagger">
            <div>
              <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
                Date
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
                Reason
              </label>
              <input
                type="text"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="e.g., Product return, Service cancellation"
                className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-grx-text dark:text-grx-primary-200">Line Items</h3>
              <button
                onClick={addLine}
                className="text-grx-primary-600 dark:text-grx-primary-400 hover:text-grx-primary-800 dark:hover:text-grx-primary-300 text-sm font-medium flex items-center gap-1"
              >
                <Plus size={16} /> Add Line
              </button>
            </div>

            <div className="bg-grx-bg dark:bg-grx-dark rounded-lg border border-grx-primary-100 dark:border-grx-primary-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-grx-primary-50 dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted">
                      HSN
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted">
                      Rate
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted">
                      Tax %
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted">
                      Amount
                    </th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
                  {formLines.map((line) => {
                    const qty = parseFloat(line.quantity) || 0;
                    const rate = parseFloat(line.rate) || 0;
                    const taxRate = parseFloat(line.taxRate) || 0;
                    const lineAmount = qty * rate;
                    const lineTax = (lineAmount * taxRate) / 100;
                    const lineTotal = lineAmount + lineTax;

                    return (
                      <tr key={line.id}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={line.description}
                            onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                            placeholder="Item description"
                            className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={line.hsnCode}
                            onChange={(e) => updateLine(line.id, 'hsnCode', e.target.value)}
                            placeholder="HSN"
                            className="w-20 border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                            min="1"
                            className="w-16 border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm text-right bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={line.rate}
                            onChange={(e) => updateLine(line.id, 'rate', e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-24 border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm text-right bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={line.taxRate}
                            onChange={(e) => updateLine(line.id, 'taxRate', e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-16 border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm text-right bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-sm text-grx-text dark:text-grx-primary-200">
                          ₹{formatINR(lineTotal)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeLine(line.id)}
                            disabled={formLines.length <= 1}
                            className="text-grx-muted hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-grx-primary-50 dark:bg-grx-dark border-t-2 border-grx-primary-100 dark:border-grx-primary-700">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-sm font-semibold text-right text-grx-text dark:text-grx-primary-200">
                      Subtotal
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-grx-text dark:text-white">
                      ₹{formatINR(formSubTotal)}
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-sm font-semibold text-right text-grx-text dark:text-grx-primary-200">
                      Tax
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-grx-text dark:text-white">
                      ₹{formatINR(formTaxTotal)}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="bg-grx-primary-50 dark:bg-grx-primary-900/20">
                    <td colSpan={5} className="px-3 py-3 text-sm font-bold text-right text-grx-primary-700 dark:text-grx-primary-400">
                      Total Credit
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-grx-primary-900 dark:text-grx-primary-100">
                      ₹{formatINR(formTotal)}
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
              className="px-4 py-2 text-grx-muted dark:text-grx-muted font-medium hover:bg-grx-bg dark:hover:bg-grx-primary-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || formTotal <= 0}
              className="bg-grx-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-grx-primary-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Credit Note
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Credit Notes</h2>
          <p className="text-grx-muted dark:text-grx-muted">Manage customer credit notes</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-grx-primary-600 hover:bg-grx-primary-700 text-white grx-btn-press px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={18} /> New Credit Note
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Credit Notes Table */}
      <div className="grx-glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-grx-primary-50 dark:border-grx-primary-800 bg-grx-bg/50 dark:bg-grx-dark/50">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted" size={18} />
            <input
              type="text"
              placeholder="Search credit notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCreditNotes()}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-grx-primary-600" size={32} />
            <span className="ml-2 text-grx-muted dark:text-grx-muted">Loading credit notes...</span>
          </div>
        ) : creditNotes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto text-grx-primary-200 dark:text-grx-muted mb-4" />
            <p className="text-grx-muted dark:text-grx-muted">No credit notes found.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-grx-muted dark:text-grx-muted uppercase bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-50 dark:border-grx-primary-800">
              <tr>
                <th className="px-6 py-4">Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Invoice Ref</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grx-primary-50 dark:divide-grx-primary-800 bg-white dark:bg-grx-dark-surface">
              {creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                  <td className="px-6 py-4 font-medium text-grx-primary-600 dark:text-grx-primary-400">
                    {cn.creditNoteNumber}
                  </td>
                  <td className="px-6 py-4 text-grx-text dark:text-white font-medium">
                    {cn.customerName}
                  </td>
                  <td className="px-6 py-4 text-grx-muted dark:text-grx-muted text-xs">
                    {cn.invoiceNumber || '-'}
                  </td>
                  <td className="px-6 py-4 text-grx-muted dark:text-grx-muted">{cn.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[cn.status] || ''
                      }`}
                    >
                      {cn.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-grx-text dark:text-grx-primary-200">
                    ₹{formatINR(cn.total)}
                  </td>
                  <td className="px-6 py-4">
                    {cn.status === 'Draft' && (
                      <button
                        onClick={() => handleApprove(cn.id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                    )}
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

export default CreditNotesPage;
