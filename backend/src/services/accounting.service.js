/**
 * Accounting Service - Core Double-Entry General Ledger Engine
 *
 * This is the single source of truth for all financial data.
 * Every financial document (invoice, bill, payment, credit note) creates
 * journal entries here. Reports read exclusively from posted GL data.
 *
 * Invariants:
 * - SUM(debit) = SUM(credit) for every journal entry (enforced before save)
 * - Posted entries cannot be modified, only reversed
 * - Entries cannot be posted to locked periods
 * - All operations are idempotent via idempotencyKey
 *
 * Journal Entry Lifecycle: Draft → Approved → Posted → (Reversed)
 */

import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import {
    sequelize,
    JournalEntry,
    JournalEntryLine,
    ChartOfAccount,
    AccountingPeriod,
    FiscalYear,
    SequenceCounter
} from '../config/database.js';
import { createAuditLog } from './audit.service.js';

// ============================================
// SEQUENCE NUMBER GENERATION
// ============================================

/**
 * Generate the next sequential document number.
 * Thread-safe via database-level row locking.
 */
export async function getNextSequenceNumber(prefix, transaction = null) {
    const opts = transaction ? { transaction, lock: true } : {};

    let counter = await SequenceCounter.findOne({
        where: { prefix },
        ...opts
    });

    if (!counter) {
        counter = await SequenceCounter.create({
            id: uuidv4(),
            prefix,
            currentValue: 0,
            paddingLength: 5
        }, transaction ? { transaction } : {});
    }

    const nextValue = counter.currentValue + 1;
    await counter.update({ currentValue: nextValue }, transaction ? { transaction } : {});

    const padded = String(nextValue).padStart(counter.paddingLength, '0');
    return `${prefix}-${padded}`;
}

// ============================================
// PERIOD VALIDATION
// ============================================

/**
 * Find the accounting period for a given date.
 * Returns null if no period exists or period is locked.
 */
export async function findPeriodForDate(date) {
    return AccountingPeriod.findOne({
        where: {
            startDate: { [Op.lte]: date },
            endDate: { [Op.gte]: date }
        }
    });
}

/**
 * Validate that a date falls within an open accounting period.
 * Throws if period is closed or locked.
 */
export async function validatePeriod(date) {
    const period = await findPeriodForDate(date);
    if (!period) {
        // No period defined - allow if no periods exist at all (fresh setup)
        const anyPeriod = await AccountingPeriod.count();
        if (anyPeriod === 0) return null;
        throw new Error(`No accounting period found for date ${date}`);
    }
    if (period.status === 'Locked') {
        throw new Error(`Accounting period "${period.name}" is locked. No entries allowed.`);
    }
    if (period.status === 'Closed') {
        throw new Error(`Accounting period "${period.name}" is closed. Reopen it first.`);
    }
    return period;
}

// ============================================
// JOURNAL ENTRY CREATION
// ============================================

/**
 * Create a journal entry with lines.
 *
 * @param {Object} params
 * @param {string} params.date - Transaction date (YYYY-MM-DD)
 * @param {string} params.description - Entry description
 * @param {Array} params.lines - Array of { accountId, description, debitAmount, creditAmount, costCenterId?, projectId?, entityType?, entityId?, taxCodeId?, taxAmount? }
 * @param {string} [params.sourceDocument] - Source document type
 * @param {string} [params.sourceDocumentId] - Source document ID
 * @param {boolean} [params.autoPost=false] - Post immediately after creation
 * @param {string} [params.createdBy] - User ID
 * @param {string} [params.idempotencyKey] - Idempotency key
 * @param {string} [params.notes] - Additional notes
 * @returns {Object} The created journal entry with lines
 */
