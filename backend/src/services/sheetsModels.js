/**
 * Google Sheets Model Definitions
 * Maps all application models to Google Sheets
 */

import { SheetsModel, sheetsDb, initSheets } from './sheetsDb.js';

// ============================================
// FINANCIAL MODELS
// ============================================

const Customer = new SheetsModel('Customers', {
  id: { primaryKey: true },
  name: { allowNull: false },
  gstin: {},
  email: {},
  balance: { defaultValue: 0 }
});

const Invoice = new SheetsModel('Invoices', {
  id: { primaryKey: true },
  number: { allowNull: false },
  date: { allowNull: false },
  dueDate: {},
  customerId: { allowNull: false },
  customerName: {},
  status: { defaultValue: 'Draft' },
  subTotal: { defaultValue: 0 },
  taxTotal: { defaultValue: 0 },
  total: { defaultValue: 0 }
});

const InvoiceItem = new SheetsModel('InvoiceItems', {
  id: { primaryKey: true },
  invoiceId: { allowNull: false },
  description: {},
  hsn: {},
  quantity: {},
  rate: {},
  taxRate: {},
  amount: {}
});

const Ledger = new SheetsModel('Ledgers', {
  id: { primaryKey: true },
  name: { allowNull: false },
  type: {},
  balance: { defaultValue: 0 }
});

const Transaction = new SheetsModel('Transactions', {
  id: { primaryKey: true },
  date: { allowNull: false },
  description: {},
  amount: { allowNull: false },
  type: {},
  ledgerId: { allowNull: false }
});

// ============================================
// USER MODELS
// ============================================

const User = new SheetsModel('Users', {
  id: { primaryKey: true },
  username: { allowNull: false },
  email: {},
  passwordHash: {},
  displayName: {},
  role: { defaultValue: 'user' },
  isActive: { defaultValue: true },
  lastLogin: {}
});

// ============================================
// HRMS MODELS
// ============================================

const Employee = new SheetsModel('Employees', {
  id: { primaryKey: true },
  name: { allowNull: false },
  email: { allowNull: false },
  role: { allowNull: false },
  department: {},
  employeePosition: {},
  designation: {},
  joinDate: {},
  terminationDate: {},
  employeeType: { defaultValue: 'Full Time' },
  status: { defaultValue: 'Active' },
  isRehired: { defaultValue: false },
  previousEmployeeId: {},
  avatar: {},
  managerId: {},
  salary: {},
  password: {},
  enableEmailLogin: { defaultValue: true },
  isNewUser: { defaultValue: false },
  workLocation: {},
  probationEndDate: {},
  noticePeriod: { defaultValue: 30 },
  lastWorkingDay: {},
  exitInterviewDate: {},
  employeeReferralId: {},
  bloodGroup: {},
  maritalStatus: {},
  spouseName: {},
  emergencyContactName: {},
  emergencyContactRelation: {},
  emergencyContactPhone: {},
  bankAccountNumber: {},
  bankIFSC: {},
  bankName: {},
  bankBranch: {},
  skills: {},
  languages: {},
  dependents: {},
  taxDeclarations: {},
  dateOfBirth: {},
  phone: {},
  address: {},
  pan: {},
  aadhar: {},
  pfNumber: {},
  educationDetails: {},
  experienceDetails: {},
  salaryBreakdown: {},
  leaveEntitlements: {},
  certifications: {}
}, {
  jsonFields: ['skills', 'languages', 'dependents', 'taxDeclarations', 'educationDetails', 'experienceDetails', 'salaryBreakdown', 'leaveEntitlements', 'certifications']
});

const EmployeeHiringHistory = new SheetsModel('EmployeeHiringHistory', {
  id: { primaryKey: true },
  employeeId: { allowNull: false },
  hireDate: { allowNull: false },
  terminationDate: {},
  employeeType: {},
  department: {},
  employeePosition: {},
  designation: {},
  salary: {},
  managerId: {},
  reasonForTermination: {},
  isRehire: { defaultValue: false },
  previousEmployeeId: {}
});

const LeaveRequest = new SheetsModel('LeaveRequests', {
  id: { primaryKey: true },
  employeeId: { allowNull: false },
  type: { allowNull: false },
  startDate: { allowNull: false },
  endDate: { allowNull: false },
  reason: {},
  status: { defaultValue: 'Pending' },
  appliedOn: { allowNull: false }
});

