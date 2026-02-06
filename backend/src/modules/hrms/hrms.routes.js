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
    WorkLocation,
    ProfessionalTaxSlab,
    Holiday
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
            // JSON fields - stringify if they're objects
            educationDetails: educationDetails ? (typeof educationDetails === 'string' ? educationDetails : JSON.stringify(educationDetails)) : null,
            experienceDetails: experienceDetails ? (typeof experienceDetails === 'string' ? experienceDetails : JSON.stringify(experienceDetails)) : null,
            salaryBreakdown: salaryBreakdown ? (typeof salaryBreakdown === 'string' ? salaryBreakdown : JSON.stringify(salaryBreakdown)) : null,
            leaveEntitlements: leaveEntitlements ? (typeof leaveEntitlements === 'string' ? leaveEntitlements : JSON.stringify(leaveEntitlements)) : null,
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

        // Hash password if being updated
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, BCRYPT_SALT_ROUNDS);
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
        res.json(filteredData);
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

        // Update employee status (within transaction)
        await employee.update({
            status: 'Terminated',
            terminationDate: terminationDate,
            lastWorkingDay: terminationDate
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

        // Use IST timezone for Indian operations
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const istDate = new Date(now.getTime() + istOffset);
        const today = istDate.toISOString().split('T')[0];
        const currentTime = istDate.toISOString().split('T')[1].substring(0, 5); // HH:mm format

        // Check if there's already an attendance record for today
        let attendance = await AttendanceRecord.findOne({
            where: {
                employeeId: targetEmployeeId,
                date: today
            }
        });

        if (!attendance) {
            // Check-in: Create new attendance record
            attendance = await AttendanceRecord.create({
                id: uuidv4(),
                employeeId: targetEmployeeId,
                date: today,
                checkIn: currentTime,
                status: 'Present',
                durationHours: null
            });
            res.status(201).json({
                attendance,
                action: 'checked-in',
                message: 'Checked in successfully'
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

            // Determine status based on check-in time (late if after 9:30 AM)
            let status = 'Present';
            if (checkInHours > 9 || (checkInHours === 9 && checkInMinutes > 30)) {
                status = 'Late';
            }
            if (durationHours < 4) {
                status = 'Half Day';
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
                durationHours: Math.round(durationHours * 10) / 10
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
        // Use IST timezone
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const today = istDate.toISOString().split('T')[0];

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

        await attendance.update(req.body);
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
            include: [{ model: Employee, attributes: ['id', 'managerId'] }]
        });
        if (!regularization) {
            return res.status(404).json({ error: 'Regularization request not found' });
        }

        const userRole = req.user.role;
        const userId = req.user.id;
        const isHROrAdmin = userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR;
        const isOwnRequest = regularization.employeeId === userId;
        const isManagerOfEmployee = regularization.Employee?.managerId === userId;

        const { status, ...otherUpdates } = req.body;

        // Status changes require Manager/HR/Admin
        if (status && status !== regularization.status) {
            if (!isHROrAdmin && !isManagerOfEmployee) {
                return res.status(403).json({ error: 'Only managers or HR can approve/reject regularization requests' });
            }
            if (isOwnRequest && !isHROrAdmin) {
                return res.status(403).json({ error: 'You cannot approve your own regularization request' });
            }
        }

        await regularization.update(req.body);
        res.json(regularization);
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

        // Total deductions
        const totalDeductions = pfEmployee + esiEmployee + tds + professionalTax + otherDeductions;

        // Net pay
        const netPay = Math.round(grossSalary - totalDeductions);

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
            generatedDate: new Date().toISOString().split('T')[0]
        }, { transaction: t });

        // Commit the transaction
        await t.commit();

        // Return detailed payslip with breakdown
        res.status(201).json({
            payslip,
            breakdown: {
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
                    otherDeductions,
                    totalDeductions
                },
                netPay,
                employerCost: {
                    grossSalary,
                    pfEmployer,
                    esiEmployer,
                    totalCost: grossSalary + pfEmployer + esiEmployer
                }
            }
        });
    } catch (error) {
        // Rollback on any error
        await t.rollback();
        console.error('Error generating payslip:', error);
        res.status(500).json({ error: 'Failed to generate payslip' });
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

export default router;