export async function createJournalEntry({
    date,
    description,
    lines,
    sourceDocument,
    sourceDocumentId,
    autoPost = false,
    createdBy,
    idempotencyKey,
    notes
}) {
    // Idempotency check
    if (idempotencyKey) {
        const existing = await JournalEntry.findOne({ where: { idempotencyKey } });
        if (existing) {
            return existing.reload({
                include: [{ model: JournalEntryLine, as: 'lines' }]
            });
        }
    }

    // Validate lines
    if (!lines || lines.length < 2) {
        throw new Error('Journal entry must have at least 2 lines');
    }

    // Calculate totals and validate balance
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
        const debit = parseFloat(line.debitAmount) || 0;
        const credit = parseFloat(line.creditAmount) || 0;
        if (debit < 0 || credit < 0) {
            throw new Error('Debit and credit amounts must be non-negative');
        }
        if (debit > 0 && credit > 0) {
            throw new Error('A journal entry line cannot have both debit and credit amounts');
        }
        if (debit === 0 && credit === 0) {
            throw new Error('A journal entry line must have either a debit or credit amount');
        }
        totalDebit += debit;
        totalCredit += credit;
    }

    // CORE INVARIANT: Debits must equal credits
    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.01) {
        throw new Error(
            `Journal entry is unbalanced. Total debits (${totalDebit.toFixed(6)}) ` +
            `must equal total credits (${totalCredit.toFixed(6)}). Difference: ${diff.toFixed(6)}`
        );
    }

    // Validate all accounts exist
    const accountIds = [...new Set(lines.map(l => l.accountId))];
    const accounts = await ChartOfAccount.findAll({
        where: { id: accountIds, isActive: true }
    });
    if (accounts.length !== accountIds.length) {
        const found = accounts.map(a => a.id);
        const missing = accountIds.filter(id => !found.includes(id));
        throw new Error(`Account(s) not found or inactive: ${missing.join(', ')}`);
    }

    // Validate period
    const period = await validatePeriod(date);

    const t = await sequelize.transaction();

    try {
        // Generate sequence number
        const number = await getNextSequenceNumber('JE', t);

        // Create journal entry header
        const je = await JournalEntry.create({
            id: uuidv4(),
            number,
            date,
            description,
            status: 'Draft',
            sourceDocument: sourceDocument || 'Manual',
            sourceDocumentId,
            periodId: period ? period.id : null,
            totalDebit,
            totalCredit,
            isAutoGenerated: !!sourceDocument && sourceDocument !== 'Manual',
            createdBy,
            idempotencyKey,
            notes
        }, { transaction: t });

        // Create lines
        const jeLines = lines.map((line, index) => ({
            id: uuidv4(),
            journalEntryId: je.id,
            lineNumber: index + 1,
            accountId: line.accountId,
            description: line.description || description,
            debitAmount: parseFloat(line.debitAmount) || 0,
            creditAmount: parseFloat(line.creditAmount) || 0,
            costCenterId: line.costCenterId || null,
            projectId: line.projectId || null,
            taxCodeId: line.taxCodeId || null,
            taxAmount: parseFloat(line.taxAmount) || 0,
            entityType: line.entityType || null,
            entityId: line.entityId || null
        }));

        await JournalEntryLine.bulkCreate(jeLines, { transaction: t });

        // Auto-post if requested (for system-generated entries)
        if (autoPost) {
            await je.update({
                status: 'Posted',
                approvedBy: createdBy || 'system',
                approvedAt: new Date().toISOString(),
                postedBy: createdBy || 'system',
                postedAt: new Date().toISOString()
            }, { transaction: t });
        }

        await t.commit();

        // Audit log
        await createAuditLog({
            tableName: 'journal_entries',
            recordId: je.id,
            action: autoPost ? 'POST' : 'CREATE',
            userId: createdBy,
            newValues: { number: je.number, totalDebit, totalCredit, lineCount: lines.length },
            description: `Journal entry ${je.number} ${autoPost ? 'created and posted' : 'created'}: ${description}`
        });

        // Return with lines
        return JournalEntry.findByPk(je.id, {
            include: [{
                model: JournalEntryLine,
                as: 'lines',
                include: [{ model: ChartOfAccount, as: 'account', attributes: ['id', 'code', 'name', 'type'] }]
            }]
        });
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

// ============================================
// JOURNAL ENTRY STATUS TRANSITIONS
// ============================================

/**
 * Approve a draft journal entry (maker-checker step 1).
 */
export async function approveJournalEntry(jeId, approvedBy) {
    const je = await JournalEntry.findByPk(jeId);
    if (!je) throw new Error('Journal entry not found');
    if (je.status !== 'Draft') {
        throw new Error(`Cannot approve journal entry in status "${je.status}". Must be Draft.`);
    }
    // Maker-checker: approver must be different from creator
    if (je.createdBy && je.createdBy === approvedBy) {
        throw new Error('Approver cannot be the same as the creator (maker-checker control)');
    }

    await je.update({
        status: 'Approved',
        approvedBy,
        approvedAt: new Date().toISOString()
    });

    await createAuditLog({
        tableName: 'journal_entries',
        recordId: je.id,
        action: 'APPROVE',
        userId: approvedBy,
        previousValues: { status: 'Draft' },
        newValues: { status: 'Approved' },
        description: `Journal entry ${je.number} approved`
    });

    return je;
}

/**
 * Post an approved journal entry to the GL.
 * Once posted, the entry is immutable.
 */
export async function postJournalEntry(jeId, postedBy) {
    const je = await JournalEntry.findByPk(jeId);
    if (!je) throw new Error('Journal entry not found');
    if (je.status !== 'Approved') {
        throw new Error(`Cannot post journal entry in status "${je.status}". Must be Approved.`);
    }

    // Re-validate period at post time
    await validatePeriod(je.date);

    await je.update({
        status: 'Posted',
        postedBy,
        postedAt: new Date().toISOString()
    });

    await createAuditLog({
        tableName: 'journal_entries',
        recordId: je.id,
        action: 'POST',
        userId: postedBy,
        previousValues: { status: 'Approved' },
        newValues: { status: 'Posted' },
        description: `Journal entry ${je.number} posted to GL`
    });

    return je;
}

/**
 * Reverse a posted journal entry.
 * Creates a new JE with debits and credits swapped.
 * The original entry is marked as Reversed and linked to the reversal.
 */
export async function reverseJournalEntry(jeId, { reversalDate, reason, reversedBy }) {
    const je = await JournalEntry.findByPk(jeId, {
        include: [{ model: JournalEntryLine, as: 'lines' }]
    });
    if (!je) throw new Error('Journal entry not found');
    if (je.status !== 'Posted') {
        throw new Error(`Cannot reverse journal entry in status "${je.status}". Must be Posted.`);
    }
    if (je.reversedBy) {
        throw new Error(`Journal entry ${je.number} has already been reversed`);
    }

    const rDate = reversalDate || new Date().toISOString().split('T')[0];
    await validatePeriod(rDate);

    const t = await sequelize.transaction();

    try {
        const reversalNumber = await getNextSequenceNumber('JE', t);

        // Create reversal entry with debits/credits swapped
        const reversal = await JournalEntry.create({
            id: uuidv4(),
            number: reversalNumber,
            date: rDate,
            description: `Reversal of ${je.number}: ${reason || je.description}`,
            status: 'Posted',
            sourceDocument: 'Reversal',
            sourceDocumentId: je.id,
            periodId: (await findPeriodForDate(rDate))?.id,
            totalDebit: je.totalCredit, // Swapped
            totalCredit: je.totalDebit, // Swapped
            reversalOf: je.id,
            reversalReason: reason,
            isAutoGenerated: true,
            createdBy: reversedBy,
            approvedBy: reversedBy,
            approvedAt: new Date().toISOString(),
            postedBy: reversedBy,
            postedAt: new Date().toISOString()
        }, { transaction: t });

        // Create reversed lines (debit ↔ credit swapped)
        const reversalLines = je.lines.map((line, index) => ({
            id: uuidv4(),
            journalEntryId: reversal.id,
            lineNumber: index + 1,
            accountId: line.accountId,
            description: `Reversal: ${line.description || ''}`,
            debitAmount: line.creditAmount, // Swapped
            creditAmount: line.debitAmount, // Swapped
            costCenterId: line.costCenterId,
            projectId: line.projectId,
            taxCodeId: line.taxCodeId,
            taxAmount: line.taxAmount ? -line.taxAmount : 0,
            entityType: line.entityType,
            entityId: line.entityId
        }));

        await JournalEntryLine.bulkCreate(reversalLines, { transaction: t });

        // Mark original as reversed
        await je.update({
            status: 'Reversed',
            reversedBy: reversal.id,
            reversalDate: rDate,
            reversalReason: reason
        }, { transaction: t });

        await t.commit();

        await createAuditLog({
            tableName: 'journal_entries',
            recordId: je.id,
            action: 'REVERSE',
            userId: reversedBy,
            previousValues: { status: 'Posted' },
            newValues: { status: 'Reversed', reversedBy: reversal.id },
            description: `Journal entry ${je.number} reversed by ${reversal.number}. Reason: ${reason}`
        });

        return {
            originalEntry: je,
            reversalEntry: await JournalEntry.findByPk(reversal.id, {
                include: [{ model: JournalEntryLine, as: 'lines' }]
            })
        };
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

// ============================================
// GL QUERY FUNCTIONS (for reports)
// ============================================

/**
 * Get the balance of an account from posted GL entries.
 * This is the source of truth for all financial reports.
 *
 * @param {string} accountId - ChartOfAccount ID
 * @param {Object} [filters] - Optional date range and dimension filters
 * @returns {Object} { debitTotal, creditTotal, balance }
 */
export async function getAccountBalance(accountId, filters = {}) {
    const where = {
        accountId,
        '$JournalEntry.status$': 'Posted'
    };

    // Build date filter on the parent JournalEntry
    const jeWhere = { status: 'Posted' };
    if (filters.startDate) jeWhere.date = { ...jeWhere.date, [Op.gte]: filters.startDate };
    if (filters.endDate) jeWhere.date = { ...jeWhere.date, [Op.lte]: filters.endDate };
    if (filters.asOfDate) jeWhere.date = { [Op.lte]: filters.asOfDate };

    if (filters.costCenterId) where.costCenterId = filters.costCenterId;
    if (filters.projectId) where.projectId = filters.projectId;

    const lines = await JournalEntryLine.findAll({
        where: { accountId },
        include: [{
            model: JournalEntry,
            as: 'JournalEntry',
            where: jeWhere,
            attributes: []
        }],
        attributes: [
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('debitAmount')), 0), 'debitTotal'],
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('creditAmount')), 0), 'creditTotal']
        ],
        raw: true
    });

    const debitTotal = parseFloat(lines[0]?.debitTotal) || 0;
    const creditTotal = parseFloat(lines[0]?.creditTotal) || 0;

    // Get the account to determine normal balance
    const account = await ChartOfAccount.findByPk(accountId);
    let balance;
    if (account) {
        if (account.type === 'Asset' || account.type === 'Expense') {
            balance = debitTotal - creditTotal;
        } else {
            balance = creditTotal - debitTotal;
        }
    } else {
        balance = debitTotal - creditTotal;
    }

    return { debitTotal, creditTotal, balance };
}

