import express from 'express';
import { Op } from 'sequelize';
import { 
    Employee, 
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
        res.json(employees);
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
        res.json(employee);
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
            isNewUser
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
            isNewUser: isNewUser || false
        });

        res.status(201).json(employee);
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

        await employee.update(req.body);
        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete employee (soft delete - set status to 'Exited')
router.delete('/employees/:id', async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        await employee.update({ status: 'Exited' });
        res.json({ message: 'Employee offboarded successfully' });
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

