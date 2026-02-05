// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extract Supabase project reference from SUPABASEURL
const getSupabaseProjectRef = () => {
  // Priority 1: Extract from SUPABASEURL (e.g., https://ctkbmfobxdpdedoqukrt.supabase.co)
  if (process.env.SUPABASEURL) {
    try {
      const url = new URL(process.env.SUPABASEURL);
      // Extract project ref from hostname: ctkbmfobxdpdedoqukrt.supabase.co -> ctkbmfobxdpdedoqukrt
      const hostname = url.hostname;
      const projectRef = hostname.split('.')[0];
      if (projectRef) {
        return projectRef;
      }
    } catch (error) {
      console.warn('Could not extract project ref from SUPABASEURL');
    }
  }
  
  // Priority 2: Extract from SUPABASE_KEY (JWT token)
  if (process.env.SUPABASE_KEY) {
    try {
      const payload = process.env.SUPABASE_KEY.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      return decoded.ref;
    } catch (error) {
      console.warn('Could not extract project ref from SUPABASE_KEY');
    }
  }
  
  // Fallback: use SUPABASE_PROJECT_REF env var
  return process.env.SUPABASE_PROJECT_REF || 'ctkbmfobxdpdedoqukrt';
};

// Build Supabase DATABASE_URL from SUPABASE_PWD
const buildSupabaseUrl = () => {
  if (process.env.SUPABASE_PWD) {
    const projectRef = getSupabaseProjectRef();
    const password = encodeURIComponent(process.env.SUPABASE_PWD);
    
    // Use connection pooler by default (IPv4 compatible, works on most networks)
    // Direct connection requires IPv6 which many networks don't support
    // Format: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
    const region = process.env.SUPABASE_REGION || 'us-east-1';
    const poolerUrl = `postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
    const maskedUrl = `postgresql://postgres.${projectRef}:***@aws-0-${region}.pooler.supabase.com:5432/postgres`;
    
    console.log(`🔗 Building Supabase connection for project: ${projectRef}`);
    console.log(`🔗 Using CONNECTION POOLER (IPv4 compatible): ${maskedUrl}`);
    console.log(`💡 Direct connection (db.*.supabase.co) requires IPv6 - using pooler instead`);
    
    return poolerUrl;
  }
  return null;
};

// Database configuration: Use Supabase PostgreSQL if credentials are provided, otherwise use SQLite
const getDatabaseConfig = () => {
  // Priority 1: Try DATABASE_URL first (usually pooler - IPv4 compatible)
  if (process.env.DATABASE_URL) {
    const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@');
    console.log('🔗 Trying DATABASE_URL (Priority 1 - usually pooler/IPv4):');
    console.log(`   ${maskedUrl}`);
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
  
  // Priority 2: Try DB_URL (usually direct - IPv6)
  if (process.env.DB_URL) {
    const maskedUrl = process.env.DB_URL.replace(/:[^:@]+@/, ':***@');
    console.log('🔗 Trying DB_URL (Priority 2 - usually direct/IPv6):');
    console.log(`   ${maskedUrl}`);
    return new Sequelize(process.env.DB_URL, {
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
  
  // Priority 2: Build DATABASE_URL from SUPABASE_PWD
  const supabaseUrl = buildSupabaseUrl();
  if (supabaseUrl) {
    console.log('✅ Using Supabase PostgreSQL database');
    return new Sequelize(supabaseUrl, {
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
  
  // Fallback: Use SQLite for local development
  console.log('📦 No PostgreSQL credentials found - using SQLite for local development');
  console.log('   Set SUPABASE_PWD or DATABASE_URL for production PostgreSQL');
  const sqlitePath = path.join(__dirname, '../../database/grx10.sqlite');
  return new Sequelize({
    dialect: 'sqlite',
    storage: sqlitePath,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false
  });
};

const sequelize = getDatabaseConfig();

// Define Models

const Customer = sequelize.define('Customer', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    gstin: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    balance: { type: DataTypes.FLOAT, defaultValue: 0 }
});

const Invoice = sequelize.define('Invoice', {
    id: { type: DataTypes.STRING, primaryKey: true },
    number: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    dueDate: { type: DataTypes.STRING },
    customerId: { type: DataTypes.STRING, allowNull: false },
    customerName: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'Draft' },
    subTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
    taxTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
    total: { type: DataTypes.FLOAT, defaultValue: 0 }
});

const InvoiceItem = sequelize.define('InvoiceItem', {
    id: { type: DataTypes.STRING, primaryKey: true },
    invoiceId: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    hsn: { type: DataTypes.STRING },
    quantity: { type: DataTypes.FLOAT },
    rate: { type: DataTypes.FLOAT },
    taxRate: { type: DataTypes.FLOAT },
    amount: { type: DataTypes.FLOAT }
});

const Ledger = sequelize.define('Ledger', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING }, // Asset, Liability, Income, Expense, Equity
    balance: { type: DataTypes.FLOAT, defaultValue: 0 }
});

const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.STRING, primaryKey: true },
    date: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    type: { type: DataTypes.STRING }, // Debit / Credit
    ledgerId: { type: DataTypes.STRING, allowNull: false }
});