/**
 * Get balances for all accounts (for trial balance, balance sheet, P&L).
 * Reads exclusively from posted GL data.
 */
export async function getAllAccountBalances(filters = {}) {
    const jeWhere = { status: 'Posted' };
    if (filters.startDate) jeWhere.date = { ...jeWhere.date, [Op.gte]: filters.startDate };
    if (filters.endDate) jeWhere.date = { ...jeWhere.date, [Op.lte]: filters.endDate };
    if (filters.asOfDate) jeWhere.date = { [Op.lte]: filters.asOfDate };

    const lineWhere = {};
    if (filters.costCenterId) lineWhere.costCenterId = filters.costCenterId;
    if (filters.projectId) lineWhere.projectId = filters.projectId;

    const results = await JournalEntryLine.findAll({
        where: lineWhere,
        include: [{
            model: JournalEntry,
            as: 'JournalEntry',
            where: jeWhere,
            attributes: []
        }],
        attributes: [
            'accountId',
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('debitAmount')), 0), 'debitTotal'],
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('creditAmount')), 0), 'creditTotal']
        ],
        group: ['accountId'],
        raw: true
    });

    // Get all accounts for type info
    const accounts = await ChartOfAccount.findAll({
        where: { isActive: true },
        order: [['code', 'ASC']]
    });

    const accountMap = {};
    accounts.forEach(a => { accountMap[a.id] = a; });

    return accounts.map(account => {
        const result = results.find(r => r.accountId === account.id);
        const debitTotal = parseFloat(result?.debitTotal) || 0;
        const creditTotal = parseFloat(result?.creditTotal) || 0;

        let balance;
        if (account.type === 'Asset' || account.type === 'Expense') {
            balance = debitTotal - creditTotal;
        } else {
            balance = creditTotal - debitTotal;
        }

        return {
            accountId: account.id,
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type,
            subType: account.subType,
            normalBalance: account.normalBalance,
            debitTotal,
            creditTotal,
            balance
        };
    });
}

