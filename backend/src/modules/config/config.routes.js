
import express from 'express';
import { Op } from 'sequelize';
import {
    Organization,
    Department,
    Position,
    HRMSRole,
    EmployeeType,
    Holiday,
    LeaveType,
    WorkLocation,
    Skill,
    Language,
    ChartOfAccount
} from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Generic CRUD helper function
const createCRUDRoutes = (Model, routeName) => {
    // Get all (with optional active filter)
    router.get(`/${routeName}`, async (req, res) => {
        try {
            const { activeOnly } = req.query;
            const where = {};
            if (activeOnly === 'true') {
                where.isActive = true;
            }
            const items = await Model.findAll({ where, order: [['name', 'ASC']] });
            res.json(items);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Get by ID
    router.get(`/${routeName}/:id`, async (req, res) => {
        try {
            const item = await Model.findByPk(req.params.id);
            if (!item) {
                return res.status(404).json({ error: `${routeName} not found` });
            }
            res.json(item);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Create
    router.post(`/${routeName}`, async (req, res) => {
        try {
            const item = await Model.create({
                id: uuidv4(),
                ...req.body
            });
            res.status(201).json(item);
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                res.status(400).json({ error: `${routeName} with this name already exists` });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // Update
    router.put(`/${routeName}/:id`, async (req, res) => {
        try {
            const item = await Model.findByPk(req.params.id);
            if (!item) {
                return res.status(404).json({ error: `${routeName} not found` });
            }
            await item.update(req.body);
            res.json(item);
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                res.status(400).json({ error: `${routeName} with this name already exists` });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

    // Delete (soft delete - set isActive to false)
    router.delete(`/${routeName}/:id`, async (req, res) => {
        try {
            const item = await Model.findByPk(req.params.id);
            if (!item) {
                return res.status(404).json({ error: `${routeName} not found` });
            }
            await item.update({ isActive: false });
            res.json({ message: `${routeName} deactivated successfully` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Hard delete (permanent)
    router.delete(`/${routeName}/:id/permanent`, async (req, res) => {
        try {
            const item = await Model.findByPk(req.params.id);
            if (!item) {
                return res.status(404).json({ error: `${routeName} not found` });
            }
            await item.destroy();
            res.json({ message: `${routeName} deleted permanently` });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
};

// Create routes for all configuration models
createCRUDRoutes(Organization, 'organizations');
createCRUDRoutes(Department, 'departments');
createCRUDRoutes(Position, 'positions');
createCRUDRoutes(HRMSRole, 'hrms-roles');
createCRUDRoutes(EmployeeType, 'employee-types');
createCRUDRoutes(Holiday, 'holidays');
createCRUDRoutes(LeaveType, 'leave-types');
createCRUDRoutes(WorkLocation, 'work-locations');
createCRUDRoutes(Skill, 'skills');
createCRUDRoutes(Language, 'languages');
createCRUDRoutes(ChartOfAccount, 'chart-of-accounts');

// Special route for Chart of Accounts - get by type
router.get('/chart-of-accounts/type/:type', async (req, res) => {
    try {
        const { activeOnly } = req.query;
        const where = { type: req.params.type };
        if (activeOnly === 'true') {
            where.isActive = true;
        }
        const accounts = await ChartOfAccount.findAll({
            where,
            include: [{ model: ChartOfAccount, as: 'parent', attributes: ['id', 'name', 'code'] }],
            order: [['code', 'ASC']]
        });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Special route for Holidays - get by year
router.get('/holidays/year/:year', async (req, res) => {
    try {
        const { activeOnly } = req.query;
        const where = {
            date: { [Op.like]: `${req.params.year}-%` }
        };
        if (activeOnly === 'true') {
            where.isActive = true;
        }
        const holidays = await Holiday.findAll({
            where,
            order: [['date', 'ASC']]
        });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

