import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle,
  BookOpen,
  Trash2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

interface JournalLine {
  id: string;
  accountId: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  number: string;
  date: string;
  description: string;
  status: 'Draft' | 'Approved' | 'Posted' | 'Reversed';
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  createdBy: string;
  createdAt: string;
}

interface FormLine {
  id: string;
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

const STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  Approved: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  Posted: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  Reversed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const JournalEntriesPage: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Form state
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLines, setFormLines] = useState<FormLine[]>([
    { id: '1', accountId: '', description: '', debit: '', credit: '' },
    { id: '2', accountId: '', description: '', debit: '', credit: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<{ id: string; code: string; name: string }[]>([]);

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (searchTerm) params.append('search', searchTerm);
      const response = await fetch(`/api/accounting/journal-entries?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch journal entries');
      const result = await response.json();
      setEntries(result.entries || result);
    } catch (err: any) {
      setError(err.message || 'Failed to load journal entries');
    } finally {
      setLoading(false);
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
      // Accounts list optional; form can still work with manual IDs
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
  }, [statusFilter, dateFrom, dateTo]);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  const totalDebit = formLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = formLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const addLine = () => {
    setFormLines([
      ...formLines,
      { id: Date.now().toString(), accountId: '', description: '', debit: '', credit: '' },
    ]);
  };

  const removeLine = (id: string) => {
    if (formLines.length <= 2) return;
    setFormLines(formLines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof FormLine, value: string) => {
    setFormLines(
      formLines.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        // If entering debit, clear credit and vice versa
        if (field === 'debit' && value) updated.credit = '';
        if (field === 'credit' && value) updated.debit = '';
        return updated;
      })
    );
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!formDescription.trim()) {
      setFormError('Description is required.');
      return;
    }
    if (!isBalanced) {
      setFormError('Total debits must equal total credits and be greater than zero.');
      return;
    }
    const hasEmptyAccount = formLines.some(
      (l) => !l.accountId && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0)
    );
    if (hasEmptyAccount) {
      setFormError('All lines with amounts must have an account selected.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date: formDate,
        description: formDescription,
        lines: formLines
          .filter((l) => (parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0)
          .map((l) => ({
            accountId: l.accountId,
            description: l.description,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
          })),
      };
      const response = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create journal entry');
      setIsCreating(false);
      resetForm();
      fetchEntries();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormLines([
      { id: '1', accountId: '', description: '', debit: '', credit: '' },
      { id: '2', accountId: '', description: '', debit: '', credit: '' },
    ]);
    setFormError(null);
  };

  const handleAction = async (id: string, action: 'approve' | 'post' | 'reverse') => {
    try {
      const response = await fetch(`/api/accounting/journal-entries/${id}/${action}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`Failed to ${action} journal entry`);
      fetchEntries();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Create form view
  if (isCreating) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 grx-animate-fade-in-up">
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
              New Journal Entry
            </h2>
            <p className="text-grx-muted dark:text-grx-muted">Create a manual journal entry</p>
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
                Description
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="e.g. Month-end depreciation adjustment"
                className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
              />
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-grx-text dark:text-grx-primary-200">
                Journal Lines
              </h3>
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
                    <th className="px-4 py-2 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted">
                      Account
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted">
                      Debit
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-grx-muted dark:text-grx-muted">
                      Credit
                    </th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
                  {formLines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-2">
                        <select
                          value={line.accountId}
                          onChange={(e) => updateLine(line.id, 'accountId', e.target.value)}
                          className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
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
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                          placeholder="Line memo"
                          className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={line.debit}
                          onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm text-right bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={line.credit}
                          onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full border border-grx-primary-100 dark:border-grx-primary-700 rounded px-2 py-1.5 text-sm text-right bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => removeLine(line.id)}
                          disabled={formLines.length <= 2}
                          className="text-grx-muted hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-grx-primary-50 dark:bg-grx-dark border-t-2 border-grx-primary-100 dark:border-grx-primary-700">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-bold text-grx-text dark:text-white">
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-grx-text dark:text-white">
                      {formatINR(totalDebit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-grx-text dark:text-white">
                      {formatINR(totalCredit)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Balance indicator */}
            <div
              className={`mt-3 p-3 rounded-lg text-sm font-medium ${
                isBalanced
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              }`}
            >
              {isBalanced
                ? 'Entry is balanced and ready to save.'
                : `Difference: ${formatINR(Math.abs(totalDebit - totalCredit))} - Debits must equal credits.`}
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
              disabled={!isBalanced || submitting}
              className="bg-grx-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-grx-primary-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save as Draft
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
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">Journal Entries</h2>
          <p className="text-grx-muted dark:text-grx-muted">
            View, create, and manage manual journal entries
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-grx-primary-600 hover:bg-grx-primary-700 text-white grx-btn-press px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
        >
          <Plus size={18} /> New Journal Entry
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="grx-glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-grx-primary-50 dark:border-grx-primary-800 bg-grx-bg/50 dark:bg-grx-dark/50">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted" size={18} />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEntries()}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-grx-muted" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Approved">Approved</option>
                <option value="Posted">Posted</option>
                <option value="Reversed">Reversed</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
              />
              <span className="text-grx-muted dark:text-grx-muted">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-grx-primary-600" size={32} />
            <span className="ml-2 text-grx-muted dark:text-grx-muted">Loading journal entries...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen size={48} className="mx-auto text-grx-primary-200 dark:text-grx-muted mb-4" />
            <p className="text-grx-muted dark:text-grx-muted">No journal entries found.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-grx-muted dark:text-grx-muted uppercase bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-50 dark:border-grx-primary-800">
              <tr>
                <th className="px-6 py-4">JE #</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Debit</th>
                <th className="px-6 py-4 text-right">Credit</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grx-primary-50 dark:divide-grx-primary-800 bg-white dark:bg-grx-dark-surface">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                  <td className="px-6 py-4 font-medium text-grx-primary-600 dark:text-grx-primary-400">
                    {entry.number}
                  </td>
                  <td className="px-6 py-4 text-grx-muted dark:text-grx-muted">{entry.date}</td>
                  <td className="px-6 py-4 text-grx-text dark:text-white font-medium">
                    {entry.description}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[entry.status] || ''}`}
                    >
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-grx-primary-200">
                    {formatINR(entry.totalDebit)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-grx-text dark:text-grx-primary-200">
                    {formatINR(entry.totalCredit)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {entry.status === 'Draft' && (
                        <button
                          onClick={() => handleAction(entry.id, 'approve')}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-semibold flex items-center gap-1"
                          title="Approve"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                      )}
                      {entry.status === 'Approved' && (
                        <button
                          onClick={() => handleAction(entry.id, 'post')}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-semibold flex items-center gap-1"
                          title="Post"
                        >
                          <BookOpen size={14} /> Post
                        </button>
                      )}
                      {entry.status === 'Posted' && (
                        <button
                          onClick={() => handleAction(entry.id, 'reverse')}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-semibold flex items-center gap-1"
                          title="Reverse"
                        >
                          <RotateCcw size={14} /> Reverse
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

export default JournalEntriesPage;
