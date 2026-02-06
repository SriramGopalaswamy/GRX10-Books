
export enum InvoiceStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
}

export interface Customer {
  id: string;
  name: string;
  gstin: string;
  email: string;
  balance: number;
  phone?: string;
  address?: string;
}

export interface Vendor {
  id: string;
  name: string;
  gstin?: string;
  email?: string;
  balance: number;
}

export interface Bill {
  id: string;
  vendorId: string;
  vendorName: string;
  billNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'Open' | 'Paid' | 'Overdue';
  attachmentUrl?: string; // For the PDF/Image
}

export interface InvoiceItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  rate: number;
  taxRate: number; // e.g., 18 for 18%
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subTotal: number;
  taxTotal: number;
  total: number;
  taxType?: 'INTRA' | 'INTER'; // Intra-state (CGST+SGST) or Inter-state (IGST)
}

export interface StatMetric {
  label: string;
  value: string;
  trend: number; // percentage
  isPositive: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  isThinking?: boolean;
  timestamp: Date;
}

export interface DocumentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  base64?: string; 
  ocrStatus: 'idle' | 'processing' | 'completed' | 'failed';
  extractedData?: {
    vendor_name?: string;
    invoice_date?: string;
    total_amount?: number;
    gst_amount?: number;
    summary?: string;
  };
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  INVOICES = 'INVOICES',
  CUSTOMERS = 'CUSTOMERS',
  VENDORS = 'VENDORS',
  BANKING = 'BANKING',
  ACCOUNTING = 'ACCOUNTING',
  CASHFLOW = 'CASHFLOW',
  MIGRATION = 'MIGRATION',
  ASSISTANT = 'ASSISTANT',
  DOCUMENTS = 'DOCUMENTS',
  // HRMS Views
  HRMS_DASHBOARD = 'HRMS_DASHBOARD',
  EMPLOYEES = 'EMPLOYEES',
  EMPLOYEE_DETAILS = 'EMPLOYEE_DETAILS',
  ATTENDANCE = 'ATTENDANCE',
  LEAVES = 'LEAVES',
  PAYROLL = 'PAYROLL',
  POLICY_CHAT = 'POLICY_CHAT',
  // OS Views
  OS_DASHBOARD = 'OS_DASHBOARD',
  GOALS = 'GOALS',
  MEMOS = 'MEMOS',
  // Configuration Views
  CONFIG_ORGANIZATIONS = 'CONFIG_ORGANIZATIONS',
  CONFIG_DEPARTMENTS = 'CONFIG_DEPARTMENTS',
  CONFIG_POSITIONS = 'CONFIG_POSITIONS',
  CONFIG_ROLES = 'CONFIG_ROLES',
  CONFIG_EMPLOYEE_TYPES = 'CONFIG_EMPLOYEE_TYPES',
  CONFIG_HOLIDAYS = 'CONFIG_HOLIDAYS',
  CONFIG_LEAVE_TYPES = 'CONFIG_LEAVE_TYPES',
  CONFIG_WORK_LOCATIONS = 'CONFIG_WORK_LOCATIONS',
  CONFIG_SKILLS = 'CONFIG_SKILLS',
  CONFIG_LANGUAGES = 'CONFIG_LANGUAGES',
  CONFIG_CHART_OF_ACCOUNTS = 'CONFIG_CHART_OF_ACCOUNTS',
  // Security & Role Management Views
  SECURITY_ROLES = 'SECURITY_ROLES',
  SECURITY_PERMISSIONS = 'SECURITY_PERMISSIONS',
  SECURITY_USER_ROLES = 'SECURITY_USER_ROLES',
  SECURITY_APPROVAL_WORKFLOWS = 'SECURITY_APPROVAL_WORKFLOWS',
  SECURITY_APPROVAL_REQUESTS = 'SECURITY_APPROVAL_REQUESTS',
  // Reports Views
  REPORT_TRIAL_BALANCE = 'REPORT_TRIAL_BALANCE',
  REPORT_BALANCE_SHEET = 'REPORT_BALANCE_SHEET',
  REPORT_PROFIT_LOSS = 'REPORT_PROFIT_LOSS',
  REPORT_EMPLOYEE_DIRECTORY = 'REPORT_EMPLOYEE_DIRECTORY',
  REPORT_ATTENDANCE = 'REPORT_ATTENDANCE',
  REPORT_LEAVES = 'REPORT_LEAVES',
  REPORT_PAYROLL = 'REPORT_PAYROLL'
}