/**
 * Get subledger balances (AR/AP) by entity.
 * Used for aging reports.
 */
export async function getSubledgerBalances(entityType, filters = {}) {
    const jeWhere = { status: 'Posted' };
    if (filters.asOfDate) jeWhere.date = { [Op.lte]: filters.asOfDate };

    const lineWhere = { entityType };
    if (filters.entityId) lineWhere.entityId = filters.entityId;

    const results = await JournalEntryLine.findAll({
        where: lineWhere,
        include: [{
            model: JournalEntry,
            as: 'JournalEntry',
            where: jeWhere,
            attributes: []
        }],
        attributes: [
            'entityId',
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('debitAmount')), 0), 'debitTotal'],
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('creditAmount')), 0), 'creditTotal']
        ],
        group: ['entityId'],
        raw: true
    });

    return results.map(r => ({
        entityId: r.entityId,
        debitTotal: parseFloat(r.debitTotal) || 0,
        creditTotal: parseFloat(r.creditTotal) || 0,
        balance: (parseFloat(r.debitTotal) || 0) - (parseFloat(r.creditTotal) || 0)
    }));
}

// ============================================
// ACCOUNTING PERIOD MANAGEMENT
// ============================================

/**
 * Create a fiscal year with 12 monthly periods.
 */
export async function createFiscalYear({ name, startDate, endDate, createdBy }) {
    const t = await sequelize.transaction();

    try {
        const fy = await FiscalYear.create({
            id: uuidv4(),
            name,
            startDate,
            endDate,
            status: 'Open'
        }, { transaction: t });

        // Generate monthly periods
        const start = new Date(startDate);
        const periods = [];
        for (let i = 0; i < 12; i++) {
            const periodStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
            const periodEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0);

            // Don't create periods beyond the fiscal year end
            if (periodStart > new Date(endDate)) break;

            const pEnd = periodEnd > new Date(endDate) ? new Date(endDate) : periodEnd;

            periods.push({
                id: uuidv4(),
                fiscalYearId: fy.id,
                name: periodStart.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                periodNumber: i + 1,
                startDate: periodStart.toISOString().split('T')[0],
                endDate: pEnd.toISOString().split('T')[0],
                status: 'Open'
            });
        }

        await AccountingPeriod.bulkCreate(periods, { transaction: t });
        await t.commit();

        await createAuditLog({
            tableName: 'fiscal_years',
            recordId: fy.id,
            action: 'CREATE',
            userId: createdBy,
            newValues: { name, startDate, endDate, periodCount: periods.length },
            description: `Fiscal year "${name}" created with ${periods.length} periods`
        });

        return FiscalYear.findByPk(fy.id, {
            include: [{ model: AccountingPeriod, as: 'periods', order: [['periodNumber', 'ASC']] }]
        });
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

/**
 * Lock an accounting period (hard lock - no entries allowed).
 */
export async function lockAccountingPeriod(periodId, lockedBy) {
    const period = await AccountingPeriod.findByPk(periodId);
    if (!period) throw new Error('Accounting period not found');
    if (period.status === 'Locked') throw new Error('Period is already locked');

    await period.update({
        status: 'Locked',
        closedBy: lockedBy,
        closedAt: new Date().toISOString()
    });

    await createAuditLog({
        tableName: 'accounting_periods',
        recordId: period.id,
        action: 'LOCK',
        userId: lockedBy,
        previousValues: { status: period.status },
        newValues: { status: 'Locked' },
        description: `Accounting period "${period.name}" locked`
    });

    return period;
}

/**
 * Close an accounting period (soft close - can be reopened).
 */
export async function closeAccountingPeriod(periodId, closedBy) {
    const period = await AccountingPeriod.findByPk(periodId);
    if (!period) throw new Error('Accounting period not found');

    await period.update({
        status: 'Closed',
        closedBy,
        closedAt: new Date().toISOString()
    });

    await createAuditLog({
        tableName: 'accounting_periods',
        recordId: period.id,
        action: 'LOCK',
        userId: closedBy,
        previousValues: { status: period.status },
        newValues: { status: 'Closed' },
        description: `Accounting period "${period.name}" closed`
    });

    return period;
}

/**
 * Reopen a closed (but not locked) accounting period.
 */
export async function reopenAccountingPeriod(periodId, reopenedBy) {
    const period = await AccountingPeriod.findByPk(periodId);
    if (!period) throw new Error('Accounting period not found');
    if (period.status === 'Locked') {
        throw new Error('Cannot reopen a locked period. Locked periods are permanently closed.');
    }
    if (period.status === 'Open') {
        throw new Error('Period is already open');
    }

    await period.update({ status: 'Open', closedBy: null, closedAt: null });

    await createAuditLog({
        tableName: 'accounting_periods',
        recordId: period.id,
        action: 'UPDATE',
        userId: reopenedBy,
        previousValues: { status: 'Closed' },
        newValues: { status: 'Open' },
        description: `Accounting period "${period.name}" reopened`
    });

    return period;
}

// ============================================
// SUSPENSE & ROUNDING DIFFERENCE HANDLING
// ============================================

/**
 * Create a journal entry to handle rounding differences.
 * Posts the difference to the configured rounding difference account.
 */
export async function handleRoundingDifference({
    amount,
    description,
    relatedDocumentType,
    relatedDocumentId,
    date,
    createdBy
}) {
    if (Math.abs(amount) > 1.00) {
        throw new Error('Rounding difference exceeds maximum threshold of 1.00');
    }

    // Find or create the rounding difference account
    let roundingAccount = await ChartOfAccount.findOne({
        where: { code: 'SYS-ROUNDING', isActive: true }
    });

    if (!roundingAccount) {
        roundingAccount = await ChartOfAccount.create({
            id: uuidv4(),
            code: 'SYS-ROUNDING',
            name: 'Rounding Differences',
            type: 'Expense',
            normalBalance: 'Debit',
            isSystemAccount: true,
            isActive: true
        });
    }

    // Find a suspense or cash account to balance against
    let balancingAccount = await ChartOfAccount.findOne({
        where: { code: 'SYS-SUSPENSE', isActive: true }
    });

    if (!balancingAccount) {
        balancingAccount = await ChartOfAccount.create({
            id: uuidv4(),
            code: 'SYS-SUSPENSE',
            name: 'Suspense Account',
            type: 'Liability',
            normalBalance: 'Credit',
            isSystemAccount: true,
            isActive: true
        });
    }

    const absAmount = Math.abs(amount);
    const lines = amount > 0
        ? [
            { accountId: roundingAccount.id, debitAmount: absAmount, creditAmount: 0, description: 'Rounding difference' },
            { accountId: balancingAccount.id, debitAmount: 0, creditAmount: absAmount, description: 'Rounding difference' }
        ]
        : [
            { accountId: balancingAccount.id, debitAmount: absAmount, creditAmount: 0, description: 'Rounding difference' },
            { accountId: roundingAccount.id, debitAmount: 0, creditAmount: absAmount, description: 'Rounding difference' }
        ];

    return createJournalEntry({
        date: date || new Date().toISOString().split('T')[0],
        description: description || `Rounding difference for ${relatedDocumentType} ${relatedDocumentId}`,
        lines,
        sourceDocument: 'RoundingAdjustment',
        sourceDocumentId: relatedDocumentId,
        autoPost: true,
        createdBy
    });
}
