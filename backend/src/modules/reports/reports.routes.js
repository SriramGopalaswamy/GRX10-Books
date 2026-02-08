/**
 * Reports Routes - All financial reports read from posted GL data
 *
 * THIS IS THE CFO'S WINDOW INTO THE SYSTEM.
 * Every number comes from posted journal entries. No shortcuts.
 *
 * Reports:
 * - Trial Balance
 * - Balance Sheet
 * - Profit & Loss
 * - Cash Flow Statement (Direct + Indirect)
 * - Budget vs Actual
 * - Variance Analysis
 * - Dimension-based reporting (Cost Center, Project)
 * - AR/AP Aging (delegated to invoice/billing routes)
 *
 * HR Reports are preserved at the bottom.
 */

import express from 'express';
import { Op } from 'sequelize';
import {
    sequelize,
    JournalEntry,
    JournalEntryLine,
    ChartOfAccount,
    CostCenter,
    Project,
    Budget,
    BudgetLine,
    AccountingPeriod,
    FiscalYear,
    // HR models
    Employee,
    LeaveRequest,
    AttendanceRecord,
    Payslip
} from '../../config/database.js';
import { getAllAccountBalances } from '../../services/accounting.service.js';

const router = express.Router();

// ============================================
// HELPER: Get GL balances from posted entries
// ============================================

async function getGLBalances(filters = {}) {
    const jeWhere = { status: 'Posted' };
    if (filters.startDate) jeWhere.date = { ...jeWhere.date, [Op.gte]: filters.startDate };
    if (filters.endDate) jeWhere.date = { ...jeWhere.date, [Op.lte]: filters.endDate };
    if (filters.asOfDate) jeWhere.date = { [Op.lte]: filters.asOfDate };

    const lineWhere = {};
    if (filters.costCenterId) lineWhere.costCenterId = filters.costCenterId;
    if (filters.projectId) lineWhere.projectId = filters.projectId;

    const results = await JournalEntryLine.findAll({
        where: lineWhere,
        include: [{
            model: JournalEntry,
            as: 'JournalEntry',
            where: jeWhere,
            attributes: []
        }],
        attributes: [
            'accountId',
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('debitAmount')), 0), 'debitTotal'],
            [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('creditAmount')), 0), 'creditTotal']
        ],
        group: ['accountId'],
        raw: true
    });

    const accounts = await ChartOfAccount.findAll({
        where: { isActive: true },
        order: [['code', 'ASC']]
    });

    return accounts.map(account => {
        const result = results.find(r => r.accountId === account.id);
        const debitTotal = parseFloat(result?.debitTotal) || 0;
        const creditTotal = parseFloat(result?.creditTotal) || 0;

        let balance;
        if (account.type === 'Asset' || account.type === 'Expense') {
            balance = debitTotal - creditTotal;
        } else {
            balance = creditTotal - debitTotal;
        }

        return {
            accountId: account.id,
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type,
            subType: account.subType,
            debitTotal,
            creditTotal,
            balance,
            cashFlowCategory: account.cashFlowCategory,
            isCashFlowRelevant: account.isCashFlowRelevant
        };
    });
}

// ============================================
// TRIAL BALANCE (from GL)
// ============================================

