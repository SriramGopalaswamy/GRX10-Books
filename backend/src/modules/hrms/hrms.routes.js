import express from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import {
    sequelize,
    Employee,
    EmployeeHiringHistory,
    LeaveRequest,
    AttendanceRecord,
    RegularizationRequest,
    Payslip,
    LeaveType,
    ShiftTiming,
    WorkLocation,
    ProfessionalTaxSlab,
    Holiday,
    SalaryChangeLog,
    HRMSAuditLog,
    HRMSNotification
} from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import {
    requireAuth,
    requireHRMSRole,
    requireEmployeeAccess,
    filterSensitiveData,
    filterEmployeeList,
    scopeByRole,
    HRMSRoles,
    RoleGroups,
    validateEmployeeData
} from './hrms.middleware.js';

const router = express.Router();
const BCRYPT_SALT_ROUNDS = 10;

// ============================================
// NOTIFICATION HELPER (P1-05)
// ============================================
const createNotification = async ({ recipientId, type, title, message, relatedModule, relatedId }) => {
    try {
        await HRMSNotification.create({
            id: uuidv4(),
            recipientId,
            type,
            title,
            message,
            relatedModule,
            relatedId,
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('Failed to create notification:', err.message);
    }
};

// Helper to get all manager IDs up the chain for an employee (P1-07)
const getManagerChain = async (employeeId) => {
    const managerIds = [];
    let currentId = employeeId;
    const visited = new Set();
    while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const emp = await Employee.findByPk(currentId, { attributes: ['id', 'managerId'] });
        if (emp && emp.managerId) {
            managerIds.push(emp.managerId);
            currentId = emp.managerId;
        } else {
            break;
        }
    }
    return managerIds;
};

// Helper to get all subordinates recursively (P1-07)
const getAllSubordinates = async (managerId) => {
    const allIds = [];
    const queue = [managerId];
    const visited = new Set();
    while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        const directReports = await Employee.findAll({
            where: { managerId: currentId, status: 'Active' },
            attributes: ['id']
        });
        for (const report of directReports) {
            allIds.push(report.id);
            queue.push(report.id);
        }
    }
    return allIds;
};

// Apply authentication to all HRMS routes
router.use(requireAuth);

// ============================================
// EMPLOYEES
// ============================================

// Get current user's employee record
router.get('/employees/me', async (req, res) => {
    try {
        const employee = await Employee.findOne({
            where: {
                [Op.or]: [
                    { id: req.user.id },
                    { email: req.user.email }
                ]
            },
            include: [
                { model: Employee, as: 'manager', attributes: ['id', 'name', 'email'] }
            ]
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee record not found' });
        }

        const data = employee.toJSON();
        // Parse JSON fields
        if (data.educationDetails) data.educationDetails = JSON.parse(data.educationDetails);
        if (data.experienceDetails) data.experienceDetails = JSON.parse(data.experienceDetails);
        if (data.salaryBreakdown) data.salaryBreakdown = JSON.parse(data.salaryBreakdown);
        if (data.leaveEntitlements) data.leaveEntitlements = JSON.parse(data.leaveEntitlements);
        if (data.certifications) data.certifications = JSON.parse(data.certifications);
        if (data.skills) data.skills = JSON.parse(data.skills);
        if (data.languages) data.languages = JSON.parse(data.languages);
        if (data.dependents) data.dependents = JSON.parse(data.dependents);
        if (data.taxDeclarations) data.taxDeclarations = JSON.parse(data.taxDeclarations);

        // Filter sensitive data (user can see their own data)
        const filteredData = filterSensitiveData(data, req.user, data.id);
        res.json(filteredData);
    } catch (error) {
        console.error('Error fetching current employee:', error);
        res.status(500).json({ error: 'Failed to fetch employee record' });
    }
});

// Get all employees (with role-based scoping)
router.get('/employees', scopeByRole, async (req, res) => {
    try {
        const { search, department, status, role } = req.query;
        const where = {};

        // Apply search filter
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { id: { [Op.iLike]: `%${search}%` } }
            ];
        }

        // Apply department filter
        if (department) {
            where.department = department;
        }

        // Apply status filter
        if (status) {
            where.status = status;
        }

        // Apply role filter
        if (role) {
            where.role = role;
        }

        // Apply scope-based filtering (from middleware)
        if (req.hrmsScope.type !== 'all' && req.hrmsScope.employeeIds) {
            where.id = { [Op.in]: req.hrmsScope.employeeIds };
        }

        const employees = await Employee.findAll({
            where,
            include: [
                { model: Employee, as: 'manager', attributes: ['id', 'name', 'email'] },
                { model: Employee, as: 'subordinates', attributes: ['id', 'name', 'email'] }
            ],
            order: [['name', 'ASC']]
        });

        // Parse JSON fields in response
        const parsedEmployees = employees.map(emp => {
            const data = emp.toJSON();
            if (data.educationDetails) data.educationDetails = JSON.parse(data.educationDetails);
            if (data.experienceDetails) data.experienceDetails = JSON.parse(data.experienceDetails);
            if (data.salaryBreakdown) data.salaryBreakdown = JSON.parse(data.salaryBreakdown);
            if (data.leaveEntitlements) data.leaveEntitlements = JSON.parse(data.leaveEntitlements);
            if (data.certifications) data.certifications = JSON.parse(data.certifications);
            if (data.skills) data.skills = JSON.parse(data.skills);
            if (data.languages) data.languages = JSON.parse(data.languages);
            if (data.dependents) data.dependents = JSON.parse(data.dependents);
            if (data.taxDeclarations) data.taxDeclarations = JSON.parse(data.taxDeclarations);
            return data;
        });

        // Filter sensitive data based on role
        const filteredEmployees = filterEmployeeList(parsedEmployees, req.user);
        res.json(filteredEmployees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// Get employee by ID (with access check)
router.get('/employees/:id', requireEmployeeAccess(req => req.params.id), async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, {
            include: [
                { model: Employee, as: 'manager', attributes: ['id', 'name', 'email'] },
                { model: Employee, as: 'subordinates', attributes: ['id', 'name', 'email'] }
            ]
        });
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Parse JSON fields in response
        const data = employee.toJSON();
        if (data.educationDetails) data.educationDetails = JSON.parse(data.educationDetails);
        if (data.experienceDetails) data.experienceDetails = JSON.parse(data.experienceDetails);
        if (data.salaryBreakdown) data.salaryBreakdown = JSON.parse(data.salaryBreakdown);
        if (data.leaveEntitlements) data.leaveEntitlements = JSON.parse(data.leaveEntitlements);
        if (data.certifications) data.certifications = JSON.parse(data.certifications);
        if (data.skills) data.skills = JSON.parse(data.skills);
        if (data.languages) data.languages = JSON.parse(data.languages);
        if (data.dependents) data.dependents = JSON.parse(data.dependents);
        if (data.taxDeclarations) data.taxDeclarations = JSON.parse(data.taxDeclarations);

        // Filter sensitive data based on role
        const filteredData = filterSensitiveData(data, req.user, req.params.id);
        res.json(filteredData);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

// Create employee (HR/Admin only)
router.post('/employees', requireHRMSRole(RoleGroups.FULL_ACCESS), validateEmployeeData, async (req, res) => {
    try {
        const {
            name,
            email,
            role,
            department,
            designation,
            joinDate,
            avatar,
            managerId,
            salary,
            status,
            password,
            isNewUser,
            // Personal Details
            dateOfBirth,
            phone,
            address,
            pan,
            aadhar,
            pfNumber,
            esiNumber,
            uanNumber,
            // Employment Details
            employeeType,
            workLocation,
            probationEndDate,
            noticePeriod,
            // Personal Extended
            bloodGroup,
            maritalStatus,
            spouseName,
            emergencyContactName,
            emergencyContactRelation,
            emergencyContactPhone,
            // Bank Details
            bankAccountNumber,
            bankIFSC,
            bankName,
            bankBranch,
            // Referral
            employeeReferralId,
            // JSON fields
            educationDetails,
            experienceDetails,
            salaryBreakdown,
            leaveEntitlements,
            certifications
        } = req.body;

        const employee = await Employee.create({
            id: uuidv4(),
            name,
            email,
            role,
            department,
            designation,
            joinDate,
            avatar: avatar || `https://picsum.photos/200?random=${Date.now()}`,
            managerId,
            salary,
            status: status || 'Active',
            password: password ? await bcrypt.hash(password, BCRYPT_SALT_ROUNDS) : null,
            isNewUser: isNewUser || false,
            // Personal Details
            dateOfBirth,
            phone,
            address,
            pan,
            aadhar,
            pfNumber,
            esiNumber,
            uanNumber,
            // Employment Details
            employeeType,
            workLocation,
            probationEndDate,
            noticePeriod,
            // Personal Extended
            bloodGroup,
            maritalStatus,
            spouseName,
            emergencyContactName,
            emergencyContactRelation,
            emergencyContactPhone,
            // Bank Details
            bankAccountNumber,
            bankIFSC,
            bankName,
            bankBranch,
            // Referral
            employeeReferralId,
            // Auto-initialize leave entitlements if not provided (pro-rated by join month)
            leaveEntitlements: leaveEntitlements
                ? (typeof leaveEntitlements === 'string' ? leaveEntitlements : JSON.stringify(leaveEntitlements))
                : (() => {
                    const joinMonth = joinDate ? new Date(joinDate).getMonth() : 0;
                    const remainingMonths = 12 - joinMonth;
                    return JSON.stringify({
                        'Sick Leave': Math.round(12 * remainingMonths / 12),
                        'Casual Leave': Math.round(12 * remainingMonths / 12),
                        'Earned Leave': Math.round(15 * remainingMonths / 12)
                    });
                })(),
            // JSON fields - stringify if they're objects
            educationDetails: educationDetails ? (typeof educationDetails === 'string' ? educationDetails : JSON.stringify(educationDetails)) : null,
            experienceDetails: experienceDetails ? (typeof experienceDetails === 'string' ? experienceDetails : JSON.stringify(experienceDetails)) : null,
            salaryBreakdown: salaryBreakdown ? (typeof salaryBreakdown === 'string' ? salaryBreakdown : JSON.stringify(salaryBreakdown)) : null,
            certifications: certifications ? (typeof certifications === 'string' ? certifications : JSON.stringify(certifications)) : null,
            skills: req.body.skills ? (typeof req.body.skills === 'string' ? req.body.skills : JSON.stringify(req.body.skills)) : null,
            languages: req.body.languages ? (typeof req.body.languages === 'string' ? req.body.languages : JSON.stringify(req.body.languages)) : null,
            dependents: req.body.dependents ? (typeof req.body.dependents === 'string' ? req.body.dependents : JSON.stringify(req.body.dependents)) : null,
            taxDeclarations: req.body.taxDeclarations ? (typeof req.body.taxDeclarations === 'string' ? req.body.taxDeclarations : JSON.stringify(req.body.taxDeclarations)) : null
        });

        // Parse JSON fields in response
        const response = employee.toJSON();
        if (response.educationDetails) response.educationDetails = JSON.parse(response.educationDetails);
        if (response.experienceDetails) response.experienceDetails = JSON.parse(response.experienceDetails);
        if (response.salaryBreakdown) response.salaryBreakdown = JSON.parse(response.salaryBreakdown);
        if (response.leaveEntitlements) response.leaveEntitlements = JSON.parse(response.leaveEntitlements);
        if (response.certifications) response.certifications = JSON.parse(response.certifications);
        if (response.skills) response.skills = JSON.parse(response.skills);
        if (response.languages) response.languages = JSON.parse(response.languages);
        if (response.dependents) response.dependents = JSON.parse(response.dependents);
        if (response.taxDeclarations) response.taxDeclarations = JSON.parse(response.taxDeclarations);

        // P1-11: Audit log for employee creation
        try {
            await HRMSAuditLog.create({
                id: uuidv4(),
                userId: req.user.id,
                action: 'EMPLOYEE_CREATE',
                module: 'hrms',
                targetId: employee.id,
                targetType: 'Employee',
                details: JSON.stringify({ name, email, role, department, designation }),
                ipAddress: req.ip,
                timestamp: new Date().toISOString()
            });
        } catch (auditErr) {
            console.error('Audit log failed:', auditErr.message);
        }

        // Filter sensitive data from response
        const filteredResponse = filterSensitiveData(response, req.user);
        res.status(201).json(filteredResponse);
    } catch (error) {
        console.error('Error creating employee:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create employee' });
        }
    }
});

// Update employee (HR/Admin can update anyone, employees can update limited fields of their own record)
router.put('/employees/:id', validateEmployeeData, async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const userRole = req.user.role;
        const userId = req.user.id;
        const isOwnRecord = req.params.id === userId;
        const isHROrAdmin = userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR;

        // Check authorization
        if (!isHROrAdmin && !isOwnRecord) {
            return res.status(403).json({ error: 'Access denied. You can only update your own record.' });
        }

        // Handle JSON fields - stringify if they're objects
        let updateData = { ...req.body };

        // If employee updating their own record, restrict fields they can update
        if (!isHROrAdmin && isOwnRecord) {
            const allowedSelfUpdateFields = [
                'phone', 'address', 'emergencyContactName', 'emergencyContactRelation',
                'emergencyContactPhone', 'languages', 'skills', 'educationDetails',
                'experienceDetails', 'certifications', 'password'
            ];
            const restrictedData = {};
            allowedSelfUpdateFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    restrictedData[field] = updateData[field];
                }
            });
            updateData = restrictedData;
        }

        // Hash password if being updated — require current password for self-update
        if (updateData.password) {
            if (!isHROrAdmin) {
                // Employees must provide currentPassword to change their own password
                if (!req.body.currentPassword) {
                    return res.status(400).json({ error: 'Current password is required to set a new password' });
                }
                const isCurrentValid = await bcrypt.compare(req.body.currentPassword, employee.password);
                if (!isCurrentValid) {
                    return res.status(403).json({ error: 'Current password is incorrect' });
                }
            }
            updateData.password = await bcrypt.hash(updateData.password, BCRYPT_SALT_ROUNDS);
            delete updateData.currentPassword; // Don't persist this field
        }

        // Stringify JSON fields
        if (updateData.educationDetails && typeof updateData.educationDetails !== 'string') {
            updateData.educationDetails = JSON.stringify(updateData.educationDetails);
        }
        if (updateData.experienceDetails && typeof updateData.experienceDetails !== 'string') {
            updateData.experienceDetails = JSON.stringify(updateData.experienceDetails);
        }
        if (updateData.salaryBreakdown && typeof updateData.salaryBreakdown !== 'string') {
            updateData.salaryBreakdown = JSON.stringify(updateData.salaryBreakdown);
        }
        if (updateData.leaveEntitlements && typeof updateData.leaveEntitlements !== 'string') {
            updateData.leaveEntitlements = JSON.stringify(updateData.leaveEntitlements);
        }
        if (updateData.certifications && typeof updateData.certifications !== 'string') {
            updateData.certifications = JSON.stringify(updateData.certifications);
        }
        if (updateData.skills && typeof updateData.skills !== 'string') {
            updateData.skills = JSON.stringify(updateData.skills);
        }
        if (updateData.languages && typeof updateData.languages !== 'string') {
            updateData.languages = JSON.stringify(updateData.languages);
        }
        if (updateData.dependents && typeof updateData.dependents !== 'string') {
            updateData.dependents = JSON.stringify(updateData.dependents);
        }
        if (updateData.taxDeclarations && typeof updateData.taxDeclarations !== 'string') {
            updateData.taxDeclarations = JSON.stringify(updateData.taxDeclarations);
        }

        // P0-04: Log salary changes for audit trail
        if (updateData.salary !== undefined && updateData.salary !== employee.salary) {
            try {
                await SalaryChangeLog.create({
                    id: uuidv4(),
                    employeeId: employee.id,
                    previousSalary: employee.salary,
                    newSalary: updateData.salary,
                    reason: req.body.salaryChangeReason || 'Updated via employee edit',
                    effectiveDate: req.body.salaryEffectiveDate || new Date().toISOString().split('T')[0],
                    changedBy: req.user.id,
                    changedOn: new Date().toISOString()
                });
            } catch (logErr) {
                console.error('Failed to log salary change:', logErr.message);
            }
        }

        // P0-06: Warn if joinDate is being changed when finalized/paid payslips exist
        if (updateData.joinDate && updateData.joinDate !== employee.joinDate) {
            const existingPayslips = await Payslip.findAll({
                where: {
                    employeeId: employee.id,
                    status: { [Op.in]: ['Finalized', 'Paid'] }
                },
                attributes: ['id', 'month', 'status']
            });
            if (existingPayslips.length > 0) {
                // Warn but allow HR/Admin to proceed — return warning in response
                req._joinDateWarning = `Warning: Changing joinDate while ${existingPayslips.length} finalized/paid payslip(s) exist. Payslip calculations may need revision.`;
            }
        }

        // P1-11: Audit log for significant updates
        if (isHROrAdmin && (updateData.salary !== undefined || updateData.role || updateData.department || updateData.status)) {
            try {
                await HRMSAuditLog.create({
                    id: uuidv4(),
                    userId: req.user.id,
                    action: 'EMPLOYEE_UPDATE',
                    module: 'hrms',
                    targetId: employee.id,
                    targetType: 'Employee',
                    details: JSON.stringify({
                        changedFields: Object.keys(updateData).filter(k => k !== 'password' && k !== 'currentPassword'),
                        salaryChange: updateData.salary !== undefined ? { from: employee.salary, to: updateData.salary } : undefined,
                        roleChange: updateData.role ? { from: employee.role, to: updateData.role } : undefined
                    }),
                    ipAddress: req.ip,
                    timestamp: new Date().toISOString()
                });
            } catch (auditErr) {
                console.error('Audit log failed:', auditErr.message);
            }
        }

        await employee.update(updateData);

        // Parse JSON fields in response
        const data = employee.toJSON();
        if (data.educationDetails) data.educationDetails = JSON.parse(data.educationDetails);
        if (data.experienceDetails) data.experienceDetails = JSON.parse(data.experienceDetails);
        if (data.salaryBreakdown) data.salaryBreakdown = JSON.parse(data.salaryBreakdown);
        if (data.leaveEntitlements) data.leaveEntitlements = JSON.parse(data.leaveEntitlements);
        if (data.certifications) data.certifications = JSON.parse(data.certifications);
        if (data.skills) data.skills = JSON.parse(data.skills);
        if (data.languages) data.languages = JSON.parse(data.languages);
        if (data.dependents) data.dependents = JSON.parse(data.dependents);
        if (data.taxDeclarations) data.taxDeclarations = JSON.parse(data.taxDeclarations);

        // Filter sensitive data based on role
        const filteredData = filterSensitiveData(data, req.user, req.params.id);
        const response = { ...filteredData };
        if (req._joinDateWarning) {
            response._warning = req._joinDateWarning;
        }
        res.json(response);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