const AttendanceRecord = new SheetsModel('AttendanceRecords', {
  id: { primaryKey: true },
  employeeId: { allowNull: false },
  date: { allowNull: false },
  checkIn: {},
  checkOut: {},
  status: { defaultValue: 'Present' },
  durationHours: {}
});

const RegularizationRequest = new SheetsModel('RegularizationRequests', {
  id: { primaryKey: true },
  employeeId: { allowNull: false },
  employeeName: { allowNull: false },
  date: { allowNull: false },
  type: { allowNull: false },
  reason: {},
  status: { defaultValue: 'Pending' },
  appliedOn: { allowNull: false },
  newCheckIn: {},
  newCheckOut: {}
});

const Payslip = new SheetsModel('Payslips', {
  id: { primaryKey: true },
  employeeId: { allowNull: false },
  month: { allowNull: false },
  basic: { defaultValue: 0 },
  hra: { defaultValue: 0 },
  allowances: { defaultValue: 0 },
  deductions: { defaultValue: 0 },
  netPay: { defaultValue: 0 },
  generatedDate: { allowNull: false }
});

// ============================================
// OS (Performance) MODELS
// ============================================

const OSGoal = new SheetsModel('OSGoals', {
  id: { primaryKey: true },
  ownerId: { allowNull: false },
  title: { allowNull: false },
  type: { allowNull: false },
  metric: { allowNull: false },
  baseline: { allowNull: false },
  target: { allowNull: false },
  current: { defaultValue: 0 },
  timeline: { allowNull: false },
  status: { defaultValue: 'On Track' },
  score: {},
  managerFeedback: {}
});

const OSGoalComment = new SheetsModel('OSGoalComments', {
  id: { primaryKey: true },
  goalId: { allowNull: false },
  authorId: { allowNull: false },
  text: { allowNull: false },
  timestamp: { allowNull: false }
});

const OSMemo = new SheetsModel('OSMemos', {
  id: { primaryKey: true },
  fromId: { allowNull: false },
  toId: { allowNull: false },
  date: { allowNull: false },
  subject: { allowNull: false },
  status: { defaultValue: 'Draft' },
  summary: {}
});

const OSMemoAttachment = new SheetsModel('OSMemoAttachments', {
  id: { primaryKey: true },
  memoId: { allowNull: false },
  name: { allowNull: false },
  size: {},
  type: {}
});

const OSMemoComment = new SheetsModel('OSMemoComments', {
  id: { primaryKey: true },
  memoId: { allowNull: false },
  authorId: { allowNull: false },
  text: { allowNull: false },
  timestamp: { allowNull: false }
});

const OSNotification = new SheetsModel('OSNotifications', {
  id: { primaryKey: true },
  userId: { allowNull: false },
  title: { allowNull: false },
  message: { allowNull: false },
  type: { defaultValue: 'info' },
  read: { defaultValue: false },
  timestamp: { allowNull: false },
  actionLink: {}
});

// ============================================
// CONFIGURATION MODELS
// ============================================

const Organization = new SheetsModel('Organizations', {
  id: { primaryKey: true },
  name: { allowNull: false },
  code: {},
  address: {},
  phone: {},
  email: {},
  website: {},
  taxId: {},
  isActive: { defaultValue: true }
});

const Department = new SheetsModel('Departments', {
  id: { primaryKey: true },
  name: { allowNull: false },
  code: {},
  description: {},
  isActive: { defaultValue: true }
});

const Position = new SheetsModel('Positions', {
  id: { primaryKey: true },
  name: { allowNull: false },
  code: {},
  description: {},
  isActive: { defaultValue: true }
});

const HRMSRole = new SheetsModel('HRMSRoles', {
  id: { primaryKey: true },
  name: { allowNull: false },
  code: {},
  description: {},
  permissions: {},
  isActive: { defaultValue: true }
}, {
  jsonFields: ['permissions']
});

const EmployeeType = new SheetsModel('EmployeeTypes', {
  id: { primaryKey: true },
  name: { allowNull: false },
  code: {},
  description: {},
  isActive: { defaultValue: true }
});

const Holiday = new SheetsModel('Holidays', {
  id: { primaryKey: true },
  name: { allowNull: false },
  date: { allowNull: false },
  type: {},
  description: {},
  isActive: { defaultValue: true }
});