router.get('/trial-balance', async (req, res) => {
    try {
        const { asOfDate, costCenterId, projectId } = req.query;
        const balances = await getGLBalances({ asOfDate, costCenterId, projectId });

        const trialBalance = balances
            .filter(b => Math.abs(b.debitTotal) > 0.001 || Math.abs(b.creditTotal) > 0.001)
            .map(b => ({
                accountCode: b.accountCode,
                accountName: b.accountName,
                accountType: b.accountType,
                debit: (b.accountType === 'Asset' || b.accountType === 'Expense')
                    ? Math.max(0, b.balance) : (b.balance < 0 ? Math.abs(b.balance) : 0),
                credit: (b.accountType === 'Liability' || b.accountType === 'Income' || b.accountType === 'Equity')
                    ? Math.max(0, b.balance) : (b.balance < 0 ? Math.abs(b.balance) : 0),
                balance: Math.abs(b.balance)
            }));

        const totalDebits = trialBalance.reduce((sum, item) => sum + item.debit, 0);
        const totalCredits = trialBalance.reduce((sum, item) => sum + item.credit, 0);

        res.json({
            asOfDate: asOfDate || new Date().toISOString().split('T')[0],
            dataSource: 'Posted GL Entries',
            accounts: trialBalance,
            totals: {
                totalDebits,
                totalCredits,
                difference: Math.abs(totalDebits - totalCredits),
                isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BALANCE SHEET (from GL)
// ============================================

router.get('/balance-sheet', async (req, res) => {
    try {
        const { asOfDate, costCenterId, projectId } = req.query;
        const balances = await getGLBalances({ asOfDate, costCenterId, projectId });

        const assets = balances.filter(b => b.accountType === 'Asset' && Math.abs(b.balance) > 0.001);
        const liabilities = balances.filter(b => b.accountType === 'Liability' && Math.abs(b.balance) > 0.001);
        const equity = balances.filter(b => b.accountType === 'Equity' && Math.abs(b.balance) > 0.001);

        // Calculate retained earnings (Income - Expenses for all time up to asOfDate)
        const income = balances.filter(b => b.accountType === 'Income');
        const expenses = balances.filter(b => b.accountType === 'Expense');
        const totalIncome = income.reduce((sum, b) => sum + b.balance, 0);
        const totalExpenses = expenses.reduce((sum, b) => sum + b.balance, 0);
        const retainedEarnings = totalIncome - totalExpenses;

        const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
        const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0) + retainedEarnings;
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        res.json({
            asOfDate: asOfDate || new Date().toISOString().split('T')[0],
            dataSource: 'Posted GL Entries',
            assets: {
                items: assets.map(a => ({ code: a.accountCode, name: a.accountName, subType: a.subType, balance: a.balance })),
                total: totalAssets
            },
            liabilities: {
                items: liabilities.map(l => ({ code: l.accountCode, name: l.accountName, subType: l.subType, balance: l.balance })),
                total: totalLiabilities
            },
            equity: {
                items: [
                    ...equity.map(e => ({ code: e.accountCode, name: e.accountName, balance: e.balance })),
                    { code: 'RE', name: 'Retained Earnings (Current Period)', balance: retainedEarnings }
                ],
                retainedEarnings,
                total: totalEquity
            },
            totals: {
                totalAssets,
                totalLiabilitiesAndEquity,
                balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
                difference: Math.abs(totalAssets - totalLiabilitiesAndEquity)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PROFIT & LOSS STATEMENT (from GL)
// ============================================

router.get('/profit-loss', async (req, res) => {
    try {
        const { startDate, endDate, costCenterId, projectId } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const balances = await getGLBalances({ startDate, endDate, costCenterId, projectId });

        const income = balances
            .filter(b => b.accountType === 'Income' && Math.abs(b.balance) > 0.001)
            .map(b => ({ code: b.accountCode, name: b.accountName, amount: b.balance }));

        const expenses = balances
            .filter(b => b.accountType === 'Expense' && Math.abs(b.balance) > 0.001)
            .map(b => ({ code: b.accountCode, name: b.accountName, amount: b.balance }));

        const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalIncome - totalExpenses;

        res.json({
            period: { startDate, endDate },
            dataSource: 'Posted GL Entries',
            income: {
                items: income,
                total: totalIncome
            },
            expenses: {
                items: expenses,
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
// CASH FLOW STATEMENT (Direct + Indirect)
// ============================================

router.get('/cashflow', async (req, res) => {
    try {
        const { startDate, endDate, method } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const reportMethod = method || 'indirect';

        if (reportMethod === 'direct') {
            // Direct method: Show actual cash receipts and payments
            const jeWhere = { status: 'Posted', date: { [Op.between]: [startDate, endDate] } };

            // Find cash/bank accounts
            const cashAccounts = await ChartOfAccount.findAll({
                where: {
                    type: 'Asset',
                    isCashFlowRelevant: true,
                    isActive: true
                }
            });
            const cashAccountIds = cashAccounts.map(a => a.id);

            if (cashAccountIds.length === 0) {
                // Fallback: use accounts with codes starting with 1000-1099
                const bankAccounts = await ChartOfAccount.findAll({
                    where: {
                        type: 'Asset',
                        code: { [Op.like]: '10%' },
                        isActive: true
                    }
                });
                cashAccountIds.push(...bankAccounts.map(a => a.id));
            }

            // Get all cash-related journal entry lines
            const cashLines = await JournalEntryLine.findAll({
                where: { accountId: cashAccountIds },
                include: [{
                    model: JournalEntry,
                    as: 'JournalEntry',
                    where: jeWhere,
                    attributes: ['id', 'date', 'description', 'sourceDocument']
                }],
                raw: true,
                nest: true
            });

            // Categorize by source document
            const operating = { inflows: 0, outflows: 0, items: [] };
            const investing = { inflows: 0, outflows: 0, items: [] };
            const financing = { inflows: 0, outflows: 0, items: [] };

            for (const line of cashLines) {
                const debit = parseFloat(line.debitAmount) || 0;
                const credit = parseFloat(line.creditAmount) || 0;
                const netCash = debit - credit; // Positive = cash in, Negative = cash out

                const item = {
                    date: line.JournalEntry.date,
                    description: line.JournalEntry.description,
                    sourceDocument: line.JournalEntry.sourceDocument,
                    amount: netCash
                };

                const src = line.JournalEntry.sourceDocument;
                if (['Invoice', 'Bill', 'Payment', 'CreditNote', 'VendorCredit', 'Manual'].includes(src)) {
                    if (netCash > 0) operating.inflows += netCash;
                    else operating.outflows += Math.abs(netCash);
                    operating.items.push(item);
                } else {
                    // Default to operating
                    if (netCash > 0) operating.inflows += netCash;
                    else operating.outflows += Math.abs(netCash);
                    operating.items.push(item);
                }
            }

            const netCashFromOperating = operating.inflows - operating.outflows;
            const netCashFromInvesting = investing.inflows - investing.outflows;
            const netCashFromFinancing = financing.inflows - financing.outflows;

            res.json({
                period: { startDate, endDate },
                method: 'direct',
                dataSource: 'Posted GL Entries',
                operating: { ...operating, netCash: netCashFromOperating },
                investing: { ...investing, netCash: netCashFromInvesting },
                financing: { ...financing, netCash: netCashFromFinancing },
                netChangeInCash: netCashFromOperating + netCashFromInvesting + netCashFromFinancing
            });
        } else {
            // Indirect method: Start with net income, adjust for non-cash items
            const periodBalances = await getGLBalances({ startDate, endDate });

            const totalIncome = periodBalances.filter(b => b.accountType === 'Income').reduce((s, b) => s + b.balance, 0);
            const totalExpenses = periodBalances.filter(b => b.accountType === 'Expense').reduce((s, b) => s + b.balance, 0);
            const netIncome = totalIncome - totalExpenses;

            // Get opening and closing balances for working capital items
            const openingBalances = await getGLBalances({ asOfDate: startDate });
            const closingBalances = await getGLBalances({ asOfDate: endDate });

            const getChange = (type, subType) => {
                const opening = openingBalances.filter(b => b.accountType === type && (!subType || b.subType === subType))
                    .reduce((s, b) => s + b.balance, 0);
                const closing = closingBalances.filter(b => b.accountType === type && (!subType || b.subType === subType))
                    .reduce((s, b) => s + b.balance, 0);
                return closing - opening;
            };

            // Working capital changes
            const arChange = -getChange('Asset', 'CurrentAsset'); // Increase in AR = cash outflow
            const apChange = getChange('Liability', 'CurrentLiability'); // Increase in AP = cash inflow

            const operatingActivities = {
                netIncome,
                adjustments: [],
                workingCapitalChanges: [
                    { name: 'Change in Accounts Receivable', amount: arChange },
                    { name: 'Change in Accounts Payable', amount: apChange }
                ],
                netCash: netIncome + arChange + apChange
            };

            const investingActivities = {
                items: [],
                netCash: 0
            };

            const financingActivities = {
                items: [],
                netCash: 0
            };

            res.json({
                period: { startDate, endDate },
                method: 'indirect',
                dataSource: 'Posted GL Entries',
                operating: operatingActivities,
                investing: investingActivities,
                financing: financingActivities,
                netChangeInCash: operatingActivities.netCash + investingActivities.netCash + financingActivities.netCash
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// BUDGET VS ACTUAL
// ============================================

router.get('/budget-vs-actual', async (req, res) => {
    try {
        const { budgetId, startDate, endDate, costCenterId, projectId } = req.query;

        if (!budgetId) {
            return res.status(400).json({ error: 'budgetId is required' });
        }

        const budget = await Budget.findByPk(budgetId, {
            include: [{
                model: BudgetLine,
                as: 'lines',
                include: [{ model: ChartOfAccount, as: 'account', attributes: ['id', 'code', 'name', 'type'] }]
            }]
        });
        if (!budget) return res.status(404).json({ error: 'Budget not found' });

        // Get actual GL balances
        const actualBalances = await getGLBalances({ startDate, endDate, costCenterId, projectId });
        const actualMap = {};
        actualBalances.forEach(b => { actualMap[b.accountId] = b; });

        // Build comparison
        const comparison = budget.lines.map(line => {
            const actual = actualMap[line.accountId];
            const budgetAmount = parseFloat(line.totalAmount) || 0;
            const actualAmount = actual ? actual.balance : 0;
            const variance = actualAmount - budgetAmount;
            const variancePercent = budgetAmount !== 0 ? (variance / budgetAmount * 100) : 0;

            return {
                accountId: line.accountId,
                accountCode: line.account?.code,
                accountName: line.account?.name,
                accountType: line.account?.type,
                budgetAmount,
                actualAmount,
                variance,
                variancePercent: Math.round(variancePercent * 100) / 100,
                status: Math.abs(variancePercent) <= 5 ? 'OnTrack' :
                        (variance > 0 && line.account?.type === 'Expense') ? 'OverBudget' :
                        (variance < 0 && line.account?.type === 'Income') ? 'UnderBudget' : 'Favorable'
            };
        });

        const totalBudget = comparison.reduce((s, c) => s + c.budgetAmount, 0);
        const totalActual = comparison.reduce((s, c) => s + c.actualAmount, 0);

        res.json({
            budget: { id: budget.id, name: budget.name, status: budget.status },
            period: { startDate, endDate },
            dataSource: 'Posted GL Entries',
            comparison,
            totals: {
                totalBudget,
                totalActual,
                totalVariance: totalActual - totalBudget,
                totalVariancePercent: totalBudget !== 0 ? Math.round((totalActual - totalBudget) / totalBudget * 10000) / 100 : 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// DIMENSION-BASED REPORTS
// ============================================

// Report by Cost Center
router.get('/by-cost-center', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const jeWhere = { status: 'Posted', date: { [Op.between]: [startDate, endDate] } };

        const results = await JournalEntryLine.findAll({
            where: { costCenterId: { [Op.ne]: null } },
            include: [{
                model: JournalEntry, as: 'JournalEntry', where: jeWhere, attributes: []
            }],
            attributes: [
                'costCenterId',
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('debitAmount')), 0), 'totalDebit'],
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('creditAmount')), 0), 'totalCredit']
            ],
            group: ['costCenterId'],
            raw: true
        });

        const costCenters = await CostCenter.findAll({ where: { isActive: true } });
        const ccMap = {};
        costCenters.forEach(cc => { ccMap[cc.id] = cc; });

        const report = results.map(r => ({
            costCenterId: r.costCenterId,
            costCenterCode: ccMap[r.costCenterId]?.code,
            costCenterName: ccMap[r.costCenterId]?.name,
            totalDebit: parseFloat(r.totalDebit) || 0,
            totalCredit: parseFloat(r.totalCredit) || 0,
            netAmount: (parseFloat(r.totalDebit) || 0) - (parseFloat(r.totalCredit) || 0)
        }));

        res.json({ period: { startDate, endDate }, dataSource: 'Posted GL Entries', costCenters: report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Report by Project
router.get('/by-project', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const jeWhere = { status: 'Posted', date: { [Op.between]: [startDate, endDate] } };

        const results = await JournalEntryLine.findAll({
            where: { projectId: { [Op.ne]: null } },
            include: [{
                model: JournalEntry, as: 'JournalEntry', where: jeWhere, attributes: []
            }],
            attributes: [
                'projectId',
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('debitAmount')), 0), 'totalDebit'],
                [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('creditAmount')), 0), 'totalCredit']
            ],
            group: ['projectId'],
            raw: true
        });

        const projects = await Project.findAll({ where: { isActive: true } });
        const projMap = {};
        projects.forEach(p => { projMap[p.id] = p; });

        const report = results.map(r => ({
            projectId: r.projectId,
            projectCode: projMap[r.projectId]?.code,
            projectName: projMap[r.projectId]?.name,
            totalDebit: parseFloat(r.totalDebit) || 0,
            totalCredit: parseFloat(r.totalCredit) || 0,
            netAmount: (parseFloat(r.totalDebit) || 0) - (parseFloat(r.totalCredit) || 0)
        }));

        res.json({ period: { startDate, endDate }, dataSource: 'Posted GL Entries', projects: report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// VARIANCE ANALYSIS
// ============================================

router.get('/variance-analysis', async (req, res) => {
    try {
        const { currentStartDate, currentEndDate, priorStartDate, priorEndDate, costCenterId, projectId } = req.query;

        if (!currentStartDate || !currentEndDate || !priorStartDate || !priorEndDate) {
            return res.status(400).json({
                error: 'currentStartDate, currentEndDate, priorStartDate, and priorEndDate are required'
            });
        }

        const currentBalances = await getGLBalances({ startDate: currentStartDate, endDate: currentEndDate, costCenterId, projectId });
        const priorBalances = await getGLBalances({ startDate: priorStartDate, endDate: priorEndDate, costCenterId, projectId });

        const priorMap = {};
        priorBalances.forEach(b => { priorMap[b.accountId] = b; });

        const analysis = currentBalances
            .filter(b => Math.abs(b.balance) > 0.001 || (priorMap[b.accountId] && Math.abs(priorMap[b.accountId].balance) > 0.001))
            .map(current => {
                const prior = priorMap[current.accountId];
                const currentAmount = current.balance;
                const priorAmount = prior ? prior.balance : 0;
                const variance = currentAmount - priorAmount;
                const variancePercent = priorAmount !== 0 ? (variance / priorAmount * 100) : (currentAmount !== 0 ? 100 : 0);

                return {
                    accountCode: current.accountCode,
                    accountName: current.accountName,
                    accountType: current.accountType,
                    currentPeriod: currentAmount,
                    priorPeriod: priorAmount,
                    variance,
                    variancePercent: Math.round(variancePercent * 100) / 100,
                    direction: variance > 0 ? 'Increase' : variance < 0 ? 'Decrease' : 'NoChange'
                };
            });

        res.json({
            currentPeriod: { startDate: currentStartDate, endDate: currentEndDate },
            priorPeriod: { startDate: priorStartDate, endDate: priorEndDate },
            dataSource: 'Posted GL Entries',
            analysis
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// HR REPORTS (preserved from existing code)
// ============================================

router.get('/hr/employee-directory', async (req, res) => {
    try {
        const { department, status, employeeType } = req.query;
        const where = {};
        if (department) where.department = department;
        if (status) where.status = status;
        if (employeeType) where.employeeType = employeeType;

        const employees = await Employee.findAll({ where, order: [['name', 'ASC']] });
        res.json({
            filters: { department, status, employeeType },
            totalEmployees: employees.length,
            employees: employees.map(emp => ({
                id: emp.id, name: emp.name, email: emp.email,
                department: emp.department, designation: emp.designation,
                employeePosition: emp.employeePosition, employeeType: emp.employeeType,
                status: emp.status, joinDate: emp.joinDate,
                workLocation: emp.workLocation, managerId: emp.managerId
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/hr/attendance', async (req, res) => {
    try {
        const { startDate, endDate, employeeId, department } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const where = { date: { [Op.between]: [startDate, endDate] } };
        if (employeeId) {
            where.employeeId = employeeId;
        } else if (department) {
            const employees = await Employee.findAll({ where: { department }, attributes: ['id'] });
            where.employeeId = { [Op.in]: employees.map(e => e.id) };
        }

        const attendance = await AttendanceRecord.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'department', 'designation'] }],
            order: [['date', 'ASC'], ['employeeId', 'ASC']]
        });

        const summary = {
            totalDays: attendance.length,
            present: attendance.filter(a => a.status === 'Present').length,
            absent: attendance.filter(a => a.status === 'Absent').length,
            late: attendance.filter(a => a.status === 'Late').length,
            halfDay: attendance.filter(a => a.status === 'Half Day').length,
            totalHours: attendance.reduce((sum, a) => sum + (a.durationHours || 0), 0)
        };

        res.json({ period: { startDate, endDate }, filters: { employeeId, department }, summary, records: attendance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/hr/leaves', async (req, res) => {
    try {
        const { startDate, endDate, employeeId, department, status, leaveType } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        const where = { startDate: { [Op.lte]: endDate }, endDate: { [Op.gte]: startDate } };
        if (employeeId) {
            where.employeeId = employeeId;
        } else if (department) {
            const employees = await Employee.findAll({ where: { department }, attributes: ['id'] });
            where.employeeId = { [Op.in]: employees.map(e => e.id) };
        }
        if (status) where.status = status;
        if (leaveType) where.type = leaveType;

        const leaves = await LeaveRequest.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'department', 'designation'] }],
            order: [['startDate', 'ASC']]
        });

        const calculateDays = (start, end) => {
            const s = new Date(start), e = new Date(end);
            let days = 0;
            const current = new Date(s);
            while (current <= e) {
                const dow = current.getDay();
                if (dow !== 0 && dow !== 6) days++;
                current.setDate(current.getDate() + 1);
            }
            return days;
        };

        const leavesWithDays = leaves.map(l => ({ ...l.toJSON(), days: calculateDays(l.startDate, l.endDate) }));

        const summary = {
            totalRequests: leaves.length,
            approved: leaves.filter(l => l.status === 'Approved').length,
            pending: leaves.filter(l => l.status === 'Pending').length,
            rejected: leaves.filter(l => l.status === 'Rejected').length,
            totalDays: leavesWithDays.filter(l => l.status === 'Approved').reduce((sum, l) => sum + l.days, 0),
            byType: leavesWithDays.reduce((acc, leave) => {
                if (!acc[leave.type]) acc[leave.type] = { count: 0, days: 0 };
                acc[leave.type].count++;
                if (leave.status === 'Approved') acc[leave.type].days += leave.days;
                return acc;
            }, {})
        };

        res.json({ period: { startDate, endDate }, filters: { employeeId, department, status, leaveType }, summary, leaves: leavesWithDays });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/hr/payroll', async (req, res) => {
    try {
        const { month, department, employeeId } = req.query;
        if (!month) return res.status(400).json({ error: 'Month is required (format: YYYY-MM)' });

        const where = { month };
        if (employeeId) {
            where.employeeId = employeeId;
        } else if (department) {
            const employees = await Employee.findAll({ where: { department }, attributes: ['id'] });
            where.employeeId = { [Op.in]: employees.map(e => e.id) };
        }

        const payslips = await Payslip.findAll({
            where,
            include: [{ model: Employee, attributes: ['id', 'name', 'email', 'department', 'designation', 'employeeType'] }],
            order: [['employeeId', 'ASC']]
        });

        const summary = {
            totalEmployees: payslips.length,
            totalGrossSalary: payslips.reduce((sum, p) => sum + p.basic + p.hra + p.allowances, 0),
            totalDeductions: payslips.reduce((sum, p) => sum + p.deductions, 0),
            totalNetPay: payslips.reduce((sum, p) => sum + p.netPay, 0),
            byDepartment: payslips.reduce((acc, payslip) => {
                const dept = payslip.Employee?.department || 'Unknown';
                if (!acc[dept]) acc[dept] = { count: 0, totalNetPay: 0 };
                acc[dept].count++;
                acc[dept].totalNetPay += payslip.netPay;
                return acc;
            }, {})
        };

        res.json({ month, filters: { department, employeeId }, summary, payslips });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