// Delete employee / Terminate (HR/Admin only, soft delete - set status to 'Terminated')
// Uses transaction to ensure data consistency
router.delete('/employees/:id', requireHRMSRole(RoleGroups.FULL_ACCESS), async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const employee = await Employee.findByPk(req.params.id, { transaction: t });
        if (!employee) {
            await t.rollback();
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Prevent terminating yourself
        if (employee.id === req.user.id) {
            await t.rollback();
            return res.status(400).json({ error: 'Cannot terminate your own account' });
        }

        const terminationDate = new Date().toISOString().split('T')[0];

        // Create hiring history record before termination (within transaction)
        await EmployeeHiringHistory.create({
            id: uuidv4(),
            employeeId: employee.id,
            hireDate: employee.joinDate,
            terminationDate: terminationDate,
            employeeType: employee.employeeType,
            department: employee.department,
            employeePosition: employee.employeePosition,
            designation: employee.designation,
            salary: employee.salary,
            managerId: employee.managerId,
            reasonForTermination: req.body.reasonForTermination || 'Not specified',
            isRehire: false
        }, { transaction: t });

        // Update employee status and revoke access (within transaction)
        await employee.update({
            status: 'Terminated',
            terminationDate: terminationDate,
            lastWorkingDay: terminationDate,
            enableEmailLogin: false
        }, { transaction: t });

        // Commit the transaction
        await t.commit();

        res.json({ message: 'Employee terminated successfully' });
    } catch (error) {
        // Rollback on any error
        await t.rollback();
        console.error('Error terminating employee:', error);
        res.status(500).json({ error: 'Failed to terminate employee' });
    }
});

// Employee separation/offboarding (HR/Admin only)
router.post('/employees/:id/separate', requireHRMSRole(RoleGroups.FULL_ACCESS), async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const employee = await Employee.findByPk(req.params.id, { transaction: t });
        if (!employee) {
            await t.rollback();
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Prevent separating yourself
        if (employee.id === req.user.id) {
            await t.rollback();
            return res.status(400).json({ error: 'Cannot process your own separation' });
        }

        // Already separated/terminated
        if (employee.status === 'Terminated' || employee.status === 'Resigned') {
            await t.rollback();
            return res.status(400).json({ error: 'Employee is already separated' });
        }

        const {
            separationType, // 'Resignation', 'Termination', 'Retirement', 'Layoff', 'Contract End'
            lastWorkingDay,
            reason,
            exitInterviewNotes,
            fullAndFinalDate,
            noticePeriodServed, // days
            recoveryAmount, // if any
            remarks
        } = req.body;

        if (!separationType || !lastWorkingDay) {
            await t.rollback();
            return res.status(400).json({ error: 'Separation type and last working day are required' });
        }

        // Check for orphaned reportees — require reassignment before separation
        const directReportees = await Employee.findAll({
            where: { managerId: employee.id, status: 'Active' },
            attributes: ['id', 'name'],
            transaction: t
        });

        if (directReportees.length > 0 && !req.body.reassignManagerId) {
            await t.rollback();
            const reporteeNames = directReportees.map(r => r.name).join(', ');
            return res.status(400).json({
                error: 'Employee has active direct reportees who must be reassigned before separation',
                reportees: directReportees.map(r => ({ id: r.id, name: r.name })),
                hint: 'Provide reassignManagerId in the request body to reassign reportees automatically',
                reporteeNames
            });
        }

        // Reassign reportees if reassignManagerId is provided
        if (directReportees.length > 0 && req.body.reassignManagerId) {
            const newManager = await Employee.findByPk(req.body.reassignManagerId, { transaction: t });
            if (!newManager || newManager.status !== 'Active') {
                await t.rollback();
                return res.status(400).json({ error: 'Reassignment target manager not found or not active' });
            }
            await Employee.update(
                { managerId: req.body.reassignManagerId },
                { where: { managerId: employee.id, status: 'Active' }, transaction: t }
            );
        }

        const validSeparationTypes = ['Resignation', 'Termination', 'Retirement', 'Layoff', 'Contract End', 'Absconding'];
        if (!validSeparationTypes.includes(separationType)) {
            await t.rollback();
            return res.status(400).json({ error: `Invalid separation type. Must be one of: ${validSeparationTypes.join(', ')}` });
        }

        // Determine status based on separation type
        const statusMap = {
            'Resignation': 'Resigned',
            'Termination': 'Terminated',
            'Retirement': 'Retired',
            'Layoff': 'Terminated',
            'Contract End': 'Inactive',
            'Absconding': 'Terminated'
        };

        // Create hiring history record
        await EmployeeHiringHistory.create({
            id: uuidv4(),
            employeeId: employee.id,
            hireDate: employee.joinDate,
            terminationDate: lastWorkingDay,
            employeeType: employee.employeeType,
            department: employee.department,
            employeePosition: employee.employeePosition,
            designation: employee.designation,
            salary: employee.salary,
            managerId: employee.managerId,
            reasonForTermination: `${separationType}: ${reason || 'Not specified'}`,
            isRehire: false
        }, { transaction: t });

        // Update employee status and revoke access
        await employee.update({
            status: statusMap[separationType],
            terminationDate: lastWorkingDay,
            lastWorkingDay: lastWorkingDay,
            enableEmailLogin: false
        }, { transaction: t });

        // Cancel any pending leave requests
        await LeaveRequest.update(
            {
                status: 'Cancelled',
                approverComments: 'Auto-cancelled due to employee separation'
            },
            {
                where: {
                    employeeId: employee.id,
                    status: 'Pending',
                    startDate: { [Op.gt]: lastWorkingDay }
                },
                transaction: t
            }
        );

        await t.commit();

        res.json({
            message: 'Employee separation processed successfully',
            employee: {
                id: employee.id,
                name: employee.name,
                status: statusMap[separationType],
                lastWorkingDay
            },
            separation: {
                type: separationType,
                reason,
                exitInterviewNotes,
                fullAndFinalDate,
                noticePeriodServed,
                recoveryAmount,
                remarks,
                processedBy: req.user.id,
                processedOn: new Date().toISOString().split('T')[0]
            }
        });
    } catch (error) {
        await t.rollback();
        console.error('Error processing separation:', error);
        res.status(500).json({ error: 'Failed to process employee separation' });
    }
});