// HRMS Types
export enum HRMSRole {
  EMPLOYEE = 'Employee',
  MANAGER = 'Manager',
  HR = 'HR',
  FINANCE = 'Finance',
  ADMIN = 'Admin'
}

export interface EducationDetail {
  level: '10th' | '12th' | 'Degree' | 'Post Graduate' | 'Other';
  institution: string;
  field: string;
  year: string;
  percentage?: number;
  grade?: string;
}

export interface ExperienceDetail {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  responsibilities?: string;
  achievements?: string;
}

export interface SalaryBreakdown {
  base: number;
  hra: number;
  specialAllowance: number;
  pf: number;
  esi?: number;
  professionalTax?: number;
  otherDeductions?: number;
  grossSalary: number;
  netSalary: number;
}

export interface LeaveEntitlement {
  casual: number;
  sick: number;
  earned: number;
  maternity?: number;
  paternity?: number;
  compOff?: number;
  lop?: number;
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  certificateNumber?: string;
  isMandatory: boolean;
}

export interface Dependent {
  name: string;
  relationship: string; // 'Spouse', 'Child', 'Parent', etc.
  dateOfBirth?: string;
}

export interface TaxDeclaration {
  section80C?: number; // Investments
  section80D?: number; // Health Insurance
  hra?: number; // House Rent Allowance
  lta?: number; // Leave Travel Allowance
  other?: number;
}

export interface HiringHistory {
  id: string;
  employeeId: string;
  hireDate: string;
  terminationDate?: string;
  employeeType: 'Full Time' | 'Part Time' | 'Contract';
  department: string;
  employeePosition: string;
  designation: string;
  salary?: number;
  managerId?: string;
  reasonForTermination?: string;
  isRehire: boolean;
  previousEmployeeId?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: HRMSRole;
  department: string;
  employeePosition?: string; // Employee Role/Position
  designation: string;
  joinDate: string;
  terminationDate?: string;
  employeeType: 'Full Time' | 'Part Time' | 'Contract';
  status: 'Active' | 'Terminated';
  isRehired?: boolean;
  previousEmployeeId?: string; // For rehired employees
  avatar: string;
  managerId?: string;
  salary?: number; // Annual CTC
  password?: string; // Mock password for direct login
  isNewUser?: boolean;
  // Additional Traditional HR Fields
  workLocation?: string;
  probationEndDate?: string;
  noticePeriod?: number; // Days
  lastWorkingDay?: string;
  exitInterviewDate?: string;
  employeeReferralId?: string;
  bloodGroup?: string;
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  spouseName?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  bankAccountNumber?: string;
  bankIFSC?: string;
  bankName?: string;
  bankBranch?: string;
  skills?: string[]; // Array of skills
  languages?: string[]; // Array of languages known
  dependents?: Dependent[];
  taxDeclarations?: TaxDeclaration;
  // Personal Details
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  pan?: string;
  aadhar?: string;
  pfNumber?: string;
  // Education Details
  educationDetails?: EducationDetail[];
  // Experience Details
  experienceDetails?: ExperienceDetail[];
  // Salary Breakdown
  salaryBreakdown?: SalaryBreakdown;
  // Leave Entitlements
  leaveEntitlements?: LeaveEntitlement;
  // Certifications
  certifications?: Certification[];
  // Hiring History (from related table)
  hiringHistory?: HiringHistory[];
}

export enum LeaveType {
  SICK = 'Sick Leave',
  CASUAL = 'Casual Leave',
  EARNED = 'Earned Leave',
  LOP = 'Loss of Pay'
}

