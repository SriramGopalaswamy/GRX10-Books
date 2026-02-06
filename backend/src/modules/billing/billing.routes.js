/**
 * Billing Routes - Procure-to-Pay (Vendors, Bills, Vendor Credits)
 *
 * When a bill is approved, a journal entry is auto-generated:
 *   DR  Expense Account (per line item)
 *   DR  Input Tax Credit (per tax component)
 *   CR  Accounts Payable (Vendor subledger)
 */

import express from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
    sequelize,
    Vendor,
    Bill,
    BillItem,
    VendorCredit,
    VendorCreditItem,
    ChartOfAccount,
    JournalEntry,
    JournalEntryLine
} from '../../config/database.js';
import { createJournalEntry, getNextSequenceNumber } from '../../services/accounting.service.js';
import { calculateTax } from '../../services/tax.service.js';
import { createAuditLog } from '../../services/audit.service.js';

const router = express.Router();

// ============================================
// VENDORS
// ============================================

router.get('/vendors', async (req, res) => {
    try {
        const { isActive } = req.query;
        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const vendors = await Vendor.findAll({ where, order: [['name', 'ASC']] });
        res.json(vendors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/vendors/:id', async (req, res) => {
    try {
        const vendor = await Vendor.findByPk(req.params.id, {
            include: [{ model: Bill, as: 'bills', limit: 20, order: [['date', 'DESC']] }]
        });
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/vendors', async (req, res) => {
    try {
        const vendor = await Vendor.create({ id: uuidv4(), ...req.body });
        await createAuditLog({
            tableName: 'vendors', recordId: vendor.id, action: 'CREATE',
            userId: req.body.createdBy,
            newValues: { name: vendor.name, code: vendor.code },
            description: `Vendor "${vendor.name}" created`
        });
        res.status(201).json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/vendors/:id', async (req, res) => {
    try {
        const vendor = await Vendor.findByPk(req.params.id);
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
        const prev = vendor.toJSON();
        await vendor.update(req.body);
        await createAuditLog({
            tableName: 'vendors', recordId: vendor.id, action: 'UPDATE',
            previousValues: prev, newValues: req.body,
            description: `Vendor "${vendor.name}" updated`
        });
        res.json(vendor);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BILLS
// ============================================

router.get('/bills', async (req, res) => {
    try {
        const { status, vendorId, startDate, endDate, limit = 50, offset = 0 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (vendorId) where.vendorId = vendorId;
        if (startDate && endDate) where.date = { [Op.between]: [startDate, endDate] };

        const { rows, count } = await Bill.findAndCountAll({
            where,
            include: [{ model: BillItem, as: 'items' }, { model: Vendor }],
            order: [['date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        res.json({ bills: rows, total: count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/bills/:id', async (req, res) => {
    try {
        const bill = await Bill.findByPk(req.params.id, {
            include: [
                { model: BillItem, as: 'items' },
                { model: Vendor },
                { model: JournalEntry, as: undefined }
            ]
        });
        if (!bill) return res.status(404).json({ error: 'Bill not found' });
        res.json(bill);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/bills', async (req, res) => {
    try {
        const { vendorId, vendorName, vendorInvoiceNumber, date, dueDate, items, notes, createdBy } = req.body;

        const t = await sequelize.transaction();
        try {
            const billNumber = await getNextSequenceNumber('BILL', t);

            let subTotal = 0, taxTotal = 0;
            const processedItems = [];

            for (const item of (items || [])) {
                const qty = parseFloat(item.quantity) || 1;
                const rate = parseFloat(item.rate) || 0;
                const lineAmount = qty * rate;
                const taxResult = await calculateTax({ amount: lineAmount, taxCodeId: item.taxCodeId, taxRate: item.taxRate });
                subTotal += taxResult.taxableAmount;
                taxTotal += taxResult.taxAmount;
                processedItems.push({
                    id: uuidv4(), accountId: item.accountId, description: item.description,
                    hsn: item.hsn, quantity: qty, rate, taxCodeId: item.taxCodeId,
                    taxRate: item.taxRate || 0, taxAmount: taxResult.taxAmount, amount: lineAmount
                });
            }

            const total = subTotal + taxTotal;
            const bill = await Bill.create({
                id: uuidv4(), number: billNumber, vendorId, vendorName, vendorInvoiceNumber,
                date, dueDate, status: 'Draft', subTotal, taxTotal, total,
                amountPaid: 0, balanceDue: total, notes, createdBy
            }, { transaction: t });

            await BillItem.bulkCreate(
                processedItems.map(i => ({ ...i, billId: bill.id })),
                { transaction: t }
            );

            await t.commit();

            await createAuditLog({
                tableName: 'bills', recordId: bill.id, action: 'CREATE', userId: createdBy,
                newValues: { number: billNumber, total, vendorId },
                description: `Bill ${billNumber} created for ${total}`
            });

            const created = await Bill.findByPk(bill.id, {
                include: [{ model: BillItem, as: 'items' }, { model: Vendor }]
            });
            res.status(201).json(created);
        } catch (error) {
            await t.rollback();
            throw error;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve bill and generate journal entry
router.post('/bills/:id/approve', async (req, res) => {
    try {
        const bill = await Bill.findByPk(req.params.id, {
            include: [{ model: BillItem, as: 'items' }]
        });
        if (!bill) return res.status(404).json({ error: 'Bill not found' });
        if (bill.status !== 'Draft') {
            return res.status(400).json({ error: `Cannot approve bill in status "${bill.status}"` });
        }

        // Find AP account
        let apAccount = await ChartOfAccount.findOne({
            where: { code: { [Op.like]: '%2100%' }, type: 'Liability', isActive: true }
        });
        if (!apAccount) apAccount = await ChartOfAccount.findOne({ where: { type: 'Liability', isActive: true } });

        // Default expense account
        let expenseAccount = await ChartOfAccount.findOne({
            where: { code: { [Op.like]: '%5000%' }, type: 'Expense', isActive: true }
        });
        if (!expenseAccount) expenseAccount = await ChartOfAccount.findOne({ where: { type: 'Expense', isActive: true } });

        if (!apAccount || !expenseAccount) {
            return res.status(400).json({
                error: 'Required accounts not found. Set up Liability (AP) and Expense accounts.'
            });
        }

        const jeLines = [];

        // DR Expense accounts (per line)
        for (const item of bill.items) {
            jeLines.push({
                accountId: item.accountId || expenseAccount.id,
                description: item.description || `Bill ${bill.number} line item`,
                debitAmount: parseFloat(item.amount),
                creditAmount: 0,
                entityType: 'Vendor',
                entityId: bill.vendorId
            });
        }

        // DR Input tax credit (if any)
        if (parseFloat(bill.taxTotal) > 0) {
            let taxCreditAccount = await ChartOfAccount.findOne({
                where: { code: { [Op.like]: '%1300%' }, type: 'Asset', isActive: true }
            });
            if (!taxCreditAccount) {
                // Create system account for input tax credit
                taxCreditAccount = await ChartOfAccount.findOne({ where: { type: 'Asset', isActive: true } });
            }
            if (taxCreditAccount) {
                jeLines.push({
                    accountId: taxCreditAccount.id,
                    description: `Input tax - Bill ${bill.number}`,
                    debitAmount: parseFloat(bill.taxTotal),
                    creditAmount: 0
                });
            }
        }

        // CR Accounts Payable
        jeLines.push({
            accountId: apAccount.id,
            description: `Bill ${bill.number} - ${bill.vendorName || 'Vendor'}`,
            debitAmount: 0,
            creditAmount: parseFloat(bill.total),
            entityType: 'Vendor',
            entityId: bill.vendorId
        });

        const je = await createJournalEntry({
            date: bill.date,
            description: `Bill ${bill.number} - ${bill.vendorName || ''}`,
            lines: jeLines,
            sourceDocument: 'Bill',
            sourceDocumentId: bill.id,
            autoPost: true,
            createdBy: req.body.approvedBy || 'system',
            idempotencyKey: `bill-approve-${bill.id}`
        });

        await bill.update({ status: 'Approved', journalEntryId: je.id });

        await createAuditLog({
            tableName: 'bills', recordId: bill.id, action: 'APPROVE',
            userId: req.body.approvedBy,
            previousValues: { status: 'Draft' },
            newValues: { status: 'Approved', journalEntryId: je.id },
            description: `Bill ${bill.number} approved and posted to GL`
        });

        res.json(await Bill.findByPk(bill.id, {
            include: [{ model: BillItem, as: 'items' }, { model: Vendor }]
        }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Void bill
router.post('/bills/:id/void', async (req, res) => {
    try {
        const bill = await Bill.findByPk(req.params.id);
        if (!bill) return res.status(404).json({ error: 'Bill not found' });
        if (bill.status === 'Void') return res.status(400).json({ error: 'Bill already voided' });
        if (parseFloat(bill.amountPaid) > 0) {
            return res.status(400).json({ error: 'Cannot void a bill with payments. Reverse payments first.' });
        }

        if (bill.journalEntryId) {
            const { reverseJournalEntry } = await import('../../services/accounting.service.js');
            await reverseJournalEntry(bill.journalEntryId, {
                reason: `Bill ${bill.number} voided`,
                reversedBy: req.body.voidedBy || 'user'
            });
        }

        await bill.update({ status: 'Void' });
        res.json(bill);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AP Aging Report
router.get('/ap-aging', async (req, res) => {
    try {
        const { asOfDate } = req.query;
        const refDate = asOfDate || new Date().toISOString().split('T')[0];

        const bills = await Bill.findAll({
            where: {
                status: { [Op.in]: ['Approved', 'PartiallyPaid', 'Overdue'] },
                balanceDue: { [Op.gt]: 0 }
            },
            include: [{ model: Vendor }],
            order: [['dueDate', 'ASC']]
        });

        const aging = { current: [], days1to30: [], days31to60: [], days61to90: [], over90: [] };
        const refDateObj = new Date(refDate);

        for (const bill of bills) {
            const dueDate = new Date(bill.dueDate || bill.date);
            const daysPastDue = Math.floor((refDateObj - dueDate) / (1000 * 60 * 60 * 24));
            const entry = {
                billId: bill.id, billNumber: bill.number,
                vendorId: bill.vendorId, vendorName: bill.vendorName || bill.Vendor?.name,
                date: bill.date, dueDate: bill.dueDate,
                total: parseFloat(bill.total), balanceDue: parseFloat(bill.balanceDue),
                daysPastDue: Math.max(0, daysPastDue)
            };

            if (daysPastDue <= 0) aging.current.push(entry);
            else if (daysPastDue <= 30) aging.days1to30.push(entry);
            else if (daysPastDue <= 60) aging.days31to60.push(entry);
            else if (daysPastDue <= 90) aging.days61to90.push(entry);
            else aging.over90.push(entry);
        }

        const sumBucket = (b) => b.reduce((s, e) => s + e.balanceDue, 0);
        res.json({
            asOfDate: refDate,
            summary: {
                current: sumBucket(aging.current),
                days1to30: sumBucket(aging.days1to30),
                days31to60: sumBucket(aging.days31to60),
                days61to90: sumBucket(aging.days61to90),
                over90: sumBucket(aging.over90),
                total: Object.values(aging).flat().reduce((s, e) => s + e.balanceDue, 0)
            },
            aging
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// VENDOR CREDITS
// ============================================

router.get('/vendor-credits', async (req, res) => {
    try {
        const { status, vendorId } = req.query;
        const where = {};
        if (status) where.status = status;
        if (vendorId) where.vendorId = vendorId;

        const credits = await VendorCredit.findAll({
            where,
            include: [{ model: VendorCreditItem, as: 'items' }, { model: Vendor }],
            order: [['date', 'DESC']]
        });
        res.json(credits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/vendor-credits', async (req, res) => {
    try {
        const { vendorId, vendorName, originalBillId, date, items, reason, notes, createdBy } = req.body;
        const t = await sequelize.transaction();
        try {
            const vcNumber = await getNextSequenceNumber('VC', t);
            let subTotal = 0, taxTotal = 0;
            const processedItems = [];
            for (const item of (items || [])) {
                const qty = parseFloat(item.quantity) || 1;
                const rate = parseFloat(item.rate) || 0;
                const lineAmount = qty * rate;
                const taxResult = await calculateTax({ amount: lineAmount, taxCodeId: item.taxCodeId, taxRate: item.taxRate });
                subTotal += taxResult.taxableAmount;
                taxTotal += taxResult.taxAmount;
                processedItems.push({
                    id: uuidv4(), accountId: item.accountId, description: item.description,
                    hsn: item.hsn, quantity: qty, rate, taxCodeId: item.taxCodeId,
                    taxRate: item.taxRate || 0, taxAmount: taxResult.taxAmount, amount: lineAmount
                });
            }
            const total = subTotal + taxTotal;
            const vc = await VendorCredit.create({
                id: uuidv4(), number: vcNumber, vendorId, vendorName, originalBillId,
                date, status: 'Draft', subTotal, taxTotal, total,
                amountApplied: 0, balanceRemaining: total, reason, notes, createdBy
            }, { transaction: t });

            await VendorCreditItem.bulkCreate(
                processedItems.map(i => ({ ...i, vendorCreditId: vc.id })),
                { transaction: t }
            );

            await t.commit();
            res.status(201).json(await VendorCredit.findByPk(vc.id, {
                include: [{ model: VendorCreditItem, as: 'items' }]
            }));
        } catch (error) {
            await t.rollback();
            throw error;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve vendor credit and generate JE
router.post('/vendor-credits/:id/approve', async (req, res) => {
    try {
        const vc = await VendorCredit.findByPk(req.params.id, {
            include: [{ model: VendorCreditItem, as: 'items' }]
        });
        if (!vc) return res.status(404).json({ error: 'Vendor credit not found' });
        if (vc.status !== 'Draft') {
            return res.status(400).json({ error: `Cannot approve in status "${vc.status}"` });
        }

        let apAccount = await ChartOfAccount.findOne({
            where: { code: { [Op.like]: '%2100%' }, type: 'Liability', isActive: true }
        });
        if (!apAccount) apAccount = await ChartOfAccount.findOne({ where: { type: 'Liability', isActive: true } });

        let expenseAccount = await ChartOfAccount.findOne({
            where: { code: { [Op.like]: '%5000%' }, type: 'Expense', isActive: true }
        });
        if (!expenseAccount) expenseAccount = await ChartOfAccount.findOne({ where: { type: 'Expense', isActive: true } });

        const jeLines = [];

        // DR AP (reduce payable)
        jeLines.push({
            accountId: apAccount.id,
            description: `Vendor Credit ${vc.number}`,
            debitAmount: parseFloat(vc.total),
            creditAmount: 0,
            entityType: 'Vendor',
            entityId: vc.vendorId
        });

        // CR Expense accounts (reverse the expense)
        for (const item of vc.items) {
            jeLines.push({
                accountId: item.accountId || expenseAccount.id,
                description: item.description || `Vendor Credit ${vc.number}`,
                debitAmount: 0,
                creditAmount: parseFloat(item.amount)
            });
        }

        if (parseFloat(vc.taxTotal) > 0) {
            let taxAccount = await ChartOfAccount.findOne({
                where: { code: { [Op.like]: '%1300%' }, type: 'Asset', isActive: true }
            });
            if (!taxAccount) taxAccount = await ChartOfAccount.findOne({ where: { type: 'Asset', isActive: true } });
            if (taxAccount) {
                jeLines.push({
                    accountId: taxAccount.id,
                    description: `Input tax reversal - Vendor Credit ${vc.number}`,
                    debitAmount: 0,
                    creditAmount: parseFloat(vc.taxTotal)
                });
            }
        }

        const je = await createJournalEntry({
            date: vc.date,
            description: `Vendor Credit ${vc.number} - ${vc.vendorName || ''}`,
            lines: jeLines,
            sourceDocument: 'VendorCredit',
            sourceDocumentId: vc.id,
            autoPost: true,
            createdBy: req.body.approvedBy || 'system',
            idempotencyKey: `vc-approve-${vc.id}`
        });

        await vc.update({ status: 'Approved', journalEntryId: je.id });
        res.json(await VendorCredit.findByPk(vc.id, {
            include: [{ model: VendorCreditItem, as: 'items' }]
        }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