// Rehire a previously separated employee (HR/Admin only)
router.post('/employees/:id/rehire', requireHRMSRole(RoleGroups.FULL_ACCESS), async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const employee = await Employee.findByPk(req.params.id, { transaction: t });
        if (!employee) {
            await t.rollback();
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Can only rehire separated employees
        if (!['Terminated', 'Resigned', 'Retired', 'Inactive'].includes(employee.status)) {
            await t.rollback();
            return res.status(400).json({ error: 'Can only rehire employees who have been separated' });
        }

        const {
            newJoinDate,
            newDepartment,
            newDesignation,
            newSalary,
            newManagerId,
            newEmployeeType,
            newWorkLocation
        } = req.body;

        if (!newJoinDate) {
            await t.rollback();
            return res.status(400).json({ error: 'New join date is required' });
        }

        const previousEmployeeId = employee.id;

        // Create hiring history record for rehire
        await EmployeeHiringHistory.create({
            id: uuidv4(),
            employeeId: employee.id,
            hireDate: newJoinDate,
            employeeType: newEmployeeType || employee.employeeType,
            department: newDepartment || employee.department,
            designation: newDesignation || employee.designation,
            salary: newSalary || employee.salary,
            managerId: newManagerId || employee.managerId,
            reasonForTermination: null,
            isRehire: true,
            previousEmployeeId: previousEmployeeId
        }, { transaction: t });

        // Update employee record
        await employee.update({
            status: 'Active',
            joinDate: newJoinDate,
            department: newDepartment || employee.department,
            designation: newDesignation || employee.designation,
            salary: newSalary || employee.salary,
            managerId: newManagerId || employee.managerId,
            employeeType: newEmployeeType || employee.employeeType,
            workLocation: newWorkLocation || employee.workLocation,
            terminationDate: null,
            lastWorkingDay: null,
            isNewUser: true // Reset password on first login
        }, { transaction: t });

        // Reset leave entitlements for new year if applicable
        const currentYear = new Date().getFullYear();
        const joinYear = new Date(newJoinDate).getFullYear();
        if (joinYear === currentYear) {
            // Pro-rate leave entitlements based on join month
            const joinMonth = new Date(newJoinDate).getMonth();
            const remainingMonths = 12 - joinMonth;
            const proratedEntitlements = {
                'Sick Leave': Math.round(12 * remainingMonths / 12),
                'Casual Leave': Math.round(12 * remainingMonths / 12),
                'Earned Leave': Math.round(15 * remainingMonths / 12)
            };
            await employee.update({
                leaveEntitlements: JSON.stringify(proratedEntitlements)
            }, { transaction: t });
        }

        await t.commit();

        res.json({
            message: 'Employee rehired successfully',
            employee: {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                status: 'Active',
                joinDate: newJoinDate,
                department: newDepartment || employee.department,
                designation: newDesignation || employee.designation
            },
            rehire: {
                previousEmployeeId,
                processedBy: req.user.id,
                processedOn: new Date().toISOString().split('T')[0]
            }
        });
    } catch (error) {
        await t.rollback();
        console.error('Error processing rehire:', error);
        res.status(500).json({ error: 'Failed to process employee rehire' });
    }
});

// ============================================
// EMPLOYEE HIRING HISTORY
// ============================================

// Get hiring history for an employee (HR/Admin or self)
router.get('/employees/:id/hiring-history', requireEmployeeAccess(req => req.params.id), async (req, res) => {
    try {
        const history = await EmployeeHiringHistory.findAll({
            where: { employeeId: req.params.id },
            order: [['hireDate', 'DESC']]
        });
        res.json(history);
    } catch (error) {
        console.error('Error fetching hiring history:', error);
        res.status(500).json({ error: 'Failed to fetch hiring history' });
    }
});

// Create hiring history entry (HR/Admin only - for rehires)
router.post('/employees/:id/hiring-history', requireHRMSRole(RoleGroups.FULL_ACCESS), async (req, res) => {
    try {
        const { hireDate, terminationDate, employeeType, department, employeePosition, designation, salary, managerId, reasonForTermination, isRehire, previousEmployeeId } = req.body;

        const history = await EmployeeHiringHistory.create({
            id: uuidv4(),
            employeeId: req.params.id,
            hireDate,
            terminationDate,
            employeeType,
            department,
            employeePosition,
            designation,
            salary,
            managerId,
            reasonForTermination,
            isRehire: isRehire || false,
            previousEmployeeId
        });

        res.status(201).json(history);
    } catch (error) {
        console.error('Error creating hiring history:', error);
        res.status(500).json({ error: 'Failed to create hiring history' });
    }
});

// ============================================
// LEAVE REQUESTS
// ============================================

// Get all leave requests (with role-based scoping)
router.get('/leaves', scopeByRole, async (req, res) => {
    try {
        const { employeeId, status } = req.query;
        const where = {};

        // Apply scope-based filtering
        if (req.hrmsScope.type !== 'all' && req.hrmsScope.employeeIds) {
            where.employeeId = { [Op.in]: req.hrmsScope.employeeIds };
        }

        // Additional filters from query params (if allowed by scope)
        if (employeeId) {
            // Check if requested employeeId is within user's scope
            if (req.hrmsScope.type !== 'all' && !req.hrmsScope.employeeIds.includes(employeeId)) {
                return res.status(403).json({ error: 'Access denied to this employee\'s leaves' });
            }
            where.employeeId = employeeId;
        }

        if (status) where.status = status;

        const leaves = await LeaveRequest.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'department', 'designation'] }],
            order: [['appliedOn', 'DESC']]
        });
        res.json(leaves);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
});

// Get leave request by ID
router.get('/leaves/:id', async (req, res) => {
    try {
        const leave = await LeaveRequest.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'managerId'] }]
        });
        if (!leave) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        // Check access: HR/Admin can view all, Manager can view reportee's, Employee can view own
        const userRole = req.user.role;
        const userId = req.user.id;
        const isHROrAdmin = userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR;
        const isOwnLeave = leave.employeeId === userId;
        const isManagerOfEmployee = leave.Employee?.managerId === userId;

        if (!isHROrAdmin && !isOwnLeave && !isManagerOfEmployee) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(leave);
    } catch (error) {
        console.error('Error fetching leave request:', error);
        res.status(500).json({ error: 'Failed to fetch leave request' });
    }
});

// Create leave request (employee can create for self, HR/Admin can create for anyone)
router.post('/leaves', async (req, res) => {
    try {
        const { employeeId, type, startDate, endDate, reason } = req.body;

        const userRole = req.user.role;
        const userId = req.user.id;
        const isHROrAdmin = userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR;

        // Validate required fields
        if (!type || !startDate || !endDate) {
            return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
        }

        // Determine which employee the leave is for
        const targetEmployeeId = employeeId || userId;

        // Non-HR/Admin can only create leave for themselves
        if (!isHROrAdmin && targetEmployeeId !== userId) {
            return res.status(403).json({ error: 'You can only apply leave for yourself' });
        }

        // Verify employee exists and is active
        const employee = await Employee.findByPk(targetEmployeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        if (employee.status !== 'Active') {
            return res.status(400).json({ error: 'Leave request cannot be created for inactive employees' });
        }

        // Validate leave type exists
        const leaveTypeConfig = await LeaveType.findOne({
            where: {
                name: type,
                isActive: true
            }
        });
        if (!leaveTypeConfig) {
            // Fallback: allow standard leave types even if not in database
            const standardLeaveTypes = ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Leave Without Pay',
                'Compensatory Off', 'Maternity Leave', 'Paternity Leave', 'Bereavement Leave'];
            if (!standardLeaveTypes.includes(type)) {
                return res.status(400).json({ error: `Invalid leave type: ${type}` });
            }
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        if (start > end) {
            return res.status(400).json({ error: 'Start date cannot be after end date' });
        }

        // Check if dates are in the past (HR/Admin can override this)
        if (!isHROrAdmin && start < today) {
            return res.status(400).json({ error: 'Start date cannot be in the past' });
        }

        // Check for overlapping leave requests
        const overlappingLeave = await LeaveRequest.findOne({
            where: {
                employeeId: targetEmployeeId,
                status: { [Op.in]: ['Pending', 'Approved'] },
                [Op.or]: [
                    {
                        startDate: { [Op.between]: [startDate, endDate] }
                    },
                    {
                        endDate: { [Op.between]: [startDate, endDate] }
                    },
                    {
                        [Op.and]: [
                            { startDate: { [Op.lte]: startDate } },
                            { endDate: { [Op.gte]: endDate } }
                        ]
                    }
                ]
            }
        });

        if (overlappingLeave) {
            return res.status(400).json({
                error: 'Overlapping leave request exists',
                existingLeave: {
                    id: overlappingLeave.id,
                    type: overlappingLeave.type,
                    startDate: overlappingLeave.startDate,
                    endDate: overlappingLeave.endDate,
                    status: overlappingLeave.status
                }
            });
        }

        // Calculate requested days (for balance check)
        const currentYear = start.getFullYear().toString();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;

        // Fetch holidays for the year
        const holidays = await Holiday.findAll({
            where: {
                date: { [Op.between]: [yearStart, yearEnd] },
                isActive: true,
                type: { [Op.ne]: 'Optional' }
            },
            attributes: ['date']
        });
        const holidayDates = new Set(holidays.map(h => h.date));

        // Calculate working days for the leave request
        let requestedDays = 0;
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            const dateStr = current.toISOString().split('T')[0];
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
                requestedDays++;
            }
            current.setDate(current.getDate() + 1);
        }

        // Check leave balance (warn but don't block, HR can approve negative balance)
        let balanceWarning = null;
        let leaveEntitlements = {};
        if (employee.leaveEntitlements) {
            try {
                leaveEntitlements = typeof employee.leaveEntitlements === 'string'
                    ? JSON.parse(employee.leaveEntitlements)
                    : employee.leaveEntitlements;
            } catch (e) { /* ignore */ }
        }

        // Get approved leaves for the year
        const approvedLeaves = await LeaveRequest.findAll({
            where: {
                employeeId: targetEmployeeId,
                type: type,
                status: 'Approved',
                startDate: { [Op.gte]: yearStart },
                endDate: { [Op.lte]: yearEnd }
            }
        });

        let usedDays = 0;
        approvedLeaves.forEach(leave => {
            const s = new Date(leave.startDate);
            const e = new Date(leave.endDate);
            const curr = new Date(s);
            while (curr <= e) {
                const dow = curr.getDay();
                const ds = curr.toISOString().split('T')[0];
                if (dow !== 0 && dow !== 6 && !holidayDates.has(ds)) {
                    usedDays++;
                }
                curr.setDate(curr.getDate() + 1);
            }
        });

        const maxDays = leaveTypeConfig?.maxDays || leaveEntitlements[type] || 12;
        const availableBalance = maxDays - usedDays;

        if (requestedDays > availableBalance && type !== 'Leave Without Pay') {
            balanceWarning = `Requested ${requestedDays} days but only ${Math.max(0, availableBalance)} days available. Request may be converted to Loss of Pay.`;
        }

        const leave = await LeaveRequest.create({
            id: uuidv4(),
            employeeId: targetEmployeeId,
            type,
            startDate,
            endDate,
            reason,
            status: 'Pending',
            appliedOn: new Date().toISOString().split('T')[0],
            workingDays: requestedDays
        });

        // P1-05: Notify manager about new leave request
        if (employee.managerId) {
            createNotification({
                recipientId: employee.managerId,
                type: 'leave_applied',
                title: 'New Leave Request',
                message: `${employee.name} has applied for ${type} from ${startDate} to ${endDate} (${requestedDays} days).`,
                relatedModule: 'leave',
                relatedId: leave.id
            });
        }

        const response = {
            ...leave.toJSON(),
            requestedDays,
            availableBalance: Math.max(0, availableBalance)
        };

        if (balanceWarning) {
            response.warning = balanceWarning;
        }

        res.status(201).json(response);
    } catch (error) {
        console.error('Error creating leave request:', error);
        res.status(500).json({ error: 'Failed to create leave request' });
    }
});

// Update leave request (for approval/rejection - Manager/HR/Admin only)
router.put('/leaves/:id', async (req, res) => {
    try {
        const leave = await LeaveRequest.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'managerId'] }]
        });
        if (!leave) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        const userRole = req.user.role;
        const userId = req.user.id;
        const isHROrAdmin = userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR;
        const isOwnLeave = leave.employeeId === userId;
        const isManagerOfEmployee = leave.Employee?.managerId === userId;

        // Determine what updates are allowed
        const { status, approverComments, ...otherUpdates } = req.body;

        // Status changes (approval/rejection) require Manager/HR/Admin
        if (status && status !== leave.status) {
            // Can only change from Pending status (or HR/Admin can change any)
            if (leave.status !== 'Pending' && !isHROrAdmin) {
                return res.status(400).json({ error: 'Can only approve/reject pending requests' });
            }

            if (!isHROrAdmin && !isManagerOfEmployee) {
                return res.status(403).json({ error: 'Only managers or HR can approve/reject leave requests' });
            }
            // Managers cannot approve their own leave
            if (isOwnLeave && !isHROrAdmin) {
                return res.status(403).json({ error: 'You cannot approve your own leave request' });
            }

            // Validate status transition
            const validStatuses = ['Approved', 'Rejected', 'Cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            }

            // Employee can only cancel their own pending leave
            if (status === 'Cancelled') {
                if (!isOwnLeave && !isHROrAdmin) {
                    return res.status(403).json({ error: 'Only the employee or HR can cancel a leave request' });
                }
            }
        }

        // Other updates (dates, reason) allowed by owner if still Pending, or by HR/Admin
        if (Object.keys(otherUpdates).length > 0) {
            if (!isHROrAdmin && !isOwnLeave) {
                return res.status(403).json({ error: 'You can only update your own leave requests' });
            }
            if (isOwnLeave && leave.status !== 'Pending') {
                return res.status(400).json({ error: 'Cannot modify a leave request that has been processed' });
            }
        }

        // Build update data
        const updateData = { ...req.body };

        // Track approval details if status is changing to Approved/Rejected
        if (status && ['Approved', 'Rejected'].includes(status) && status !== leave.status) {
            updateData.approvedBy = userId;
            updateData.approvedOn = new Date().toISOString().split('T')[0];
            if (approverComments) {
                updateData.approverComments = approverComments;
            }
        }

        // Track cancellation
        if (status === 'Cancelled' && status !== leave.status) {
            updateData.approvedBy = userId;
            updateData.approvedOn = new Date().toISOString().split('T')[0];
            if (approverComments) {
                updateData.approverComments = approverComments;
            }
        }

        await leave.update(updateData);

        // P1-05: Notify employee about leave approval/rejection
        if (status && ['Approved', 'Rejected'].includes(status) && status !== leave.status) {
            createNotification({
                recipientId: leave.employeeId,
                type: status === 'Approved' ? 'leave_approved' : 'leave_rejected',
                title: `Leave ${status}`,
                message: `Your ${leave.type} request (${leave.startDate} to ${leave.endDate}) has been ${status.toLowerCase()}.${approverComments ? ' Comment: ' + approverComments : ''}`,
                relatedModule: 'leave',
                relatedId: leave.id
            });
        }

        // Fetch updated leave with relationships
        const updatedLeave = await LeaveRequest.findByPk(req.params.id, {
            include: [
                { model: Employee, attributes: ['id', 'name', 'email', 'managerId'] }
            ]
        });

        res.json(updatedLeave);
    } catch (error) {
        console.error('Error updating leave request:', error);
        res.status(500).json({ error: 'Failed to update leave request' });
    }
});