const LeaveType = new SheetsModel('LeaveTypes', {
  id: { primaryKey: true },
  name: { allowNull: false },
  code: {},
  description: {},
  maxDays: {},
  isPaid: { defaultValue: true },
  requiresApproval: { defaultValue: true },
  isActive: { defaultValue: true }
});

const WorkLocation = new SheetsModel('WorkLocations', {
  id: { primaryKey: true },
  name: { allowNull: false },
  code: {},
  address: {},
  city: {},
  state: {},
  country: {},
  isActive: { defaultValue: true }
});

const Skill = new SheetsModel('Skills', {
  id: { primaryKey: true },
  name: { allowNull: false },
  category: {},
  description: {},
  isActive: { defaultValue: true }
});

const Language = new SheetsModel('Languages', {
  id: { primaryKey: true },
  name: { allowNull: false },
  code: {},
  isActive: { defaultValue: true }
});

const ChartOfAccount = new SheetsModel('ChartOfAccounts', {
  id: { primaryKey: true },
  code: { allowNull: false },
  name: { allowNull: false },
  type: { allowNull: false },
  parentId: {},
  description: {},
  isActive: { defaultValue: true }
});

// ============================================
// SECURITY MODELS
// ============================================

const Role = new SheetsModel('Roles', {
  id: { primaryKey: true },
  name: { allowNull: false },
  code: {},
  description: {},
  isSystemRole: { defaultValue: false },
  isActive: { defaultValue: true }
});

const Permission = new SheetsModel('Permissions', {
  id: { primaryKey: true },
  name: { allowNull: false },
  code: { allowNull: false },
  module: { allowNull: false },
  resource: { allowNull: false },
  action: { allowNull: false },
  description: {},
  isActive: { defaultValue: true }
});

const RolePermission = new SheetsModel('RolePermissions', {
  id: { primaryKey: true },
  roleId: { allowNull: false },
  permissionId: { allowNull: false }
});

const UserRole = new SheetsModel('UserRoles', {
  id: { primaryKey: true },
  userId: { allowNull: false },
  roleId: { allowNull: false },
  assignedBy: {},
  assignedAt: {},
  isActive: { defaultValue: true }
});

const ApprovalWorkflow = new SheetsModel('ApprovalWorkflows', {
  id: { primaryKey: true },
  name: { allowNull: false },
  module: { allowNull: false },
  resource: { allowNull: false },
  workflowType: { allowNull: false },
  isActive: { defaultValue: true }
});

const ApprovalWorkflowStep = new SheetsModel('ApprovalWorkflowSteps', {
  id: { primaryKey: true },
  workflowId: { allowNull: false },
  stepOrder: { allowNull: false },
  approverType: { allowNull: false },
  approverId: {},
  isRequired: { defaultValue: true },
  canDelegate: { defaultValue: false },
  timeoutHours: {}
});

const ApprovalRequest = new SheetsModel('ApprovalRequests', {
  id: { primaryKey: true },
  workflowId: { allowNull: false },
  module: { allowNull: false },
  resource: { allowNull: false },
  resourceId: { allowNull: false },
  requestedBy: { allowNull: false },
  currentStep: { defaultValue: 1 },
  status: { defaultValue: 'Pending' },
  priority: { defaultValue: 'Normal' },
  requestData: {},
  comments: {},
  completedAt: {}
}, {
  jsonFields: ['requestData']
});

const ApprovalHistory = new SheetsModel('ApprovalHistories', {
  id: { primaryKey: true },
  requestId: { allowNull: false },
  stepOrder: { allowNull: false },
  approverId: { allowNull: false },
  action: { allowNull: false },
  comments: {},
  actionDate: {}
});

// ============================================
// DEFINE RELATIONSHIPS
// ============================================

