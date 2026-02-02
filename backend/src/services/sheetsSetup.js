/**
 * Google Sheets Database Setup Script
 * Initializes all sheets and seeds initial data
 */

import { v4 as uuidv4 } from 'uuid';
import {
  initDb,
  Organization,
  Department,
  Position,
  HRMSRole,
  EmployeeType,
  Holiday,
  LeaveType,
  WorkLocation,
  Skill,
  Language,
  ChartOfAccount,
  Customer,
  Ledger,
  Employee,
  Role,
  Permission
} from './sheetsModels.js';

async function seedData() {
  console.log('🌱 Seeding initial data...');

  // Check if data already exists
  const existingOrgs = await Organization.findAll();
  if (existingOrgs.length > 0) {
    console.log('⚠️ Data already exists, skipping seed');
    return;
  }

  // Organizations
  console.log('  Creating Organizations...');
  await Organization.bulkCreate([
    { id: uuidv4(), name: 'GRX10 Technologies', code: 'GRX10', address: '123 Tech Park, Bangalore', phone: '+91 80 1234 5678', email: 'info@grx10.com', website: 'https://grx10.com', taxId: 'GSTIN123456789' },
    { id: uuidv4(), name: 'GRX10 Subsidiary', code: 'GRX10-SUB', address: '456 Business Center, Mumbai', phone: '+91 22 9876 5432', email: 'subsidiary@grx10.com' }
  ]);

  // Departments
  console.log('  Creating Departments...');
  await Department.bulkCreate([
    { id: uuidv4(), name: 'Human Resources', code: 'HR', description: 'Human Resources Department' },
    { id: uuidv4(), name: 'Engineering', code: 'ENG', description: 'Software Engineering Department' },
    { id: uuidv4(), name: 'Finance', code: 'FIN', description: 'Finance and Accounting Department' },
    { id: uuidv4(), name: 'Sales', code: 'SALES', description: 'Sales Department' },
    { id: uuidv4(), name: 'Marketing', code: 'MKT', description: 'Marketing Department' },
    { id: uuidv4(), name: 'Operations', code: 'OPS', description: 'Operations Department' },
    { id: uuidv4(), name: 'Customer Support', code: 'CS', description: 'Customer Support Department' },
    { id: uuidv4(), name: 'Product', code: 'PROD', description: 'Product Management Department' },
    { id: uuidv4(), name: 'Legal', code: 'LEGAL', description: 'Legal Department' },
    { id: uuidv4(), name: 'Administration', code: 'ADMIN', description: 'Administration Department' }
  ]);

  // Positions
  console.log('  Creating Positions...');
  await Position.bulkCreate([
    { id: uuidv4(), name: 'Chief Executive Officer', code: 'CEO' },
    { id: uuidv4(), name: 'Chief Technology Officer', code: 'CTO' },
    { id: uuidv4(), name: 'Chief Financial Officer', code: 'CFO' },
    { id: uuidv4(), name: 'Vice President', code: 'VP' },
    { id: uuidv4(), name: 'Director', code: 'DIR' },
    { id: uuidv4(), name: 'Senior Manager', code: 'SM' },
    { id: uuidv4(), name: 'Manager', code: 'MGR' },
    { id: uuidv4(), name: 'Team Lead', code: 'TL' },
    { id: uuidv4(), name: 'Senior Engineer', code: 'SE' },
    { id: uuidv4(), name: 'Engineer', code: 'ENG' },
    { id: uuidv4(), name: 'Junior Engineer', code: 'JE' },
    { id: uuidv4(), name: 'Analyst', code: 'ANL' },
    { id: uuidv4(), name: 'Associate', code: 'ASSOC' },
    { id: uuidv4(), name: 'Intern', code: 'INT' }
  ]);

  // HRMS Roles
  console.log('  Creating HRMS Roles...');
  await HRMSRole.bulkCreate([
    { id: uuidv4(), name: 'Admin', code: 'ADMIN', description: 'Full system access', permissions: JSON.stringify(['all']) },
    { id: uuidv4(), name: 'HR Manager', code: 'HR_MGR', description: 'HR management access', permissions: JSON.stringify(['hrms.*', 'config.*']) },
    { id: uuidv4(), name: 'Manager', code: 'MGR', description: 'Team management access', permissions: JSON.stringify(['hrms.team.*']) },
    { id: uuidv4(), name: 'Employee', code: 'EMP', description: 'Basic employee access', permissions: JSON.stringify(['hrms.self.*']) },
    { id: uuidv4(), name: 'Finance Manager', code: 'FIN_MGR', description: 'Finance management access', permissions: JSON.stringify(['financial.*']) }
  ]);

  // Employee Types
  console.log('  Creating Employee Types...');
  await EmployeeType.bulkCreate([
    { id: uuidv4(), name: 'Full Time', code: 'FT', description: 'Full-time permanent employee' },
    { id: uuidv4(), name: 'Part Time', code: 'PT', description: 'Part-time employee' },
    { id: uuidv4(), name: 'Contract', code: 'CON', description: 'Contract employee' },
    { id: uuidv4(), name: 'Intern', code: 'INT', description: 'Internship' },
    { id: uuidv4(), name: 'Consultant', code: 'CONS', description: 'External consultant' },
    { id: uuidv4(), name: 'Temporary', code: 'TEMP', description: 'Temporary employee' }
  ]);

  // Holidays (2024-2025)
  console.log('  Creating Holidays...');
  await Holiday.bulkCreate([
    { id: uuidv4(), name: 'New Year', date: '2025-01-01', type: 'National' },
    { id: uuidv4(), name: 'Republic Day', date: '2025-01-26', type: 'National' },
    { id: uuidv4(), name: 'Holi', date: '2025-03-14', type: 'National' },
    { id: uuidv4(), name: 'Good Friday', date: '2025-04-18', type: 'National' },
    { id: uuidv4(), name: 'May Day', date: '2025-05-01', type: 'National' },
    { id: uuidv4(), name: 'Independence Day', date: '2025-08-15', type: 'National' },
    { id: uuidv4(), name: 'Gandhi Jayanti', date: '2025-10-02', type: 'National' },
    { id: uuidv4(), name: 'Diwali', date: '2025-10-20', type: 'National' },
    { id: uuidv4(), name: 'Christmas', date: '2025-12-25', type: 'National' }
  ]);

  // Leave Types
  console.log('  Creating Leave Types...');
  await LeaveType.bulkCreate([
    { id: uuidv4(), name: 'Sick Leave', code: 'SL', maxDays: 12, isPaid: true, requiresApproval: true },
    { id: uuidv4(), name: 'Casual Leave', code: 'CL', maxDays: 12, isPaid: true, requiresApproval: true },
    { id: uuidv4(), name: 'Earned Leave', code: 'EL', maxDays: 15, isPaid: true, requiresApproval: true },
    { id: uuidv4(), name: 'Loss of Pay', code: 'LOP', maxDays: 365, isPaid: false, requiresApproval: true },
    { id: uuidv4(), name: 'Maternity Leave', code: 'ML', maxDays: 182, isPaid: true, requiresApproval: true },
    { id: uuidv4(), name: 'Paternity Leave', code: 'PL', maxDays: 15, isPaid: true, requiresApproval: true },
    { id: uuidv4(), name: 'Bereavement Leave', code: 'BL', maxDays: 5, isPaid: true, requiresApproval: true },
    { id: uuidv4(), name: 'Compensatory Off', code: 'CO', maxDays: 30, isPaid: true, requiresApproval: true }
  ]);

  // Work Locations
  console.log('  Creating Work Locations...');
  await WorkLocation.bulkCreate([
    { id: uuidv4(), name: 'Bangalore HQ', code: 'BLR', address: '123 Tech Park', city: 'Bangalore', state: 'Karnataka', country: 'India' },
    { id: uuidv4(), name: 'Mumbai Office', code: 'MUM', address: '456 Business Center', city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    { id: uuidv4(), name: 'Delhi Office', code: 'DEL', address: '789 Corporate Tower', city: 'New Delhi', state: 'Delhi', country: 'India' },
    { id: uuidv4(), name: 'Remote - India', code: 'REM-IN', city: 'Various', country: 'India' },
    { id: uuidv4(), name: 'Remote - International', code: 'REM-INTL', country: 'Various' }
  ]);

  // Skills
  console.log('  Creating Skills...');
  await Skill.bulkCreate([
    { id: uuidv4(), name: 'JavaScript', category: 'Programming' },
    { id: uuidv4(), name: 'TypeScript', category: 'Programming' },
    { id: uuidv4(), name: 'Python', category: 'Programming' },
    { id: uuidv4(), name: 'Java', category: 'Programming' },
    { id: uuidv4(), name: 'React', category: 'Framework' },
    { id: uuidv4(), name: 'Node.js', category: 'Framework' },
    { id: uuidv4(), name: 'SQL', category: 'Database' },
    { id: uuidv4(), name: 'MongoDB', category: 'Database' },
    { id: uuidv4(), name: 'AWS', category: 'Cloud' },
    { id: uuidv4(), name: 'Docker', category: 'DevOps' },
    { id: uuidv4(), name: 'Project Management', category: 'Management' },
    { id: uuidv4(), name: 'Agile/Scrum', category: 'Management' }
  ]);

  // Languages
  console.log('  Creating Languages...');
  await Language.bulkCreate([
    { id: uuidv4(), name: 'English', code: 'en' },
    { id: uuidv4(), name: 'Hindi', code: 'hi' },
    { id: uuidv4(), name: 'Kannada', code: 'kn' },
    { id: uuidv4(), name: 'Tamil', code: 'ta' },
    { id: uuidv4(), name: 'Telugu', code: 'te' },
    { id: uuidv4(), name: 'Marathi', code: 'mr' },
    { id: uuidv4(), name: 'Bengali', code: 'bn' }
  ]);

  // Chart of Accounts
  console.log('  Creating Chart of Accounts...');
  await ChartOfAccount.bulkCreate([
    // Assets
    { id: uuidv4(), code: '1000', name: 'Assets', type: 'Asset' },
    { id: uuidv4(), code: '1100', name: 'Cash and Bank', type: 'Asset' },
    { id: uuidv4(), code: '1200', name: 'Accounts Receivable', type: 'Asset' },
    { id: uuidv4(), code: '1300', name: 'Inventory', type: 'Asset' },
    { id: uuidv4(), code: '1400', name: 'Fixed Assets', type: 'Asset' },
    // Liabilities
    { id: uuidv4(), code: '2000', name: 'Liabilities', type: 'Liability' },
    { id: uuidv4(), code: '2100', name: 'Accounts Payable', type: 'Liability' },
    { id: uuidv4(), code: '2200', name: 'Short-term Loans', type: 'Liability' },
    { id: uuidv4(), code: '2300', name: 'Long-term Loans', type: 'Liability' },
    // Income
    { id: uuidv4(), code: '4000', name: 'Revenue', type: 'Income' },
    { id: uuidv4(), code: '4100', name: 'Sales Revenue', type: 'Income' },
    { id: uuidv4(), code: '4200', name: 'Service Revenue', type: 'Income' },
    { id: uuidv4(), code: '4300', name: 'Other Income', type: 'Income' },
    // Expenses
    { id: uuidv4(), code: '5000', name: 'Expenses', type: 'Expense' },
    { id: uuidv4(), code: '5100', name: 'Cost of Goods Sold', type: 'Expense' },
    { id: uuidv4(), code: '5200', name: 'Salaries and Wages', type: 'Expense' },
    { id: uuidv4(), code: '5300', name: 'Rent Expense', type: 'Expense' },
    { id: uuidv4(), code: '5400', name: 'Utilities Expense', type: 'Expense' },
    { id: uuidv4(), code: '5500', name: 'Office Supplies', type: 'Expense' },
    // Equity
    { id: uuidv4(), code: '3000', name: 'Equity', type: 'Equity' },
    { id: uuidv4(), code: '3100', name: 'Share Capital', type: 'Equity' },
    { id: uuidv4(), code: '3200', name: 'Retained Earnings', type: 'Equity' }
  ]);

  // Sample Customers
  console.log('  Creating Sample Customers...');
  await Customer.bulkCreate([
    { id: uuidv4(), name: 'Acme Corporation', gstin: 'GSTIN001', email: 'acme@example.com', balance: 0 },
    { id: uuidv4(), name: 'Tech Solutions Ltd', gstin: 'GSTIN002', email: 'tech@example.com', balance: 0 },
    { id: uuidv4(), name: 'Global Enterprises', gstin: 'GSTIN003', email: 'global@example.com', balance: 0 }
  ]);

  // Sample Ledgers
  console.log('  Creating Sample Ledgers...');
  await Ledger.bulkCreate([
    { id: uuidv4(), name: 'Cash', type: 'Asset', balance: 100000 },
    { id: uuidv4(), name: 'Bank Account', type: 'Asset', balance: 500000 },
    { id: uuidv4(), name: 'Sales', type: 'Income', balance: 0 },
    { id: uuidv4(), name: 'Purchases', type: 'Expense', balance: 0 },
    { id: uuidv4(), name: 'Salaries', type: 'Expense', balance: 0 },
    { id: uuidv4(), name: 'Capital', type: 'Equity', balance: 600000 }
  ]);

  // Admin Employee
  console.log('  Creating Admin Employee...');
  const adminId = uuidv4();
  await Employee.create({
    id: adminId,
    name: 'System Administrator',
    email: 'admin@grx10.com',
    role: 'Admin',
    department: 'Administration',
    designation: 'System Administrator',
    joinDate: '2024-01-01',
    employeeType: 'Full Time',
    status: 'Active',
    password: 'admin123',
    enableEmailLogin: true,
    salary: 0
  });

  // System Roles
  console.log('  Creating System Roles...');
  await Role.bulkCreate([
    { id: uuidv4(), name: 'Super Admin', code: 'SUPER_ADMIN', description: 'Full system access', isSystemRole: true },
    { id: uuidv4(), name: 'Admin', code: 'ADMIN', description: 'Administrative access', isSystemRole: true },
    { id: uuidv4(), name: 'Manager', code: 'MANAGER', description: 'Team management access', isSystemRole: false },
    { id: uuidv4(), name: 'Employee', code: 'EMPLOYEE', description: 'Basic employee access', isSystemRole: false }
  ]);

  // Basic Permissions
  console.log('  Creating Permissions...');
  const modules = ['hrms', 'financial', 'os', 'config', 'admin'];
  const resources = ['employees', 'leaves', 'attendance', 'payroll', 'invoices', 'customers', 'goals', 'memos'];
  const actions = ['create', 'read', 'update', 'delete', 'approve'];

  const permissions = [];
  for (const module of modules) {
    for (const resource of resources) {
      for (const action of actions) {
        permissions.push({
          id: uuidv4(),
          name: `${module}.${resource}.${action}`,
          code: `${module.toUpperCase()}_${resource.toUpperCase()}_${action.toUpperCase()}`,
          module,
          resource,
          action,
          description: `${action} access to ${resource} in ${module} module`
        });
      }
    }
  }
  await Permission.bulkCreate(permissions);

  console.log('✅ Seed data created successfully');
}

async function setup() {
  console.log('🚀 Starting Google Sheets database setup...');

  try {
    await initDb();
    await seedData();
    console.log('✅ Setup complete!');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
setup();

export { setup, seedData };