// Get leave balance for an employee
router.get('/leaves/balance/:employeeId', requireEmployeeAccess(req => req.params.employeeId), async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { year } = req.query;
        const currentYear = year || new Date().getFullYear().toString();

        // Get employee
        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Parse leave entitlements from employee record
        let leaveEntitlements = {};
        if (employee.leaveEntitlements) {
            try {
                leaveEntitlements = typeof employee.leaveEntitlements === 'string' 
                    ? JSON.parse(employee.leaveEntitlements) 
                    : employee.leaveEntitlements;
            } catch (e) {
                console.error('Error parsing leave entitlements:', e);
            }
        }

        // Get all approved leave requests for the year
        const startOfYear = `${currentYear}-01-01`;
        const endOfYear = `${currentYear}-12-31`;
        
        const approvedLeaves = await LeaveRequest.findAll({
            where: {
                employeeId,
                status: 'Approved',
                startDate: { [Op.gte]: startOfYear },
                endDate: { [Op.lte]: endOfYear }
            }
        });

        // Fetch holidays for the year to exclude from working days calculation
        const holidays = await Holiday.findAll({
            where: {
                date: {
                    [Op.gte]: startOfYear,
                    [Op.lte]: endOfYear
                },
                isActive: true,
                // Exclude optional holidays as they count as working days
                type: { [Op.ne]: 'Optional' }
            },
            attributes: ['date']
        });

        // Create a Set of holiday dates for O(1) lookup
        const holidayDates = new Set(holidays.map(h => h.date));

        // Calculate balance for each leave type
        const leaveBalances = {};

        // Helper function to calculate days between dates (excluding weekends and holidays)
        const calculateWorkingDays = (startDate, endDate) => {
            const start = new Date(startDate);
            const end = new Date(endDate);
            let days = 0;
            const current = new Date(start);

            while (current <= end) {
                const dayOfWeek = current.getDay();
                const dateStr = current.toISOString().split('T')[0]; // YYYY-MM-DD format

                // Exclude Sunday (0), Saturday (6), and holidays
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
                    days++;
                }
                current.setDate(current.getDate() + 1);
            }
            return days;
        };

        // Group leaves by type and calculate used days
        const usedLeaves = {};
        approvedLeaves.forEach(leave => {
            const leaveType = leave.type;
            if (!usedLeaves[leaveType]) {
                usedLeaves[leaveType] = 0;
            }
            const days = calculateWorkingDays(leave.startDate, leave.endDate);
            usedLeaves[leaveType] += days;
        });

        // Get leave types from configuration
        const leaveTypesConfig = await LeaveType.findAll({
            where: { isActive: true }
        });

        // Build leave types map from database
        const leaveTypesMap = {};
        leaveTypesConfig.forEach(lt => {
            leaveTypesMap[lt.name] = {
                maxDays: lt.maxDays || 0,
                isPaid: lt.isPaid !== false,
                code: lt.code
            };
        });

        // Fallback defaults if no leave types in database
        const defaultLeaveTypes = {
            'Sick Leave': { maxDays: 12, isPaid: true },
            'Casual Leave': { maxDays: 12, isPaid: true },
            'Earned Leave': { maxDays: 15, isPaid: true },
            'Compensatory Off': { maxDays: 5, isPaid: true },
            'Leave Without Pay': { maxDays: 30, isPaid: false },
            'Maternity Leave': { maxDays: 180, isPaid: true },
            'Paternity Leave': { maxDays: 7, isPaid: true },
            'Bereavement Leave': { maxDays: 5, isPaid: true },
            'Marriage Leave': { maxDays: 3, isPaid: true },
            'Sabbatical': { maxDays: 90, isPaid: false }
        };

        // Use database config if available, otherwise use defaults
        const leaveTypes = Object.keys(leaveTypesMap).length > 0 ? leaveTypesMap : defaultLeaveTypes;

        // Calculate balance for each leave type
        Object.keys(leaveTypes).forEach(leaveType => {
            const config = leaveTypes[leaveType];
            const entitlement = leaveEntitlements[leaveType] || config.maxDays;
            const used = usedLeaves[leaveType] || 0;
            const balance = Math.max(0, entitlement - used);

            leaveBalances[leaveType] = {
                entitlement,
                used,
                balance,
                maxDays: config.maxDays,
                isPaid: config.isPaid,
                code: config.code
            };
        });

        // Also include any custom leave types from entitlements
        Object.keys(leaveEntitlements).forEach(leaveType => {
            if (!leaveBalances[leaveType]) {
                const used = usedLeaves[leaveType] || 0;
                const entitlement = leaveEntitlements[leaveType];
                leaveBalances[leaveType] = {
                    entitlement,
                    used,
                    balance: Math.max(0, entitlement - used),
                    maxDays: entitlement,
                    isPaid: true
                };
            }
        });

        res.json({
            employeeId,
            year: currentYear,
            balances: leaveBalances,
            summary: {
                totalEntitlement: Object.values(leaveBalances).reduce((sum, b) => sum + b.entitlement, 0),
                totalUsed: Object.values(leaveBalances).reduce((sum, b) => sum + b.used, 0),
                totalBalance: Object.values(leaveBalances).reduce((sum, b) => sum + b.balance, 0)
            },
            holidaysConsidered: holidayDates.size,
            note: 'Working days calculation excludes weekends and non-optional holidays'
        });
    } catch (error) {
        console.error('Error fetching leave balance:', error);
        res.status(500).json({ error: 'Failed to fetch leave balance' });
    }
});

// Calculate leave accrual for an employee (HR/Admin only)
// Used to update employee's leave entitlements with accrued and carry-forward leaves
router.post('/leaves/accrual/:employeeId', requireHRMSRole(RoleGroups.FULL_ACCESS), async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { year, applyUpdate } = req.body;
        const targetYear = year || new Date().getFullYear().toString();
        const previousYear = (parseInt(targetYear) - 1).toString();

        // Get employee
        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Parse current leave entitlements
        let currentEntitlements = {};
        if (employee.leaveEntitlements) {
            try {
                currentEntitlements = typeof employee.leaveEntitlements === 'string'
                    ? JSON.parse(employee.leaveEntitlements)
                    : employee.leaveEntitlements;
            } catch (e) { /* ignore */ }
        }

        // Get leave types from configuration
        const leaveTypesConfig = await LeaveType.findAll({
            where: { isActive: true }
        });

        // Build leave types map with accrual settings
        const leaveTypesMap = {};
        leaveTypesConfig.forEach(lt => {
            leaveTypesMap[lt.name] = {
                maxDays: lt.maxDays || 0,
                isPaid: lt.isPaid !== false,
                canCarryForward: lt.name === 'Earned Leave', // Only EL carries forward by default
                maxCarryForward: lt.name === 'Earned Leave' ? 30 : 0, // Max 30 days carry forward
                monthlyAccrual: lt.name === 'Earned Leave' ? 1.25 : 0 // 1.25 days/month for EL
            };
        });

        // Fallback defaults
        const defaultLeaveTypes = {
            'Sick Leave': { maxDays: 12, canCarryForward: false, maxCarryForward: 0, monthlyAccrual: 1 },
            'Casual Leave': { maxDays: 12, canCarryForward: false, maxCarryForward: 0, monthlyAccrual: 1 },
            'Earned Leave': { maxDays: 15, canCarryForward: true, maxCarryForward: 30, monthlyAccrual: 1.25 }
        };

        const leaveTypes = Object.keys(leaveTypesMap).length > 0 ? leaveTypesMap : defaultLeaveTypes;

        // Calculate months employed in target year
        const joinDate = new Date(employee.joinDate);
        const yearStart = new Date(`${targetYear}-01-01`);
        const yearEnd = new Date(`${targetYear}-12-31`);

        let monthsEmployed = 12;
        if (joinDate > yearStart) {
            // Employee joined during the year
            const joinMonth = joinDate.getMonth();
            const joinYear = joinDate.getFullYear();
            if (joinYear.toString() === targetYear) {
                monthsEmployed = 12 - joinMonth;
            }
        }

        // Calculate carry-forward from previous year
        const prevYearStart = `${previousYear}-01-01`;
        const prevYearEnd = `${previousYear}-12-31`;

        // Get previous year's approved leaves
        const prevYearLeaves = await LeaveRequest.findAll({
            where: {
                employeeId,
                status: 'Approved',
                startDate: { [Op.gte]: prevYearStart },
                endDate: { [Op.lte]: prevYearEnd }
            }
        });

        // Calculate used leaves by type for previous year
        const prevYearUsed = {};
        prevYearLeaves.forEach(leave => {
            if (!prevYearUsed[leave.type]) {
                prevYearUsed[leave.type] = 0;
            }
            prevYearUsed[leave.type] += leave.workingDays || 0;
        });

        // Build accrual result
        const accrualResult = {};
        const newEntitlements = { ...currentEntitlements };

        for (const [leaveType, config] of Object.entries(leaveTypes)) {
            const prevEntitlement = currentEntitlements[leaveType] || config.maxDays;
            const prevUsed = prevYearUsed[leaveType] || 0;
            const prevBalance = Math.max(0, prevEntitlement - prevUsed);

            // Calculate carry forward
            let carryForward = 0;
            if (config.canCarryForward) {
                carryForward = Math.min(prevBalance, config.maxCarryForward);
            }

            // Calculate accrual for target year
            const annualAccrual = Math.round(config.monthlyAccrual * monthsEmployed * 10) / 10;

            // New entitlement = base entitlement + carry forward
            const baseEntitlement = config.maxDays;
            const totalEntitlement = baseEntitlement + carryForward;

            accrualResult[leaveType] = {
                baseEntitlement,
                monthsEmployed,
                monthlyAccrual: config.monthlyAccrual,
                annualAccrual,
                previousYearBalance: prevBalance,
                carryForward,
                maxCarryForward: config.maxCarryForward,
                totalEntitlement
            };

            newEntitlements[leaveType] = totalEntitlement;
        }

        // Apply update if requested
        if (applyUpdate) {
            await employee.update({
                leaveEntitlements: JSON.stringify(newEntitlements)
            });
        }

        res.json({
            employeeId,
            targetYear,
            previousYear,
            monthsEmployed,
            accrual: accrualResult,
            newEntitlements,
            applied: !!applyUpdate,
            note: applyUpdate
                ? 'Leave entitlements updated successfully'
                : 'Preview only. Set applyUpdate: true to update employee leave entitlements'
        });
    } catch (error) {
        console.error('Error calculating leave accrual:', error);
        res.status(500).json({ error: 'Failed to calculate leave accrual' });
    }
});

// ============================================
// ATTENDANCE RECORDS
// ============================================

// Get all attendance records (with role-based scoping)
router.get('/attendance', scopeByRole, async (req, res) => {
    try {
        const { employeeId, date, startDate, endDate } = req.query;
        const where = {};

        // Apply scope-based filtering
        if (req.hrmsScope.type !== 'all' && req.hrmsScope.employeeIds) {
            where.employeeId = { [Op.in]: req.hrmsScope.employeeIds };
        }

        // Additional filters from query params (if allowed by scope)
        if (employeeId) {
            if (req.hrmsScope.type !== 'all' && !req.hrmsScope.employeeIds.includes(employeeId)) {
                return res.status(403).json({ error: 'Access denied to this employee\'s attendance' });
            }
            where.employeeId = employeeId;
        }

        if (date) where.date = date;
        if (startDate && endDate) {
            where.date = { [Op.between]: [startDate, endDate] };
        }

        const attendance = await AttendanceRecord.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'department'] }],
            order: [['date', 'DESC']]
        });
        res.json(attendance);
    } catch (error) {
        console.error('Error fetching attendance records:', error);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
});