export enum LeaveStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  CANCELLED = 'Cancelled'
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string; // HH:mm
  checkOut?: string; // HH:mm
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  durationHours?: number;
}

export enum RegularizationType {
  MISSING_PUNCH = 'Missing Punch',
  INCORRECT_PUNCH = 'Incorrect Punch',
  WFH = 'Work From Home'
}

export interface RegularizationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  type: RegularizationType;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  newCheckIn?: string;
  newCheckOut?: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  netPay: number;
  generatedDate: string;
}

export interface HRMSDocument {
  id: string;
  title: string;
  type: 'Policy' | 'Form' | 'Contract';
  url: string;
  lastUpdated: string;
}

// OS (Performance OS) Types
export enum OSTeam {
  MARKETING = 'Marketing',
  REVOPS = 'RevOps',
  SALES = 'Sales',
  SOLAR_OPS = 'Solar Operations',
  DESIGN = 'Designers',
  AI_ENG = 'AI Engineering',
  LEADERSHIP = 'Leadership'
}

export interface OSUser {
  id: string;
  name: string;
  email: string;
  role: 'Employee' | 'Manager' | 'Admin';
  team: OSTeam;
  avatarUrl?: string;
}

export enum GoalType {
  ANNUAL = 'Annual',
  QUARTERLY = 'Quarterly'
}

export enum GoalStatus {
  ON_TRACK = 'On Track',
  AT_RISK = 'Risk',
  OFF_TRACK = 'Off Track',
  COMPLETED = 'Completed'
}

export interface GoalComment {
  id: string;
  authorId: string;
  text: string;
  timestamp: string;
}

export interface Goal {
  id: string;
  ownerId: string;
  title: string;
  type: GoalType;
  metric: string;
  baseline: number;
  target: number;
  current: number;
  timeline: string; // ISO Date
  status: GoalStatus;
  score?: 'A' | 'B' | 'C' | 'D' | 'F';
  managerFeedback?: string;
  comments?: GoalComment[];
}

export enum MemoStatus {
  DRAFT = 'Draft',
  PENDING_REVIEW = 'Pending Review',
  APPROVED = 'Approved',
  REVISION_REQUESTED = 'Revision Requested'
}

export interface MemoAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

export interface MemoComment {
  id: string;
  authorId: string;
  text: string;
  timestamp: string;
}

export interface Memo {
  id: string;
  fromId: string;
  toId: string; // User ID or 'ALL'
  date: string;
  subject: string;
  status: MemoStatus;
  summary: string; // Single summary field replacing structured sections
  attachments: MemoAttachment[]; // File attachments
  comments: MemoComment[];
}

export interface OSNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'alert' | 'info';
  read: boolean;
  timestamp: string;
  actionLink?: string;
}

export interface DashboardStats {
  goalCompletion: number;
  teamScores: { name: string; score: number }[];
  companyKpis: { label: string; value: string; trend: 'up' | 'down' | 'flat' }[];
}

export type AgreementStatus = 'Sent' | 'Viewed' | 'Signed' | 'Expired';

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  details: string;
}

export interface Agreement {
  id: string;
  customerName: string;
  recipientEmail: string;
  type: 'MSA' | 'NDA' | 'Service Contract';
  sentDate: string;
  status: AgreementStatus;
  lastActivity: string;
  uniqueLink: string;
  auditTrail: AuditEvent[];
  signedDocUrl?: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  thumbnailColor: string;
  tags: string[];
}

// --- New Types for Accounting & Banking ---

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  balance: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debits: { accountId: string; amount: number }[];
  credits: { accountId: string; amount: number }[];
  total: number;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  withdrawal: number;
  deposit: number;
  status: 'Unreconciled' | 'Reconciled';
}

export interface CashFlowItem {
  category: string;
  projected: number;
  actual: number;
}

export interface MonthlyCashFlow {
  month: string;
  inflows: CashFlowItem[];
  outflows: CashFlowItem[];
}
