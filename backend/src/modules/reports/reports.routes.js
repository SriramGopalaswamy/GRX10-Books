import express from 'express';
import {
    Transaction,
    Ledger,
    ChartOfAccount,
    Invoice,
    InvoiceItem,
    Employee,
    LeaveRequest,
    AttendanceRecord,
    Payslip
} from '../../services/sheetsModels.js';

const router = express.Router();

// ============================================
// FINANCIAL REPORTS
// ============================================

// Trial Balance
router.get('/trial-balance', async (req, res) => {
    try {
        const { asOfDate } = req.query;
        const dateFilter = asOfDate ? { date: { lte: asOfDate } } : {};

        // Get all chart of accounts
        const accounts = await ChartOfAccount.findAll({
            where: { isActive: true },
            order: [['code', 'ASC']]
        });

        // Calculate balances for each account
        const trialBalance = await Promise.all(accounts.map(async (account) => {
            // Get all transactions for this account up to the date
            const transactions = await Transaction.findAll({
                where: {
                    ledgerId: account.id,
                    ...dateFilter
                }
            });

            let debitTotal = 0;
            let creditTotal = 0;

            transactions.forEach(txn => {
                if (txn.type === 'Debit') {
                    debitTotal += txn.amount;
                } else {
                    creditTotal += txn.amount;
                }
            });

            // Calculate balance based on account type
            let balance = 0;
            if (account.type === 'Asset' || account.type === 'Expense') {
                balance = debitTotal - creditTotal; // Normal debit balance
            } else {
                balance = creditTotal - debitTotal; // Normal credit balance
            }

            return {
                accountCode: account.code,
                accountName: account.name,
                accountType: account.type,
                debit: account.type === 'Asset' || account.type === 'Expense' ? Math.max(0, balance) : 0,
                credit: account.type === 'Liability' || account.type === 'Income' || account.type === 'Equity' ? Math.max(0, balance) : 0,
                balance: Math.abs(balance)
            };
        }));

        const totalDebits = trialBalance.reduce((sum, item) => sum + item.debit, 0);
        const totalCredits = trialBalance.reduce((sum, item) => sum + item.credit, 0);

        res.json({
            asOfDate: asOfDate || new Date().toISOString().split('T')[0],
            accounts: trialBalance,
            totals: {
                totalDebits,
                totalCredits,
                difference: totalDebits - totalCredits
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Balance Sheet
router.get('/balance-sheet', async (req, res) => {
    try {
        const { asOfDate } = req.query;
        const dateFilter = asOfDate ? { date: { lte: asOfDate } } : {};

        // Assets
        const assetAccounts = await ChartOfAccount.findAll({
            where: { 
                type: 'Asset',
                isActive: true 
            },
            order: [['code', 'ASC']]
        });

        const assets = await Promise.all(assetAccounts.map(async (account) => {
            const transactions = await Transaction.findAll({
                where: {
                    ledgerId: account.id,
                    ...dateFilter
                }
            });

            let debitTotal = 0;
            let creditTotal = 0;
            transactions.forEach(txn => {
                if (txn.type === 'Debit') debitTotal += txn.amount;
                else creditTotal += txn.amount;
            });

            const balance = debitTotal - creditTotal;
            return {
                code: account.code,
                name: account.name,
                balance: Math.max(0, balance)
            };
        }));

        const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);

        // Liabilities
        const liabilityAccounts = await ChartOfAccount.findAll({
            where: { 
                type: 'Liability',
                isActive: true 
            },
            order: [['code', 'ASC']]
        });

        const liabilities = await Promise.all(liabilityAccounts.map(async (account) => {
            const transactions = await Transaction.findAll({
                where: {
                    ledgerId: account.id,
                    ...dateFilter
                }
            });

            let debitTotal = 0;
            let creditTotal = 0;
            transactions.forEach(txn => {
                if (txn.type === 'Debit') debitTotal += txn.amount;
                else creditTotal += txn.amount;
            });

            const balance = creditTotal - debitTotal;
            return {
                code: account.code,
                name: account.name,
                balance: Math.max(0, balance)
            };
        }));

        // Equity
        const equityAccounts = await ChartOfAccount.findAll({
            where: { 
                type: 'Equity',
                isActive: true 
            },
            order: [['code', 'ASC']]
        });

        const equity = await Promise.all(equityAccounts.map(async (account) => {
            const transactions = await Transaction.findAll({
                where: {
                    ledgerId: account.id,
                    ...dateFilter
                }
            });

            let debitTotal = 0;
            let creditTotal = 0;
            transactions.forEach(txn => {
                if (txn.type === 'Debit') debitTotal += txn.amount;
                else creditTotal += txn.amount;
            });

            const balance = creditTotal - debitTotal;
            return {
                code: account.code,
                name: account.name,
                balance: Math.max(0, balance)
            };
        }));

        // Calculate Net Income (Income - Expenses) for current period
        const incomeAccounts = await ChartOfAccount.findAll({
            where: { type: 'Income', isActive: true }
        });

        const expenseAccounts = await ChartOfAccount.findAll({
            where: { type: 'Expense', isActive: true }
        });

        let totalIncome = 0;
        for (const account of incomeAccounts) {
            const transactions = await Transaction.findAll({
                where: { ledgerId: account.id, ...dateFilter }
            });
            const creditTotal = transactions
                .filter(t => t.type === 'Credit')
                .reduce((sum, t) => sum + t.amount, 0);
            const debitTotal = transactions
                .filter(t => t.type === 'Debit')
                .reduce((sum, t) => sum + t.amount, 0);
            totalIncome += (creditTotal - debitTotal);
        }

        let totalExpenses = 0;
        for (const account of expenseAccounts) {
            const transactions = await Transaction.findAll({
                where: { ledgerId: account.id, ...dateFilter }
            });
            const debitTotal = transactions
                .filter(t => t.type === 'Debit')
                .reduce((sum, t) => sum + t.amount, 0);
            const creditTotal = transactions
                .filter(t => t.type === 'Credit')
                .reduce((sum, t) => sum + t.amount, 0);
            totalExpenses += (debitTotal - creditTotal);
        }

        const netIncome = totalIncome - totalExpenses;

        const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
        const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0) + netIncome;
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        res.json({
            asOfDate: asOfDate || new Date().toISOString().split('T')[0],
            assets: {
                items: assets,
                total: totalAssets
            },
            liabilities: {
                items: liabilities,
                total: totalLiabilities
            },
            equity: {
                items: equity,
                netIncome,
                total: totalEquity
            },
            totals: {
                totalAssets,
                totalLiabilitiesAndEquity,
                balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Profit & Loss Statement
router.get('/profit-loss', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const dateFilter = {
            date: { between: [startDate, endDate] }
        };

        // Income
        const incomeAccounts = await ChartOfAccount.findAll({
            where: { 
                type: 'Income',
                isActive: true 
            },
            order: [['code', 'ASC']]
        });

        const income = await Promise.all(incomeAccounts.map(async (account) => {
            const transactions = await Transaction.findAll({
                where: {
                    ledgerId: account.id,
                    ...dateFilter
                }
            });

            const creditTotal = transactions
                .filter(t => t.type === 'Credit')
                .reduce((sum, t) => sum + t.amount, 0);
            const debitTotal = transactions
                .filter(t => t.type === 'Debit')
                .reduce((sum, t) => sum + t.amount, 0);

            const balance = creditTotal - debitTotal;
            return {
                code: account.code,
                name: account.name,
                amount: Math.max(0, balance)
            };
        }));

        const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);

        // Expenses
        const expenseAccounts = await ChartOfAccount.findAll({
            where: { 
                type: 'Expense',
                isActive: true 
            },
            order: [['code', 'ASC']]
        });

        const expenses = await Promise.all(expenseAccounts.map(async (account) => {
            const transactions = await Transaction.findAll({
                where: {
                    ledgerId: account.id,
                    ...dateFilter
                }
            });

            const debitTotal = transactions
                .filter(t => t.type === 'Debit')
                .reduce((sum, t) => sum + t.amount, 0);
            const creditTotal = transactions
                .filter(t => t.type === 'Credit')
                .reduce((sum, t) => sum + t.amount, 0);

            const balance = debitTotal - creditTotal;
            return {
                code: account.code,
                name: account.name,
                amount: Math.max(0, balance)
            };
        }));

        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalIncome - totalExpenses;

        res.json({
            period: {
                startDate,
                endDate
            },
            income: {
                items: income.filter(i => i.amount > 0),
                total: totalIncome
            },
            expenses: {
                items: expenses.filter(e => e.amount > 0),
                total: totalExpenses
            },
            netProfit,
            netLoss: netProfit < 0 ? Math.abs(netProfit) : 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// HR REPORTS
// ============================================

// Employee Directory Report
router.get('/hr/employee-directory', async (req, res) => {
    try {
        const { department, status, employeeType } = req.query;
        const where = {};
        
        if (department) where.department = department;
        if (status) where.status = status;
        if (employeeType) where.employeeType = employeeType;

        const employees = await Employee.findAll({
            where,
            order: [['name', 'ASC']]
        });

        res.json({
            filters: { department, status, employeeType },
            totalEmployees: employees.length,
            employees: employees.map(emp => ({
                id: emp.id,
                name: emp.name,
                email: emp.email,
                department: emp.department,
                designation: emp.designation,
                employeePosition: emp.employeePosition,
                employeeType: emp.employeeType,
                status: emp.status,
                joinDate: emp.joinDate,
                workLocation: emp.workLocation,
                managerId: emp.managerId
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Attendance Report
router.get('/hr/attendance', async (req, res) => {
    try {
        const { startDate, endDate, employeeId, department } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const where = {
            date: { between: [startDate, endDate] }
        };

        if (employeeId) {
            where.employeeId = employeeId;
        } else if (department) {
            // Get employee IDs for the department
            const employees = await Employee.findAll({
                where: { department },
                attributes: ['id']
            });
            where.employeeId = { in: employees.map(e => e.id) };
        }

        const attendance = await AttendanceRecord.findAll({
            where,
            include: [{ 
                model: Employee, 
                attributes: ['id', 'name', 'email', 'department', 'designation'] 
            }],
            order: [['date', 'ASC'], ['employeeId', 'ASC']]
        });

        // Calculate summary statistics
        const summary = {
            totalDays: attendance.length,
            present: attendance.filter(a => a.status === 'Present').length,
            absent: attendance.filter(a => a.status === 'Absent').length,
            late: attendance.filter(a => a.status === 'Late').length,
            halfDay: attendance.filter(a => a.status === 'Half Day').length,
            totalHours: attendance.reduce((sum, a) => sum + (a.durationHours || 0), 0)
        };

        res.json({
            period: { startDate, endDate },
            filters: { employeeId, department },
            summary,
            records: attendance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Leave Report
router.get('/hr/leaves', async (req, res) => {
    try {
        const { startDate, endDate, employeeId, department, status, leaveType } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const where = {
            startDate: { lte: endDate },
            endDate: { gte: startDate }
        };

        if (employeeId) {
            where.employeeId = employeeId;
        } else if (department) {
            const employees = await Employee.findAll({
                where: { department },
                attributes: ['id']
            });
            where.employeeId = { in: employees.map(e => e.id) };
        }

        if (status) where.status = status;
        if (leaveType) where.type = leaveType;

        const leaves = await LeaveRequest.findAll({
            where,
            include: [{ 
                model: Employee, 
                attributes: ['id', 'name', 'email', 'department', 'designation'] 
            }],
            order: [['startDate', 'ASC']]
        });

        // Calculate days for each leave
        const calculateDays = (start, end) => {
            const startDate = new Date(start);
            const endDate = new Date(end);
            let days = 0;
            const current = new Date(startDate);
            while (current <= endDate) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    days++;
                }
                current.setDate(current.getDate() + 1);
            }
            return days;
        };

        const leavesWithDays = leaves.map(leave => ({
            ...leave.toJSON(),
            days: calculateDays(leave.startDate, leave.endDate)
        }));

        const summary = {
            totalRequests: leaves.length,
            approved: leaves.filter(l => l.status === 'Approved').length,
            pending: leaves.filter(l => l.status === 'Pending').length,
            rejected: leaves.filter(l => l.status === 'Rejected').length,
            totalDays: leavesWithDays
                .filter(l => l.status === 'Approved')
                .reduce((sum, l) => sum + l.days, 0),
            byType: leavesWithDays.reduce((acc, leave) => {
                if (!acc[leave.type]) {
                    acc[leave.type] = { count: 0, days: 0 };
                }
                acc[leave.type].count++;
                if (leave.status === 'Approved') {
                    acc[leave.type].days += leave.days;
                }
                return acc;
            }, {})
        };

        res.json({
            period: { startDate, endDate },
            filters: { employeeId, department, status, leaveType },
            summary,
            leaves: leavesWithDays
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Payroll Report
router.get('/hr/payroll', async (req, res) => {
    try {
        const { month, department, employeeId } = req.query;
        if (!month) {
            return res.status(400).json({ error: 'Month is required (format: YYYY-MM)' });
        }

        const where = { month };

        if (employeeId) {
            where.employeeId = employeeId;
        } else if (department) {
            const employees = await Employee.findAll({
                where: { department },
                attributes: ['id']
            });
            where.employeeId = { in: employees.map(e => e.id) };
        }

        const payslips = await Payslip.findAll({
            where,
            include: [{ 
                model: Employee, 
                attributes: ['id', 'name', 'email', 'department', 'designation', 'employeeType'] 
            }],
            order: [['employeeId', 'ASC']]
        });

        const summary = {
            totalEmployees: payslips.length,
            totalGrossSalary: payslips.reduce((sum, p) => sum + p.basic + p.hra + p.allowances, 0),
            totalDeductions: payslips.reduce((sum, p) => sum + p.deductions, 0),
            totalNetPay: payslips.reduce((sum, p) => sum + p.netPay, 0),
            byDepartment: payslips.reduce((acc, payslip) => {
                const dept = payslip.Employee?.department || 'Unknown';
                if (!acc[dept]) {
                    acc[dept] = { count: 0, totalNetPay: 0 };
                }
                acc[dept].count++;
                acc[dept].totalNetPay += payslip.netPay;
                return acc;
            }, {})
        };

        res.json({
            month,
            filters: { department, employeeId },
            summary,
            payslips
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

