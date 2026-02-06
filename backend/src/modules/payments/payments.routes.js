/**
 * Payments Routes - Unified Customer & Vendor Payments
 *
 * Supports:
 * - Partial payments and overpayments
 * - Payment allocation to multiple invoices/bills
 * - Overpayment tracking and credit balance handling
 *
 * Customer Payment JE:
 *   DR  Bank Account (or Cash)
 *   CR  Accounts Receivable
 *
 * Vendor Payment JE:
 *   DR  Accounts Payable
 *   CR  Bank Account (or Cash)
 */

import express from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
    sequelize,
    Payment,
    PaymentAllocation,
    Invoice,
    Bill,
    CreditNote,
    VendorCredit,
    Customer,
    Vendor,
    BankAccount,
    ChartOfAccount
} from '../../config/database.js';
import { createJournalEntry, getNextSequenceNumber } from '../../services/accounting.service.js';
import { createAuditLog } from '../../services/audit.service.js';

const router = express.Router();

// List payments
router.get('/', async (req, res) => {
    try {
        const { type, status, customerId, vendorId, startDate, endDate, limit = 50, offset = 0 } = req.query;
        const where = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (customerId) where.customerId = customerId;
        if (vendorId) where.vendorId = vendorId;
        if (startDate && endDate) where.date = { [Op.between]: [startDate, endDate] };

        const { rows, count } = await Payment.findAndCountAll({
            where,
            include: [
                { model: PaymentAllocation, as: 'allocations' },
                { model: Customer, required: false },
                { model: Vendor, required: false },
                { model: BankAccount, as: 'bankAccount', required: false }
            ],
            order: [['date', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({ payments: rows, total: count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single payment
router.get('/:id', async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id, {
            include: [
                { model: PaymentAllocation, as: 'allocations' },
                { model: Customer, required: false },
                { model: Vendor, required: false },
                { model: BankAccount, as: 'bankAccount', required: false }
            ]
        });
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create and confirm a payment with allocations
router.post('/', async (req, res) => {
    try {
        const {
            date, type, customerId, vendorId, amount,
            paymentMethod, bankAccountId, referenceNumber,
            allocations, notes, createdBy
        } = req.body;

        if (!type || !amount || !date) {
            return res.status(400).json({ error: 'type, amount, and date are required' });
        }
        if (type === 'CustomerPayment' && !customerId) {
            return res.status(400).json({ error: 'customerId required for customer payments' });
        }
        if (type === 'VendorPayment' && !vendorId) {
            return res.status(400).json({ error: 'vendorId required for vendor payments' });
        }

        const paymentAmount = parseFloat(amount);
        if (paymentAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be positive' });
        }

        const t = await sequelize.transaction();
        try {
            const number = await getNextSequenceNumber('PMT', t);

            // Calculate allocations
            let totalAllocated = 0;
            const allocationRecords = [];

            if (allocations && allocations.length > 0) {
                for (const alloc of allocations) {
                    const allocAmount = parseFloat(alloc.amount) || 0;
                    if (allocAmount <= 0) continue;
                    totalAllocated += allocAmount;
                    allocationRecords.push({
                        id: uuidv4(),
                        documentType: alloc.documentType,
                        documentId: alloc.documentId,
                        amount: allocAmount
                    });
                }
            }

            if (totalAllocated > paymentAmount) {
                throw new Error('Total allocations exceed payment amount');
            }

            const unallocated = paymentAmount - totalAllocated;
            const isOverpayment = unallocated > 0 && allocations && allocations.length > 0;

            const payment = await Payment.create({
                id: uuidv4(),
                number,
                date,
                type,
                customerId: type === 'CustomerPayment' ? customerId : null,
                vendorId: type === 'VendorPayment' ? vendorId : null,
                amount: paymentAmount,
                paymentMethod: paymentMethod || 'BankTransfer',
                bankAccountId,
                referenceNumber,
                status: 'Draft',
                amountAllocated: totalAllocated,
                amountUnallocated: unallocated,
                isOverpayment,
                overpaymentAmount: isOverpayment ? unallocated : 0,
                notes,
                createdBy
            }, { transaction: t });

            // Create allocation records
            for (const alloc of allocationRecords) {
                await PaymentAllocation.create({
                    ...alloc,
                    paymentId: payment.id
                }, { transaction: t });
            }

            await t.commit();

            await createAuditLog({
                tableName: 'payments', recordId: payment.id, action: 'CREATE',
                userId: createdBy,
                newValues: { number, amount: paymentAmount, type, allocations: allocationRecords.length },
                description: `Payment ${number} created for ${paymentAmount}`
            });

            const created = await Payment.findByPk(payment.id, {
                include: [{ model: PaymentAllocation, as: 'allocations' }]
            });
            res.status(201).json(created);
        } catch (error) {
            await t.rollback();
            throw error;
        }
    } catch (error) {
        res.status(error.message.includes('exceed') ? 400 : 500).json({ error: error.message });
    }
});

// Confirm payment - generates JE and updates document balances
router.post('/:id/confirm', async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id, {
            include: [{ model: PaymentAllocation, as: 'allocations' }]
        });
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        if (payment.status !== 'Draft') {
            return res.status(400).json({ error: `Cannot confirm payment in status "${payment.status}"` });
        }

        const isCustomer = payment.type === 'CustomerPayment';

        // Find bank/cash account
        let bankCoaId;
        if (payment.bankAccountId) {
            const bankAcct = await BankAccount.findByPk(payment.bankAccountId);
            bankCoaId = bankAcct?.chartOfAccountId;
        }
        if (!bankCoaId) {
            const cashAcct = await ChartOfAccount.findOne({
                where: { code: { [Op.like]: '%1000%' }, type: 'Asset', isActive: true }
            });
            bankCoaId = cashAcct?.id;
            if (!bankCoaId) {
                const anyAsset = await ChartOfAccount.findOne({ where: { type: 'Asset', isActive: true } });
                bankCoaId = anyAsset?.id;
            }
        }

        // Find AR/AP account
        let counterAccountId;
        if (isCustomer) {
            const arAcct = await ChartOfAccount.findOne({
                where: { code: { [Op.like]: '%1100%' }, type: 'Asset', isActive: true }
            });
            counterAccountId = arAcct?.id || (await ChartOfAccount.findOne({ where: { type: 'Asset', isActive: true } }))?.id;
        } else {
            const apAcct = await ChartOfAccount.findOne({
                where: { code: { [Op.like]: '%2100%' }, type: 'Liability', isActive: true }
            });
            counterAccountId = apAcct?.id || (await ChartOfAccount.findOne({ where: { type: 'Liability', isActive: true } }))?.id;
        }

        if (!bankCoaId || !counterAccountId) {
            return res.status(400).json({ error: 'Required accounts not configured' });
        }

        const paymentAmount = parseFloat(payment.amount);
        const entityType = isCustomer ? 'Customer' : 'Vendor';
        const entityId = isCustomer ? payment.customerId : payment.vendorId;

        // Build JE lines
        const jeLines = isCustomer
            ? [
                { accountId: bankCoaId, description: `Payment received - ${payment.number}`, debitAmount: paymentAmount, creditAmount: 0 },
                { accountId: counterAccountId, description: `Payment received - ${payment.number}`, debitAmount: 0, creditAmount: paymentAmount, entityType, entityId }
            ]
            : [
                { accountId: counterAccountId, description: `Payment made - ${payment.number}`, debitAmount: paymentAmount, creditAmount: 0, entityType, entityId },
                { accountId: bankCoaId, description: `Payment made - ${payment.number}`, debitAmount: 0, creditAmount: paymentAmount }
            ];

        const je = await createJournalEntry({
            date: payment.date,
            description: `${isCustomer ? 'Customer' : 'Vendor'} Payment ${payment.number}`,
            lines: jeLines,
            sourceDocument: 'Payment',
            sourceDocumentId: payment.id,
            autoPost: true,
            createdBy: req.body.confirmedBy || 'system',
            idempotencyKey: `pmt-confirm-${payment.id}`
        });

        // Update document balances for each allocation
        const t = await sequelize.transaction();
        try {
            for (const alloc of payment.allocations) {
                const allocAmount = parseFloat(alloc.amount);

                if (alloc.documentType === 'Invoice') {
                    const invoice = await Invoice.findByPk(alloc.documentId, { transaction: t });
                    if (invoice) {
                        const newPaid = parseFloat(invoice.amountPaid) + allocAmount;
                        const newBalance = parseFloat(invoice.total) - newPaid;
                        const newStatus = newBalance <= 0.01 ? 'Paid' : 'PartiallyPaid';
                        await invoice.update({
                            amountPaid: newPaid,
                            balanceDue: Math.max(0, newBalance),
                            status: newStatus
                        }, { transaction: t });
                    }
                } else if (alloc.documentType === 'Bill') {
                    const bill = await Bill.findByPk(alloc.documentId, { transaction: t });
                    if (bill) {
                        const newPaid = parseFloat(bill.amountPaid) + allocAmount;
                        const newBalance = parseFloat(bill.total) - newPaid;
                        const newStatus = newBalance <= 0.01 ? 'Paid' : 'PartiallyPaid';
                        await bill.update({
                            amountPaid: newPaid,
                            balanceDue: Math.max(0, newBalance),
                            status: newStatus
                        }, { transaction: t });
                    }
                } else if (alloc.documentType === 'CreditNote') {
                    const cn = await CreditNote.findByPk(alloc.documentId, { transaction: t });
                    if (cn) {
                        const newApplied = parseFloat(cn.amountApplied) + allocAmount;
                        await cn.update({
                            amountApplied: newApplied,
                            balanceRemaining: Math.max(0, parseFloat(cn.total) - newApplied),
                            status: newApplied >= parseFloat(cn.total) ? 'Applied' : cn.status
                        }, { transaction: t });
                    }
                } else if (alloc.documentType === 'VendorCredit') {
                    const vc = await VendorCredit.findByPk(alloc.documentId, { transaction: t });
                    if (vc) {
                        const newApplied = parseFloat(vc.amountApplied) + allocAmount;
                        await vc.update({
                            amountApplied: newApplied,
                            balanceRemaining: Math.max(0, parseFloat(vc.total) - newApplied),
                            status: newApplied >= parseFloat(vc.total) ? 'Applied' : vc.status
                        }, { transaction: t });
                    }
                }
            }

            // Update payment status
            await payment.update({
                status: 'Confirmed',
                journalEntryId: je.id,
                confirmedBy: req.body.confirmedBy || 'user',
                confirmedAt: new Date().toISOString()
            }, { transaction: t });

            // Update bank account balance if applicable
            if (payment.bankAccountId) {
                const bankAcct = await BankAccount.findByPk(payment.bankAccountId, { transaction: t });
                if (bankAcct) {
                    const balanceChange = isCustomer ? paymentAmount : -paymentAmount;
                    await bankAcct.update({
                        currentBalance: parseFloat(bankAcct.currentBalance) + balanceChange
                    }, { transaction: t });
                }
            }

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }

        await createAuditLog({
            tableName: 'payments', recordId: payment.id, action: 'APPROVE',
            userId: req.body.confirmedBy,
            description: `Payment ${payment.number} confirmed and posted to GL`
        });

        res.json(await Payment.findByPk(payment.id, {
            include: [{ model: PaymentAllocation, as: 'allocations' }]
        }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Void a payment
router.post('/:id/void', async (req, res) => {
    try {
        const payment = await Payment.findByPk(req.params.id, {
            include: [{ model: PaymentAllocation, as: 'allocations' }]
        });
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        if (payment.status === 'Void') return res.status(400).json({ error: 'Already voided' });

        const t = await sequelize.transaction();
        try {
            // Reverse document balance updates
            for (const alloc of payment.allocations) {
                const allocAmount = parseFloat(alloc.amount);
                if (alloc.documentType === 'Invoice') {
                    const inv = await Invoice.findByPk(alloc.documentId, { transaction: t });
                    if (inv) {
                        const newPaid = Math.max(0, parseFloat(inv.amountPaid) - allocAmount);
                        await inv.update({
                            amountPaid: newPaid,
                            balanceDue: parseFloat(inv.total) - newPaid,
                            status: newPaid > 0 ? 'PartiallyPaid' : 'Approved'
                        }, { transaction: t });
                    }
                } else if (alloc.documentType === 'Bill') {
                    const bill = await Bill.findByPk(alloc.documentId, { transaction: t });
                    if (bill) {
                        const newPaid = Math.max(0, parseFloat(bill.amountPaid) - allocAmount);
                        await bill.update({
                            amountPaid: newPaid,
                            balanceDue: parseFloat(bill.total) - newPaid,
                            status: newPaid > 0 ? 'PartiallyPaid' : 'Approved'
                        }, { transaction: t });
                    }
                }
            }

            await payment.update({ status: 'Void' }, { transaction: t });

            // Reverse bank balance
            if (payment.bankAccountId) {
                const bankAcct = await BankAccount.findByPk(payment.bankAccountId, { transaction: t });
                if (bankAcct) {
                    const isCustomer = payment.type === 'CustomerPayment';
                    const reversal = isCustomer ? -parseFloat(payment.amount) : parseFloat(payment.amount);
                    await bankAcct.update({
                        currentBalance: parseFloat(bankAcct.currentBalance) + reversal
                    }, { transaction: t });
                }
            }

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }

        // Reverse JE
        if (payment.journalEntryId) {
            const { reverseJournalEntry } = await import('../../services/accounting.service.js');
            await reverseJournalEntry(payment.journalEntryId, {
                reason: `Payment ${payment.number} voided`,
                reversedBy: req.body.voidedBy || 'user'
            });
        }

        res.json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