const User = sequelize.define('User', {
    id: { type: DataTypes.STRING, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: { type: DataTypes.STRING, unique: true },
    passwordHash: { type: DataTypes.STRING }, // For future password hashing (bcrypt)
    displayName: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING, defaultValue: 'user' }, // 'admin', 'user', 'viewer'
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    lastLogin: { type: DataTypes.DATE }
});

// HRMS Models
const Employee = sequelize.define('Employee', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    role: { type: DataTypes.STRING, allowNull: false }, // 'Employee', 'Manager', 'HR', 'Finance', 'Admin'
    department: { type: DataTypes.STRING },
    employeePosition: { type: DataTypes.STRING }, // Employee Role/Position
    designation: { type: DataTypes.STRING },
    joinDate: { type: DataTypes.STRING },
    terminationDate: { type: DataTypes.STRING },
    employeeType: { type: DataTypes.STRING, defaultValue: 'Full Time' }, // 'Full Time', 'Part Time', 'Contract'
    status: { type: DataTypes.STRING, defaultValue: 'Active' }, // 'Active', 'Terminated'
    isRehired: { type: DataTypes.BOOLEAN, defaultValue: false },
    previousEmployeeId: { type: DataTypes.STRING }, // For rehired employees
    avatar: { type: DataTypes.STRING },
    managerId: { type: DataTypes.STRING },
    salary: { type: DataTypes.FLOAT }, // Annual CTC
    password: { type: DataTypes.STRING }, // For direct login (should be hashed in production)
    enableEmailLogin: { type: DataTypes.BOOLEAN, defaultValue: true }, // Allow email/password login (if false, only SSO)
    isNewUser: { type: DataTypes.BOOLEAN, defaultValue: false },
    // Additional Traditional HR Fields
    workLocation: { type: DataTypes.STRING },
    probationEndDate: { type: DataTypes.STRING },
    noticePeriod: { type: DataTypes.INTEGER, defaultValue: 30 },
    lastWorkingDay: { type: DataTypes.STRING },
    exitInterviewDate: { type: DataTypes.STRING },
    employeeReferralId: { type: DataTypes.STRING },
    bloodGroup: { type: DataTypes.STRING },
    maritalStatus: { type: DataTypes.STRING },
    spouseName: { type: DataTypes.STRING },
    emergencyContactName: { type: DataTypes.STRING },
    emergencyContactRelation: { type: DataTypes.STRING },
    emergencyContactPhone: { type: DataTypes.STRING },
    bankAccountNumber: { type: DataTypes.STRING },
    bankIFSC: { type: DataTypes.STRING },
    bankName: { type: DataTypes.STRING },
    bankBranch: { type: DataTypes.STRING },
    skills: { type: DataTypes.TEXT }, // JSON array
    languages: { type: DataTypes.TEXT }, // JSON array
    dependents: { type: DataTypes.TEXT }, // JSON array
    taxDeclarations: { type: DataTypes.TEXT }, // JSON object
    // Personal Details
    dateOfBirth: { type: DataTypes.STRING },
    phone: { type: DataTypes.STRING },
    address: { type: DataTypes.TEXT },
    pan: { type: DataTypes.STRING },
    aadhar: { type: DataTypes.STRING },
    pfNumber: { type: DataTypes.STRING },
    // JSON fields for complex data
    educationDetails: { type: DataTypes.TEXT }, // JSON array
    experienceDetails: { type: DataTypes.TEXT }, // JSON array
    salaryBreakdown: { type: DataTypes.TEXT }, // JSON object
    leaveEntitlements: { type: DataTypes.TEXT }, // JSON object
    certifications: { type: DataTypes.TEXT } // JSON array
});

