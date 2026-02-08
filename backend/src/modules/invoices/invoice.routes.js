/**
 * Invoice Routes - Order-to-Cash flow with GL integration
 *
 * Flow: Estimate → Sales Order → Invoice → Payment → Credit Note
 *
 * When an invoice is approved, a journal entry is auto-generated:
 *   DR  Accounts Receivable (Customer subledger)
 *   CR  Revenue Account (per line item)
 *   CR  Tax Liability (per tax component)
 */

import express from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
    sequelize,
    Invoice,
    InvoiceItem,
    Customer,
    Estimate,
    EstimateItem,
    SalesOrder,
    SalesOrderItem,
    CreditNote,
    CreditNoteItem,
    ChartOfAccount,
    JournalEntry,
    JournalEntryLine,
    Payment,
    PaymentAllocation
} from '../../config/database.js';
import {
    createJournalEntry,
    getNextSequenceNumber
} from '../../services/accounting.service.js';
import { calculateTax } from '../../services/tax.service.js';
import { createAuditLog } from '../../services/audit.service.js';

const router = express.Router();

// ============================================
// INVOICES
// ============================================

// List invoices
router.get('/invoices', async (req, res) => {
    try {
        const { status, customerId, startDate, endDate, limit = 50, offset = 0 } = req.query;
        const where = {};
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (startDate && endDate) where.date = { [Op.between]: [startDate, endDate] };

        const { rows, count } = await Invoice.findAndCountAll({
            where,
            include: [
                { model: InvoiceItem, as: 'items' },
                { model: Customer }
            ],
            order: [['date', 'DESC'], ['number', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({ invoices: rows, total: count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single invoice
router.get('/invoices/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id, {
            include: [
                { model: InvoiceItem, as: 'items' },
                { model: Customer },
                { model: JournalEntry, as: 'journalEntry', include: [{ model: JournalEntryLine, as: 'lines' }] }
            ]
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create invoice
router.post('/invoices', async (req, res) => {
    try {
        const { number, date, dueDate, customerId, customerName, salesOrderId, items, notes, termsAndConditions, createdBy } = req.body;

        const t = await sequelize.transaction();
        try {
            const invoiceNumber = number || await getNextSequenceNumber('INV', t);

            // Calculate totals
            let subTotal = 0;
            let taxTotal = 0;
            const processedItems = [];

            for (const item of (items || [])) {
                const qty = parseFloat(item.quantity) || 1;
                const rate = parseFloat(item.rate) || 0;
                const lineAmount = qty * rate;

                // Calculate tax
                const taxResult = await calculateTax({
                    amount: lineAmount,
                    taxCodeId: item.taxCodeId,
                    taxRate: item.taxRate
                });

                subTotal += taxResult.taxableAmount;
                taxTotal += taxResult.taxAmount;

                processedItems.push({
                    id: uuidv4(),
                    description: item.description,
                    hsn: item.hsn,
                    accountId: item.accountId,
                    quantity: qty,
                    rate,
                    taxCodeId: item.taxCodeId,
                    taxRate: item.taxRate || (taxResult.taxBreakdown[0]?.rate || 0),
                    taxAmount: taxResult.taxAmount,
                    amount: lineAmount
                });
            }

            const total = subTotal + taxTotal;

            const invoice = await Invoice.create({
                id: uuidv4(),
                number: invoiceNumber,
                date,
                dueDate,
                customerId,
                customerName,
                salesOrderId,
                status: 'Draft',
                subTotal,
                taxTotal,
                total,
                amountPaid: 0,
                balanceDue: total,
                notes,
                termsAndConditions,
                createdBy
            }, { transaction: t });

            const invoiceItems = processedItems.map(item => ({
                ...item,
                invoiceId: invoice.id
            }));
            await InvoiceItem.bulkCreate(invoiceItems, { transaction: t });

            // If created from a sales order, mark it
            if (salesOrderId) {
                await SalesOrder.update(
                    { status: 'Fulfilled' },
                    { where: { id: salesOrderId }, transaction: t }
                );
            }

            await t.commit();

            await createAuditLog({
                tableName: 'Invoices',
                recordId: invoice.id,
                action: 'CREATE',
                userId: createdBy,
                newValues: { number: invoiceNumber, total, customerId },
                description: `Invoice ${invoiceNumber} created for ${total}`
            });

            const created = await Invoice.findByPk(invoice.id, {
                include: [{ model: InvoiceItem, as: 'items' }, { model: Customer }]
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

// Approve invoice and generate journal entry
router.post('/invoices/:id/approve', async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id, {
            include: [{ model: InvoiceItem, as: 'items' }]
        });
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.status !== 'Draft') {
            return res.status(400).json({ error: `Cannot approve invoice in status "${invoice.status}"` });
        }

        // Find AR account
        let arAccount = await ChartOfAccount.findOne({
            where: { code: { [Op.like]: '%1100%' }, type: 'Asset', isActive: true }
        });
        if (!arAccount) {
            arAccount = await ChartOfAccount.findOne({ where: { type: 'Asset', isActive: true } });
        }

        // Find default revenue account
        let revenueAccount = await ChartOfAccount.findOne({
            where: { code: { [Op.like]: '%4000%' }, type: 'Income', isActive: true }
        });
        if (!revenueAccount) {
            revenueAccount = await ChartOfAccount.findOne({ where: { type: 'Income', isActive: true } });
        }

        if (!arAccount || !revenueAccount) {
            return res.status(400).json({
                error: 'Required accounts not found. Please set up Asset (AR) and Income accounts in Chart of Accounts.'
            });
        }

        // Build journal entry lines
        const jeLines = [];

        // DR Accounts Receivable
        jeLines.push({
            accountId: arAccount.id,
            description: `Invoice ${invoice.number} - ${invoice.customerName || 'Customer'}`,
            debitAmount: parseFloat(invoice.total),
            creditAmount: 0,
            entityType: 'Customer',
            entityId: invoice.customerId
        });

        // CR Revenue accounts (per line item)
        for (const item of invoice.items) {
            const accountId = item.accountId || revenueAccount.id;
            jeLines.push({
                accountId,
                description: item.description || `Invoice ${invoice.number} line item`,
                debitAmount: 0,
                creditAmount: parseFloat(item.amount),
                entityType: 'Customer',
                entityId: invoice.customerId
            });
        }

        // CR Tax liability (if any)
        if (parseFloat(invoice.taxTotal) > 0) {
            let taxAccount = await ChartOfAccount.findOne({
                where: { code: { [Op.like]: '%2200%' }, type: 'Liability', isActive: true }
            });
            if (!taxAccount) {
                taxAccount = await ChartOfAccount.findOne({ where: { type: 'Liability', isActive: true } });
            }
            if (taxAccount) {
                jeLines.push({
                    accountId: taxAccount.id,
                    description: `Tax on Invoice ${invoice.number}`,
                    debitAmount: 0,
                    creditAmount: parseFloat(invoice.taxTotal)
                });
            }
        }

        // Create and auto-post the journal entry
        const je = await createJournalEntry({
            date: invoice.date,
            description: `Invoice ${invoice.number} - ${invoice.customerName || ''}`,
            lines: jeLines,
            sourceDocument: 'Invoice',
            sourceDocumentId: invoice.id,
            autoPost: true,
            createdBy: req.body.approvedBy || 'system',
            idempotencyKey: `inv-approve-${invoice.id}`
        });

        // Update invoice status
        await invoice.update({
            status: 'Approved',
            journalEntryId: je.id
        });

        await createAuditLog({
            tableName: 'Invoices',
            recordId: invoice.id,
            action: 'APPROVE',
            userId: req.body.approvedBy,
            previousValues: { status: 'Draft' },
            newValues: { status: 'Approved', journalEntryId: je.id },
            description: `Invoice ${invoice.number} approved and posted to GL`
        });

        res.json(await Invoice.findByPk(invoice.id, {
            include: [{ model: InvoiceItem, as: 'items' }, { model: Customer }]
        }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark invoice as sent
router.post('/invoices/:id/send', async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (!['Draft', 'Approved'].includes(invoice.status)) {
            return res.status(400).json({ error: `Cannot send invoice in status "${invoice.status}"` });
        }
        await invoice.update({ status: 'Sent' });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Void invoice (instead of delete - reverses the JE)
router.post('/invoices/:id/void', async (req, res) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.status === 'Void') {
            return res.status(400).json({ error: 'Invoice is already voided' });
        }
        if (parseFloat(invoice.amountPaid) > 0) {
            return res.status(400).json({ error: 'Cannot void an invoice with payments applied. Refund first.' });
        }

        // Reverse the journal entry if it exists
        if (invoice.journalEntryId) {
            const { reverseJournalEntry } = await import('../../services/accounting.service.js');
            await reverseJournalEntry(invoice.journalEntryId, {
                reason: `Invoice ${invoice.number} voided`,
                reversedBy: req.body.voidedBy || 'user'
            });
        }

        await invoice.update({ status: 'Void' });

        await createAuditLog({
            tableName: 'Invoices',
            recordId: invoice.id,
            action: 'VOID',
            userId: req.body.voidedBy,
            description: `Invoice ${invoice.number} voided`
        });

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AR Aging Report
router.get('/ar-aging', async (req, res) => {
    try {
        const { asOfDate } = req.query;
        const refDate = asOfDate || new Date().toISOString().split('T')[0];

        const invoices = await Invoice.findAll({
            where: {
                status: { [Op.in]: ['Approved', 'Sent', 'PartiallyPaid', 'Overdue'] },
                balanceDue: { [Op.gt]: 0 }
            },
            include: [{ model: Customer }],
            order: [['dueDate', 'ASC']]
        });

        const aging = { current: [], days1to30: [], days31to60: [], days61to90: [], over90: [] };
        const refDateObj = new Date(refDate);

        for (const inv of invoices) {
            const dueDate = new Date(inv.dueDate || inv.date);
            const daysPastDue = Math.floor((refDateObj - dueDate) / (1000 * 60 * 60 * 24));
            const entry = {
                invoiceId: inv.id,
                invoiceNumber: inv.number,
                customerId: inv.customerId,
                customerName: inv.customerName || inv.Customer?.name,
                date: inv.date,
                dueDate: inv.dueDate,
                total: parseFloat(inv.total),
                balanceDue: parseFloat(inv.balanceDue),
                daysPastDue: Math.max(0, daysPastDue)
            };

            if (daysPastDue <= 0) aging.current.push(entry);
            else if (daysPastDue <= 30) aging.days1to30.push(entry);
            else if (daysPastDue <= 60) aging.days31to60.push(entry);
            else if (daysPastDue <= 90) aging.days61to90.push(entry);
            else aging.over90.push(entry);
        }

        const sumBucket = (bucket) => bucket.reduce((sum, e) => sum + e.balanceDue, 0);

        res.json({
            asOfDate: refDate,
            summary: {
                current: sumBucket(aging.current),
                days1to30: sumBucket(aging.days1to30),
                days31to60: sumBucket(aging.days31to60),
                days61to90: sumBucket(aging.days61to90),
                over90: sumBucket(aging.over90),
                total: sumBucket(aging.current) + sumBucket(aging.days1to30) + sumBucket(aging.days31to60) + sumBucket(aging.days61to90) + sumBucket(aging.over90)
            },
            aging
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ESTIMATES
// ============================================

router.get('/estimates', async (req, res) => {
    try {
        const { status, customerId } = req.query;
        const where = {};
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;

        const estimates = await Estimate.findAll({
            where,
            include: [{ model: EstimateItem, as: 'items' }, { model: Customer }],
            order: [['date', 'DESC']]
        });
        res.json(estimates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/estimates', async (req, res) => {
    try {
        const { customerId, customerName, date, expiryDate, items, notes, termsAndConditions, createdBy } = req.body;
        const t = await sequelize.transaction();
        try {
            const number = await getNextSequenceNumber('EST', t);

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
                    id: uuidv4(),
                    description: item.description, hsn: item.hsn, accountId: item.accountId,
                    quantity: qty, rate, taxCodeId: item.taxCodeId,
                    taxRate: item.taxRate || 0, taxAmount: taxResult.taxAmount, amount: lineAmount
                });
            }

            const estimate = await Estimate.create({
                id: uuidv4(), number, customerId, customerName, date, expiryDate,
                status: 'Draft', subTotal, taxTotal, total: subTotal + taxTotal,
                notes, termsAndConditions, createdBy
            }, { transaction: t });

            await EstimateItem.bulkCreate(
                processedItems.map(i => ({ ...i, estimateId: estimate.id })),
                { transaction: t }
            );

            await t.commit();
            const created = await Estimate.findByPk(estimate.id, {
                include: [{ model: EstimateItem, as: 'items' }]
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

// Convert estimate to sales order
router.post('/estimates/:id/convert-to-sales-order', async (req, res) => {
    try {
        const estimate = await Estimate.findByPk(req.params.id, {
            include: [{ model: EstimateItem, as: 'items' }]
        });
        if (!estimate) return res.status(404).json({ error: 'Estimate not found' });
        if (estimate.status === 'Invoiced') {
            return res.status(400).json({ error: 'Estimate already converted' });
        }

        const t = await sequelize.transaction();
        try {
            const soNumber = await getNextSequenceNumber('SO', t);

            const so = await SalesOrder.create({
                id: uuidv4(), number: soNumber,
                customerId: estimate.customerId, customerName: estimate.customerName,
                estimateId: estimate.id, date: new Date().toISOString().split('T')[0],
                status: 'Draft', subTotal: estimate.subTotal,
                taxTotal: estimate.taxTotal, total: estimate.total,
                createdBy: req.body.createdBy || 'user'
            }, { transaction: t });

            await SalesOrderItem.bulkCreate(
                estimate.items.map(item => ({
                    id: uuidv4(), salesOrderId: so.id,
                    description: item.description, hsn: item.hsn, accountId: item.accountId,
                    quantity: item.quantity, rate: item.rate, taxCodeId: item.taxCodeId,
                    taxRate: item.taxRate, taxAmount: item.taxAmount, amount: item.amount
                })),
                { transaction: t }
            );

            await estimate.update({ status: 'Invoiced' }, { transaction: t });
            await t.commit();

            const created = await SalesOrder.findByPk(so.id, {
                include: [{ model: SalesOrderItem, as: 'items' }]
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

// ============================================
// SALES ORDERS
// ============================================

router.get('/sales-orders', async (req, res) => {
    try {
        const { status, customerId } = req.query;
        const where = {};
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;

        const orders = await SalesOrder.findAll({
            where,
            include: [{ model: SalesOrderItem, as: 'items' }, { model: Customer }],
            order: [['date', 'DESC']]
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/sales-orders', async (req, res) => {
    try {
        const { customerId, customerName, date, expectedDeliveryDate, items, notes, createdBy } = req.body;
        const t = await sequelize.transaction();
        try {
            const number = await getNextSequenceNumber('SO', t);

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
                    id: uuidv4(), description: item.description, hsn: item.hsn, accountId: item.accountId,
                    quantity: qty, rate, taxCodeId: item.taxCodeId,
                    taxRate: item.taxRate || 0, taxAmount: taxResult.taxAmount, amount: lineAmount
                });
            }

            const so = await SalesOrder.create({
                id: uuidv4(), number, customerId, customerName, date, expectedDeliveryDate,
                status: 'Draft', subTotal, taxTotal, total: subTotal + taxTotal,
                notes, createdBy
            }, { transaction: t });

            await SalesOrderItem.bulkCreate(
                processedItems.map(i => ({ ...i, salesOrderId: so.id })),
                { transaction: t }
            );

            await t.commit();
            const created = await SalesOrder.findByPk(so.id, {
                include: [{ model: SalesOrderItem, as: 'items' }]
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

// Convert sales order to invoice
router.post('/sales-orders/:id/convert-to-invoice', async (req, res) => {
    try {
        const so = await SalesOrder.findByPk(req.params.id, {
            include: [{ model: SalesOrderItem, as: 'items' }]
        });
        if (!so) return res.status(404).json({ error: 'Sales order not found' });
        if (so.status === 'Fulfilled') {
            return res.status(400).json({ error: 'Sales order already fulfilled' });
        }

        const t = await sequelize.transaction();
        try {
            const invNumber = await getNextSequenceNumber('INV', t);

            const invoice = await Invoice.create({
                id: uuidv4(), number: invNumber,
                date: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                customerId: so.customerId, customerName: so.customerName,
                salesOrderId: so.id, status: 'Draft',
                subTotal: so.subTotal, taxTotal: so.taxTotal, total: so.total,
                amountPaid: 0, balanceDue: so.total,
                createdBy: req.body.createdBy || 'user'
            }, { transaction: t });

            await InvoiceItem.bulkCreate(
                so.items.map(item => ({
                    id: uuidv4(), invoiceId: invoice.id,
                    description: item.description, hsn: item.hsn, accountId: item.accountId,
                    quantity: item.quantity, rate: item.rate, taxCodeId: item.taxCodeId,
                    taxRate: item.taxRate, taxAmount: item.taxAmount, amount: item.amount
                })),
                { transaction: t }
            );

            await so.update({ status: 'Fulfilled' }, { transaction: t });
            await t.commit();

            const created = await Invoice.findByPk(invoice.id, {
                include: [{ model: InvoiceItem, as: 'items' }, { model: Customer }]
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

// ============================================
// CREDIT NOTES
// ============================================

router.get('/credit-notes', async (req, res) => {
    try {
        const { status, customerId } = req.query;
        const where = {};
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;

        const notes = await CreditNote.findAll({
            where,
            include: [{ model: CreditNoteItem, as: 'items' }, { model: Customer }],
            order: [['date', 'DESC']]
        });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/credit-notes', async (req, res) => {
    try {
        const { customerId, customerName, originalInvoiceId, date, items, reason, notes, createdBy } = req.body;
        const t = await sequelize.transaction();
        try {
            const cnNumber = await getNextSequenceNumber('CN', t);

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
                    id: uuidv4(), description: item.description, hsn: item.hsn, accountId: item.accountId,
                    quantity: qty, rate, taxCodeId: item.taxCodeId,
                    taxRate: item.taxRate || 0, taxAmount: taxResult.taxAmount, amount: lineAmount
                });
            }

            const total = subTotal + taxTotal;
            const cn = await CreditNote.create({
                id: uuidv4(), number: cnNumber, customerId, customerName, originalInvoiceId,
                date, status: 'Draft', subTotal, taxTotal, total,
                amountApplied: 0, balanceRemaining: total, reason, notes, createdBy
            }, { transaction: t });

            await CreditNoteItem.bulkCreate(
                processedItems.map(i => ({ ...i, creditNoteId: cn.id })),
                { transaction: t }
            );

            await t.commit();
            const created = await CreditNote.findByPk(cn.id, {
                include: [{ model: CreditNoteItem, as: 'items' }]
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

// Approve credit note and generate reversal JE
router.post('/credit-notes/:id/approve', async (req, res) => {
    try {
        const cn = await CreditNote.findByPk(req.params.id, {
            include: [{ model: CreditNoteItem, as: 'items' }]
        });
        if (!cn) return res.status(404).json({ error: 'Credit note not found' });
        if (cn.status !== 'Draft') {
            return res.status(400).json({ error: `Cannot approve credit note in status "${cn.status}"` });
        }

        // Find accounts (reverse of invoice JE)
        let arAccount = await ChartOfAccount.findOne({
            where: { code: { [Op.like]: '%1100%' }, type: 'Asset', isActive: true }
        });
        if (!arAccount) arAccount = await ChartOfAccount.findOne({ where: { type: 'Asset', isActive: true } });

        let revenueAccount = await ChartOfAccount.findOne({
            where: { code: { [Op.like]: '%4000%' }, type: 'Income', isActive: true }
        });
        if (!revenueAccount) revenueAccount = await ChartOfAccount.findOne({ where: { type: 'Income', isActive: true } });

        const jeLines = [];

        // CR Accounts Receivable (reverse of invoice)
        jeLines.push({
            accountId: arAccount.id,
            description: `Credit Note ${cn.number}`,
            debitAmount: 0,
            creditAmount: parseFloat(cn.total),
            entityType: 'Customer',
            entityId: cn.customerId
        });

        // DR Revenue accounts
        for (const item of cn.items) {
            jeLines.push({
                accountId: item.accountId || revenueAccount.id,
                description: item.description || `Credit Note ${cn.number} line item`,
                debitAmount: parseFloat(item.amount),
                creditAmount: 0
            });
        }

        // DR Tax liability
        if (parseFloat(cn.taxTotal) > 0) {
            let taxAccount = await ChartOfAccount.findOne({
                where: { code: { [Op.like]: '%2200%' }, type: 'Liability', isActive: true }
            });
            if (!taxAccount) taxAccount = await ChartOfAccount.findOne({ where: { type: 'Liability', isActive: true } });
            if (taxAccount) {
                jeLines.push({
                    accountId: taxAccount.id,
                    description: `Tax reversal - Credit Note ${cn.number}`,
                    debitAmount: parseFloat(cn.taxTotal),
                    creditAmount: 0
                });
            }
        }

        const je = await createJournalEntry({
            date: cn.date,
            description: `Credit Note ${cn.number} - ${cn.customerName || ''}`,
            lines: jeLines,
            sourceDocument: 'CreditNote',
            sourceDocumentId: cn.id,
            autoPost: true,
            createdBy: req.body.approvedBy || 'system',
            idempotencyKey: `cn-approve-${cn.id}`
        });

        await cn.update({ status: 'Approved', journalEntryId: je.id });

        res.json(await CreditNote.findByPk(cn.id, {
            include: [{ model: CreditNoteItem, as: 'items' }]
        }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
