/**
 * Database Seed Script
 * 
 * Seeds the database with initial sample data for testing
 * 
 * Usage: npm run db:seed
 */

import dotenv from 'dotenv';
import { sequelize, Customer, Ledger, User, Employee, LeaveRequest, AttendanceRecord, RegularizationRequest, Payslip } from '../src/config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

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
        const adminUser = await User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                id: 'admin-001',
                username: 'admin',
                email: 'admin@grx10.com',
                passwordHash: 'admin123', // TODO: Hash with bcrypt in production
                displayName: 'Administrator',
                role: 'admin',
                isActive: true
            }
        });
        console.log('   ✅ Admin user ready (username: admin, password: admin123)');

        // Seed HRMS Employees
        console.log('📝 Seeding HRMS Employees...');
        const employees = [
            { id: 'EMP001', name: 'Alice Carter', email: 'alice@grx10.com', role: 'HR', department: 'Human Resources', designation: 'HR Manager', joinDate: '2022-01-15', avatar: 'https://picsum.photos/200', salary: 85000, status: 'Active', password: 'password123', isNewUser: false },
            { id: 'EMP002', name: 'Bob Smith', email: 'bob@grx10.com', role: 'Manager', department: 'Engineering', designation: 'Tech Lead', joinDate: '2021-05-20', avatar: 'https://picsum.photos/201', salary: 120000, status: 'Active', password: 'password123', isNewUser: false, managerId: null },
            { id: 'EMP003', name: 'Charlie Davis', email: 'charlie@grx10.com', role: 'Employee', department: 'Engineering', designation: 'Frontend Engineer', joinDate: '2023-02-10', managerId: 'EMP002', avatar: 'https://picsum.photos/202', salary: 90000, status: 'Active', password: 'password123', isNewUser: false },
            { id: 'EMP004', name: 'Diana Evans', email: 'diana@grx10.com', role: 'Finance', department: 'Finance', designation: 'Payroll Specialist', joinDate: '2022-08-01', avatar: 'https://picsum.photos/203', salary: 75000, status: 'Active', password: 'password123', isNewUser: false },
            { id: 'EMP005', name: 'Ethan Hunt', email: 'ethan@grx10.com', role: 'Employee', department: 'Sales', designation: 'Sales Executive', joinDate: '2023-06-15', avatar: 'https://picsum.photos/204', salary: 60000, status: 'Active', password: 'password123', isNewUser: false }
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

        // Seed Attendance Records
        console.log('📝 Seeding Attendance Records...');
        const attendance = [
            { id: 'A001', employeeId: 'EMP003', date: '2023-10-25', checkIn: '09:05', checkOut: '18:10', status: 'Present', durationHours: 9.1 },
            { id: 'A002', employeeId: 'EMP003', date: '2023-10-26', checkIn: '09:30', checkOut: '18:00', status: 'Late', durationHours: 8.5 }
        ];
        
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
        
        console.log('\n✅ Database seeded successfully!');
        console.log('📊 Sample data added:');
        console.log(`   - ${customers.length} Sample Customers`);
        console.log(`   - ${ledgers.length} Sample Ledgers (Chart of Accounts)`);
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