const EmployeeHiringHistory = sequelize.define('EmployeeHiringHistory', {
    id: { type: DataTypes.STRING, primaryKey: true },
    employeeId: { type: DataTypes.STRING, allowNull: false },
    hireDate: { type: DataTypes.STRING, allowNull: false },
    terminationDate: { type: DataTypes.STRING },
    employeeType: { type: DataTypes.STRING },
    department: { type: DataTypes.STRING },
    employeePosition: { type: DataTypes.STRING },
    designation: { type: DataTypes.STRING },
    salary: { type: DataTypes.FLOAT },
    managerId: { type: DataTypes.STRING },
    reasonForTermination: { type: DataTypes.TEXT },
    isRehire: { type: DataTypes.BOOLEAN, defaultValue: false },
    previousEmployeeId: { type: DataTypes.STRING }
});

const LeaveRequest = sequelize.define('LeaveRequest', {
    id: { type: DataTypes.STRING, primaryKey: true },
    employeeId: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // 'Sick Leave', 'Casual Leave', 'Earned Leave', 'Loss of Pay'
    startDate: { type: DataTypes.STRING, allowNull: false },
    endDate: { type: DataTypes.STRING, allowNull: false },
    reason: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' }, // 'Pending', 'Approved', 'Rejected'
    appliedOn: { type: DataTypes.STRING, allowNull: false }
});

const AttendanceRecord = sequelize.define('AttendanceRecord', {
    id: { type: DataTypes.STRING, primaryKey: true },
    employeeId: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    checkIn: { type: DataTypes.STRING }, // HH:mm format
    checkOut: { type: DataTypes.STRING }, // HH:mm format
    status: { type: DataTypes.STRING, defaultValue: 'Present' }, // 'Present', 'Absent', 'Late', 'Half Day'
    durationHours: { type: DataTypes.FLOAT }
});

const RegularizationRequest = sequelize.define('RegularizationRequest', {
    id: { type: DataTypes.STRING, primaryKey: true },
    employeeId: { type: DataTypes.STRING, allowNull: false },
    employeeName: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // 'Missing Punch', 'Incorrect Punch', 'Work From Home'
    reason: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' }, // 'Pending', 'Approved', 'Rejected'
    appliedOn: { type: DataTypes.STRING, allowNull: false },
    newCheckIn: { type: DataTypes.STRING },
    newCheckOut: { type: DataTypes.STRING }
});

const Payslip = sequelize.define('Payslip', {
    id: { type: DataTypes.STRING, primaryKey: true },
    employeeId: { type: DataTypes.STRING, allowNull: false },
    month: { type: DataTypes.STRING, allowNull: false }, // YYYY-MM format
    basic: { type: DataTypes.FLOAT, defaultValue: 0 },
    hra: { type: DataTypes.FLOAT, defaultValue: 0 },
    allowances: { type: DataTypes.FLOAT, defaultValue: 0 },
    deductions: { type: DataTypes.FLOAT, defaultValue: 0 },
    netPay: { type: DataTypes.FLOAT, defaultValue: 0 },
    generatedDate: { type: DataTypes.STRING, allowNull: false }
});

// OS (Performance OS) Models
const OSGoal = sequelize.define('OSGoal', {
    id: { type: DataTypes.STRING, primaryKey: true },
    ownerId: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // 'Annual', 'Quarterly'
    metric: { type: DataTypes.STRING, allowNull: false },
    baseline: { type: DataTypes.FLOAT, allowNull: false },
    target: { type: DataTypes.FLOAT, allowNull: false },
    current: { type: DataTypes.FLOAT, defaultValue: 0 },
    timeline: { type: DataTypes.STRING, allowNull: false }, // ISO Date
    status: { type: DataTypes.STRING, defaultValue: 'On Track' }, // 'On Track', 'Risk', 'Off Track', 'Completed'
    score: { type: DataTypes.STRING }, // 'A', 'B', 'C', 'D', 'F'
    managerFeedback: { type: DataTypes.TEXT }
});

