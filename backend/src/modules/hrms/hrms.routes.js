import express from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import {
    Employee,
    EmployeeHiringHistory,
    LeaveRequest,
    AttendanceRecord,
    RegularizationRequest,
    Payslip,
    LeaveType
} from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const BCRYPT_SALT_ROUNDS = 10;

// ============================================
// EMPLOYEES
// ============================================

// Get all employees
router.get('/employees', async (req, res) => {
    try {
        const employees = await Employee.findAll({
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
        
        res.json(parsedEmployees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get employee by ID
router.get('/employees/:id', async (req, res) => {
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
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create employee
router.post('/employees', async (req, res) => {
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
            // Additional Traditional HR Fields
            workLocation,
            probationEndDate,
            noticePeriod,
            lastWorkingDay,
            exitInterviewDate,
            employeeReferralId,
            bloodGroup,
            maritalStatus,
            spouseName,
            emergencyContactName,
            emergencyContactRelation,
            emergencyContactPhone,
            bankAccountNumber,
            bankIFSC,
            bankName,
            bankBranch,
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

        res.status(201).json(response);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'Email already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Update employee
router.put('/employees/:id', async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Handle JSON fields - stringify if they're objects
        const updateData = { ...req.body };

        // Hash password if being updated
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, BCRYPT_SALT_ROUNDS);
        }

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
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete employee (soft delete - set status to 'Terminated')
router.delete('/employees/:id', async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Create hiring history record before termination
        await EmployeeHiringHistory.create({
            id: uuidv4(),
            employeeId: employee.id,
            hireDate: employee.joinDate,
            terminationDate: new Date().toISOString().split('T')[0],
            employeeType: employee.employeeType,
            department: employee.department,
            employeePosition: employee.employeePosition,
            designation: employee.designation,
            salary: employee.salary,
            managerId: employee.managerId,
            reasonForTermination: req.body.reasonForTermination || 'Not specified',
            isRehire: false
        });

        await employee.update({ 
            status: 'Terminated',
            terminationDate: new Date().toISOString().split('T')[0]
        });
        res.json({ message: 'Employee terminated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// EMPLOYEE HIRING HISTORY
// ============================================

// Get hiring history for an employee
router.get('/employees/:id/hiring-history', async (req, res) => {
    try {
        const history = await EmployeeHiringHistory.findAll({
            where: { employeeId: req.params.id },
            order: [['hireDate', 'DESC']]
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create hiring history entry (for rehires)
router.post('/employees/:id/hiring-history', async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// LEAVE REQUESTS
// ============================================

// Get all leave requests
router.get('/leaves', async (req, res) => {
    try {
        const { employeeId, managerId, status } = req.query;
        const where = {};
        
        // If managerId is provided, get all employees under that manager
        if (managerId) {
            const reportees = await Employee.findAll({
                where: { managerId: managerId },
                attributes: ['id']
            });
            const reporteeIds = reportees.map(emp => emp.id);
            if (reporteeIds.length > 0) {
                where.employeeId = { [Op.in]: reporteeIds };
            } else {
                // Manager has no reportees, return empty array
                return res.json([]);
            }
        } else if (employeeId) {
            where.employeeId = employeeId;
        }
        
        if (status) where.status = status;

        const leaves = await LeaveRequest.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email'] }],
            order: [['appliedOn', 'DESC']]
        });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get leave request by ID
router.get('/leaves/:id', async (req, res) => {
    try {
        const leave = await LeaveRequest.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'email'] }]
        });
        if (!leave) {
            return res.status(404).json({ error: 'Leave request not found' });
        }
        res.json(leave);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create leave request
router.post('/leaves', async (req, res) => {
    try {
        const { employeeId, type, startDate, endDate, reason, status } = req.body;

        const leave = await LeaveRequest.create({
            id: uuidv4(),
            employeeId,
            type,
            startDate,
            endDate,
            reason,
            status: status || 'Pending',
            appliedOn: new Date().toISOString().split('T')[0]
        });

        res.status(201).json(leave);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update leave request (for approval/rejection)
router.put('/leaves/:id', async (req, res) => {
    try {
        const leave = await LeaveRequest.findByPk(req.params.id);
        if (!leave) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        await leave.update(req.body);
        res.json(leave);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get leave balance for an employee
router.get('/leaves/balance/:employeeId', async (req, res) => {
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

        // Calculate balance for each leave type
        const leaveBalances = {};
        
        // Helper function to calculate days between dates (excluding weekends)
        const calculateWorkingDays = (startDate, endDate) => {
            const start = new Date(startDate);
            const end = new Date(endDate);
            let days = 0;
            const current = new Date(start);
            
            while (current <= end) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
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
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ATTENDANCE RECORDS
// ============================================

// Get all attendance records
router.get('/attendance', async (req, res) => {
    try {
        const { employeeId, managerId, date, startDate, endDate } = req.query;
        const where = {};
        
        // If managerId is provided, get all employees under that manager
        if (managerId) {
            const reportees = await Employee.findAll({
                where: { managerId: managerId },
                attributes: ['id']
            });
            const reporteeIds = reportees.map(emp => emp.id);
            if (reporteeIds.length > 0) {
                where.employeeId = { [Op.in]: reporteeIds };
            } else {
                // Manager has no reportees, return empty array
                return res.json([]);
            }
        } else if (employeeId) {
            where.employeeId = employeeId;
        }
        
        if (date) where.date = date;
        if (startDate && endDate) {
            where.date = { [Op.between]: [startDate, endDate] };
        }

        const attendance = await AttendanceRecord.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email'] }],
            order: [['date', 'DESC']]
        });
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get attendance record by ID
router.get('/attendance/:id', async (req, res) => {
    try {
        const attendance = await AttendanceRecord.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'email'] }]
        });
        if (!attendance) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check-in/Check-out endpoint
router.post('/attendance/checkin', async (req, res) => {
    try {
        const { employeeId } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        // Check if there's already an attendance record for today
        let attendance = await AttendanceRecord.findOne({
            where: {
                employeeId,
                date: today
            }
        });

        if (!attendance) {
            // Check-in: Create new attendance record
            attendance = await AttendanceRecord.create({
                id: uuidv4(),
                employeeId,
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
        res.status(500).json({ error: error.message });
    }
});

// Get today's attendance status for an employee
router.get('/attendance/today/:employeeId', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
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
        res.status(500).json({ error: error.message });
    }
});

// Create attendance record
router.post('/attendance', async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
});

// Update attendance record
router.put('/attendance/:id', async (req, res) => {
    try {
        const attendance = await AttendanceRecord.findByPk(req.params.id);
        if (!attendance) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }

        await attendance.update(req.body);
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// REGULARIZATION REQUESTS
// ============================================

// Get all regularization requests
router.get('/regularizations', async (req, res) => {
    try {
        const { employeeId, status } = req.query;
        const where = {};
        if (employeeId) where.employeeId = employeeId;
        if (status) where.status = status;

        const regularizations = await RegularizationRequest.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email'] }],
            order: [['appliedOn', 'DESC']]
        });
        res.json(regularizations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get regularization request by ID
router.get('/regularizations/:id', async (req, res) => {
    try {
        const regularization = await RegularizationRequest.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'email'] }]
        });
        if (!regularization) {
            return res.status(404).json({ error: 'Regularization request not found' });
        }
        res.json(regularization);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create regularization request
router.post('/regularizations', async (req, res) => {
    try {
        const { employeeId, employeeName, date, type, reason, newCheckIn, newCheckOut, status } = req.body;

        const regularization = await RegularizationRequest.create({
            id: uuidv4(),
            employeeId,
            employeeName,
            date,
            type,
            reason,
            newCheckIn,
            newCheckOut,
            status: status || 'Pending',
            appliedOn: new Date().toISOString().split('T')[0]
        });

        res.status(201).json(regularization);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update regularization request (for approval/rejection)
router.put('/regularizations/:id', async (req, res) => {
    try {
        const regularization = await RegularizationRequest.findByPk(req.params.id);
        if (!regularization) {
            return res.status(404).json({ error: 'Regularization request not found' });
        }

        await regularization.update(req.body);
        res.json(regularization);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PAYSLIPS
// ============================================

// Get all payslips
router.get('/payslips', async (req, res) => {
    try {
        const { employeeId, managerId, month } = req.query;
        const where = {};
        
        // If managerId is provided, get all employees under that manager
        if (managerId) {
            const reportees = await Employee.findAll({
                where: { managerId: managerId },
                attributes: ['id']
            });
            const reporteeIds = reportees.map(emp => emp.id);
            if (reporteeIds.length > 0) {
                where.employeeId = { [Op.in]: reporteeIds };
            } else {
                // Manager has no reportees, return empty array
                return res.json([]);
            }
        } else if (employeeId) {
            where.employeeId = employeeId;
        }
        
        if (month) where.month = month;

        const payslips = await Payslip.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email'] }],
            order: [['month', 'DESC']]
        });
        res.json(payslips);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get payslip by ID with detailed breakdown
router.get('/payslips/:id', async (req, res) => {
    try {
        const payslip = await Payslip.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'department', 'designation', 'salary', 'salaryBreakdown'] }]
        });
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
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
        res.status(500).json({ error: error.message });
    }
});

// Generate payslip with automatic calculations
router.post('/payslips/generate', async (req, res) => {
    try {
        const { employeeId, month } = req.body; // month format: YYYY-MM

        if (!employeeId || !month) {
            return res.status(400).json({ error: 'Employee ID and month are required' });
        }

        // Get employee
        const employee = await Employee.findByPk(employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Check if payslip already exists for this month
        const existingPayslip = await Payslip.findOne({
            where: { employeeId, month }
        });

        if (existingPayslip) {
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

        // Other deductions
        const professionalTax = salaryBreakdown.professionalTax || 200; // Standard PT
        const otherDeductions = salaryBreakdown.otherDeductions || 0;

        // Total deductions
        const totalDeductions = pfEmployee + esiEmployee + tds + professionalTax + otherDeductions;

        // Net pay
        const netPay = Math.round(grossSalary - totalDeductions);

        // Create payslip
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
        });

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
        res.status(500).json({ error: error.message });
    }
});

// Create payslip (manual)
router.post('/payslips', async (req, res) => {
    try {
        const { employeeId, month, basic, hra, allowances, deductions, netPay } = req.body;

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
        res.status(500).json({ error: error.message });
    }
});

// Update payslip
router.put('/payslips/:id', async (req, res) => {
    try {
        const payslip = await Payslip.findByPk(req.params.id);
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }

        await payslip.update(req.body);
        res.json(payslip);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

