/**
 * Accounting Routes - Journal Entries, Fiscal Years, Accounting Periods, Dimensions
 *
 * All journal entry operations go through the accounting service which
 * enforces double-entry invariants and period validation.
 */

import express from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import {
    JournalEntry,
    JournalEntryLine,
    ChartOfAccount,
    FiscalYear,
    AccountingPeriod,
    CostCenter,
    Project
} from '../../config/database.js';
import {
    createJournalEntry,
    approveJournalEntry,
    postJournalEntry,
    reverseJournalEntry,
    createFiscalYear,
    lockAccountingPeriod,
    closeAccountingPeriod,
    reopenAccountingPeriod
} from '../../services/accounting.service.js';
import { getAuditLogs } from '../../services/audit.service.js';

const router = express.Router();

// ============================================
// JOURNAL ENTRIES
// ============================================

// List journal entries with filters
router.get('/journal-entries', async (req, res) => {
    try {
        const { status, startDate, endDate, sourceDocument, limit = 50, offset = 0 } = req.query;
        const where = {};

        if (status) where.status = status;
        if (sourceDocument) where.sourceDocument = sourceDocument;
        if (startDate && endDate) {
            where.date = { [Op.between]: [startDate, endDate] };
        } else if (startDate) {
            where.date = { [Op.gte]: startDate };
        } else if (endDate) {
            where.date = { [Op.lte]: endDate };
        }

        const { rows, count } = await JournalEntry.findAndCountAll({
            where,
            include: [{
                model: JournalEntryLine,
                as: 'lines',
                include: [{ model: ChartOfAccount, as: 'account', attributes: ['id', 'code', 'name', 'type'] }]
            }],
            order: [['date', 'DESC'], ['number', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({ entries: rows, total: count, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single journal entry
router.get('/journal-entries/:id', async (req, res) => {
    try {
        const je = await JournalEntry.findByPk(req.params.id, {
            include: [{
                model: JournalEntryLine,
                as: 'lines',
                include: [
                    { model: ChartOfAccount, as: 'account', attributes: ['id', 'code', 'name', 'type'] },
                    { model: CostCenter, as: 'costCenter', attributes: ['id', 'code', 'name'] },
                    { model: Project, as: 'project', attributes: ['id', 'code', 'name'] }
                ]
            }]
        });
        if (!je) return res.status(404).json({ error: 'Journal entry not found' });
        res.json(je);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create manual journal entry
router.post('/journal-entries', async (req, res) => {
    try {
        const { date, description, lines, notes, idempotencyKey } = req.body;

        if (!date || !description || !lines) {
            return res.status(400).json({ error: 'date, description, and lines are required' });
        }

        const je = await createJournalEntry({
            date,
            description,
            lines,
            sourceDocument: 'Manual',
            notes,
            createdBy: req.body.createdBy || 'user',
            idempotencyKey: idempotencyKey || `manual-${uuidv4()}`
        });

        res.status(201).json(je);
    } catch (error) {
        if (error.message.includes('unbalanced') || error.message.includes('must have')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

// Approve journal entry
router.post('/journal-entries/:id/approve', async (req, res) => {
    try {
        const je = await approveJournalEntry(req.params.id, req.body.approvedBy || 'user');
        res.json(je);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Post journal entry
router.post('/journal-entries/:id/post', async (req, res) => {
    try {
        const je = await postJournalEntry(req.params.id, req.body.postedBy || 'user');
        res.json(je);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Reverse journal entry
router.post('/journal-entries/:id/reverse', async (req, res) => {
    try {
        const { reversalDate, reason, reversedBy } = req.body;
        const result = await reverseJournalEntry(req.params.id, {
            reversalDate,
            reason,
            reversedBy: reversedBy || 'user'
        });
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ============================================
// FISCAL YEARS
// ============================================

router.get('/fiscal-years', async (req, res) => {
    try {
        const years = await FiscalYear.findAll({
            include: [{ model: AccountingPeriod, as: 'periods', order: [['periodNumber', 'ASC']] }],
            order: [['startDate', 'DESC']]
        });
        res.json(years);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/fiscal-years', async (req, res) => {
    try {
        const { name, startDate, endDate } = req.body;
        if (!name || !startDate || !endDate) {
            return res.status(400).json({ error: 'name, startDate, and endDate are required' });
        }
        const fy = await createFiscalYear({
            name,
            startDate,
            endDate,
            createdBy: req.body.createdBy || 'user'
        });
        res.status(201).json(fy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ACCOUNTING PERIODS
// ============================================

router.get('/accounting-periods', async (req, res) => {
    try {
        const { fiscalYearId, status } = req.query;
        const where = {};
        if (fiscalYearId) where.fiscalYearId = fiscalYearId;
        if (status) where.status = status;

        const periods = await AccountingPeriod.findAll({
            where,
            include: [{ model: FiscalYear, attributes: ['id', 'name'] }],
            order: [['startDate', 'ASC']]
        });
        res.json(periods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/accounting-periods/:id/close', async (req, res) => {
    try {
        const period = await closeAccountingPeriod(req.params.id, req.body.closedBy || 'user');
        res.json(period);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/accounting-periods/:id/lock', async (req, res) => {
    try {
        const period = await lockAccountingPeriod(req.params.id, req.body.lockedBy || 'user');
        res.json(period);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/accounting-periods/:id/reopen', async (req, res) => {
    try {
        const period = await reopenAccountingPeriod(req.params.id, req.body.reopenedBy || 'user');
        res.json(period);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ============================================
// COST CENTERS
// ============================================

router.get('/cost-centers', async (req, res) => {
    try {
        const centers = await CostCenter.findAll({
            where: { isActive: true },
            include: [{ model: CostCenter, as: 'children' }],
            order: [['code', 'ASC']]
        });
        res.json(centers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/cost-centers', async (req, res) => {
    try {
        const center = await CostCenter.create({ id: uuidv4(), ...req.body });
        res.status(201).json(center);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/cost-centers/:id', async (req, res) => {
    try {
        const center = await CostCenter.findByPk(req.params.id);
        if (!center) return res.status(404).json({ error: 'Cost center not found' });
        await center.update(req.body);
        res.json(center);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PROJECTS
// ============================================

router.get('/projects', async (req, res) => {
    try {
        const { status } = req.query;
        const where = { isActive: true };
        if (status) where.status = status;

        const projects = await Project.findAll({ where, order: [['code', 'ASC']] });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/projects', async (req, res) => {
    try {
        const project = await Project.create({ id: uuidv4(), ...req.body });
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/projects/:id', async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });
        await project.update(req.body);
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// AUDIT LOG (read-only)
// ============================================

router.get('/audit-logs', async (req, res) => {
    try {
        const { tableName, recordId, userId, action, startDate, endDate, limit = 100, offset = 0 } = req.query;
        const result = await getAuditLogs({
            tableName, recordId, userId, action, startDate, endDate,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        res.json({ logs: result.rows, total: result.count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