const OSGoalComment = sequelize.define('OSGoalComment', {
    id: { type: DataTypes.STRING, primaryKey: true },
    goalId: { type: DataTypes.STRING, allowNull: false },
    authorId: { type: DataTypes.STRING, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    timestamp: { type: DataTypes.STRING, allowNull: false }
});

const OSMemo = sequelize.define('OSMemo', {
    id: { type: DataTypes.STRING, primaryKey: true },
    fromId: { type: DataTypes.STRING, allowNull: false },
    toId: { type: DataTypes.STRING, allowNull: false }, // User ID or 'ALL'
    date: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'Draft' }, // 'Draft', 'Pending Review', 'Approved', 'Revision Requested'
    summary: { type: DataTypes.TEXT } // Single summary field
});

const OSMemoAttachment = sequelize.define('OSMemoAttachment', {
    id: { type: DataTypes.STRING, primaryKey: true },
    memoId: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    size: { type: DataTypes.STRING },
    type: { type: DataTypes.STRING }
});

const OSMemoComment = sequelize.define('OSMemoComment', {
    id: { type: DataTypes.STRING, primaryKey: true },
    memoId: { type: DataTypes.STRING, allowNull: false },
    authorId: { type: DataTypes.STRING, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    timestamp: { type: DataTypes.STRING, allowNull: false }
});

const OSNotification = sequelize.define('OSNotification', {
    id: { type: DataTypes.STRING, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.STRING, defaultValue: 'info' }, // 'alert', 'info'
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
    timestamp: { type: DataTypes.STRING, allowNull: false },
    actionLink: { type: DataTypes.STRING }
});

// Configuration Models
const Organization = sequelize.define('Organization', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, unique: true },
    address: { type: DataTypes.TEXT },
    phone: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    website: { type: DataTypes.STRING },
    taxId: { type: DataTypes.STRING },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Department = sequelize.define('Department', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Position = sequelize.define('Position', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const HRMSRole = sequelize.define('HRMSRole', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    permissions: { type: DataTypes.TEXT }, // JSON array
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const EmployeeType = sequelize.define('EmployeeType', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Holiday = sequelize.define('Holiday', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING }, // 'National', 'Regional', 'Company', 'Optional'
    description: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const LeaveType = sequelize.define('LeaveType', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    maxDays: { type: DataTypes.INTEGER },
    isPaid: { type: DataTypes.BOOLEAN, defaultValue: true },
    requiresApproval: { type: DataTypes.BOOLEAN, defaultValue: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const WorkLocation = sequelize.define('WorkLocation', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING },
    address: { type: DataTypes.TEXT },
    city: { type: DataTypes.STRING },
    state: { type: DataTypes.STRING },
    country: { type: DataTypes.STRING },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Skill = sequelize.define('Skill', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    category: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Language = sequelize.define('Language', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const ChartOfAccount = sequelize.define('ChartOfAccount', {
    id: { type: DataTypes.STRING, primaryKey: true },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false }, // 'Asset', 'Liability', 'Income', 'Expense', 'Equity'
    parentId: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// Security & Role Management Models
const Role = sequelize.define('Role', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING, unique: true },
    description: { type: DataTypes.TEXT },
    isSystemRole: { type: DataTypes.BOOLEAN, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Permission = sequelize.define('Permission', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING, unique: true, allowNull: false },
    module: { type: DataTypes.STRING, allowNull: false }, // 'hrms', 'financial', 'os', 'config', 'admin'
    resource: { type: DataTypes.STRING, allowNull: false }, // 'employees', 'invoices', 'leaves', etc.
    action: { type: DataTypes.STRING, allowNull: false }, // 'create', 'read', 'update', 'delete', 'approve'
    description: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const RolePermission = sequelize.define('RolePermission', {
    id: { type: DataTypes.STRING, primaryKey: true },
    roleId: { type: DataTypes.STRING, allowNull: false },
    permissionId: { type: DataTypes.STRING, allowNull: false }
});

const UserRole = sequelize.define('UserRole', {
    id: { type: DataTypes.STRING, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    roleId: { type: DataTypes.STRING, allowNull: false },
    assignedBy: { type: DataTypes.STRING },
    assignedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const ApprovalWorkflow = sequelize.define('ApprovalWorkflow', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    module: { type: DataTypes.STRING, allowNull: false }, // 'hrms', 'financial', 'os'
    resource: { type: DataTypes.STRING, allowNull: false }, // 'leave', 'expense', 'invoice', 'memo'
    workflowType: { type: DataTypes.STRING, allowNull: false }, // 'sequential', 'parallel', 'any'
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const ApprovalWorkflowStep = sequelize.define('ApprovalWorkflowStep', {
    id: { type: DataTypes.STRING, primaryKey: true },
    workflowId: { type: DataTypes.STRING, allowNull: false },
    stepOrder: { type: DataTypes.INTEGER, allowNull: false },
    approverType: { type: DataTypes.STRING, allowNull: false }, // 'role', 'user', 'manager', 'department_head'
    approverId: { type: DataTypes.STRING },
    isRequired: { type: DataTypes.BOOLEAN, defaultValue: true },
    canDelegate: { type: DataTypes.BOOLEAN, defaultValue: false },
    timeoutHours: { type: DataTypes.INTEGER }
});

const ApprovalRequest = sequelize.define('ApprovalRequest', {
    id: { type: DataTypes.STRING, primaryKey: true },
    workflowId: { type: DataTypes.STRING, allowNull: false },
    module: { type: DataTypes.STRING, allowNull: false },
    resource: { type: DataTypes.STRING, allowNull: false },
    resourceId: { type: DataTypes.STRING, allowNull: false },
    requestedBy: { type: DataTypes.STRING, allowNull: false },
    currentStep: { type: DataTypes.INTEGER, defaultValue: 1 },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' }, // 'Pending', 'Approved', 'Rejected', 'Cancelled'
    priority: { type: DataTypes.STRING, defaultValue: 'Normal' }, // 'Low', 'Normal', 'High', 'Urgent'
    requestData: { type: DataTypes.TEXT }, // JSON
    comments: { type: DataTypes.TEXT },
    completedAt: { type: DataTypes.DATE }
});

const ApprovalHistory = sequelize.define('ApprovalHistory', {
    id: { type: DataTypes.STRING, primaryKey: true },
    requestId: { type: DataTypes.STRING, allowNull: false },
    stepOrder: { type: DataTypes.INTEGER, allowNull: false },
    approverId: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false }, // 'Approved', 'Rejected', 'Delegated', 'Returned'
    comments: { type: DataTypes.TEXT },
    actionDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Relationships
Customer.hasMany(Invoice, { foreignKey: 'customerId' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });

Ledger.hasMany(Transaction, { foreignKey: 'ledgerId' });
Transaction.belongsTo(Ledger, { foreignKey: 'ledgerId' });

// HRMS Relationships
Employee.hasMany(LeaveRequest, { foreignKey: 'employeeId' });
LeaveRequest.belongsTo(Employee, { foreignKey: 'employeeId' });

Employee.hasMany(AttendanceRecord, { foreignKey: 'employeeId' });
AttendanceRecord.belongsTo(Employee, { foreignKey: 'employeeId' });

Employee.hasMany(RegularizationRequest, { foreignKey: 'employeeId' });
RegularizationRequest.belongsTo(Employee, { foreignKey: 'employeeId' });

Employee.hasMany(Payslip, { foreignKey: 'employeeId' });
Payslip.belongsTo(Employee, { foreignKey: 'employeeId' });

// Self-referential relationship for managers
Employee.belongsTo(Employee, { foreignKey: 'managerId', as: 'manager' });
Employee.hasMany(Employee, { foreignKey: 'managerId', as: 'subordinates' });

// Employee rehire relationships
Employee.belongsTo(Employee, { foreignKey: 'previousEmployeeId', as: 'previousEmployee' });
Employee.hasMany(Employee, { foreignKey: 'previousEmployeeId', as: 'rehiredVersions' });

// Employee referral relationship
Employee.belongsTo(Employee, { foreignKey: 'employeeReferralId', as: 'referredBy' });
Employee.hasMany(Employee, { foreignKey: 'employeeReferralId', as: 'referredEmployees' });

// Employee Hiring History
Employee.hasMany(EmployeeHiringHistory, { foreignKey: 'employeeId', as: 'hiringHistory' });
EmployeeHiringHistory.belongsTo(Employee, { foreignKey: 'employeeId' });
EmployeeHiringHistory.belongsTo(Employee, { foreignKey: 'previousEmployeeId', as: 'previousEmployee' });

// Chart of Accounts self-referential
ChartOfAccount.belongsTo(ChartOfAccount, { foreignKey: 'parentId', as: 'parent' });
ChartOfAccount.hasMany(ChartOfAccount, { foreignKey: 'parentId', as: 'children' });

// Security & Role Management Relationships
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: 'roleId', as: 'permissions' });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: 'permissionId', as: 'roles' });

User.belongsToMany(Role, { through: UserRole, foreignKey: 'userId', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'roleId', as: 'users' });

UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
UserRole.belongsTo(User, { foreignKey: 'assignedBy', as: 'assigner' });

ApprovalWorkflow.hasMany(ApprovalWorkflowStep, { foreignKey: 'workflowId', as: 'steps' });
ApprovalWorkflowStep.belongsTo(ApprovalWorkflow, { foreignKey: 'workflowId' });

ApprovalWorkflow.hasMany(ApprovalRequest, { foreignKey: 'workflowId', as: 'requests' });
ApprovalRequest.belongsTo(ApprovalWorkflow, { foreignKey: 'workflowId' });

ApprovalRequest.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
ApprovalRequest.hasMany(ApprovalHistory, { foreignKey: 'requestId', as: 'history' });

ApprovalHistory.belongsTo(ApprovalRequest, { foreignKey: 'requestId' });
ApprovalHistory.belongsTo(User, { foreignKey: 'approverId', as: 'approver' });

// OS Relationships
OSGoal.hasMany(OSGoalComment, { foreignKey: 'goalId', as: 'comments' });
OSGoalComment.belongsTo(OSGoal, { foreignKey: 'goalId' });

OSMemo.hasMany(OSMemoAttachment, { foreignKey: 'memoId', as: 'attachments' });
OSMemoAttachment.belongsTo(OSMemo, { foreignKey: 'memoId' });

OSMemo.hasMany(OSMemoComment, { foreignKey: 'memoId', as: 'comments' });
OSMemoComment.belongsTo(OSMemo, { foreignKey: 'memoId' });

const initDb = async () => {
    try {
        await sequelize.authenticate();
        const dbType = sequelize.getDialect();
        console.log(`✅ Database connection established successfully!`);
        console.log(`📊 Database type: ${dbType.toUpperCase()}`);
        
        // Log which connection string was used
        if (process.env.DATABASE_URL) {
            console.log(`✅ Successfully connected using DATABASE_URL (pooler/IPv4)`);
        } else if (process.env.DB_URL) {
            console.log(`✅ Successfully connected using DB_URL (direct/IPv6)`);
        } else {
            console.log(`✅ Successfully connected using SUPABASE_PWD (auto-built)`);
        }
        
        await sequelize.sync({ alter: true }); // Update schema if changed
        console.log('📋 Database synchronized.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        
        // Provide helpful error messages
        if (process.env.DATABASE_URL) {
            console.error('💡 DATABASE_URL connection failed. Error details above.');
            if (process.env.DB_URL) {
                console.error('💡 Will not try DB_URL because DATABASE_URL is set.');
            }
        } else if (process.env.DB_URL) {
            console.error('💡 DB_URL connection failed. This might be an IPv6 issue.');
            console.error('💡 Try using DATABASE_URL with the pooler format instead.');
        } else if (process.env.SUPABASE_PWD) {
            console.error('💡 Auto-built connection failed. Check SUPABASE_PWD and SUPABASE_REGION.');
        }
        
        throw error;
    }
};

export { 
    sequelize, 
    initDb, 
    Customer, 
    Invoice, 
    InvoiceItem, 
    Ledger, 
    Transaction, 
    User,
    // HRMS Models
    Employee,
    EmployeeHiringHistory,
    LeaveRequest,
    AttendanceRecord,
    RegularizationRequest,
    Payslip,
    // OS Models
    OSGoal,
    OSGoalComment,
    OSMemo,
    OSMemoAttachment,
    OSMemoComment,
    OSNotification,
    // Configuration Models
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
    // Security & Role Management Models
    Role,
    Permission,
    RolePermission,
    UserRole,
    ApprovalWorkflow,
    ApprovalWorkflowStep,
    ApprovalRequest,
    ApprovalHistory
};
