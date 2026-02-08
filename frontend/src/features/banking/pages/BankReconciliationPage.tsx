import React, { useState, useEffect } from 'react';
import {
  RefreshCcw,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  X,
  Check,
} from 'lucide-react';

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  balance: number;
}

interface ReconciliationSummary {
  unmatchedCount: number;
  matchedCount: number;
  reconciledCount: number;
  clearedBalance: number;
  unclearedBalance: number;
  difference: number;
  statementBalance: number;
  bookBalance: number;
}

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  status: 'Unmatched' | 'Matched' | 'Reconciled';
  matchedEntryId?: string;
  matchedEntryDescription?: string;
}

interface MatchResult {
  transactionId: string;
  matchedWith: string;
  confidence: number;
}

const STATUS_STYLES: Record<string, string> = {
  Unmatched: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  Matched: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  Reconciled: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
};

export const BankReconciliationPage: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [autoReconciling, setAutoReconciling] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/banking/accounts');
      if (!response.ok) throw new Error('Failed to fetch bank accounts');
      const result = await response.json();
      setAccounts(result.accounts || result);
      if (result.accounts && result.accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(result.accounts[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load bank accounts');
    }
  };

  const fetchSummary = async (accountId: string) => {
    try {
      const response = await fetch(`/api/banking/accounts/${accountId}/reconciliation-summary`);
      if (!response.ok) throw new Error('Failed to fetch reconciliation summary');
      const result = await response.json();
      setSummary(result);
    } catch (err: any) {
      console.error('Failed to load summary:', err);
    }
  };

  const fetchTransactions = async (accountId: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await fetch(
        `/api/banking/accounts/${accountId}/transactions?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const result = await response.json();
      setTransactions(result.transactions || result);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchSummary(selectedAccountId);
      fetchTransactions(selectedAccountId);
    }
  }, [selectedAccountId, statusFilter]);

  const formatINR = (val: number) =>
    val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleAutoReconcile = async () => {
    if (!selectedAccountId) return;
    setAutoReconciling(true);
    setError(null);
    try {
      const response = await fetch(`/api/banking/accounts/${selectedAccountId}/auto-reconcile`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to auto-reconcile');
      const result = await response.json();
      setMatchResults(result.matches || []);
      fetchTransactions(selectedAccountId);
      fetchSummary(selectedAccountId);
      alert(`Auto-reconciliation complete! ${result.matches?.length || 0} matches found.`);
    } catch (err: any) {
      setError(err.message || 'Auto-reconciliation failed');
    } finally {
      setAutoReconciling(false);
    }
  };

  const handleBulkReconcile = async () => {
    if (selectedTransactions.size === 0) {
      alert('Please select transactions to reconcile.');
      return;
    }
    setError(null);
    try {
      const response = await fetch('/api/banking/transactions/bulk-reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds: Array.from(selectedTransactions) }),
      });
      if (!response.ok) throw new Error('Failed to reconcile transactions');
      setSelectedTransactions(new Set());
      if (selectedAccountId) {
        fetchTransactions(selectedAccountId);
        fetchSummary(selectedAccountId);
      }
      alert('Selected transactions reconciled successfully!');
    } catch (err: any) {
      setError(err.message || 'Bulk reconciliation failed');
    }
  };

  const toggleTransactionSelection = (id: string) => {
    const newSelection = new Set(selectedTransactions);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTransactions(newSelection);
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.reference.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-grx-text dark:text-white">
            Bank Reconciliation
          </h2>
          <p className="text-grx-muted dark:text-grx-muted">
            Match and reconcile bank transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedTransactions.size > 0 && (
            <button
              onClick={handleBulkReconcile}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
            >
              <CheckCircle size={18} />
              Reconcile Selected ({selectedTransactions.size})
            </button>
          )}
          <button
            onClick={handleAutoReconcile}
            disabled={autoReconciling || !selectedAccountId}
            className="bg-grx-primary-600 hover:bg-grx-primary-700 text-white grx-btn-press px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {autoReconciling ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <RefreshCcw size={18} />
            )}
            Auto-Reconcile
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Bank Account Selector */}
      <div className="grx-glass-card rounded-xl p-6">
        <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">
          Bank Account
        </label>
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full max-w-md border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
        >
          <option value="">Select a bank account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.bankName} - {account.accountName} ({account.accountNumber})
            </option>
          ))}
        </select>
        {selectedAccount && (
          <div className="mt-4 flex items-center gap-2 text-sm text-grx-muted dark:text-grx-muted">
            <DollarSign size={16} />
            <span>
              Current Balance: <strong>₹{formatINR(selectedAccount.balance)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Reconciliation Summary */}
      {summary && selectedAccountId && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="grx-glass-card p-4 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={14} className="text-yellow-600 dark:text-yellow-400" />
              <p className="text-xs text-grx-muted dark:text-grx-muted">Unmatched</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {summary.unmatchedCount}
            </p>
          </div>
          <div className="grx-glass-card p-4 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800">
            <div className="flex items-center gap-2 mb-1">
              <Check size={14} className="text-blue-600 dark:text-blue-400" />
              <p className="text-xs text-grx-muted dark:text-grx-muted">Matched</p>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {summary.matchedCount}
            </p>
          </div>
          <div className="grx-glass-card p-4 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs text-grx-muted dark:text-grx-muted">Reconciled</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.reconciledCount}
            </p>
          </div>
          <div className="grx-glass-card p-4 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs text-grx-muted dark:text-grx-muted">Cleared</p>
            </div>
            <p className="text-lg font-bold text-grx-text dark:text-white">
              ₹{formatINR(summary.clearedBalance)}
            </p>
          </div>
          <div className="grx-glass-card p-4 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={14} className="text-orange-600 dark:text-orange-400" />
              <p className="text-xs text-grx-muted dark:text-grx-muted">Uncleared</p>
            </div>
            <p className="text-lg font-bold text-grx-text dark:text-white">
              ₹{formatINR(summary.unclearedBalance)}
            </p>
          </div>
          <div className="bg-grx-primary-50 dark:bg-grx-primary-900/20 p-4 rounded-xl border border-grx-primary-200 dark:border-grx-primary-800">
            <p className="text-xs text-grx-primary-600 dark:text-grx-primary-400 mb-1">Difference</p>
            <p
              className={`text-lg font-bold ${
                Math.abs(summary.difference) < 0.01
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              ₹{formatINR(summary.difference)}
            </p>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {selectedAccountId && (
        <div className="grx-glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-grx-primary-50 dark:border-grx-primary-800 bg-grx-bg/50 dark:bg-grx-dark/50">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-grx-muted" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-grx-primary-100 dark:border-grx-primary-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white focus:ring-2 focus:ring-grx-primary outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="Unmatched">Unmatched</option>
                  <option value="Matched">Matched</option>
                  <option value="Reconciled">Reconciled</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-grx-primary-600" size={32} />
              <span className="ml-2 text-grx-muted dark:text-grx-muted">
                Loading transactions...
              </span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign size={48} className="mx-auto text-grx-primary-200 dark:text-grx-muted mb-4" />
              <p className="text-grx-muted dark:text-grx-muted">No transactions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-grx-muted dark:text-grx-muted uppercase bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-50 dark:border-grx-primary-800">
                  <tr>
                    <th className="px-4 py-4 w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedTransactions.size === filteredTransactions.length &&
                          filteredTransactions.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransactions(
                              new Set(filteredTransactions.map((t) => t.id))
                            );
                          } else {
                            setSelectedTransactions(new Set());
                          }
                        }}
                        className="rounded border-grx-primary-100 dark:border-grx-primary-700"
                      />
                    </th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Description</th>
                    <th className="px-4 py-4">Reference</th>
                    <th className="px-4 py-4 text-right">Debit</th>
                    <th className="px-4 py-4 text-right">Credit</th>
                    <th className="px-4 py-4 text-right">Balance</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Match Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grx-primary-50 dark:divide-grx-primary-800 bg-white dark:bg-grx-dark-surface">
                  {filteredTransactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="hover:bg-grx-bg dark:hover:bg-grx-primary-800"
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(txn.id)}
                          onChange={() => toggleTransactionSelection(txn.id)}
                          disabled={txn.status === 'Reconciled'}
                          className="rounded border-grx-primary-100 dark:border-grx-primary-700 disabled:opacity-30"
                        />
                      </td>
                      <td className="px-4 py-4 text-grx-muted dark:text-grx-muted whitespace-nowrap">
                        {txn.date}
                      </td>
                      <td className="px-4 py-4 text-grx-text dark:text-white">
                        {txn.description}
                      </td>
                      <td className="px-4 py-4 text-grx-muted dark:text-grx-muted text-xs">
                        {txn.reference}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-red-600 dark:text-red-400">
                        {txn.debit > 0 ? `₹${formatINR(txn.debit)}` : '-'}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {txn.credit > 0 ? `₹${formatINR(txn.credit)}` : '-'}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-semibold text-grx-text dark:text-grx-primary-200">
                        ₹{formatINR(txn.balance)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_STYLES[txn.status] || ''
                          }`}
                        >
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {txn.matchedEntryDescription && (
                          <div className="text-xs text-grx-muted dark:text-grx-muted max-w-xs truncate">
                            {txn.matchedEntryDescription}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BankReconciliationPage;
