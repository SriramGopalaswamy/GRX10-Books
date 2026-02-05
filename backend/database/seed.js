/**
 * Database Seed Script
 * 
 * Seeds the database with initial sample data for testing
 * 
 * Usage: npm run db:seed
 */

import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { sequelize, Customer, Ledger, User, Employee, LeaveRequest, AttendanceRecord, RegularizationRequest, Payslip, Organization, Department, Position, HRMSRole, EmployeeType, Holiday, LeaveType, WorkLocation, Skill, Language, ChartOfAccount } from '../src/config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const BCRYPT_SALT_ROUNDS = 10;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');
        
        // Initialize database (sync models)
        await sequelize.sync();
        console.log('✅ Database models synced\n');

        // Seed Ledgers (Chart of Accounts)
        console.log('📝 Seeding Ledgers...');
        const ledgers = [
            { id: 'ledger-001', name: 'Cash', type: 'Asset', balance: 0 },
            { id: 'ledger-002', name: 'Bank Account', type: 'Asset', balance: 0 },
            { id: 'ledger-003', name: 'Accounts Receivable', type: 'Asset', balance: 0 },
            { id: 'ledger-004', name: 'Sales Revenue', type: 'Income', balance: 0 },
            { id: 'ledger-005', name: 'Cost of Goods Sold', type: 'Expense', balance: 0 },
            { id: 'ledger-006', name: 'Operating Expenses', type: 'Expense', balance: 0 }
        ];
        
        for (const ledger of ledgers) {
            await Ledger.findOrCreate({
                where: { id: ledger.id },
                defaults: ledger
            });
        }
        console.log(`   ✅ Created ${ledgers.length} Ledgers`);

        // Seed Customers
        console.log('📝 Seeding Customers...');
        const customers = [
            { id: 'cust-001', name: 'Acme Corporation', gstin: '29AABCU9603R1ZX', email: 'contact@acme.com', balance: 0 },
            { id: 'cust-002', name: 'Tech Solutions Ltd', gstin: '27AABCT1234M1Z5', email: 'info@techsolutions.com', balance: 0 },
            { id: 'cust-003', name: 'Global Industries', gstin: '19AABCG5678K1Z9', email: 'sales@globalind.com', balance: 0 }
        ];
        
        for (const customer of customers) {
            await Customer.findOrCreate({
                where: { id: customer.id },
                defaults: customer
            });
        }
        console.log(`   ✅ Created ${customers.length} Customers`);

        // Seed Admin User (if not exists)
        console.log('📝 Seeding Admin User...');
        const adminPasswordHash = await bcrypt.hash('admin123', BCRYPT_SALT_ROUNDS);
        const adminUser = await User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                id: 'admin-001',
                username: 'admin',
                email: 'admin@grx10.com',
                passwordHash: adminPasswordHash,
                displayName: 'Administrator',
                role: 'admin',
                isActive: true
            }
        });
        console.log('   ✅ Admin user ready (username: admin, password: admin123)');

        // Seed HRMS Employees
        console.log('📝 Seeding HRMS Employees...');
        // Pre-hash passwords for seeding
        const adminHash = await bcrypt.hash('admin123', BCRYPT_SALT_ROUNDS);
        const defaultHash = await bcrypt.hash('password123', BCRYPT_SALT_ROUNDS);

        const employees = [
            { id: 'admin-001', name: 'Administrator', email: 'admin@grx10.com', role: 'Admin', department: 'Administration', designation: 'System Administrator', joinDate: '2020-01-01', avatar: 'https://picsum.photos/199', salary: 150000, status: 'Active', password: adminHash, enableEmailLogin: true, isNewUser: false, managerId: null },
            { id: 'EMP001', name: 'Alice Carter', email: 'alice@grx10.com', role: 'HR', department: 'Human Resources', designation: 'HR Manager', joinDate: '2022-01-15', avatar: 'https://picsum.photos/200', salary: 85000, status: 'Active', password: defaultHash, isNewUser: false, managerId: 'admin-001' },
            { id: 'EMP002', name: 'Bob Smith', email: 'bob@grx10.com', role: 'Manager', department: 'Engineering', designation: 'Tech Lead', joinDate: '2021-05-20', avatar: 'https://picsum.photos/201', salary: 120000, status: 'Active', password: defaultHash, isNewUser: false, managerId: 'admin-001' },
            { id: 'EMP003', name: 'Charlie Davis', email: 'charlie@grx10.com', role: 'Employee', department: 'Engineering', designation: 'Frontend Engineer', joinDate: '2023-02-10', managerId: 'EMP002', avatar: 'https://picsum.photos/202', salary: 90000, status: 'Active', password: defaultHash, isNewUser: false },
            { id: 'EMP004', name: 'Diana Evans', email: 'diana@grx10.com', role: 'Finance', department: 'Finance', designation: 'Payroll Specialist', joinDate: '2022-08-01', avatar: 'https://picsum.photos/203', salary: 75000, status: 'Active', password: defaultHash, isNewUser: false, managerId: 'admin-001' },
            { id: 'EMP005', name: 'Ethan Hunt', email: 'ethan@grx10.com', role: 'Employee', department: 'Sales', designation: 'Sales Executive', joinDate: '2023-06-15', avatar: 'https://picsum.photos/204', salary: 60000, status: 'Active', password: defaultHash, isNewUser: false, managerId: 'admin-001' }
        ];

        for (const employee of employees) {
            await Employee.findOrCreate({
                where: { id: employee.id },
                defaults: employee
            });
        }
        console.log(`   ✅ Created ${employees.length} Sample Employees`);

        // Seed Leave Requests
        console.log('📝 Seeding Leave Requests...');
        const leaves = [
            { id: 'L001', employeeId: 'EMP003', type: 'Sick Leave', startDate: '2023-10-10', endDate: '2023-10-11', reason: 'Viral Fever', status: 'Approved', appliedOn: '2023-10-09' },
            { id: 'L002', employeeId: 'EMP003', type: 'Casual Leave', startDate: '2023-11-05', endDate: '2023-11-05', reason: 'Personal work', status: 'Pending', appliedOn: '2023-11-01' }
        ];
        
        for (const leave of leaves) {
            await LeaveRequest.findOrCreate({
                where: { id: leave.id },
                defaults: leave
            });
        }
        console.log(`   ✅ Created ${leaves.length} Sample Leave Requests`);

        // Seed Attendance Records (Last 30 days for all employees)
        console.log('📝 Seeding Attendance Records...');
        const attendance = [];
        
        // Generate attendance for last 30 working days (excluding weekends)
        const today = new Date();
        const employeeIds = ['admin-001', 'EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'];
        
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dayOfWeek = date.getDay();
            
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;
            
            const dateStr = date.toISOString().split('T')[0];
            
            employeeIds.forEach((empId, empIndex) => {
                // Vary check-in times slightly for realism
                const checkInHour = 9;
                const checkInMinute = empIndex === 0 ? 0 : (empIndex === 1 ? 30 : (empIndex === 2 ? 0 : (empIndex === 3 ? 0 : 0)));
                const checkOutHour = 18;
                const checkOutMinute = empIndex === 0 ? 0 : (empIndex === 1 ? 30 : (empIndex === 2 ? 0 : (empIndex === 3 ? 0 : 0)));
                
                // Some late entries
                const isLate = Math.random() < 0.1 && checkInMinute > 0;
                const status = isLate ? 'Late' : 'Present';
                
                const checkIn = `${String(checkInHour).padStart(2, '0')}:${String(checkInMinute).padStart(2, '0')}`;
                const checkOut = `${String(checkOutHour).padStart(2, '0')}:${String(checkOutMinute).padStart(2, '0')}`;
                const durationHours = checkOutHour - checkInHour + (checkOutMinute - checkInMinute) / 60;
                
                attendance.push({
                    id: `ATT-${empId}-${dateStr.replace(/-/g, '')}`,
                    employeeId: empId,
                    date: dateStr,
                    checkIn: checkIn,
                    checkOut: checkOut,
                    status: status,
                    durationHours: durationHours
                });
            });
        }
        
        for (const record of attendance) {
            await AttendanceRecord.findOrCreate({
                where: { id: record.id },
                defaults: record
            });
        }
        console.log(`   ✅ Created ${attendance.length} Sample Attendance Records`);

        // Seed Regularization Requests
        console.log('📝 Seeding Regularization Requests...');
        const regularizations = [
            { id: 'REG001', employeeId: 'EMP003', employeeName: 'Charlie Davis', date: '2023-10-26', type: 'Missing Punch', reason: 'Forgot to punch out', status: 'Pending', appliedOn: '2023-10-27', newCheckIn: '09:30', newCheckOut: '18:30' },
            { id: 'REG002', employeeId: 'EMP003', employeeName: 'Charlie Davis', date: '2023-10-20', type: 'Work From Home', reason: 'Car breakdown, worked from home', status: 'Approved', appliedOn: '2023-10-20' }
        ];
        
        for (const reg of regularizations) {
            await RegularizationRequest.findOrCreate({
                where: { id: reg.id },
                defaults: reg
            });
        }
        console.log(`   ✅ Created ${regularizations.length} Sample Regularization Requests`);

        // Seed Configuration Data
        console.log('\n📝 Seeding Configuration Data...');
        
        // Organizations
        const organizations = [
            { id: 'org-001', name: 'GRX10 Systems Pvt Ltd', code: 'GRX10', address: '123 Tech Park, Sector 5, Bangalore, Karnataka 560001', phone: '+91-80-12345678', email: 'info@grx10.com', website: 'https://www.grx10.com', taxId: '29AABCG1234H1Z5', isActive: true },
            { id: 'org-002', name: 'GRX10 Solutions', code: 'GRX10-SOL', address: '456 Business Center, Andheri East, Mumbai, Maharashtra 400069', phone: '+91-22-98765432', email: 'solutions@grx10.com', website: 'https://solutions.grx10.com', taxId: '27AABCG5678K1Z9', isActive: true }
        ];
        for (const org of organizations) {
            await Organization.findOrCreate({ where: { id: org.id }, defaults: org });
        }
        console.log(`   ✅ Created ${organizations.length} Organizations`);

        // Departments
        const departments = [
            { id: 'dept-001', name: 'Human Resources', code: 'HR', description: 'Manages employee relations, recruitment, and HR policies', isActive: true },
            { id: 'dept-002', name: 'Engineering', code: 'ENG', description: 'Software development and technical operations', isActive: true },
            { id: 'dept-003', name: 'Finance', code: 'FIN', description: 'Financial management, accounting, and budgeting', isActive: true },
            { id: 'dept-004', name: 'Sales', code: 'SALES', description: 'Sales operations and customer acquisition', isActive: true },
            { id: 'dept-005', name: 'Marketing', code: 'MKT', description: 'Brand management, digital marketing, and communications', isActive: true },
            { id: 'dept-006', name: 'Operations', code: 'OPS', description: 'Business operations and process management', isActive: true },
            { id: 'dept-007', name: 'Customer Support', code: 'CS', description: 'Customer service and technical support', isActive: true },
            { id: 'dept-008', name: 'Quality Assurance', code: 'QA', description: 'Software testing and quality control', isActive: true },
            { id: 'dept-009', name: 'Product Management', code: 'PM', description: 'Product strategy and roadmap management', isActive: true },
            { id: 'dept-010', name: 'Administration', code: 'ADMIN', description: 'Administrative and facilities management', isActive: true }
        ];
        for (const dept of departments) {
            await Department.findOrCreate({ where: { id: dept.id }, defaults: dept });
        }
        console.log(`   ✅ Created ${departments.length} Departments`);

        // Positions
        const positions = [
            { id: 'pos-001', name: 'Chief Executive Officer', code: 'CEO', description: 'Top executive responsible for overall company strategy', isActive: true },
            { id: 'pos-002', name: 'Chief Technology Officer', code: 'CTO', description: 'Leads technology strategy and development', isActive: true },
            { id: 'pos-003', name: 'Chief Financial Officer', code: 'CFO', description: 'Manages financial operations and strategy', isActive: true },
            { id: 'pos-004', name: 'VP Engineering', code: 'VP-ENG', description: 'Senior engineering leadership role', isActive: true },
            { id: 'pos-005', name: 'VP Sales', code: 'VP-SALES', description: 'Senior sales leadership role', isActive: true },
            { id: 'pos-006', name: 'HR Manager', code: 'HR-MGR', description: 'Manages HR operations and policies', isActive: true },
            { id: 'pos-007', name: 'Engineering Manager', code: 'ENG-MGR', description: 'Manages engineering team and projects', isActive: true },
            { id: 'pos-008', name: 'Finance Manager', code: 'FIN-MGR', description: 'Manages finance and accounting operations', isActive: true },
            { id: 'pos-009', name: 'Sales Manager', code: 'SALES-MGR', description: 'Manages sales team and targets', isActive: true },
            { id: 'pos-010', name: 'Tech Lead', code: 'TECH-LEAD', description: 'Technical leadership for development teams', isActive: true },
            { id: 'pos-011', name: 'Senior Software Engineer', code: 'SSE', description: 'Senior developer role', isActive: true },
            { id: 'pos-012', name: 'Software Engineer', code: 'SE', description: 'Mid-level developer role', isActive: true },
            { id: 'pos-013', name: 'Junior Software Engineer', code: 'JSE', description: 'Entry-level developer role', isActive: true },
            { id: 'pos-014', name: 'HR Executive', code: 'HR-EXEC', description: 'HR operations and support', isActive: true },
            { id: 'pos-015', name: 'Accountant', code: 'ACC', description: 'Accounting and bookkeeping', isActive: true },
            { id: 'pos-016', name: 'Sales Executive', code: 'SALES-EXEC', description: 'Sales and business development', isActive: true },
            { id: 'pos-017', name: 'Business Analyst', code: 'BA', description: 'Business analysis and requirements', isActive: true },
            { id: 'pos-018', name: 'QA Engineer', code: 'QA-ENG', description: 'Quality assurance and testing', isActive: true },
            { id: 'pos-019', name: 'Product Manager', code: 'PM', description: 'Product management and strategy', isActive: true },
            { id: 'pos-020', name: 'Designer', code: 'DESIGN', description: 'UI/UX design', isActive: true }
        ];
        for (const pos of positions) {
            await Position.findOrCreate({ where: { id: pos.id }, defaults: pos });
        }
        console.log(`   ✅ Created ${positions.length} Positions`);

        // HRMS Roles
        const hrmsRoles = [
            { id: 'hrms-role-001', name: 'HR', code: 'HR', description: 'Human Resources role with access to employee data and HR functions', permissions: JSON.stringify(['employees.view', 'employees.edit', 'leaves.approve', 'attendance.view']), isActive: true },
            { id: 'hrms-role-002', name: 'Manager', code: 'MGR', description: 'Manager role with team management capabilities', permissions: JSON.stringify(['employees.view', 'leaves.approve', 'attendance.view']), isActive: true },
            { id: 'hrms-role-003', name: 'Employee', code: 'EMP', description: 'Standard employee role', permissions: JSON.stringify(['employees.view.own', 'leaves.request', 'attendance.log']), isActive: true },
            { id: 'hrms-role-004', name: 'Finance', code: 'FIN', description: 'Finance role with access to payroll and financial data', permissions: JSON.stringify(['payroll.view', 'payroll.edit', 'employees.view']), isActive: true },
            { id: 'hrms-role-005', name: 'Admin', code: 'ADMIN', description: 'Administrator with full access', permissions: JSON.stringify(['*']), isActive: true }
        ];
        for (const role of hrmsRoles) {
            await HRMSRole.findOrCreate({ where: { id: role.id }, defaults: role });
        }
        console.log(`   ✅ Created ${hrmsRoles.length} HRMS Roles`);

        // Employee Types
        const employeeTypes = [
            { id: 'emp-type-001', name: 'Full Time', code: 'FT', description: 'Full-time permanent employee', isActive: true },
            { id: 'emp-type-002', name: 'Part Time', code: 'PT', description: 'Part-time employee', isActive: true },
            { id: 'emp-type-003', name: 'Contract', code: 'CONTRACT', description: 'Contract-based employee', isActive: true },
            { id: 'emp-type-004', name: 'Intern', code: 'INTERN', description: 'Internship position', isActive: true },
            { id: 'emp-type-005', name: 'Consultant', code: 'CONSULT', description: 'Consultant or freelancer', isActive: true },
            { id: 'emp-type-006', name: 'Temporary', code: 'TEMP', description: 'Temporary employee', isActive: true }
        ];
        for (const type of employeeTypes) {
            await EmployeeType.findOrCreate({ where: { id: type.id }, defaults: type });
        }
        console.log(`   ✅ Created ${employeeTypes.length} Employee Types`);

        // Holidays (2024-2025)
        const holidays = [
            { id: 'hol-001', name: 'Republic Day', date: '2024-01-26', type: 'National', description: 'Republic Day of India', isActive: true },
            { id: 'hol-002', name: 'Holi', date: '2024-03-25', type: 'National', description: 'Festival of Colors', isActive: true },
            { id: 'hol-003', name: 'Good Friday', date: '2024-03-29', type: 'National', description: 'Good Friday', isActive: true },
            { id: 'hol-004', name: 'Eid ul-Fitr', date: '2024-04-11', type: 'National', description: 'Eid ul-Fitr', isActive: true },
            { id: 'hol-005', name: 'Independence Day', date: '2024-08-15', type: 'National', description: 'Independence Day of India', isActive: true },
            { id: 'hol-006', name: 'Ganesh Chaturthi', date: '2024-09-07', type: 'Regional', description: 'Ganesh Chaturthi (Mumbai/Pune)', isActive: true },
            { id: 'hol-007', name: 'Dussehra', date: '2024-10-12', type: 'National', description: 'Dussehra', isActive: true },
            { id: 'hol-008', name: 'Diwali', date: '2024-10-31', type: 'National', description: 'Diwali - Festival of Lights', isActive: true },
            { id: 'hol-009', name: 'Christmas', date: '2024-12-25', type: 'National', description: 'Christmas Day', isActive: true },
            { id: 'hol-010', name: 'New Year', date: '2025-01-01', type: 'National', description: 'New Year Day', isActive: true },
            { id: 'hol-011', name: 'Republic Day', date: '2025-01-26', type: 'National', description: 'Republic Day of India', isActive: true },
            { id: 'hol-012', name: 'Holi', date: '2025-03-14', type: 'National', description: 'Festival of Colors', isActive: true },
            { id: 'hol-013', name: 'Good Friday', date: '2025-04-18', type: 'National', description: 'Good Friday', isActive: true },
            { id: 'hol-014', name: 'Independence Day', date: '2025-08-15', type: 'National', description: 'Independence Day of India', isActive: true },
            { id: 'hol-015', name: 'Ganesh Chaturthi', date: '2025-08-27', type: 'Regional', description: 'Ganesh Chaturthi (Mumbai/Pune)', isActive: true },
            { id: 'hol-016', name: 'Dussehra', date: '2025-10-02', type: 'National', description: 'Dussehra', isActive: true },
            { id: 'hol-017', name: 'Diwali', date: '2025-10-20', type: 'National', description: 'Diwali - Festival of Lights', isActive: true },
            { id: 'hol-018', name: 'Christmas', date: '2025-12-25', type: 'National', description: 'Christmas Day', isActive: true },
            { id: 'hol-019', name: 'Company Foundation Day', date: '2024-06-15', type: 'Company', description: 'GRX10 Foundation Day', isActive: true },
            { id: 'hol-020', name: 'Company Foundation Day', date: '2025-06-15', type: 'Company', description: 'GRX10 Foundation Day', isActive: true }
        ];
        for (const holiday of holidays) {
            await Holiday.findOrCreate({ where: { id: holiday.id }, defaults: holiday });
        }
        console.log(`   ✅ Created ${holidays.length} Holidays`);

        // Leave Types
        const leaveTypes = [
            { id: 'leave-001', name: 'Casual Leave', code: 'CL', description: 'Casual leave for personal work', maxDays: 12, isPaid: true, requiresApproval: true, isActive: true },
            { id: 'leave-002', name: 'Sick Leave', code: 'SL', description: 'Medical leave for illness', maxDays: 12, isPaid: true, requiresApproval: true, isActive: true },
            { id: 'leave-003', name: 'Earned Leave', code: 'EL', description: 'Earned/Privilege leave', maxDays: 15, isPaid: true, requiresApproval: true, isActive: true },
            { id: 'leave-004', name: 'Compensatory Off', code: 'CO', description: 'Compensatory leave for working on holidays', maxDays: 5, isPaid: true, requiresApproval: true, isActive: true },
            { id: 'leave-005', name: 'Leave Without Pay', code: 'LWP', description: 'Unpaid leave', maxDays: 30, isPaid: false, requiresApproval: true, isActive: true },
            { id: 'leave-006', name: 'Maternity Leave', code: 'ML', description: 'Maternity leave for female employees', maxDays: 180, isPaid: true, requiresApproval: true, isActive: true },
            { id: 'leave-007', name: 'Paternity Leave', code: 'PL', description: 'Paternity leave for male employees', maxDays: 7, isPaid: true, requiresApproval: true, isActive: true },
            { id: 'leave-008', name: 'Bereavement Leave', code: 'BL', description: 'Leave for family member death', maxDays: 5, isPaid: true, requiresApproval: true, isActive: true },
            { id: 'leave-009', name: 'Marriage Leave', code: 'MAR', description: 'Leave for own marriage', maxDays: 3, isPaid: true, requiresApproval: true, isActive: true },
            { id: 'leave-010', name: 'Sabbatical', code: 'SAB', description: 'Extended leave for personal development', maxDays: 90, isPaid: false, requiresApproval: true, isActive: true }
        ];
        for (const leaveType of leaveTypes) {
            await LeaveType.findOrCreate({ where: { id: leaveType.id }, defaults: leaveType });
        }
        console.log(`   ✅ Created ${leaveTypes.length} Leave Types`);

        // Work Locations
        const workLocations = [
            { id: 'loc-001', name: 'Bangalore HQ', code: 'BLR-HQ', address: '123 Tech Park, Sector 5', city: 'Bangalore', state: 'Karnataka', country: 'India', isActive: true },
            { id: 'loc-002', name: 'Mumbai Office', code: 'MUM-OFF', address: '456 Business Center, Andheri East', city: 'Mumbai', state: 'Maharashtra', country: 'India', isActive: true },
            { id: 'loc-003', name: 'Delhi Office', code: 'DEL-OFF', address: '789 Corporate Tower, Connaught Place', city: 'New Delhi', state: 'Delhi', country: 'India', isActive: true },
            { id: 'loc-004', name: 'Hyderabad Office', code: 'HYD-OFF', address: '321 IT Park, Hitech City', city: 'Hyderabad', state: 'Telangana', country: 'India', isActive: true },
            { id: 'loc-005', name: 'Pune Office', code: 'PUN-OFF', address: '654 Software Park, Hinjewadi', city: 'Pune', state: 'Maharashtra', country: 'India', isActive: true },
            { id: 'loc-006', name: 'Chennai Office', code: 'CHE-OFF', address: '987 Tech Hub, OMR', city: 'Chennai', state: 'Tamil Nadu', country: 'India', isActive: true },
            { id: 'loc-007', name: 'Remote', code: 'REMOTE', address: 'Work from Home', city: 'Various', state: 'Various', country: 'India', isActive: true }
        ];
        for (const loc of workLocations) {
            await WorkLocation.findOrCreate({ where: { id: loc.id }, defaults: loc });
        }
        console.log(`   ✅ Created ${workLocations.length} Work Locations`);

        // Skills
        const skills = [
            { id: 'skill-001', name: 'JavaScript', category: 'Technical', description: 'JavaScript programming language', isActive: true },
            { id: 'skill-002', name: 'TypeScript', category: 'Technical', description: 'TypeScript programming language', isActive: true },
            { id: 'skill-003', name: 'React', category: 'Technical', description: 'React.js framework', isActive: true },
            { id: 'skill-004', name: 'Node.js', category: 'Technical', description: 'Node.js runtime environment', isActive: true },
            { id: 'skill-005', name: 'Python', category: 'Technical', description: 'Python programming language', isActive: true },
            { id: 'skill-006', name: 'Java', category: 'Technical', description: 'Java programming language', isActive: true },
            { id: 'skill-007', name: 'SQL', category: 'Technical', description: 'Structured Query Language', isActive: true },
            { id: 'skill-008', name: 'MongoDB', category: 'Technical', description: 'MongoDB database', isActive: true },
            { id: 'skill-009', name: 'PostgreSQL', category: 'Technical', description: 'PostgreSQL database', isActive: true },
            { id: 'skill-010', name: 'AWS', category: 'Technical', description: 'Amazon Web Services', isActive: true },
            { id: 'skill-011', name: 'Docker', category: 'Technical', description: 'Docker containerization', isActive: true },
            { id: 'skill-012', name: 'Kubernetes', category: 'Technical', description: 'Kubernetes orchestration', isActive: true },
            { id: 'skill-013', name: 'Git', category: 'Technical', description: 'Version control with Git', isActive: true },
            { id: 'skill-014', name: 'CI/CD', category: 'Technical', description: 'Continuous Integration/Deployment', isActive: true },
            { id: 'skill-015', name: 'REST API', category: 'Technical', description: 'RESTful API development', isActive: true },
            { id: 'skill-016', name: 'Communication', category: 'Soft', description: 'Effective communication skills', isActive: true },
            { id: 'skill-017', name: 'Leadership', category: 'Soft', description: 'Leadership and team management', isActive: true },
            { id: 'skill-018', name: 'Problem Solving', category: 'Soft', description: 'Analytical problem-solving abilities', isActive: true },
            { id: 'skill-019', name: 'Teamwork', category: 'Soft', description: 'Collaboration and teamwork', isActive: true },
            { id: 'skill-020', name: 'Time Management', category: 'Soft', description: 'Effective time management', isActive: true },
            { id: 'skill-021', name: 'Project Management', category: 'Soft', description: 'Project planning and execution', isActive: true },
            { id: 'skill-022', name: 'Agile/Scrum', category: 'Soft', description: 'Agile methodology and Scrum framework', isActive: true },
            { id: 'skill-023', name: 'Financial Accounting', category: 'Domain', description: 'Financial accounting and reporting', isActive: true },
            { id: 'skill-024', name: 'GST Compliance', category: 'Domain', description: 'GST filing and compliance', isActive: true },
            { id: 'skill-025', name: 'HR Management', category: 'Domain', description: 'Human resource management', isActive: true },
            { id: 'skill-026', name: 'Payroll Processing', category: 'Domain', description: 'Payroll calculation and processing', isActive: true },
            { id: 'skill-027', name: 'Sales & Marketing', category: 'Domain', description: 'Sales and marketing strategies', isActive: true },
            { id: 'skill-028', name: 'Customer Relations', category: 'Domain', description: 'Customer relationship management', isActive: true }
        ];
        for (const skill of skills) {
            await Skill.findOrCreate({ where: { id: skill.id }, defaults: skill });
        }
        console.log(`   ✅ Created ${skills.length} Skills`);

        // Languages
        const languages = [
            { id: 'lang-001', name: 'English', code: 'en', isActive: true },
            { id: 'lang-002', name: 'Hindi', code: 'hi', isActive: true },
            { id: 'lang-003', name: 'Kannada', code: 'kn', isActive: true },
            { id: 'lang-004', name: 'Tamil', code: 'ta', isActive: true },
            { id: 'lang-005', name: 'Telugu', code: 'te', isActive: true },
            { id: 'lang-006', name: 'Marathi', code: 'mr', isActive: true },
            { id: 'lang-007', name: 'Bengali', code: 'bn', isActive: true },
            { id: 'lang-008', name: 'Gujarati', code: 'gu', isActive: true },
            { id: 'lang-009', name: 'Malayalam', code: 'ml', isActive: true },
            { id: 'lang-010', name: 'Punjabi', code: 'pa', isActive: true },
            { id: 'lang-011', name: 'Urdu', code: 'ur', isActive: true },
            { id: 'lang-012', name: 'Sanskrit', code: 'sa', isActive: true },
            { id: 'lang-013', name: 'French', code: 'fr', isActive: true },
            { id: 'lang-014', name: 'Spanish', code: 'es', isActive: true },
            { id: 'lang-015', name: 'German', code: 'de', isActive: true },
            { id: 'lang-016', name: 'Japanese', code: 'ja', isActive: true },
            { id: 'lang-017', name: 'Chinese', code: 'zh', isActive: true }
        ];
        for (const lang of languages) {
            await Language.findOrCreate({ where: { id: lang.id }, defaults: lang });
        }
        console.log(`   ✅ Created ${languages.length} Languages`);

        // Chart of Accounts (Top level only - full hierarchy in SQL)
        const chartOfAccounts = [
            { id: 'coa-001', code: '1000', name: 'Assets', type: 'Asset', parentId: null, description: 'All asset accounts', isActive: true },
            { id: 'coa-002', code: '1100', name: 'Current Assets', type: 'Asset', parentId: 'coa-001', description: 'Current assets', isActive: true },
            { id: 'coa-003', code: '1110', name: 'Cash and Cash Equivalents', type: 'Asset', parentId: 'coa-002', description: 'Cash in hand and bank', isActive: true },
            { id: 'coa-004', code: '1111', name: 'Cash in Hand', type: 'Asset', parentId: 'coa-003', description: 'Physical cash', isActive: true },
            { id: 'coa-005', code: '1112', name: 'Bank Account - HDFC', type: 'Asset', parentId: 'coa-003', description: 'HDFC Bank current account', isActive: true },
            { id: 'coa-013', code: '2000', name: 'Liabilities', type: 'Liability', parentId: null, description: 'All liability accounts', isActive: true },
            { id: 'coa-014', code: '2100', name: 'Current Liabilities', type: 'Liability', parentId: 'coa-013', description: 'Current liabilities', isActive: true },
            { id: 'coa-015', code: '2110', name: 'Accounts Payable', type: 'Liability', parentId: 'coa-014', description: 'Money owed to vendors', isActive: true },
            { id: 'coa-024', code: '3000', name: 'Equity', type: 'Equity', parentId: null, description: 'All equity accounts', isActive: true },
            { id: 'coa-028', code: '4000', name: 'Income', type: 'Income', parentId: null, description: 'All income accounts', isActive: true },
            { id: 'coa-029', code: '4100', name: 'Sales Revenue', type: 'Income', parentId: 'coa-028', description: 'Revenue from sales', isActive: true },
            { id: 'coa-035', code: '5000', name: 'Expenses', type: 'Expense', parentId: null, description: 'All expense accounts', isActive: true },
            { id: 'coa-037', code: '5200', name: 'Operating Expenses', type: 'Expense', parentId: 'coa-035', description: 'Operating expenses', isActive: true }
        ];
        for (const coa of chartOfAccounts) {
            await ChartOfAccount.findOrCreate({ where: { id: coa.id }, defaults: coa });
        }
        console.log(`   ✅ Created ${chartOfAccounts.length} Chart of Accounts (sample)`);
        
        console.log('\n✅ Database seeded successfully!');
        console.log('📊 Sample data added:');
        console.log(`   - ${organizations.length} Organizations`);
        console.log(`   - ${departments.length} Departments`);
        console.log(`   - ${positions.length} Positions`);
        console.log(`   - ${hrmsRoles.length} HRMS Roles`);
        console.log(`   - ${employeeTypes.length} Employee Types`);
        console.log(`   - ${holidays.length} Holidays`);
        console.log(`   - ${leaveTypes.length} Leave Types`);
        console.log(`   - ${workLocations.length} Work Locations`);
        console.log(`   - ${skills.length} Skills`);
        console.log(`   - ${languages.length} Languages`);
        console.log(`   - ${chartOfAccounts.length} Chart of Accounts`);
        console.log(`   - ${customers.length} Sample Customers`);
        console.log(`   - ${ledgers.length} Sample Ledgers`);
        console.log('   - 1 Admin User (username: admin, password: admin123)');
        console.log(`   - ${employees.length} Sample Employees`);
        console.log(`   - ${leaves.length} Sample Leave Requests`);
        console.log(`   - ${attendance.length} Sample Attendance Records`);
        console.log(`   - ${regularizations.length} Sample Regularization Requests`);
        
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Database seeding failed:', error.message);
        console.error(error);
        await sequelize.close();
        process.exit(1);
    }
}

// Run directly when executed
seedDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

