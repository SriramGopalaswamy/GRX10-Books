/**
 * Banking Routes - Bank accounts, statements, CSV import, and reconciliation
 *
 * Reconciliation flow:
 * 1. Import bank statement (CSV)
 * 2. Auto-match transactions against GL entries
 * 3. Manual match remaining items
 * 4. Mark as reconciled
 * 5. Track cleared vs uncleared balances
 */

import express from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
    sequelize,
    BankAccount,
    BankStatement,
    BankTransaction,
    ChartOfAccount,
    JournalEntry,
    JournalEntryLine,
    Payment
} from '../../config/database.js';
import { createAuditLog } from '../../services/audit.service.js';

const router = express.Router();

// ============================================
// BANK ACCOUNTS
// ============================================

router.get('/accounts', async (req, res) => {
    try {
        const { isActive } = req.query;
        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const accounts = await BankAccount.findAll({
            where,
            include: [{ model: ChartOfAccount, as: 'account', attributes: ['id', 'code', 'name'] }],
            order: [['name', 'ASC']]
        });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/accounts/:id', async (req, res) => {
    try {
        const account = await BankAccount.findByPk(req.params.id, {
            include: [
                { model: ChartOfAccount, as: 'account' },
                { model: BankStatement, as: 'statements', limit: 10, order: [['statementDate', 'DESC']] }
            ]
        });
        if (!account) return res.status(404).json({ error: 'Bank account not found' });
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/accounts', async (req, res) => {
    try {
        const account = await BankAccount.create({ id: uuidv4(), ...req.body });
        await createAuditLog({
            tableName: 'bank_accounts', recordId: account.id, action: 'CREATE',
            newValues: { name: account.name, accountNumber: account.accountNumber },
            description: `Bank account "${account.name}" created`
        });
        res.status(201).json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/accounts/:id', async (req, res) => {
    try {
        const account = await BankAccount.findByPk(req.params.id);
        if (!account) return res.status(404).json({ error: 'Bank account not found' });
        await account.update(req.body);
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BANK STATEMENTS & CSV IMPORT
// ============================================

router.get('/accounts/:bankAccountId/statements', async (req, res) => {
    try {
        const statements = await BankStatement.findAll({
            where: { bankAccountId: req.params.bankAccountId },
            order: [['statementDate', 'DESC']]
        });
        res.json(statements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Import CSV bank statement
router.post('/accounts/:bankAccountId/import', async (req, res) => {
    try {
        const { bankAccountId } = req.params;
        const { transactions, statementDate, fileName, openingBalance, closingBalance, importedBy } = req.body;

        const account = await BankAccount.findByPk(bankAccountId);
        if (!account) return res.status(404).json({ error: 'Bank account not found' });

        if (!transactions || transactions.length === 0) {
            return res.status(400).json({ error: 'No transactions to import' });
        }

        const t = await sequelize.transaction();
        try {
            let totalDebit = 0, totalCredit = 0;

            // Create statement record
            const statement = await BankStatement.create({
                id: uuidv4(),
                bankAccountId,
                statementDate: statementDate || new Date().toISOString().split('T')[0],
                fileName,
                openingBalance: parseFloat(openingBalance) || 0,
                closingBalance: parseFloat(closingBalance) || 0,
                transactionCount: transactions.length,
                importedAt: new Date().toISOString(),
                importedBy
            }, { transaction: t });

            // Create bank transactions
            const bankTxns = transactions.map(txn => {
                const debit = parseFloat(txn.debit) || 0;
                const credit = parseFloat(txn.credit) || 0;
                totalDebit += debit;
                totalCredit += credit;

                return {
                    id: uuidv4(),
                    bankAccountId,
                    statementId: statement.id,
                    date: txn.date,
                    description: txn.description || txn.narration || '',
                    reference: txn.reference || txn.chequeNumber || '',
                    debit,
                    credit,
                    runningBalance: parseFloat(txn.balance) || 0,
                    status: 'Unmatched'
                };
            });

            await BankTransaction.bulkCreate(bankTxns, { transaction: t });

            // Update statement totals
            await statement.update({
                totalDebit,
                totalCredit
            }, { transaction: t });

            await t.commit();

            await createAuditLog({
                tableName: 'bank_statements', recordId: statement.id, action: 'CREATE',
                userId: importedBy,
                newValues: { bankAccountId, transactionCount: transactions.length, fileName },
                description: `Bank statement imported: ${transactions.length} transactions`
            });

            res.status(201).json({
                statement,
                transactionsImported: transactions.length,
                totalDebit,
                totalCredit
            });
        } catch (error) {
            await t.rollback();
            throw error;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BANK TRANSACTIONS & RECONCILIATION
// ============================================

// Get bank transactions for reconciliation
router.get('/accounts/:bankAccountId/transactions', async (req, res) => {
    try {
        const { status, startDate, endDate, isReconciled } = req.query;
        const where = { bankAccountId: req.params.bankAccountId };
        if (status) where.status = status;
        if (isReconciled !== undefined) where.isReconciled = isReconciled === 'true';
        if (startDate && endDate) where.date = { [Op.between]: [startDate, endDate] };

        const transactions = await BankTransaction.findAll({
            where,
            order: [['date', 'DESC']]
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Auto-match bank transactions against GL entries
router.post('/accounts/:bankAccountId/auto-reconcile', async (req, res) => {
    try {
        const { bankAccountId } = req.params;
        const account = await BankAccount.findByPk(bankAccountId);
        if (!account) return res.status(404).json({ error: 'Bank account not found' });

        // Get unmatched bank transactions
        const unmatchedTxns = await BankTransaction.findAll({
            where: { bankAccountId, status: 'Unmatched' }
        });

        let matched = 0;

        for (const txn of unmatchedTxns) {
            const amount = parseFloat(txn.debit) || parseFloat(txn.credit);
            if (!amount) continue;

            // Try to match by amount and date proximity against payments
            const matchDate = txn.date;
            const payments = await Payment.findAll({
                where: {
                    bankAccountId,
                    status: 'Confirmed',
                    amount: { [Op.between]: [amount - 0.01, amount + 0.01] },
                    date: {
                        [Op.between]: [
                            new Date(new Date(matchDate).getTime() - 5 * 86400000).toISOString().split('T')[0],
                            new Date(new Date(matchDate).getTime() + 5 * 86400000).toISOString().split('T')[0]
                        ]
                    }
                }
            });

            if (payments.length === 1) {
                await txn.update({
                    status: 'Matched',
                    matchType: 'Auto',
                    matchedPaymentId: payments[0].id,
                    matchedJournalEntryId: payments[0].journalEntryId
                });
                matched++;
            }
        }

        res.json({
            totalUnmatched: unmatchedTxns.length,
            autoMatched: matched,
            remaining: unmatchedTxns.length - matched
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual match a bank transaction
router.post('/transactions/:id/match', async (req, res) => {
    try {
        const txn = await BankTransaction.findByPk(req.params.id);
        if (!txn) return res.status(404).json({ error: 'Bank transaction not found' });

        const { journalEntryId, paymentId, categoryAccountId } = req.body;

        await txn.update({
            status: 'Matched',
            matchType: 'Manual',
            matchedJournalEntryId: journalEntryId || null,
            matchedPaymentId: paymentId || null,
            categoryAccountId: categoryAccountId || null
        });

        res.json(txn);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reconcile matched transactions
router.post('/transactions/:id/reconcile', async (req, res) => {
    try {
        const txn = await BankTransaction.findByPk(req.params.id);
        if (!txn) return res.status(404).json({ error: 'Bank transaction not found' });
        if (txn.status !== 'Matched') {
            return res.status(400).json({ error: 'Transaction must be matched before reconciling' });
        }

        await txn.update({
            status: 'Reconciled',
            isReconciled: true,
            reconciledAt: new Date().toISOString(),
            reconciledBy: req.body.reconciledBy || 'user'
        });

        await createAuditLog({
            tableName: 'bank_transactions', recordId: txn.id, action: 'RECONCILE',
            userId: req.body.reconciledBy,
            description: `Bank transaction reconciled: ${txn.description} (${txn.debit || txn.credit})`
        });

        res.json(txn);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk reconcile
router.post('/transactions/bulk-reconcile', async (req, res) => {
    try {
        const { transactionIds, reconciledBy } = req.body;
        if (!transactionIds || transactionIds.length === 0) {
            return res.status(400).json({ error: 'No transaction IDs provided' });
        }

        const updated = await BankTransaction.update({
            status: 'Reconciled',
            isReconciled: true,
            reconciledAt: new Date().toISOString(),
            reconciledBy: reconciledBy || 'user'
        }, {
            where: { id: transactionIds, status: 'Matched' }
        });

        res.json({ reconciled: updated[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reconciliation summary
router.get('/accounts/:bankAccountId/reconciliation-summary', async (req, res) => {
    try {
        const { bankAccountId } = req.params;
        const account = await BankAccount.findByPk(bankAccountId);
        if (!account) return res.status(404).json({ error: 'Bank account not found' });

        const [unmatched, matched, reconciled] = await Promise.all([
            BankTransaction.count({ where: { bankAccountId, status: 'Unmatched' } }),
            BankTransaction.count({ where: { bankAccountId, status: 'Matched' } }),
            BankTransaction.count({ where: { bankAccountId, status: 'Reconciled' } })
        ]);

        // Calculate cleared vs uncleared balance
        const reconciledTxns = await BankTransaction.findAll({
            where: { bankAccountId, isReconciled: true },
            attributes: [
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('debit')), 0), 'totalDebit'],
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('credit')), 0), 'totalCredit']
            ],
            raw: true
        });

        const clearedDebit = parseFloat(reconciledTxns[0]?.totalDebit) || 0;
        const clearedCredit = parseFloat(reconciledTxns[0]?.totalCredit) || 0;
        const clearedBalance = clearedCredit - clearedDebit;

        const allTxns = await BankTransaction.findAll({
            where: { bankAccountId },
            attributes: [
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('debit')), 0), 'totalDebit'],
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('credit')), 0), 'totalCredit']
            ],
            raw: true
        });

        const totalDebit = parseFloat(allTxns[0]?.totalDebit) || 0;
        const totalCredit = parseFloat(allTxns[0]?.totalCredit) || 0;
        const unclearedBalance = (totalCredit - totalDebit) - clearedBalance;

        res.json({
            bankAccountId,
            accountName: account.name,
            bookBalance: parseFloat(account.currentBalance),
            bankBalance: parseFloat(account.bankBalance),
            transactionCounts: { unmatched, matched, reconciled, total: unmatched + matched + reconciled },
            clearedBalance,
            unclearedBalance,
            difference: parseFloat(account.bankBalance) - clearedBalance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
