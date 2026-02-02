import express from 'express';
import {
    Employee,
    LeaveRequest,
    AttendanceRecord,
    Payslip,
    Invoice,
    OSGoal,
    OSMemo
} from '../../services/sheetsModels.js';

const router = express.Router();

// Get dashboard summary statistics
router.get('/summary', async (req, res) => {
    try {
        const user = req.user; // From session
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

        // Determine employee filter based on role
        let employeeFilter = {};
        if (user.role === 'Employee') {
            employeeFilter = { id: user.id };
        } else if (user.role === 'Manager') {
            // Get reportees
            const reportees = await Employee.findAll({ 
                where: { managerId: user.id },
                attributes: ['id']
            });
            const reporteeIds = reportees.map(r => r.id);
            employeeFilter = { id: { in: [user.id, ...reporteeIds] } };
        }
        // Admin/HR/Finance see all (no filter)

        // ============================================
        // HRMS Statistics
        // ============================================
        const totalEmployees = await Employee.count({ 
            where: { status: 'Active' }
        });

        const newEmployeesThisMonth = await Employee.count({
            where: {
                joinDate: { between: [startOfMonth, endOfMonth] }
            }
        });

        // Attendance stats (current month)
        const attendanceWhere = {
            date: { between: [startOfMonth, endOfMonth] }
        };
        if (user.role === 'Employee') {
            attendanceWhere.employeeId = user.id;
        } else if (user.role === 'Manager') {
            const reportees = await Employee.findAll({ 
                where: { managerId: user.id },
                attributes: ['id']
            });
            attendanceWhere.employeeId = { in: reportees.map(r => r.id) };
        }

        const attendanceRecords = await AttendanceRecord.findAll({ where: attendanceWhere });
        const presentCount = attendanceRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
        const absentCount = attendanceRecords.filter(a => a.status === 'Absent').length;
        const attendanceRate = attendanceRecords.length > 0 
            ? ((presentCount / attendanceRecords.length) * 100).toFixed(1) 
            : 0;

        // Leave requests (pending)
        const leaveWhere = { status: 'Pending' };
        if (user.role === 'Employee') {
            leaveWhere.employeeId = user.id;
        } else if (user.role === 'Manager') {
            const reportees = await Employee.findAll({ 
                where: { managerId: user.id },
                attributes: ['id']
            });
            leaveWhere.employeeId = { in: reportees.map(r => r.id) };
        }

        const pendingLeaves = await LeaveRequest.count({ where: leaveWhere });

        // Payroll stats (current month)
        // Format month as YYYY-MM string (e.g., "2025-12")
        const monthString = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
        const payrollWhere = {
            month: monthString
        };
        if (user.role === 'Employee') {
            payrollWhere.employeeId = user.id;
        } else if (user.role === 'Manager') {
            const reportees = await Employee.findAll({ 
                where: { managerId: user.id },
                attributes: ['id']
            });
            payrollWhere.employeeId = { in: reportees.map(r => r.id) };
        }

        const payslips = await Payslip.findAll({ where: payrollWhere });
        // Calculate gross salary from payslip components (basic + hra + allowances)
        const totalGrossSalary = payslips.reduce((sum, p) => {
            const gross = (p.basic || 0) + (p.hra || 0) + (p.allowances || 0);
            return sum + gross;
        }, 0);
        const totalNetPay = payslips.reduce((sum, p) => sum + (p.netPay || 0), 0);
        const totalDeductions = payslips.reduce((sum, p) => sum + (p.deductions || 0), 0);

        // ============================================
        // Financial Statistics
        // ============================================
        const totalInvoices = await Invoice.count();
        const paidInvoices = await Invoice.count({ where: { status: 'Paid' } });
        const pendingInvoices = await Invoice.count({ where: { status: { in: ['Pending', 'Sent'] } } });
        const overdueInvoices = await Invoice.count({ where: { status: 'Overdue' } });

        // Calculate total receivables
        const unpaidInvoices = await Invoice.findAll({
            where: { status: { ne: 'Paid' } }
        });
        const totalReceivables = unpaidInvoices.reduce((sum, inv) => {
            return sum + (inv.total || 0);
        }, 0);

        // Revenue this month
        const paidThisMonth = await Invoice.findAll({
            where: {
                status: 'Paid',
                date: { between: [startOfMonth, endOfMonth] }
            }
        });
        const revenueThisMonth = paidThisMonth.reduce((sum, inv) => {
            return sum + (inv.total || 0);
        }, 0);

        // ============================================
        // OS Statistics
        // ============================================
        const goalWhere = {};
        if (user.role === 'Employee') {
            goalWhere.employeeId = user.id;
        } else if (user.role === 'Manager') {
            const reportees = await Employee.findAll({ 
                where: { managerId: user.id },
                attributes: ['id']
            });
            goalWhere.employeeId = { in: [user.id, ...reportees.map(r => r.id)] };
        }

        const totalGoals = await OSGoal.count({ where: goalWhere });
        const completedGoals = await OSGoal.count({ 
            where: { ...goalWhere, status: 'Completed' }
        });
        const inProgressGoals = await OSGoal.count({ 
            where: { ...goalWhere, status: 'In Progress' }
        });
        const goalCompletionRate = totalGoals > 0 
            ? ((completedGoals / totalGoals) * 100).toFixed(1) 
            : 0;

        const memoWhere = {};
        if (user.role === 'Employee') {
            memoWhere.createdBy = user.id;
        } else if (user.role === 'Manager') {
            const reportees = await Employee.findAll({ 
                where: { managerId: user.id },
                attributes: ['id']
            });
            memoWhere.createdBy = { in: [user.id, ...reportees.map(r => r.id)] };
        }

        const totalMemos = await OSMemo.count({ where: memoWhere });
        const pendingMemos = await OSMemo.count({ 
            where: { ...memoWhere, status: 'Pending' }
        });

        // ============================================
        // Recent Activity (last 7 days)
        // ============================================
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentLeaves = await LeaveRequest.findAll({
            where: {
                createdAt: { gte: sevenDaysAgo }
            },
            include: [{ 
                model: Employee, 
                attributes: ['id', 'name', 'email'] 
            }],
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        const recentAttendance = await AttendanceRecord.findAll({
            where: {
                date: { gte: sevenDaysAgo }
            },
            include: [{ 
                model: Employee, 
                attributes: ['id', 'name', 'email'] 
            }],
            order: [['date', 'DESC']],
            limit: 5
        });

        res.json({
            hrms: {
                totalEmployees,
                newEmployeesThisMonth,
                attendanceRate: parseFloat(attendanceRate),
                presentCount,
                absentCount,
                pendingLeaves,
                totalGrossSalary,
                totalNetPay,
                totalDeductions,
                payslipCount: payslips.length
            },
            financial: {
                totalInvoices,
                paidInvoices,
                pendingInvoices,
                overdueInvoices,
                totalReceivables,
                revenueThisMonth
            },
            os: {
                totalGoals,
                completedGoals,
                inProgressGoals,
                goalCompletionRate: parseFloat(goalCompletionRate),
                totalMemos,
                pendingMemos
            },
            recentActivity: {
                leaves: recentLeaves.map(l => ({
                    id: l.id,
                    employeeName: l.Employee?.name || 'Unknown',
                    type: l.type,
                    startDate: l.startDate,
                    endDate: l.endDate,
                    status: l.status,
                    createdAt: l.createdAt
                })),
                attendance: recentAttendance.map(a => ({
                    id: a.id,
                    employeeName: a.Employee?.name || 'Unknown',
                    date: a.date,
                    status: a.status,
                    checkIn: a.checkIn,
                    checkOut: a.checkOut
                }))
            }
        });
    } catch (error) {
        console.error('Dashboard summary error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: error.message || 'Failed to load dashboard data',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

export default router;