// Customer - Invoice
Customer.hasMany(Invoice, { foreignKey: 'customerId', as: 'invoices' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

// Invoice - InvoiceItem
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Ledger - Transaction
Ledger.hasMany(Transaction, { foreignKey: 'ledgerId', as: 'transactions' });
Transaction.belongsTo(Ledger, { foreignKey: 'ledgerId', as: 'ledger' });

// Employee relationships
Employee.hasMany(LeaveRequest, { foreignKey: 'employeeId', as: 'leaveRequests' });
LeaveRequest.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(AttendanceRecord, { foreignKey: 'employeeId', as: 'attendanceRecords' });
AttendanceRecord.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(RegularizationRequest, { foreignKey: 'employeeId', as: 'regularizationRequests' });
RegularizationRequest.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.hasMany(Payslip, { foreignKey: 'employeeId', as: 'payslips' });
Payslip.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

Employee.belongsTo(Employee, { foreignKey: 'managerId', as: 'manager' });
Employee.hasMany(Employee, { foreignKey: 'managerId', as: 'subordinates' });

Employee.hasMany(EmployeeHiringHistory, { foreignKey: 'employeeId', as: 'hiringHistory' });
EmployeeHiringHistory.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// OS relationships
OSGoal.hasMany(OSGoalComment, { foreignKey: 'goalId', as: 'comments' });
OSGoalComment.belongsTo(OSGoal, { foreignKey: 'goalId', as: 'goal' });

OSMemo.hasMany(OSMemoAttachment, { foreignKey: 'memoId', as: 'attachments' });
OSMemoAttachment.belongsTo(OSMemo, { foreignKey: 'memoId', as: 'memo' });

OSMemo.hasMany(OSMemoComment, { foreignKey: 'memoId', as: 'comments' });
OSMemoComment.belongsTo(OSMemo, { foreignKey: 'memoId', as: 'memo' });

// Approval workflow relationships
ApprovalWorkflow.hasMany(ApprovalWorkflowStep, { foreignKey: 'workflowId', as: 'steps' });
ApprovalWorkflowStep.belongsTo(ApprovalWorkflow, { foreignKey: 'workflowId', as: 'workflow' });

ApprovalWorkflow.hasMany(ApprovalRequest, { foreignKey: 'workflowId', as: 'requests' });
ApprovalRequest.belongsTo(ApprovalWorkflow, { foreignKey: 'workflowId', as: 'workflow' });

ApprovalRequest.hasMany(ApprovalHistory, { foreignKey: 'requestId', as: 'history' });
ApprovalHistory.belongsTo(ApprovalRequest, { foreignKey: 'requestId', as: 'request' });

// Chart of Accounts self-referential
ChartOfAccount.belongsTo(ChartOfAccount, { foreignKey: 'parentId', as: 'parent' });
ChartOfAccount.hasMany(ChartOfAccount, { foreignKey: 'parentId', as: 'children' });

// ============================================
// INITIALIZE DATABASE
// ============================================

const initDb = async () => {
  try {
    await initSheets();
    console.log('✅ Google Sheets database initialized');

    // Sync all models (create sheets if they don't exist)
    const allModels = [
      Customer, Invoice, InvoiceItem, Ledger, Transaction, User,
      Employee, EmployeeHiringHistory, LeaveRequest, AttendanceRecord,
      RegularizationRequest, Payslip,
      OSGoal, OSGoalComment, OSMemo, OSMemoAttachment, OSMemoComment, OSNotification,
      Organization, Department, Position, HRMSRole, EmployeeType, Holiday,
      LeaveType, WorkLocation, Skill, Language, ChartOfAccount,
      Role, Permission, RolePermission, UserRole,
      ApprovalWorkflow, ApprovalWorkflowStep, ApprovalRequest, ApprovalHistory
    ];

    for (const model of allModels) {
      await model.sync();
    }

    console.log('📋 All sheets synchronized');
  } catch (error) {
    console.error('❌ Failed to initialize Google Sheets database:', error.message);
    throw error;
  }
};

// ============================================
// EXPORTS
// ============================================

export {
  sheetsDb as sequelize,
  initDb,
  // Financial
  Customer,
  Invoice,
  InvoiceItem,
  Ledger,
  Transaction,
  // User
  User,
  // HRMS
  Employee,
  EmployeeHiringHistory,
  LeaveRequest,
  AttendanceRecord,
  RegularizationRequest,
  Payslip,
  // OS
  OSGoal,
  OSGoalComment,
  OSMemo,
  OSMemoAttachment,
  OSMemoComment,
  OSNotification,
  // Configuration
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
  // Security
  Role,
  Permission,
  RolePermission,
  UserRole,
  ApprovalWorkflow,
  ApprovalWorkflowStep,
  ApprovalRequest,
  ApprovalHistory
};
