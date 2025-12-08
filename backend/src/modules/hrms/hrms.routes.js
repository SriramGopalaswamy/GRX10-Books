import express from 'express';
import { Op } from 'sequelize';
import { 
    Employee, 
    EmployeeHiringHistory,
    LeaveRequest, 
    AttendanceRecord, 
    RegularizationRequest, 
    Payslip 
} from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

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
            password,
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
        const { employeeId, status } = req.query;
        const where = {};
        if (employeeId) where.employeeId = employeeId;
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

// ============================================
// ATTENDANCE RECORDS
// ============================================

// Get all attendance records
router.get('/attendance', async (req, res) => {
    try {
        const { employeeId, date, startDate, endDate } = req.query;
        const where = {};
        if (employeeId) where.employeeId = employeeId;
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
        const { employeeId, month } = req.query;
        const where = {};
        if (employeeId) where.employeeId = employeeId;
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

// Get payslip by ID
router.get('/payslips/:id', async (req, res) => {
    try {
        const payslip = await Payslip.findByPk(req.params.id, {
            include: [{ model: Employee, attributes: ['id', 'name', 'email'] }]
        });
        if (!payslip) {
            return res.status(404).json({ error: 'Payslip not found' });
        }
        res.json(payslip);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create payslip
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