// Get attendance record by ID
router.get('/attendance/:id', async (req, res) => {
    try {
        const attendance = await AttendanceRecord.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'managerId'] }]
        });
        if (!attendance) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }

        // Check access
        const userRole = req.user.role;
        const userId = req.user.id;
        const isHROrAdmin = userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR;
        const isOwnRecord = attendance.employeeId === userId;
        const isManagerOfEmployee = attendance.Employee?.managerId === userId;

        if (!isHROrAdmin && !isOwnRecord && !isManagerOfEmployee) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(attendance);
    } catch (error) {
        console.error('Error fetching attendance record:', error);
        res.status(500).json({ error: 'Failed to fetch attendance record' });
    }
});

// Check-in/Check-out endpoint (employees can only check in for themselves)
router.post('/attendance/checkin', async (req, res) => {
    try {
        const { employeeId } = req.body;

        // Employees can only check in for themselves, HR/Admin can check in for anyone
        const userRole = req.user.role;
        const userId = req.user.id;
        const isHROrAdmin = userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR;
        const targetEmployeeId = employeeId || userId;

        if (!isHROrAdmin && targetEmployeeId !== userId) {
            return res.status(403).json({ error: 'You can only check in for yourself' });
        }

        // Get default shift timing or use fallback
        const defaultShift = await ShiftTiming.findOne({
            where: { isDefault: true, isActive: true }
        });

        // Fallback shift configuration if no shift defined
        const shiftConfig = defaultShift || {
            startTime: '09:00',
            endTime: '18:00',
            graceMinutes: 15,
            halfDayHours: 4,
            fullDayHours: 8
        };

        // Parse shift start time
        const [shiftStartHours, shiftStartMinutes] = shiftConfig.startTime.split(':').map(Number);
        const shiftStartTotalMinutes = shiftStartHours * 60 + shiftStartMinutes;
        const lateThresholdMinutes = shiftStartTotalMinutes + (shiftConfig.graceMinutes || 15);

        // Use IST timezone for Indian operations
        // Use Intl API for correct IST conversion regardless of server timezone
        const now = new Date();
        const istFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        const istTimeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
        const today = istFormatter.format(now); // YYYY-MM-DD
        const currentTime = istTimeFormatter.format(now); // HH:mm

        // Check if there's already an attendance record for today
        let attendance = await AttendanceRecord.findOne({
            where: {
                employeeId: targetEmployeeId,
                date: today
            }
        });

        if (!attendance) {
            // Check-in: Create new attendance record
            const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
            const currentTotalMinutes = currentHours * 60 + currentMinutes;

            // Determine initial status based on check-in time
            let initialStatus = 'Present';
            if (currentTotalMinutes > lateThresholdMinutes) {
                initialStatus = 'Late';
            }

            attendance = await AttendanceRecord.create({
                id: uuidv4(),
                employeeId: targetEmployeeId,
                date: today,
                checkIn: currentTime,
                status: initialStatus,
                durationHours: null
            });

            // P1-05: Notify employee and manager about late check-in
            if (initialStatus === 'Late') {
                createNotification({
                    recipientId: targetEmployeeId,
                    type: 'attendance_anomaly',
                    title: 'Late Check-in Recorded',
                    message: `You checked in at ${currentTime} (shift starts at ${shiftConfig.startTime}, grace: ${shiftConfig.graceMinutes || 15} min).`,
                    relatedModule: 'attendance',
                    relatedId: attendance.id
                });
                // Also notify manager
                const emp = await Employee.findByPk(targetEmployeeId, { attributes: ['managerId', 'name'] });
                if (emp?.managerId) {
                    createNotification({
                        recipientId: emp.managerId,
                        type: 'attendance_anomaly',
                        title: 'Team Member Late',
                        message: `${emp.name} checked in late at ${currentTime} on ${today}.`,
                        relatedModule: 'attendance',
                        relatedId: attendance.id
                    });
                }
            }

            res.status(201).json({
                attendance,
                action: 'checked-in',
                message: initialStatus === 'Late' ? 'Checked in (Late)' : 'Checked in successfully',
                shiftStart: shiftConfig.startTime,
                graceMinutes: shiftConfig.graceMinutes || 15
            });
        } else if (attendance.checkIn && !attendance.checkOut) {
            // Check-out: Update existing record
            const checkOutTime = currentTime;

            // Calculate duration
            const [checkInHours, checkInMinutes] = attendance.checkIn.split(':').map(Number);
            const [checkOutHours, checkOutMinutes] = checkOutTime.split(':').map(Number);
            const checkInTotalMinutes = checkInHours * 60 + checkInMinutes;
            const checkOutTotalMinutes = checkOutHours * 60 + checkOutMinutes;
            const durationMinutes = checkOutTotalMinutes - checkInTotalMinutes;
            const durationHours = durationMinutes / 60;

            // Determine status based on shift configuration
            let status = 'Present';
            const halfDayThreshold = shiftConfig.halfDayHours || 4;
            const fullDayThreshold = shiftConfig.fullDayHours || 8;

            // Check if was late
            if (checkInTotalMinutes > lateThresholdMinutes) {
                status = 'Late';
            }

            // Check for half day based on duration
            if (durationHours < halfDayThreshold) {
                status = 'Half Day';
            } else if (durationHours >= halfDayThreshold && durationHours < fullDayThreshold && status !== 'Late') {
                // Between half and full day but not late
                status = 'Present';
            }

            await attendance.update({
                checkOut: checkOutTime,
                durationHours: Math.round(durationHours * 10) / 10, // Round to 1 decimal
                status
            });

            res.json({
                attendance,
                action: 'checked-out',
                message: 'Checked out successfully',
                durationHours: Math.round(durationHours * 10) / 10,
                shiftConfig: {
                    halfDayHours: halfDayThreshold,
                    fullDayHours: fullDayThreshold
                }
            });
        } else {
            // Already checked in and out
            res.status(400).json({
                error: 'Already checked in and out for today',
                attendance
            });
        }
    } catch (error) {
        console.error('Error during check-in/check-out:', error);
        res.status(500).json({ error: 'Failed to process check-in/check-out' });
    }
});

// Get today's attendance status for an employee
router.get('/attendance/today/:employeeId', requireEmployeeAccess(req => req.params.employeeId), async (req, res) => {
    try {
        // Use IST timezone via Intl API for correctness regardless of server timezone
        const now = new Date();
        const istFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
        const today = istFormatter.format(now);

        const attendance = await AttendanceRecord.findOne({
            where: {
                employeeId: req.params.employeeId,
                date: today
            },
            include: [{ model: Employee, attributes: ['id', 'name', 'email'] }]
        });

        if (!attendance) {
            return res.json({
                checkedIn: false,
                checkedOut: false,
                attendance: null
            });
        }

        res.json({
            checkedIn: !!attendance.checkIn,
            checkedOut: !!attendance.checkOut,
            attendance
        });
    } catch (error) {
        console.error('Error fetching today\'s attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance status' });
    }
});

