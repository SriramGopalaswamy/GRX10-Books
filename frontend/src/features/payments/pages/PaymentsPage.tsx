import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  CreditCard,
  AlertTriangle,
  Filter,
  Banknote,
} from 'lucide-react';

interface PaymentAllocation {
  documentId: string;
  documentNumber: string;
  documentType: 'Invoice' | 'Bill';
  amount: number;
}

interface Payment {
  id: string;
  paymentNumber: string;
  date: string;
  type: 'Customer' | 'Vendor';
  partyId: string;
  partyName: string;
  method: 'Bank Transfer' | 'Cash' | 'Cheque' | 'UPI' | 'Credit Card';
  bankAccountId: string;
  bankAccountName: string;
  referenceNumber: string;
  amount: number;
  status: 'Draft' | 'Confirmed' | 'Void';
  allocations: PaymentAllocation[];
}

interface FormAllocation {
  id: string;
  documentId: string;
  amount: string;
}

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  Confirmed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  Void: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const TYPE_STYLES: Record<string, string> = {
  Customer: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  Vendor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
};

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Credit Card'];

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Form state
  const [formType, setFormType] = useState<'Customer' | 'Vendor'>('Customer');
  const [formPartyId, setFormPartyId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMethod, setFormMethod] = useState('Bank Transfer');
  const [formBankAccountId, setFormBankAccountId] = useState('');
  const [formReferenceNumber, setFormReferenceNumber] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formAllocations, setFormAllocations] = useState<FormAllocation[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{ id: string; name: string }[]>([]);
  const [documents, setDocuments] = useState<
    { id: string; number: string; type: string; amount: number; balance: number }[]
  >([]);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (typeFilter) params.append('type', typeFilter);
      const response = await fetch(`/api/payments?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch payments');
      const result = await response.json();
      setPayments(result.payments || result);
    } catch (err: any) {
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const [custRes, vendRes, bankRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/vendors'),
        fetch('/api/banking/accounts'),
      ]);
      if (custRes.ok) {
        const r = await custRes.json();
        setCustomers(r.customers || r);
      }
      if (vendRes.ok) {
        const r = await vendRes.json();
        setVendors(r.vendors || r);
      }
      if (bankRes.ok) {
        const r = await bankRes.json();
        setBankAccounts(r.accounts || r);
      }
    } catch {
      // Optional data
    }
  };

  const fetchDocuments = async (partyId: string, type: 'Customer' | 'Vendor') => {
    try {
      const endpoint =
        type === 'Customer'
          ? `/api/invoices?customerId=${partyId}&status=unpaid`
          : `/api/billing/bills?vendorId=${partyId}&status=unpaid`;
      const response = await fetch(endpoint);
      if (response.ok) {
        const result = await response.json();
        setDocuments(result.documents || result.invoices || result.bills || result);
      }
    } catch {
      setDocuments([]);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchParties();
  }, [typeFilter]);

  useEffect(() => {
    if (formPartyId) {
      fetchDocuments(formPartyId, formType);
      setFormAllocations([]);
    }
  }, [formPartyId, formType]);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const totalAllocated = formAllocations.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0
  );

  const addAllocation = () => {
    setFormAllocations([
      ...formAllocations,
      { id: Date.now().toString(), documentId: '', amount: '' },
    ]);
  };

  const updateAllocation = (id: string, field: keyof FormAllocation, value: string) => {
    setFormAllocations(
      formAllocations.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const removeAllocation = (id: string) => {
    setFormAllocations(formAllocations.filter((a) => a.id !== id));
  };

  const handleSubmit = async () => {
    setFormError(null);
    const amount = parseFloat(formAmount) || 0;
    if (!formPartyId) {
      setFormError(`Please select a ${formType.toLowerCase()}.`);
      return;
    }
    if (amount <= 0) {
      setFormError('Payment amount must be greater than zero.');
      return;
    }
    if (totalAllocated > amount) {
      setFormError('Total allocation cannot exceed payment amount.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: formType,
        partyId: formPartyId,
        date: formDate,
        method: formMethod,
        bankAccountId: formBankAccountId,
        referenceNumber: formReferenceNumber,
        amount,
        allocations: formAllocations
          .filter((a) => a.documentId && (parseFloat(a.amount) || 0) > 0)
          .map((a) => ({
            documentId: a.documentId,
            amount: parseFloat(a.amount) || 0,
          })),
      };
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create payment');
      setIsCreating(false);
      resetForm();
      fetchPayments();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create payment');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormType('Customer');
    setFormPartyId('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormMethod('Bank Transfer');
    setFormBankAccountId('');
    setFormReferenceNumber('');
    setFormAmount('');
    setFormAllocations([]);
    setFormError(null);
    setDocuments([]);
  };

  const handleAction = async (id: string, action: 'confirm' | 'void') => {
    try {
      const response = await fetch(`/api/payments/${id}/${action}`, { method: 'POST' });
      if (!response.ok) throw new Error(`Failed to ${action} payment`);
      fetchPayments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const parties = formType === 'Customer' ? customers : vendors;

  // Create form view
  if (isCreating) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
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
            <h2 className="text-2xl font-bold text-grx-text dark:text-white">
              Record Payment
            </h2>
            <p className="text-grx-muted dark:text-grx-muted">Record a customer or vendor payment</p>
          </div>
        </div>

        {formError && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle size={18} />
            {formError}
          </div>
        )}

        <div className="grx-glass-card rounded-xl p-6 space-y-6">
          {/* Payment Type Toggle */}
          <div className="flex bg-grx-primary-50 dark:bg-grx-dark p-1 rounded-lg w-fit">
            <button
              onClick={() => {
                setFormType('Customer');
                setFormPartyId('');
              }}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                formType === 'Customer'
                  ? 'bg-white dark:bg-grx-primary-800 shadow-sm text-grx-text dark:text-white'
                  : 'text-grx-muted dark:text-grx-muted'
              }`}
            >
              Customer Payment
            </button>
            <button
              onClick={() => {
                setFormType('Vendor');
                setFormPartyId('');
              }}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                formType === 'Vendor'
                  ? 'bg-white dark:bg-grx-primary-800 shadow-sm text-grx-text dark:text-white'
                  : 'text-grx-muted dark:text-grx-muted'
              }`}
            >
              Vendor Payment
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 grx-stagger">
            <div>
              <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
                {formType}
              </label>
              <select
                value={formPartyId}
                onChange={(e) => setFormPartyId(e.target.value)}
                className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
              >
                <option value="">Select {formType.toLowerCase()}</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 grx-stagger">
            <div>
              <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
                Payment Method
              </label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value)}
                className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
                Bank Account
              </label>
              <select
                value={formBankAccountId}
                onChange={(e) => setFormBankAccountId(e.target.value)}
                className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
              >
                <option value="">Select bank account</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={formReferenceNumber}
                onChange={(e) => setFormReferenceNumber(e.target.value)}
                placeholder="e.g. CHQ-001, UTR-12345"
                className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
              Amount
            </label>
            <input
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full md:w-64 border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
            />
          </div>

          {/* Document Allocation */}
          {formPartyId && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-grx-text dark:text-grx-primary-200">
                  Allocate to Documents
                </h3>
                <button
                  onClick={addAllocation}
                  className="text-grx-primary-600 dark:text-grx-primary-400 hover:text-grx-primary-800 dark:hover:text-grx-primary-300 text-sm font-medium flex items-center gap-1"
                >
                  <Plus size={16} /> Add Allocation
                </button>
              </div>
              {formAllocations.length === 0 ? (
                <p className="text-sm text-grx-muted dark:text-grx-muted">
                  No allocations added. Payment will be recorded as unallocated.
                </p>
              ) : (
                <div className="space-y-2">
                  {formAllocations.map((alloc) => (
                    <div
                      key={alloc.id}
                      className="flex items-center gap-3 bg-grx-bg dark:bg-grx-dark p-3 rounded-lg border border-grx-primary-100 dark:border-grx-primary-800"
                    >
                      <select
                        value={alloc.documentId}
                        onChange={(e) =>
                          updateAllocation(alloc.id, 'documentId', e.target.value)
                        }
                        className="flex-1 border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
                      >
                        <option value="">Select document</option>
                        {documents.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.number} - {formatINR(d.balance || d.amount)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={alloc.amount}
                        onChange={(e) =>
                          updateAllocation(alloc.id, 'amount', e.target.value)
                        }
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-32 border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm text-right bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
                      />
                      <button
                        onClick={() => removeAllocation(alloc.id)}
                        className="text-grx-muted hover:text-red-500"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  ))}
                  <div className="text-sm text-grx-muted dark:text-grx-muted text-right">
                    Total Allocated: <span className="font-semibold">{formatINR(totalAllocated)}</span>
                    {(parseFloat(formAmount) || 0) > 0 && (
                      <span className="ml-2">
                        Unallocated:{' '}
                        <span className="font-semibold">
                          {formatINR((parseFloat(formAmount) || 0) - totalAllocated)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
              disabled={submitting || (parseFloat(formAmount) || 0) <= 0}
              className="bg-grx-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-grx-primary-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Payment
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
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Payments</h2>
          <p className="text-grx-muted dark:text-grx-muted">
            Manage customer and vendor payments
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-grx-primary-600 hover:bg-grx-primary-700 text-white grx-btn-press px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={18} /> Record Payment
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Payments Table */}
      <div className="grx-glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-grx-primary-50 dark:border-grx-primary-800 bg-grx-bg/50 dark:bg-grx-dark/50">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted" size={18} />
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPayments()}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-grx-muted" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
              >
                <option value="">All Types</option>
                <option value="Customer">Customer</option>
                <option value="Vendor">Vendor</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-grx-primary-600" size={32} />
            <span className="ml-2 text-grx-muted dark:text-grx-muted">Loading payments...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <Banknote size={48} className="mx-auto text-grx-primary-200 dark:text-grx-muted mb-4" />
            <p className="text-grx-muted dark:text-grx-muted">No payments found.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-grx-muted dark:text-grx-muted uppercase bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-50 dark:border-grx-primary-800">
              <tr>
                <th className="px-6 py-4">Payment #</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Party</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Bank Account</th>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grx-primary-50 dark:divide-grx-primary-800 bg-white dark:bg-grx-dark-surface">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                  <td className="px-6 py-4 font-medium text-grx-primary-600 dark:text-grx-primary-400">
                    {payment.paymentNumber}
                  </td>
                  <td className="px-6 py-4 text-grx-muted dark:text-grx-muted">{payment.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[payment.type] || ''}`}
                    >
                      {payment.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-grx-text dark:text-white font-medium">
                    {payment.partyName}
                  </td>
                  <td className="px-6 py-4 text-grx-muted dark:text-grx-primary-200 flex items-center gap-1">
                    <CreditCard size={14} className="text-grx-muted" />
                    {payment.method}
                  </td>
                  <td className="px-6 py-4 text-grx-muted dark:text-grx-muted text-xs">
                    {payment.bankAccountName || '-'}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-grx-muted dark:text-grx-muted">
                    {payment.referenceNumber || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[payment.status] || ''}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-grx-text dark:text-grx-primary-200">
                    {formatINR(payment.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {payment.status === 'Draft' && (
                        <button
                          onClick={() => handleAction(payment.id, 'confirm')}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle size={14} /> Confirm
                        </button>
                      )}
                      {(payment.status === 'Draft' || payment.status === 'Confirmed') && (
                        <button
                          onClick={() => handleAction(payment.id, 'void')}
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

export default PaymentsPage;
