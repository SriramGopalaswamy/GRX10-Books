
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
    ChartOfAccount,
    Employee,
    ProfessionalTaxSlab,
    Payslip,
    HRMSNotification
} from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ============================================
// P2-06: Department rename cascade
// Custom PUT that cascades name change to Employee records
// Must be registered BEFORE the generic CRUD routes
// ============================================
router.put('/departments/:id', async (req, res) => {
    try {
        const dept = await Department.findByPk(req.params.id);
        if (!dept) {
            return res.status(404).json({ error: 'departments not found' });
        }

        const oldName = dept.name;
        const newName = req.body.name;

        await dept.update(req.body);

        // If name changed, cascade to all employees with the old department name
        let cascadedCount = 0;
        if (newName && newName !== oldName) {
            const [affectedCount] = await Employee.update(
                { department: newName },
                { where: { department: oldName } }
            );
            cascadedCount = affectedCount;
        }

        const response = dept.toJSON();
        if (cascadedCount > 0) {
            response._cascade = {
                message: `Department renamed from "${oldName}" to "${newName}". Updated ${cascadedCount} employee record(s).`,
                affectedEmployees: cascadedCount
            };
        }
        res.json(response);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'departments with this name already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// ============================================
// P1-12: PT slab update with retroactive warning
// Custom PUT that checks payslip impact when PT slabs change
// Must be registered BEFORE the generic CRUD routes
// ============================================
router.put('/professional-tax-slabs/:id', async (req, res) => {
    try {
        const slab = await ProfessionalTaxSlab.findByPk(req.params.id);
        if (!slab) {
            return res.status(404).json({ error: 'professional-tax-slabs not found' });
        }

        const oldTaxAmount = slab.taxAmount;
        const oldMinSalary = slab.minSalary;
        const oldMaxSalary = slab.maxSalary;

        await slab.update(req.body);

        // Check if tax-relevant fields changed
        const taxChanged = (req.body.taxAmount !== undefined && req.body.taxAmount !== oldTaxAmount) ||
            (req.body.minSalary !== undefined && req.body.minSalary !== oldMinSalary) ||
            (req.body.maxSalary !== undefined && req.body.maxSalary !== oldMaxSalary);

        let retroactiveWarning = null;
        if (taxChanged) {
            // Find employees in locations mapped to this state
            const stateLocations = await WorkLocation.findAll({
                where: {
                    [Op.or]: [
                        { state: slab.state },
                        { state: slab.stateCode }
                    ].filter(f => Object.values(f)[0]),
                    isActive: true
                },
                attributes: ['name', 'code']
            });

            const locationIds = [
                ...stateLocations.map(l => l.name),
                ...stateLocations.map(l => l.code).filter(Boolean)
            ];

            if (locationIds.length > 0) {
                const employees = await Employee.findAll({
                    where: { workLocation: { [Op.in]: locationIds }, status: 'Active' },
                    attributes: ['id']
                });
                const empIds = employees.map(e => e.id);

                if (empIds.length > 0) {
                    const affectedPayslips = await Payslip.count({
                        where: {
                            employeeId: { [Op.in]: empIds },
                            status: { [Op.in]: ['Finalized', 'Paid'] }
                        }
                    });

                    if (affectedPayslips > 0) {
                        retroactiveWarning = `PT slab changed (tax: ₹${oldTaxAmount} → ₹${slab.taxAmount}). ${affectedPayslips} finalized/paid payslip(s) for ${slab.state} may need revision. Use POST /api/hrms/pt-slabs/impact-check for details.`;

                        // Notify HR/Admin about the change
                        const hrAdmins = await Employee.findAll({
                            where: { role: { [Op.in]: ['HR', 'Admin'] }, status: 'Active' },
                            attributes: ['id']
                        });
                        for (const hr of hrAdmins) {
                            try {
                                await HRMSNotification.create({
                                    id: uuidv4(),
                                    recipientId: hr.id,
                                    type: 'pt_slab_change',
                                    title: 'PT Slab Updated - Retroactive Impact',
                                    message: retroactiveWarning,
                                    relatedModule: 'payslip',
                                    relatedId: null,
                                    createdAt: new Date().toISOString()
                                });
                            } catch (e) { /* best effort */ }
                        }
                    }
                }
            }
        }

        const response = slab.toJSON();
        if (retroactiveWarning) {
            response._warning = retroactiveWarning;
        }
        res.json(response);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'professional-tax-slabs with this name already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

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
createCRUDRoutes(ProfessionalTaxSlab, 'professional-tax-slabs');

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