// Get monthly attendance summary for an employee
router.get('/attendance/summary/:employeeId', requireEmployeeAccess(req => req.params.employeeId), async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month } = req.query; // YYYY-MM format

        // Default to current month
        const now = new Date();
        const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const [year, monthNum] = targetMonth.split('-').map(Number);

        // Calculate date range for the month
        const startDate = `${targetMonth}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDate = `${targetMonth}-${String(lastDay).padStart(2, '0')}`;

        // Get employee
        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Get attendance records for the month
        const attendanceRecords = await AttendanceRecord.findAll({
            where: {
                employeeId,
                date: { [Op.between]: [startDate, endDate] }
            },
            order: [['date', 'ASC']]
        });

        // Get holidays for the month
        const holidays = await Holiday.findAll({
            where: {
                date: { [Op.between]: [startDate, endDate] },
                isActive: true,
                type: { [Op.ne]: 'Optional' }
            }
        });
        const holidayDates = new Set(holidays.map(h => h.date));

        // Get approved leaves for the month
        const approvedLeaves = await LeaveRequest.findAll({
            where: {
                employeeId,
                status: 'Approved',
                [Op.or]: [
                    { startDate: { [Op.between]: [startDate, endDate] } },
                    { endDate: { [Op.between]: [startDate, endDate] } }
                ]
            }
        });

        // Build leave dates set
        const leaveDates = new Set();
        approvedLeaves.forEach(leave => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const current = new Date(start);
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                if (dateStr >= startDate && dateStr <= endDate) {
                    leaveDates.add(dateStr);
                }
                current.setDate(current.getDate() + 1);
            }
        });

        // Build attendance map
        const attendanceMap = new Map();
        attendanceRecords.forEach(record => {
            attendanceMap.set(record.date, record);
        });

        // Calculate summary
        let workingDays = 0;
        let presentDays = 0;
        let lateDays = 0;
        let halfDays = 0;
        let absentDays = 0;
        let leaveDaysCount = 0;
        let holidayCount = 0;
        let weekendCount = 0;
        let totalHours = 0;
        let wfhDays = 0;

        const dailyRecords = [];

        // Iterate through each day of the month
        const current = new Date(startDate);
        const endDateObj = new Date(endDate);
        while (current <= endDateObj) {
            const dateStr = current.toISOString().split('T')[0];
            const dayOfWeek = current.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidayDates.has(dateStr);
            const isOnLeave = leaveDates.has(dateStr);
            const attendance = attendanceMap.get(dateStr);

            let dayStatus = 'Not Marked';

            if (isWeekend) {
                dayStatus = 'Weekend';
                weekendCount++;
            } else if (isHoliday) {
                dayStatus = 'Holiday';
                holidayCount++;
            } else if (isOnLeave) {
                dayStatus = 'On Leave';
                leaveDaysCount++;
            } else {
                workingDays++;

                if (attendance) {
                    switch (attendance.status) {
                        case 'Present':
                            presentDays++;
                            dayStatus = 'Present';
                            break;
                        case 'Late':
                            presentDays++;
                            lateDays++;
                            dayStatus = 'Late';
                            break;
                        case 'Half Day':
                            halfDays++;
                            dayStatus = 'Half Day';
                            break;
                        case 'WFH':
                            presentDays++;
                            wfhDays++;
                            dayStatus = 'WFH';
                            break;
                        case 'Absent':
                            absentDays++;
                            dayStatus = 'Absent';
                            break;
                        default:
                            presentDays++;
                            dayStatus = attendance.status;
                    }

                    if (attendance.durationHours) {
                        totalHours += attendance.durationHours;
                    }
                } else {
                    // No attendance record - only mark as absent for past dates
                    if (current < now) {
                        absentDays++;
                        dayStatus = 'Absent';
                    } else {
                        dayStatus = 'Upcoming';
                    }
                }
            }

            dailyRecords.push({
                date: dateStr,
                dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
                status: dayStatus,
                checkIn: attendance?.checkIn || null,
                checkOut: attendance?.checkOut || null,
                durationHours: attendance?.durationHours || null
            });

            current.setDate(current.getDate() + 1);
        }

        // Calculate attendance percentage
        const effectiveWorkingDays = workingDays - leaveDaysCount;
        const attendancePercentage = effectiveWorkingDays > 0
            ? Math.round((presentDays + halfDays * 0.5) / effectiveWorkingDays * 100 * 10) / 10
            : 0;

        res.json({
            employeeId,
            employeeName: employee.name,
            month: targetMonth,
            summary: {
                totalDays: lastDay,
                workingDays,
                weekends: weekendCount,
                holidays: holidayCount,
                leaveDays: leaveDaysCount,
                presentDays,
                lateDays,
                halfDays,
                absentDays,
                wfhDays,
                totalHours: Math.round(totalHours * 10) / 10,
                averageHours: presentDays > 0 ? Math.round(totalHours / presentDays * 10) / 10 : 0,
                attendancePercentage
            },
            dailyRecords,
            leaves: approvedLeaves.map(l => ({
                type: l.type,
                startDate: l.startDate,
                endDate: l.endDate
            })),
            holidayList: holidays.map(h => ({
                name: h.name,
                date: h.date,
                type: h.type
            }))
        });
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
});

// Create attendance record (HR/Admin only - for manual entry)
router.post('/attendance', requireHRMSRole(RoleGroups.FULL_ACCESS), async (req, res) => {
    try {
        const { employeeId, date, checkIn, checkOut, status, durationHours } = req.body;

        const attendance = await AttendanceRecord.create({
            id: uuidv4(),
            employeeId,
            date,
            checkIn,
            checkOut,
            status: status || 'Present',
            durationHours
        });

        res.status(201).json(attendance);
    } catch (error) {
        console.error('Error creating attendance record:', error);
        res.status(500).json({ error: 'Failed to create attendance record' });
    }
});

// Update attendance record (HR/Admin only)
router.put('/attendance/:id', requireHRMSRole(RoleGroups.FULL_ACCESS), async (req, res) => {
    try {
        const attendance = await AttendanceRecord.findByPk(req.params.id);
        if (!attendance) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }

        // Whitelist allowed fields to prevent injection
        const allowedFields = ['checkIn', 'checkOut', 'status', 'durationHours', 'date'];
        const sanitizedData = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                sanitizedData[field] = req.body[field];
            }
        });

        await attendance.update(sanitizedData);
        res.json(attendance);
    } catch (error) {
        console.error('Error updating attendance record:', error);
        res.status(500).json({ error: 'Failed to update attendance record' });
    }
});

// ============================================
// REGULARIZATION REQUESTS
// ============================================

// Get all regularization requests (with role-based scoping)
router.get('/regularizations', scopeByRole, async (req, res) => {
    try {
        const { employeeId, status } = req.query;
        const where = {};

        // Apply scope-based filtering
        if (req.hrmsScope.type !== 'all' && req.hrmsScope.employeeIds) {
            where.employeeId = { [Op.in]: req.hrmsScope.employeeIds };
        }

        if (employeeId) {
            if (req.hrmsScope.type !== 'all' && !req.hrmsScope.employeeIds.includes(employeeId)) {
                return res.status(403).json({ error: 'Access denied' });
            }
            where.employeeId = employeeId;
        }
        if (status) where.status = status;

        const regularizations = await RegularizationRequest.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'department', 'managerId'] }],
            order: [['appliedOn', 'DESC']]
        });
        res.json(regularizations);
    } catch (error) {
        console.error('Error fetching regularization requests:', error);
        res.status(500).json({ error: 'Failed to fetch regularization requests' });
    }
});

// Get regularization request by ID
router.get('/regularizations/:id', async (req, res) => {
    try {
        const regularization = await RegularizationRequest.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'managerId'] }]
        });
        if (!regularization) {
            return res.status(404).json({ error: 'Regularization request not found' });
        }

        // Check access
        const userRole = req.user.role;
        const userId = req.user.id;
        const isHROrAdmin = userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR;
        const isOwnRequest = regularization.employeeId === userId;
        const isManagerOfEmployee = regularization.Employee?.managerId === userId;

        if (!isHROrAdmin && !isOwnRequest && !isManagerOfEmployee) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(regularization);
    } catch (error) {
        console.error('Error fetching regularization request:', error);
        res.status(500).json({ error: 'Failed to fetch regularization request' });
    }
});

// Create regularization request
router.post('/regularizations', async (req, res) => {
    try {
        const { employeeId, employeeName, date, type, reason, newCheckIn, newCheckOut } = req.body;

        const userRole = req.user.role;
        const userId = req.user.id;
        const isHROrAdmin = userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR;
        const targetEmployeeId = employeeId || userId;

        // Non-HR/Admin can only create for themselves
        if (!isHROrAdmin && targetEmployeeId !== userId) {
            return res.status(403).json({ error: 'You can only create regularization requests for yourself' });
        }

        // Validate date is not in the future
        if (date) {
            const regDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (regDate > today) {
                return res.status(400).json({ error: 'Regularization date cannot be in the future' });
            }
        }

        // Validate check-in is before check-out
        if (newCheckIn && newCheckOut) {
            const [inH, inM] = newCheckIn.split(':').map(Number);
            const [outH, outM] = newCheckOut.split(':').map(Number);
            if (inH * 60 + inM >= outH * 60 + outM) {
                return res.status(400).json({ error: 'Check-in time must be before check-out time' });
            }
        }

        // Get employee name if not provided
        let finalEmployeeName = employeeName;
        if (!finalEmployeeName) {
            const employee = await Employee.findByPk(targetEmployeeId);
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }
            finalEmployeeName = employee.name;
        }

        const regularization = await RegularizationRequest.create({
            id: uuidv4(),
            employeeId: targetEmployeeId,
            employeeName: finalEmployeeName,
            date,
            type,
            reason,
            newCheckIn,
            newCheckOut,
            status: 'Pending',
            appliedOn: new Date().toISOString().split('T')[0]
        });

        res.status(201).json(regularization);
    } catch (error) {
        console.error('Error creating regularization request:', error);
        res.status(500).json({ error: 'Failed to create regularization request' });
    }
});

// Update regularization request (for approval/rejection - Manager/HR/Admin only)
router.put('/regularizations/:id', async (req, res) => {
    try {
        const regularization = await RegularizationRequest.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'managerId'] }]
        });
        if (!regularization) {
            return res.status(404).json({ error: 'Regularization request not found' });
        }

        const userRole = req.user.role;
        const userId = req.user.id;
        const isHROrAdmin = userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR;
        const isOwnRequest = regularization.employeeId === userId;
        const isManagerOfEmployee = regularization.Employee?.managerId === userId;

        const { status, approverComments, ...otherUpdates } = req.body;

        // Status changes require Manager/HR/Admin
        if (status && status !== regularization.status) {
            // Can only change from Pending status (or HR/Admin can override)
            if (regularization.status !== 'Pending' && !isHROrAdmin) {
                return res.status(400).json({ error: 'Can only approve/reject pending requests' });
            }

            if (!isHROrAdmin && !isManagerOfEmployee) {
                return res.status(403).json({ error: 'Only managers or HR can approve/reject regularization requests' });
            }
            if (isOwnRequest && !isHROrAdmin) {
                return res.status(403).json({ error: 'You cannot approve your own regularization request' });
            }

            // Validate status
            const validStatuses = ['Approved', 'Rejected'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            }
        }

        // Build update data
        const updateData = { ...req.body };

        // Track approval details if status is changing
        if (status && ['Approved', 'Rejected'].includes(status) && status !== regularization.status) {
            updateData.approvedBy = userId;
            updateData.approvedOn = new Date().toISOString().split('T')[0];
            if (approverComments) {
                updateData.approverComments = approverComments;
            }

            // If approved, update the attendance record
            if (status === 'Approved' && (regularization.newCheckIn || regularization.newCheckOut)) {
                const attendanceRecord = await AttendanceRecord.findOne({
                    where: {
                        employeeId: regularization.employeeId,
                        date: regularization.date
                    }
                });

                if (attendanceRecord) {
                    const attendanceUpdate = {};
                    if (regularization.newCheckIn) {
                        attendanceUpdate.checkIn = regularization.newCheckIn;
                    }
                    if (regularization.newCheckOut) {
                        attendanceUpdate.checkOut = regularization.newCheckOut;
                    }

                    // Recalculate duration if both times are now available
                    const checkIn = regularization.newCheckIn || attendanceRecord.checkIn;
                    const checkOut = regularization.newCheckOut || attendanceRecord.checkOut;

                    if (checkIn && checkOut) {
                        const [inH, inM] = checkIn.split(':').map(Number);
                        const [outH, outM] = checkOut.split(':').map(Number);
                        const durationMinutes = (outH * 60 + outM) - (inH * 60 + inM);
                        attendanceUpdate.durationHours = Math.round(durationMinutes / 60 * 10) / 10;

                        // Update status based on duration
                        if (durationMinutes / 60 < 4) {
                            attendanceUpdate.status = 'Half Day';
                        } else {
                            attendanceUpdate.status = 'Present';
                        }
                    }

                    await attendanceRecord.update(attendanceUpdate);
                } else {
                    // Create attendance record if it doesn't exist
                    await AttendanceRecord.create({
                        id: uuidv4(),
                        employeeId: regularization.employeeId,
                        date: regularization.date,
                        checkIn: regularization.newCheckIn,
                        checkOut: regularization.newCheckOut,
                        status: regularization.type === 'Work From Home' ? 'WFH' : 'Present',
                        durationHours: null
                    });
                }
            }
        }

        await regularization.update(updateData);

        // Fetch updated record
        const updatedRegularization = await RegularizationRequest.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'managerId'] }]
        });

        res.json(updatedRegularization);
    } catch (error) {
        console.error('Error updating regularization request:', error);
        res.status(500).json({ error: 'Failed to update regularization request' });
    }
});

// ============================================
// PAYSLIPS
// ============================================

// Get all payslips (with role-based scoping - Finance/HR/Admin see all, others see own)
router.get('/payslips', scopeByRole, async (req, res) => {
    try {
        const { employeeId, month } = req.query;
        const where = {};

        // Apply scope-based filtering
        if (req.hrmsScope.type !== 'all' && req.hrmsScope.employeeIds) {
            where.employeeId = { [Op.in]: req.hrmsScope.employeeIds };
        }

        if (employeeId) {
            if (req.hrmsScope.type !== 'all' && !req.hrmsScope.employeeIds.includes(employeeId)) {
                return res.status(403).json({ error: 'Access denied to this employee\'s payslips' });
            }
            where.employeeId = employeeId;
        }

        if (month) where.month = month;

        // Non-payroll roles (employees) should only see Finalized/Paid payslips, not Drafts
        const userRole = req.user.role;
        const isPayrollRole = [HRMSRoles.ADMIN, HRMSRoles.HR, HRMSRoles.FINANCE].includes(userRole);
        if (!isPayrollRole) {
            where.status = { [Op.in]: ['Finalized', 'Paid'] };
        }

        const payslips = await Payslip.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'department'] }],
            order: [['month', 'DESC']]
        });
        res.json(payslips);
    } catch (error) {
        console.error('Error fetching payslips:', error);
        res.status(500).json({ error: 'Failed to fetch payslips' });
    }
});

// Get payslip by ID with detailed breakdown
router.get('/payslips/:id', async (req, res) => {
    try {
        const payslip = await Payslip.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'department', 'designation', 'salary', 'salaryBreakdown', 'managerId'] }]
        });
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }

        // Check access - payslips contain sensitive salary info
        const userRole = req.user.role;
        const userId = req.user.id;
        const isPayrollAccess = [HRMSRoles.ADMIN, HRMSRoles.HR, HRMSRoles.FINANCE].includes(userRole);
        const isOwnPayslip = payslip.employeeId === userId;

        if (!isPayrollAccess && !isOwnPayslip) {
            return res.status(403).json({ error: 'Access denied. You can only view your own payslips.' });
        }

        // Calculate breakdown for display
        const employee = payslip.Employee;
        let salaryBreakdown = {};
        if (employee.salaryBreakdown) {
            try {
                salaryBreakdown = typeof employee.salaryBreakdown === 'string'
                    ? JSON.parse(employee.salaryBreakdown)
                    : employee.salaryBreakdown;
            } catch (e) {
                console.error('Error parsing salary breakdown:', e);
            }
        }

        const grossSalary = payslip.basic + payslip.hra + payslip.allowances;
        const pfEmployee = Math.min(Math.round(payslip.basic * 0.12), 1800);
        const esiEmployee = grossSalary < 21000 ? Math.round(grossSalary * 0.0075) : 0;
        const tds = payslip.deductions - pfEmployee - esiEmployee - (salaryBreakdown.professionalTax || 200) - (salaryBreakdown.otherDeductions || 0);

        res.json({
            ...payslip.toJSON(),
            breakdown: {
                earnings: {
                    basic: payslip.basic,
                    hra: payslip.hra,
                    allowances: payslip.allowances,
                    grossSalary
                },
                deductions: {
                    pfEmployee,
                    esiEmployee,
                    tds,
                    professionalTax: salaryBreakdown.professionalTax || 200,
                    otherDeductions: salaryBreakdown.otherDeductions || 0,
                    totalDeductions: payslip.deductions
                },
                netPay: payslip.netPay
            }
        });
    } catch (error) {
        console.error('Error fetching payslip:', error);
        res.status(500).json({ error: 'Failed to fetch payslip' });
    }
});

// Generate payslip with automatic calculations (Payroll Access only)
// Uses transaction with locking to prevent race conditions
router.post('/payslips/generate', requireHRMSRole(RoleGroups.PAYROLL_ACCESS), async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { employeeId, month } = req.body; // month format: YYYY-MM

        if (!employeeId || !month) {
            await t.rollback();
            return res.status(400).json({ error: 'Employee ID and month are required' });
        }

        // Get employee with lock to prevent concurrent modifications
        const employee = await Employee.findByPk(employeeId, {
            transaction: t,
            lock: t.LOCK.UPDATE
        });
        if (!employee) {
            await t.rollback();
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Block payslip generation for non-active employees
        if (employee.status !== 'Active') {
            await t.rollback();
            return res.status(400).json({ error: `Cannot generate payslip for ${employee.status.toLowerCase()} employee` });
        }

        // Check if payslip already exists for this month (with lock)
        const existingPayslip = await Payslip.findOne({
            where: { employeeId, month },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (existingPayslip) {
            await t.rollback();
            return res.status(400).json({ error: 'Payslip already exists for this month' });
        }

        // Parse salary breakdown from employee record
        let salaryBreakdown = {};
        if (employee.salaryBreakdown) {
            try {
                salaryBreakdown = typeof employee.salaryBreakdown === 'string' 
                    ? JSON.parse(employee.salaryBreakdown) 
                    : employee.salaryBreakdown;
            } catch (e) {
                console.error('Error parsing salary breakdown:', e);
            }
        }

        // Get annual CTC
        const annualCTC = employee.salary || 0;
        const monthlyGross = annualCTC / 12;

        // Calculate salary components (Indian salary structure)
        // Default structure: Basic (50%), HRA (40% of Basic), Allowances (remaining)
        const basic = salaryBreakdown.basic || Math.round(monthlyGross * 0.5);
        const hra = salaryBreakdown.hra || Math.round(basic * 0.4);
        const specialAllowance = salaryBreakdown.specialAllowance || Math.round(monthlyGross - basic - hra);
        const otherAllowances = salaryBreakdown.otherAllowances || 0;
        
        const grossSalary = basic + hra + specialAllowance + otherAllowances;

        // Calculate PF (Employee contribution: 12% of Basic, max 1800)
        const pfEmployee = Math.min(Math.round(basic * 0.12), 1800);
        const pfEmployer = Math.min(Math.round(basic * 0.12), 1800); // Employer contribution

        // Calculate ESI (if applicable - for salary < 21000)
        let esiEmployee = 0;
        let esiEmployer = 0;
        if (grossSalary < 21000) {
            esiEmployee = Math.round(grossSalary * 0.0075); // 0.75%
            esiEmployer = Math.round(grossSalary * 0.0325); // 3.25%
        }

        // Calculate taxable income (after HRA exemption)
        // HRA exemption calculation (simplified - minimum of: actual HRA, rent paid - 10% of basic, 50% of basic for metro)
        const hraExemption = Math.min(hra, basic * 0.5); // Simplified: 50% of basic for metro cities
        const taxableIncome = grossSalary - hraExemption;

        // Calculate TDS (Indian tax calculation - simplified)
        // Using FY 2023-24 tax slabs
        const annualTaxableIncome = taxableIncome * 12;
        let tds = 0;

        if (annualTaxableIncome <= 250000) {
            tds = 0;
        } else if (annualTaxableIncome <= 500000) {
            tds = (annualTaxableIncome - 250000) * 0.05 / 12; // 5% tax
        } else if (annualTaxableIncome <= 1000000) {
            tds = (12500 + (annualTaxableIncome - 500000) * 0.20) / 12; // 5% + 20%
        } else {
            tds = (112500 + (annualTaxableIncome - 1000000) * 0.30) / 12; // 5% + 20% + 30%
        }

        // Apply rebate under section 87A (if applicable)
        if (annualTaxableIncome <= 500000) {
            const rebate = Math.min(tds * 12, 12500) / 12; // Max rebate 12500
            tds = Math.max(0, tds - rebate);
        }

        tds = Math.round(tds);

        // Calculate Professional Tax based on employee's work location/state
        let professionalTax = 0;
        let professionalTaxState = null;

        // Try to get state from work location
        if (employee.workLocation) {
            const workLoc = await WorkLocation.findOne({
                where: {
                    [Op.or]: [
                        { name: employee.workLocation },
                        { code: employee.workLocation }
                    ],
                    isActive: true
                },
                transaction: t
            });

            if (workLoc && workLoc.state) {
                professionalTaxState = workLoc.state;

                // Look up PT slab for the state based on gross salary
                const ptSlab = await ProfessionalTaxSlab.findOne({
                    where: {
                        [Op.or]: [
                            { state: professionalTaxState },
                            { stateCode: professionalTaxState }
                        ],
                        minSalary: { [Op.lte]: grossSalary },
                        [Op.or]: [
                            { maxSalary: { [Op.gte]: grossSalary } },
                            { maxSalary: null }
                        ],
                        isActive: true,
                        [Op.or]: [
                            { effectiveTo: null },
                            { effectiveTo: { [Op.gte]: month } }
                        ]
                    },
                    order: [['minSalary', 'DESC']], // Get the highest applicable slab
                    transaction: t
                });

                if (ptSlab) {
                    professionalTax = ptSlab.taxAmount;
                }
            }
        }

        // Fallback to salaryBreakdown or default if no PT slab found
        if (professionalTax === 0) {
            professionalTax = salaryBreakdown.professionalTax || 200; // Default PT
        }

        const otherDeductions = salaryBreakdown.otherDeductions || 0;

        // Calculate attendance-based LOP (Loss of Pay)
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = `${month}-01`;
        const lastDay = new Date(year, monthNum, 0).getDate();
        const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

        // Get holidays for the month
        const monthHolidays = await Holiday.findAll({
            where: {
                date: { [Op.between]: [startDate, endDate] },
                isActive: true,
                type: { [Op.ne]: 'Optional' }
            },
            transaction: t
        });
        const holidayDates = new Set(monthHolidays.map(h => h.date));

        // Get approved leaves for the month
        const monthLeaves = await LeaveRequest.findAll({
            where: {
                employeeId,
                status: 'Approved',
                [Op.or]: [
                    { startDate: { [Op.between]: [startDate, endDate] } },
                    { endDate: { [Op.between]: [startDate, endDate] } }
                ]
            },
            transaction: t
        });

        // Build leave dates set with type
        const leaveDates = new Map();
        monthLeaves.forEach(leave => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const current = new Date(start);
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                if (dateStr >= startDate && dateStr <= endDate) {
                    leaveDates.set(dateStr, leave.type);
                }
                current.setDate(current.getDate() + 1);
            }
        });

        // Get attendance records
        const attendanceRecords = await AttendanceRecord.findAll({
            where: {
                employeeId,
                date: { [Op.between]: [startDate, endDate] }
            },
            transaction: t
        });
        const attendanceMap = new Map();
        attendanceRecords.forEach(r => attendanceMap.set(r.date, r));

        // Calculate working days and LOP
        let workingDays = 0;
        let presentDays = 0;
        let lopDays = 0;
        let paidLeaveDays = 0;

        const current = new Date(startDate);
        const endDateObj = new Date(endDate);
        while (current <= endDateObj) {
            const dateStr = current.toISOString().split('T')[0];
            const dayOfWeek = current.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = holidayDates.has(dateStr);

            if (!isWeekend && !isHoliday) {
                workingDays++;
                const leaveType = leaveDates.get(dateStr);
                const attendance = attendanceMap.get(dateStr);

                if (leaveType) {
                    // On approved leave
                    if (leaveType === 'Leave Without Pay') {
                        lopDays++;
                    } else {
                        paidLeaveDays++;
                        presentDays++; // Paid leave counts as present
                    }
                } else if (attendance) {
                    // Has attendance record
                    if (attendance.status === 'Present' || attendance.status === 'Late' || attendance.status === 'WFH') {
                        presentDays++;
                    } else if (attendance.status === 'Half Day') {
                        presentDays += 0.5;
                        lopDays += 0.5; // Half day absence = 0.5 LOP
                    } else if (attendance.status === 'Absent') {
                        lopDays++;
                    } else {
                        presentDays++; // Default to present
                    }
                } else {
                    // No attendance record - check if date has passed
                    if (new Date(dateStr) < new Date()) {
                        lopDays++; // Past date with no attendance = LOP
                    }
                    // Future dates are not counted as LOP
                }
            }

            current.setDate(current.getDate() + 1);
        }

        // Calculate LOP deduction
        const perDaySalary = grossSalary / workingDays;
        const lopDeduction = Math.round(perDaySalary * lopDays);

        // Adjusted gross after LOP
        const adjustedGross = grossSalary - lopDeduction;

        // Total deductions including LOP
        const totalDeductions = pfEmployee + esiEmployee + tds + professionalTax + otherDeductions + lopDeduction;

        // Net pay
        const netPay = Math.round(grossSalary - totalDeductions);

        // Build detailed breakdown
        const breakdownData = {
            earnings: {
                basic,
                hra,
                specialAllowance,
                otherAllowances,
                grossSalary
            },
            deductions: {
                pfEmployee,
                pfEmployer,
                esiEmployee,
                esiEmployer,
                tds,
                professionalTax,
                professionalTaxState: professionalTaxState || 'Default',
                lopDeduction,
                otherDeductions,
                totalDeductions
            },
            attendance: {
                workingDays,
                presentDays,
                paidLeaveDays,
                lopDays,
                perDaySalary: Math.round(perDaySalary)
            },
            netPay,
            employerCost: {
                grossSalary,
                pfEmployer,
                esiEmployer,
                totalCost: grossSalary + pfEmployer + esiEmployer
            }
        };

        // Create payslip (within transaction)
        const payslip = await Payslip.create({
            id: uuidv4(),
            employeeId,
            month,
            basic,
            hra,
            allowances: specialAllowance + otherAllowances,
            deductions: totalDeductions,
            netPay,
            generatedDate: new Date().toISOString().split('T')[0],
            workingDays,
            presentDays,
            lopDays,
            lopDeduction,
            status: 'Draft',
            breakdown: JSON.stringify(breakdownData)
        }, { transaction: t });

        // Commit the transaction
        await t.commit();

        // Return detailed payslip with breakdown
        res.status(201).json({
            payslip,
            breakdown: breakdownData
        });
    } catch (error) {
        // Rollback on any error
        await t.rollback();
        console.error('Error generating payslip:', error);
        res.status(500).json({ error: 'Failed to generate payslip' });
    }
});

// Finalize payslip (lock for payment - Payroll Access only)
router.put('/payslips/:id/finalize', requireHRMSRole(RoleGroups.PAYROLL_ACCESS), async (req, res) => {
    try {
        const payslip = await Payslip.findByPk(req.params.id);
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }

        if (payslip.status === 'Finalized' || payslip.status === 'Paid') {
            return res.status(400).json({ error: 'Payslip is already finalized' });
        }

        await payslip.update({
            status: 'Finalized',
            finalizedBy: req.user.id,
            finalizedOn: new Date().toISOString().split('T')[0]
        });

        // P1-05: Notify employee about payslip
        createNotification({
            recipientId: payslip.employeeId,
            type: 'payslip_generated',
            title: 'Payslip Available',
            message: `Your payslip for ${payslip.month} has been finalized. Net pay: ₹${payslip.netPay?.toLocaleString('en-IN') || payslip.netPay}.`,
            relatedModule: 'payslip',
            relatedId: payslip.id
        });

        res.json({
            message: 'Payslip finalized successfully',
            payslip
        });
    } catch (error) {
        console.error('Error finalizing payslip:', error);
        res.status(500).json({ error: 'Failed to finalize payslip' });
    }
});

// Mark payslip as paid (Payroll Access only)
router.put('/payslips/:id/paid', requireHRMSRole(RoleGroups.PAYROLL_ACCESS), async (req, res) => {
    try {
        const payslip = await Payslip.findByPk(req.params.id);
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }

        if (payslip.status !== 'Finalized') {
            return res.status(400).json({ error: 'Payslip must be finalized before marking as paid' });
        }

        await payslip.update({
            status: 'Paid',
            paidOn: new Date().toISOString().split('T')[0]
        });

        res.json({
            message: 'Payslip marked as paid',
            payslip
        });
    } catch (error) {
        console.error('Error marking payslip as paid:', error);
        res.status(500).json({ error: 'Failed to update payslip status' });
    }
});

// Bulk generate payslips for a month (Payroll Access only)
router.post('/payslips/bulk-generate', requireHRMSRole(RoleGroups.PAYROLL_ACCESS), async (req, res) => {
    try {
        const { month, departmentId, employeeIds } = req.body;

        if (!month) {
            return res.status(400).json({ error: 'Month is required (format: YYYY-MM)' });
        }

        // Build employee filter
        const where = { status: 'Active' };
        if (employeeIds && employeeIds.length > 0) {
            where.id = { [Op.in]: employeeIds };
        }
        if (departmentId) {
            where.department = departmentId;
        }

        // Get active employees
        const employees = await Employee.findAll({ where });

        if (employees.length === 0) {
            return res.status(400).json({ error: 'No active employees found matching criteria' });
        }

        // Check for existing payslips
        const existingPayslips = await Payslip.findAll({
            where: {
                month,
                employeeId: { [Op.in]: employees.map(e => e.id) }
            },
            attributes: ['employeeId']
        });
        const existingEmployeeIds = new Set(existingPayslips.map(p => p.employeeId));

        // Filter out employees with existing payslips
        const employeesToProcess = employees.filter(e => !existingEmployeeIds.has(e.id));

        if (employeesToProcess.length === 0) {
            return res.status(400).json({
                error: 'All employees already have payslips for this month',
                existingCount: existingPayslips.length
            });
        }

        // Generate payslips (simplified - without full transaction for bulk)
        const results = {
            success: [],
            failed: [],
            skipped: Array.from(existingEmployeeIds)
        };

        for (const employee of employeesToProcess) {
            try {
                // Simplified payslip generation for bulk
                const annualCTC = employee.salary || 0;
                const monthlyGross = annualCTC / 12;

                let salaryBreakdown = {};
                if (employee.salaryBreakdown) {
                    try {
                        salaryBreakdown = typeof employee.salaryBreakdown === 'string'
                            ? JSON.parse(employee.salaryBreakdown)
                            : employee.salaryBreakdown;
                    } catch (e) { /* ignore */ }
                }

                const basic = salaryBreakdown.basic || Math.round(monthlyGross * 0.5);
                const hra = salaryBreakdown.hra || Math.round(basic * 0.4);
                const specialAllowance = salaryBreakdown.specialAllowance || Math.round(monthlyGross - basic - hra);

                const grossSalary = basic + hra + specialAllowance;
                const pfEmployee = Math.min(Math.round(basic * 0.12), 1800);
                const esiEmployee = grossSalary < 21000 ? Math.round(grossSalary * 0.0075) : 0;
                const professionalTax = salaryBreakdown.professionalTax || 200;

                const totalDeductions = pfEmployee + esiEmployee + professionalTax;
                const netPay = Math.round(grossSalary - totalDeductions);

                await Payslip.create({
                    id: uuidv4(),
                    employeeId: employee.id,
                    month,
                    basic,
                    hra,
                    allowances: specialAllowance,
                    deductions: totalDeductions,
                    netPay,
                    generatedDate: new Date().toISOString().split('T')[0],
                    status: 'Draft'
                });

                results.success.push(employee.id);
            } catch (err) {
                console.error(`Failed to generate payslip for ${employee.id}:`, err);
                results.failed.push({ employeeId: employee.id, error: err.message });
            }
        }

        res.status(201).json({
            message: `Bulk payslip generation completed`,
            month,
            totalEmployees: employees.length,
            generated: results.success.length,
            failed: results.failed.length,
            skipped: results.skipped.length,
            details: results
        });
    } catch (error) {
        console.error('Error in bulk payslip generation:', error);
        res.status(500).json({ error: 'Failed to generate payslips in bulk' });
    }
});

// Create payslip (manual - Payroll Access only)
router.post('/payslips', requireHRMSRole(RoleGroups.PAYROLL_ACCESS), async (req, res) => {
    try {
        const { employeeId, month, basic, hra, allowances, deductions, netPay } = req.body;

        // Check for duplicate
        const existingPayslip = await Payslip.findOne({
            where: { employeeId, month }
        });

        if (existingPayslip) {
            return res.status(400).json({ error: 'Payslip already exists for this month' });
        }

        const payslip = await Payslip.create({
            id: uuidv4(),
            employeeId,
            month,
            basic: basic || 0,
            hra: hra || 0,
            allowances: allowances || 0,
            deductions: deductions || 0,
            netPay: netPay || 0,
            generatedDate: new Date().toISOString().split('T')[0]
        });

        res.status(201).json(payslip);
    } catch (error) {
        console.error('Error creating payslip:', error);
        res.status(500).json({ error: 'Failed to create payslip' });
    }
});

// Update payslip (Payroll Access only)
router.put('/payslips/:id', requireHRMSRole(RoleGroups.PAYROLL_ACCESS), async (req, res) => {
    try {
        const payslip = await Payslip.findByPk(req.params.id);
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }

        await payslip.update(req.body);
        res.json(payslip);
    } catch (error) {
        console.error('Error updating payslip:', error);
        res.status(500).json({ error: 'Failed to update payslip' });
    }
});

// ============================================
// SALARY CHANGE HISTORY (P0-04)
// ============================================

// Get salary change history for an employee
router.get('/employees/:id/salary-history', requireEmployeeAccess(req => req.params.id), async (req, res) => {
    try {
        const history = await SalaryChangeLog.findAll({
            where: { employeeId: req.params.id },
            order: [['changedOn', 'DESC']]
        });
        res.json(history);
    } catch (error) {
        console.error('Error fetching salary history:', error);
        res.status(500).json({ error: 'Failed to fetch salary history' });
    }
});

// ============================================
// PAYSLIP REVISION (P0-05)
// ============================================

// Delete a Draft payslip (allows re-generation)
router.delete('/payslips/:id', requireHRMSRole(RoleGroups.PAYROLL_ACCESS), async (req, res) => {
    try {
        const payslip = await Payslip.findByPk(req.params.id);
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }

        if (payslip.status !== 'Draft') {
            return res.status(400).json({
                error: 'Only Draft payslips can be deleted. Finalized or Paid payslips must be revised instead.',
                currentStatus: payslip.status
            });
        }

        // Audit log
        try {
            await HRMSAuditLog.create({
                id: uuidv4(),
                userId: req.user.id,
                action: 'PAYSLIP_DELETE',
                module: 'payroll',
                targetId: payslip.id,
                targetType: 'Payslip',
                details: JSON.stringify({ employeeId: payslip.employeeId, month: payslip.month, netPay: payslip.netPay }),
                ipAddress: req.ip,
                timestamp: new Date().toISOString()
            });
        } catch (e) { /* audit best effort */ }

        await payslip.destroy();
        res.json({ message: 'Draft payslip deleted successfully. You can now regenerate it.' });
    } catch (error) {
        console.error('Error deleting payslip:', error);
        res.status(500).json({ error: 'Failed to delete payslip' });
    }
});

// Revise a Finalized payslip (creates a new version, marks old as superseded)
router.post('/payslips/:id/revise', requireHRMSRole(RoleGroups.PAYROLL_ACCESS), async (req, res) => {
    try {
        const payslip = await Payslip.findByPk(req.params.id);
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }

        if (payslip.status === 'Draft') {
            return res.status(400).json({ error: 'Draft payslips can be edited directly or deleted and regenerated.' });
        }

        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ error: 'Reason for revision is required' });
        }

        // Reset to Draft so it can be re-finalized after corrections
        await payslip.update({
            status: 'Draft',
            finalizedBy: null,
            finalizedOn: null,
            paidOn: null
        });

        // Audit log
        try {
            await HRMSAuditLog.create({
                id: uuidv4(),
                userId: req.user.id,
                action: 'PAYSLIP_REVISE',
                module: 'payroll',
                targetId: payslip.id,
                targetType: 'Payslip',
                details: JSON.stringify({ employeeId: payslip.employeeId, month: payslip.month, reason, previousStatus: payslip.status }),
                ipAddress: req.ip,
                timestamp: new Date().toISOString()
            });
        } catch (e) { /* audit best effort */ }

        res.json({
            message: 'Payslip reverted to Draft for revision. Edit and re-finalize when ready.',
            payslip
        });
    } catch (error) {
        console.error('Error revising payslip:', error);
        res.status(500).json({ error: 'Failed to revise payslip' });
    }
});

// ============================================
// SHIFT TIMING (P2-08) - Expose to employees
// ============================================

// Get active shift timings (all authenticated users)
router.get('/shift-timings', async (req, res) => {
    try {
        const shifts = await ShiftTiming.findAll({
            where: { isActive: true },
            order: [['isDefault', 'DESC'], ['name', 'ASC']]
        });
        res.json(shifts);
    } catch (error) {
        console.error('Error fetching shift timings:', error);
        res.status(500).json({ error: 'Failed to fetch shift timings' });
    }
});

// ============================================
// AUDIT LOG (P1-11)
// ============================================

// Get audit logs (HR/Admin only)
router.get('/audit-logs', requireHRMSRole(RoleGroups.FULL_ACCESS), async (req, res) => {
    try {
        const { module, action, targetType, userId, startDate, endDate, limit: queryLimit } = req.query;
        const where = {};

        if (module) where.module = module;
        if (action) where.action = action;
        if (targetType) where.targetType = targetType;
        if (userId) where.userId = userId;
        if (startDate && endDate) {
            where.timestamp = { [Op.between]: [startDate, endDate] };
        }

        const logs = await HRMSAuditLog.findAll({
            where,
            order: [['timestamp', 'DESC']],
            limit: parseInt(queryLimit) || 100
        });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// ============================================
// PT SLAB RETROACTIVE DETECTION (P1-12)
// ============================================

// Check impact of PT slab changes on existing payslips
router.post('/pt-slabs/impact-check', requireHRMSRole(RoleGroups.PAYROLL_ACCESS), async (req, res) => {
    try {
        const { state, stateCode } = req.body;
        if (!state && !stateCode) {
            return res.status(400).json({ error: 'State or stateCode is required' });
        }

        // Find all current PT slabs for this state
        const stateFilter = state ? { state } : { stateCode };
        const currentSlabs = await ProfessionalTaxSlab.findAll({
            where: { ...stateFilter, isActive: true }
        });

        if (currentSlabs.length === 0) {
            return res.json({ affectedPayslips: [], message: 'No active PT slabs found for this state.' });
        }

        // Find employees in locations mapped to this state
        const stateLocations = await WorkLocation.findAll({
            where: { state: state || stateCode, isActive: true },
            attributes: ['name', 'code']
        });
        const locationNames = stateLocations.map(l => l.name);
        const locationCodes = stateLocations.map(l => l.code).filter(Boolean);
        const allLocationIds = [...locationNames, ...locationCodes];

        if (allLocationIds.length === 0) {
            return res.json({ affectedPayslips: [], message: 'No work locations mapped to this state.' });
        }

        // Find employees at these locations
        const employees = await Employee.findAll({
            where: {
                workLocation: { [Op.in]: allLocationIds },
                status: 'Active'
            },
            attributes: ['id', 'name', 'workLocation']
        });
        const employeeIds = employees.map(e => e.id);

        if (employeeIds.length === 0) {
            return res.json({ affectedPayslips: [], message: 'No active employees at locations in this state.' });
        }

        // Find Finalized/Paid payslips for these employees
        const affectedPayslips = await Payslip.findAll({
            where: {
                employeeId: { [Op.in]: employeeIds },
                status: { [Op.in]: ['Finalized', 'Paid'] }
            },
            include: [{ model: Employee, attributes: ['id', 'name', 'workLocation'] }],
            order: [['month', 'DESC']],
            attributes: ['id', 'employeeId', 'month', 'deductions', 'netPay', 'status', 'breakdown']
        });

        // For each payslip, check if the PT amount would differ under current slabs
        const discrepancies = [];
        for (const payslip of affectedPayslips) {
            let breakdownData = {};
            if (payslip.breakdown) {
                try { breakdownData = JSON.parse(payslip.breakdown); } catch (e) { /* ignore */ }
            }
            const oldPT = breakdownData?.deductions?.professionalTax || 0;
            const grossSalary = (breakdownData?.earnings?.grossSalary) || (payslip.deductions + payslip.netPay);

            // Find applicable current slab
            const applicableSlab = currentSlabs.find(s =>
                grossSalary >= s.minSalary && (s.maxSalary === null || grossSalary <= s.maxSalary)
            );
            const newPT = applicableSlab ? applicableSlab.taxAmount : 0;

            if (oldPT !== newPT) {
                discrepancies.push({
                    payslipId: payslip.id,
                    employeeId: payslip.employeeId,
                    employeeName: payslip.Employee?.name,
                    month: payslip.month,
                    status: payslip.status,
                    oldPT,
                    newPT,
                    difference: newPT - oldPT
                });
            }
        }

        // If there are discrepancies, notify HR/Admin
        if (discrepancies.length > 0) {
            const hrAdmins = await Employee.findAll({
                where: { role: { [Op.in]: ['HR', 'Admin'] }, status: 'Active' },
                attributes: ['id']
            });
            for (const hr of hrAdmins) {
                createNotification({
                    recipientId: hr.id,
                    type: 'pt_slab_change',
                    title: 'PT Slab Change Impact',
                    message: `PT slab change for ${state || stateCode} affects ${discrepancies.length} payslip(s). Review required.`,
                    relatedModule: 'payslip',
                    relatedId: null
                });
            }
        }

        res.json({
            state: state || stateCode,
            totalPayslipsChecked: affectedPayslips.length,
            discrepancies,
            affectedCount: discrepancies.length,
            message: discrepancies.length > 0
                ? `${discrepancies.length} payslip(s) would have different PT amounts under current slabs. Consider revision.`
                : 'No discrepancies found. All payslips are consistent with current PT slabs.'
        });
    } catch (error) {
        console.error('Error checking PT slab impact:', error);
        res.status(500).json({ error: 'Failed to check PT slab impact' });
    }
});

// ============================================
// NOTIFICATIONS (P1-05)
// ============================================

// Get notifications for the current user
router.get('/notifications', async (req, res) => {
    try {
        const { unreadOnly, limit: queryLimit } = req.query;
        const where = { recipientId: req.user.id };
        if (unreadOnly === 'true') {
            where.isRead = false;
        }

        const notifications = await HRMSNotification.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: parseInt(queryLimit) || 50
        });

        const unreadCount = await HRMSNotification.count({
            where: { recipientId: req.user.id, isRead: false }
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark a notification as read
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const notification = await HRMSNotification.findByPk(req.params.id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        if (notification.recipientId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await notification.update({ isRead: true });
        res.json(notification);
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all notifications as read
router.put('/notifications/read-all', async (req, res) => {
    try {
        await HRMSNotification.update(
            { isRead: true },
            { where: { recipientId: req.user.id, isRead: false } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

export default router;

