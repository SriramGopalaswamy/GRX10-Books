
import express from 'express';
import { Op } from 'sequelize';
import {
    Role,
    Permission,
    RolePermission,
    UserRole,
    User,
    ApprovalWorkflow,
    ApprovalWorkflowStep,
    ApprovalRequest,
    ApprovalHistory
} from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { requirePermission } from '../../security/requirePermission.js';

const router = express.Router();

// ============================================
// ROLE MANAGEMENT ROUTES
// ============================================

// Get all roles
router.get('/roles', requirePermission('security.read'), async (req, res) => {
    try {
        const { activeOnly } = req.query;
        const where = {};
        if (activeOnly === 'true') {
            where.isActive = true;
        }
        const roles = await Role.findAll({ where, order: [['name', 'ASC']] });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get role by ID with permissions
router.get('/roles/:id', requirePermission('security.read'), async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id, {
            include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }]
        });
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        res.json(role);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create role
router.post('/roles', requirePermission('security.manage'), async (req, res) => {
    try {
        const role = await Role.create({
            id: uuidv4(),
            ...req.body
        });
        res.status(201).json(role);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'Role with this name already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Update role
router.put('/roles/:id', requirePermission('security.manage'), async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        if (role.isSystemRole && req.body.isSystemRole === false) {
            return res.status(400).json({ error: 'Cannot modify system role' });
        }
        await role.update(req.body);
        res.json(role);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'Role with this name already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Delete role (soft delete)
router.delete('/roles/:id', requirePermission('security.manage'), async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        if (role.isSystemRole) {
            return res.status(400).json({ error: 'Cannot delete system role' });
        }
        await role.update({ isActive: false });
        res.json({ message: 'Role deactivated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Assign permissions to role
router.post('/roles/:id/permissions', requirePermission('security.manage'), async (req, res) => {
    try {
        const { permissionIds } = req.body;
        const role = await Role.findByPk(req.params.id);
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Remove existing permissions
        await RolePermission.destroy({ where: { roleId: role.id } });

        // Add new permissions
        if (permissionIds && permissionIds.length > 0) {
            const rolePermissions = permissionIds.map(permissionId => ({
                id: uuidv4(),
                roleId: role.id,
                permissionId
            }));
            await RolePermission.bulkCreate(rolePermissions);
        }

        const updatedRole = await Role.findByPk(role.id, {
            include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }]
        });
        res.json(updatedRole);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PERMISSION MANAGEMENT ROUTES
// ============================================

// Get all permissions
router.get('/permissions', requirePermission('security.read'), async (req, res) => {
    try {
        const { module, resource, activeOnly } = req.query;
        const where = {};
        if (module) where.module = module;
        if (resource) where.resource = resource;
        if (activeOnly === 'true') {
            where.isActive = true;
        }
        const permissions = await Permission.findAll({ where, order: [['module', 'ASC'], ['resource', 'ASC'], ['action', 'ASC']] });
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get permission by ID
router.get('/permissions/:id', requirePermission('security.read'), async (req, res) => {
    try {
        const permission = await Permission.findByPk(req.params.id);
        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }
        res.json(permission);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create permission
router.post('/permissions', requirePermission('security.manage'), async (req, res) => {
    try {
        const permission = await Permission.create({
            id: uuidv4(),
            ...req.body
        });
        res.status(201).json(permission);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'Permission with this name or code already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Update permission
router.put('/permissions/:id', requirePermission('security.manage'), async (req, res) => {
    try {
        const permission = await Permission.findByPk(req.params.id);
        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }
        await permission.update(req.body);
        res.json(permission);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'Permission with this name or code already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Delete permission (soft delete)
router.delete('/permissions/:id', requirePermission('security.manage'), async (req, res) => {
    try {
        const permission = await Permission.findByPk(req.params.id);
        if (!permission) {
            return res.status(404).json({ error: 'Permission not found' });
        }
        await permission.update({ isActive: false });
        res.json({ message: 'Permission deactivated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// USER ROLE ASSIGNMENT ROUTES
// ============================================

// Get user roles
router.get('/users/:userId/roles', requirePermission('security.read'), async (req, res) => {
    try {
        const userRoles = await UserRole.findAll({
            where: { userId: req.params.userId, isActive: true },
            include: [{ model: Role, as: 'role' }]
        });
        res.json(userRoles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Assign role to user
router.post('/users/:userId/roles', requirePermission('security.manage'), async (req, res) => {
    try {
        const { roleId, assignedBy } = req.body;
        const [userRole, created] = await UserRole.findOrCreate({
            where: { userId: req.params.userId, roleId },
            defaults: {
                id: uuidv4(),
                userId: req.params.userId,
                roleId,
                assignedBy,
                isActive: true
            }
        });
        if (!created) {
            await userRole.update({ isActive: true, assignedBy });
        }
        const result = await UserRole.findByPk(userRole.id, {
            include: [{ model: Role, as: 'role' }]
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove role from user
router.delete('/users/:userId/roles/:roleId', requirePermission('security.manage'), async (req, res) => {
    try {
        const userRole = await UserRole.findOne({
            where: { userId: req.params.userId, roleId: req.params.roleId }
        });
        if (!userRole) {
            return res.status(404).json({ error: 'User role not found' });
        }
        await userRole.update({ isActive: false });
        res.json({ message: 'Role removed from user' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user permissions (all permissions from all user roles)
router.get('/users/:userId/permissions', requirePermission('security.read'), async (req, res) => {
    try {
        const userRoles = await UserRole.findAll({
            where: { userId: req.params.userId, isActive: true },
            include: [{
                model: Role,
                as: 'role',
                include: [{
                    model: Permission,
                    as: 'permissions',
                    where: { isActive: true },
                    through: { attributes: [] }
                }]
            }]
        });

        const permissions = new Map();
        userRoles.forEach(userRole => {
            if (userRole.role && userRole.role.permissions) {
                userRole.role.permissions.forEach(permission => {
                    permissions.set(permission.code, permission);
                });
            }
        });

        res.json(Array.from(permissions.values()));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// APPROVAL WORKFLOW ROUTES
// ============================================

// Get all workflows
router.get('/approval-workflows', requirePermission('security.read'), async (req, res) => {
    try {
        const { module, resource, activeOnly } = req.query;
        const where = {};
        if (module) where.module = module;
        if (resource) where.resource = resource;
        if (activeOnly === 'true') {
            where.isActive = true;
        }
        const workflows = await ApprovalWorkflow.findAll({
            where,
            include: [{ model: ApprovalWorkflowStep, as: 'steps', order: [['stepOrder', 'ASC']] }],
            order: [['name', 'ASC']]
        });
        res.json(workflows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get workflow by ID
router.get('/approval-workflows/:id', requirePermission('security.read'), async (req, res) => {
    try {
        const workflow = await ApprovalWorkflow.findByPk(req.params.id, {
            include: [{ model: ApprovalWorkflowStep, as: 'steps', order: [['stepOrder', 'ASC']] }]
        });
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json(workflow);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create workflow
router.post('/approval-workflows', requirePermission('security.manage'), async (req, res) => {
    try {
        const { steps, ...workflowData } = req.body;
        const workflow = await ApprovalWorkflow.create({
            id: uuidv4(),
            ...workflowData
        });

        if (steps && steps.length > 0) {
            const workflowSteps = steps.map((step, index) => ({
                id: uuidv4(),
                workflowId: workflow.id,
                stepOrder: index + 1,
                ...step
            }));
            await ApprovalWorkflowStep.bulkCreate(workflowSteps);
        }

        const createdWorkflow = await ApprovalWorkflow.findByPk(workflow.id, {
            include: [{ model: ApprovalWorkflowStep, as: 'steps', order: [['stepOrder', 'ASC']] }]
        });
        res.status(201).json(createdWorkflow);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update workflow
router.put('/approval-workflows/:id', requirePermission('security.manage'), async (req, res) => {
    try {
        const { steps, ...workflowData } = req.body;
        const workflow = await ApprovalWorkflow.findByPk(req.params.id);
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }

        await workflow.update(workflowData);

        // Update steps if provided
        if (steps) {
            await ApprovalWorkflowStep.destroy({ where: { workflowId: workflow.id } });
            if (steps.length > 0) {
                const workflowSteps = steps.map((step, index) => ({
                    id: uuidv4(),
                    workflowId: workflow.id,
                    stepOrder: index + 1,
                    ...step
                }));
                await ApprovalWorkflowStep.bulkCreate(workflowSteps);
            }
        }

        const updatedWorkflow = await ApprovalWorkflow.findByPk(workflow.id, {
            include: [{ model: ApprovalWorkflowStep, as: 'steps', order: [['stepOrder', 'ASC']] }]
        });
        res.json(updatedWorkflow);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete workflow (soft delete)
router.delete('/approval-workflows/:id', requirePermission('security.manage'), async (req, res) => {
    try {
        const workflow = await ApprovalWorkflow.findByPk(req.params.id);
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        await workflow.update({ isActive: false });
        res.json({ message: 'Workflow deactivated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// APPROVAL REQUEST ROUTES
// ============================================

// Get all approval requests
router.get('/approval-requests', requirePermission('security.read'), async (req, res) => {
    try {
        const { status, module, requestedBy, assignedTo } = req.query;
        const where = {};
        if (status) where.status = status;
        if (module) where.module = module;
        if (requestedBy) where.requestedBy = requestedBy;

        const requests = await ApprovalRequest.findAll({
            where,
            include: [
                { model: ApprovalWorkflow, as: 'workflow' },
                { model: User, as: 'requester', attributes: ['id', 'username', 'displayName', 'email'] },
                { model: ApprovalHistory, as: 'history', include: [{ model: User, as: 'approver', attributes: ['id', 'username', 'displayName'] }] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get approval request by ID
router.get('/approval-requests/:id', requirePermission('security.read'), async (req, res) => {
    try {
        const request = await ApprovalRequest.findByPk(req.params.id, {
            include: [
                { model: ApprovalWorkflow, as: 'workflow', include: [{ model: ApprovalWorkflowStep, as: 'steps', order: [['stepOrder', 'ASC']] }] },
                { model: User, as: 'requester', attributes: ['id', 'username', 'displayName', 'email'] },
                { model: ApprovalHistory, as: 'history', include: [{ model: User, as: 'approver', attributes: ['id', 'username', 'displayName'] }], order: [['actionDate', 'ASC']] }
            ]
        });
        if (!request) {
            return res.status(404).json({ error: 'Approval request not found' });
        }
        res.json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create approval request
router.post('/approval-requests', requirePermission('security.manage'), async (req, res) => {
    try {
        const request = await ApprovalRequest.create({
            id: uuidv4(),
            ...req.body
        });
        const createdRequest = await ApprovalRequest.findByPk(request.id, {
            include: [
                { model: ApprovalWorkflow, as: 'workflow' },
                { model: User, as: 'requester', attributes: ['id', 'username', 'displayName', 'email'] }
            ]
        });
        res.status(201).json(createdRequest);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Process approval (approve/reject)
router.post('/approval-requests/:id/process', requirePermission('security.manage'), async (req, res) => {
    try {
        const { action, comments, approverId } = req.body; // action: 'Approved', 'Rejected', 'Returned'
        const request = await ApprovalRequest.findByPk(req.params.id, {
            include: [{ model: ApprovalWorkflow, as: 'workflow', include: [{ model: ApprovalWorkflowStep, as: 'steps', order: [['stepOrder', 'ASC']] }] }]
        });

        if (!request) {
            return res.status(404).json({ error: 'Approval request not found' });
        }

        if (request.status !== 'Pending') {
            return res.status(400).json({ error: 'Request is not in pending status' });
        }

        // Create approval history entry
        await ApprovalHistory.create({
            id: uuidv4(),
            requestId: request.id,
            stepOrder: request.currentStep,
            approverId,
            action,
            comments
        });

        // Update request status
        if (action === 'Rejected' || action === 'Returned') {
            await request.update({
                status: action === 'Rejected' ? 'Rejected' : 'Pending',
                currentStep: action === 'Returned' ? Math.max(1, request.currentStep - 1) : request.currentStep,
                completedAt: action === 'Rejected' ? new Date() : null
            });
        } else if (action === 'Approved') {
            const workflow = request.workflow;
            const totalSteps = workflow.steps.length;
            const nextStep = request.currentStep + 1;

            if (nextStep > totalSteps) {
                // All steps approved
                await request.update({
                    status: 'Approved',
                    currentStep: totalSteps,
                    completedAt: new Date()
                });
            } else {
                // Move to next step
                await request.update({
                    currentStep: nextStep
                });
            }
        }

        const updatedRequest = await ApprovalRequest.findByPk(request.id, {
            include: [
                { model: ApprovalWorkflow, as: 'workflow' },
                { model: User, as: 'requester', attributes: ['id', 'username', 'displayName', 'email'] },
                { model: ApprovalHistory, as: 'history', include: [{ model: User, as: 'approver', attributes: ['id', 'username', 'displayName'] }], order: [['actionDate', 'ASC']] }
            ]
        });
        res.json(updatedRequest);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get pending approvals for a user
router.get('/approval-requests/pending/:userId', requirePermission('security.read'), async (req, res) => {
    try {
        // This is a simplified version - in production, you'd check user roles, manager relationships, etc.
        const requests = await ApprovalRequest.findAll({
            where: { status: 'Pending' },
            include: [
                { model: ApprovalWorkflow, as: 'workflow', include: [{ model: ApprovalWorkflowStep, as: 'steps', order: [['stepOrder', 'ASC']] }] },
                { model: User, as: 'requester', attributes: ['id', 'username', 'displayName', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
