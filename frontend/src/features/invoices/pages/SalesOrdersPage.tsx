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
  ArrowRight,
} from 'lucide-react';

interface SalesOrderLineItem {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  deliveryDate: string;
  status: 'Draft' | 'Confirmed' | 'Delivered' | 'Invoiced' | 'Cancelled';
  subTotal: number;
  taxTotal: number;
  total: number;
  notes?: string;
  lineItems: SalesOrderLineItem[];
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
  Confirmed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  Delivered: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  Invoiced: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  Cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export const SalesOrdersPage: React.FC = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDeliveryDate, setFormDeliveryDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formLines, setFormLines] = useState<FormLineItem[]>([
    { id: '1', description: '', hsnCode: '', quantity: '1', rate: '', taxRate: '18' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  const fetchSalesOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      const response = await fetch(`/api/invoices/sales-orders?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch sales orders');
      const result = await response.json();
      setSalesOrders(result.salesOrders || result);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales orders');
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

  useEffect(() => {
    fetchSalesOrders();
    fetchCustomers();
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
    if (formTotal <= 0) {
      setFormError('Sales order must have at least one line item with a positive amount.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: formCustomerId,
        date: formDate,
        deliveryDate: formDeliveryDate,
        notes: formNotes,
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
      const response = await fetch('/api/invoices/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create sales order');
      setIsCreating(false);
      resetForm();
      fetchSalesOrders();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create sales order');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormCustomerId('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDeliveryDate('');
    setFormNotes('');
    setFormLines([{ id: '1', description: '', hsnCode: '', quantity: '1', rate: '', taxRate: '18' }]);
    setFormError(null);
  };

  const handleConvertToInvoice = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/sales-orders/${id}/convert-to-invoice`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to convert sales order to invoice');
      fetchSalesOrders();
      alert('Sales order converted to invoice successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

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
            <h2 className="text-2xl font-bold text-grx-text dark:text-white">New Sales Order</h2>
            <p className="text-grx-muted dark:text-grx-muted">Create a new sales order</p>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
                  Order Date
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
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={formDeliveryDate}
                  onChange={(e) => setFormDeliveryDate(e.target.value)}
                  className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-grx-text dark:text-grx-primary-200">Line Items</h3>
              <button
                onClick={addLine}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-sm font-medium flex items-center gap-1"
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
                  <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                    <td colSpan={5} className="px-3 py-3 text-sm font-bold text-right text-emerald-700 dark:text-emerald-400">
                      Total
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-emerald-900 dark:text-emerald-100">
                      ₹{formatINR(formTotal)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1">
              Notes
            </label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes or delivery instructions..."
              className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
            />
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
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Sales Order
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
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Sales Orders</h2>
          <p className="text-grx-muted dark:text-grx-muted">Manage customer orders</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={18} /> New Sales Order
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Sales Orders Table */}
      <div className="grx-glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-grx-primary-50 dark:border-grx-primary-800 bg-grx-bg/50 dark:bg-grx-dark/50">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted" size={18} />
            <input
              type="text"
              placeholder="Search sales orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchSalesOrders()}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <span className="ml-2 text-grx-muted dark:text-grx-muted">Loading sales orders...</span>
          </div>
        ) : salesOrders.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto text-grx-primary-200 dark:text-grx-muted mb-4" />
            <p className="text-grx-muted dark:text-grx-muted">No sales orders found.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-grx-muted dark:text-grx-muted uppercase bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-50 dark:border-grx-primary-800">
              <tr>
                <th className="px-6 py-4">Order #</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Delivery Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grx-primary-50 dark:divide-grx-primary-800 bg-white dark:bg-grx-dark-surface">
              {salesOrders.map((order) => (
                <tr key={order.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                  <td className="px-6 py-4 font-medium text-emerald-600 dark:text-emerald-400">
                    {order.orderNumber}
                  </td>
                  <td className="px-6 py-4 text-grx-text dark:text-white font-medium">
                    {order.customerName}
                  </td>
                  <td className="px-6 py-4 text-grx-muted dark:text-grx-muted">{order.date}</td>
                  <td className="px-6 py-4 text-grx-muted dark:text-grx-muted">
                    {order.deliveryDate}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[order.status] || ''
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-grx-text dark:text-grx-primary-200">
                    ₹{formatINR(order.total)}
                  </td>
                  <td className="px-6 py-4">
                    {order.status === 'Delivered' && (
                      <button
                        onClick={() => handleConvertToInvoice(order.id)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <ArrowRight size={14} /> Convert to Invoice
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

export default SalesOrdersPage;
