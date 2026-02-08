/**
 * Tax Routes - Tax codes, groups, and calculation API
 *
 * Supports Indian GST structure:
 * - Tax Groups (e.g., "GST 18%") containing multiple components
 * - Tax Codes (e.g., "CGST 9%", "SGST 9%", "IGST 18%")
 * - Inclusive and exclusive tax handling
 * - Tax liability ledger linkage
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
    TaxGroup,
    TaxCode,
    TaxGroupTax,
    ChartOfAccount
} from '../../config/database.js';
import { calculateTax } from '../../services/tax.service.js';

const router = express.Router();

// ============================================
// TAX GROUPS
// ============================================

router.get('/groups', async (req, res) => {
    try {
        const { isActive } = req.query;
        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const groups = await TaxGroup.findAll({
            where,
            include: [{
                model: TaxGroupTax,
                as: 'taxes',
                include: [{ model: TaxCode }]
            }],
            order: [['name', 'ASC']]
        });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/groups', async (req, res) => {
    try {
        const { name, description, taxCodeIds } = req.body;
        const group = await TaxGroup.create({ id: uuidv4(), name, description });

        if (taxCodeIds && taxCodeIds.length > 0) {
            await TaxGroupTax.bulkCreate(
                taxCodeIds.map(tcId => ({
                    id: uuidv4(),
                    taxGroupId: group.id,
                    taxCodeId: tcId
                }))
            );
        }

        const created = await TaxGroup.findByPk(group.id, {
            include: [{ model: TaxGroupTax, as: 'taxes', include: [{ model: TaxCode }] }]
        });
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/groups/:id', async (req, res) => {
    try {
        const group = await TaxGroup.findByPk(req.params.id);
        if (!group) return res.status(404).json({ error: 'Tax group not found' });
        await group.update(req.body);

        // Update tax codes in group if provided
        if (req.body.taxCodeIds) {
            await TaxGroupTax.destroy({ where: { taxGroupId: group.id } });
            await TaxGroupTax.bulkCreate(
                req.body.taxCodeIds.map(tcId => ({
                    id: uuidv4(), taxGroupId: group.id, taxCodeId: tcId
                }))
            );
        }

        const updated = await TaxGroup.findByPk(group.id, {
            include: [{ model: TaxGroupTax, as: 'taxes', include: [{ model: TaxCode }] }]
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TAX CODES
// ============================================

router.get('/codes', async (req, res) => {
    try {
        const { isActive } = req.query;
        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';

        const codes = await TaxCode.findAll({
            where,
            include: [
                { model: ChartOfAccount, as: 'salesAccount', attributes: ['id', 'code', 'name'], required: false },
                { model: ChartOfAccount, as: 'purchaseAccount', attributes: ['id', 'code', 'name'], required: false }
            ],
            order: [['code', 'ASC']]
        });
        res.json(codes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/codes', async (req, res) => {
    try {
        const code = await TaxCode.create({ id: uuidv4(), ...req.body });
        res.status(201).json(code);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Tax code already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

router.put('/codes/:id', async (req, res) => {
    try {
        const code = await TaxCode.findByPk(req.params.id);
        if (!code) return res.status(404).json({ error: 'Tax code not found' });
        await code.update(req.body);
        res.json(code);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// TAX CALCULATION API
// ============================================

router.post('/calculate', async (req, res) => {
    try {
        const { amount, taxCodeId, taxGroupId, taxRate } = req.body;
        if (!amount) return res.status(400).json({ error: 'amount is required' });

        const result = await calculateTax({ amount, taxCodeId, taxGroupId, taxRate });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
