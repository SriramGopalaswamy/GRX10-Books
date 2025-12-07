
import { Invoice, InvoiceStatus, Customer, Account, Vendor, Bill, BankTransaction, MonthlyCashFlow, Employee, HRMSRole, LeaveRequest, LeaveType, LeaveStatus, AttendanceRecord, RegularizationRequest, RegularizationType } from '../types';

export const APP_NAME = "GRX10 Financial Suite";

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'TechFlow India Pvt Ltd', gstin: '27ABCDE1234F1Z5', email: 'accounts@techflow.in', balance: 0, phone: '+91 9876543210', address: 'Mumbai, Maharashtra' },
  { id: 'c2', name: 'Reddy Enterprises', gstin: '36XYZAB9876L1Z2', email: 'billing@reddyent.com', balance: 45000, phone: '+91 8888888888', address: 'Hyderabad, Telangana' },
  { id: 'c3', name: 'Global Exports Ltd', gstin: '29PQRST5678G1Z9', email: 'finance@globalexports.com', balance: 12000, phone: '+91 7777777777', address: 'Bangalore, Karnataka' },
];

export const MOCK_VENDORS: Vendor[] = [
  { id: 'v1', name: 'AWS Web Services', gstin: '99AWS1234', balance: 15000 },
  { id: 'v2', name: 'Office Depot India', gstin: '27OFFICE99', balance: 2500 },
];

export const MOCK_BILLS: Bill[] = [
  { id: 'b1', vendorId: 'v1', vendorName: 'AWS Web Services', billNumber: 'AWS-MAY-24', date: '2024-05-02', dueDate: '2024-05-15', amount: 12500, status: 'Open' },
  { id: 'b2', vendorId: 'v2', vendorName: 'Office Depot India', billNumber: 'OD-9922', date: '2024-05-10', dueDate: '2024-05-20', amount: 4500, status: 'Paid' },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv_001',
    number: 'INV-2024-001',
    date: '2024-05-01',
    dueDate: '2024-05-15',
    customerId: 'c1',
    customerName: 'TechFlow India Pvt Ltd',
    status: InvoiceStatus.PAID,
    subTotal: 50000,
    taxTotal: 9000,
    total: 59000,
    items: [],
    taxType: 'INTRA'
  },
  {
    id: 'inv_002',
    number: 'INV-2024-002',
    date: '2024-05-10',
    dueDate: '2024-05-25',
    customerId: 'c2',
    customerName: 'Reddy Enterprises',
    status: InvoiceStatus.OVERDUE,
    subTotal: 100000,
    taxTotal: 18000,
    total: 118000,
    items: [],
    taxType: 'INTER'
  },
  {
    id: 'inv_003',
    number: 'INV-2024-003',
    date: '2024-05-20',
    dueDate: '2024-06-05',
    customerId: 'c3',
    customerName: 'Global Exports Ltd',
    status: InvoiceStatus.SENT,
    subTotal: 75000,
    taxTotal: 13500,
    total: 88500,
    items: [],
    taxType: 'INTRA'
  }
];

export const MOCK_ACCOUNTS: Account[] = [
  { id: 'ac1', code: '1001', name: 'HDFC Bank - Current', type: 'Asset', balance: 1250000 },
  { id: 'ac2', code: '1002', name: 'Petty Cash', type: 'Asset', balance: 15000 },
  { id: 'ac3', code: '2001', name: 'Accounts Payable', type: 'Liability', balance: 45000 },
  { id: 'ac4', code: '4001', name: 'Sales Revenue', type: 'Income', balance: 5600000 },
  { id: 'ac5', code: '5001', name: 'Hosting Expenses', type: 'Expense', balance: 120000 },
  { id: 'ac6', code: '5002', name: 'Office Rent', type: 'Expense', balance: 600000 },
];

export const MOCK_BANK_TXNS: BankTransaction[] = [
  { id: 'bt1', date: '2024-05-01', description: 'NEFT Transfer from TechFlow', withdrawal: 0, deposit: 59000, status: 'Unreconciled' },
  { id: 'bt2', date: '2024-05-05', description: 'AWS Services Payment', withdrawal: 12500, deposit: 0, status: 'Reconciled' },
  { id: 'bt3', date: '2024-05-10', description: 'UPI Payment - Office Snacks', withdrawal: 500, deposit: 0, status: 'Reconciled' },
  { id: 'bt4', date: '2024-05-12', description: 'IMPS Inward - Unknown', withdrawal: 0, deposit: 25000, status: 'Unreconciled' },
];

export const MOCK_CASHFLOW_FORECAST: MonthlyCashFlow = {
  month: 'June 2024',
  inflows: [
    { category: 'Client Retainers', projected: 500000, actual: 0 },
    { category: 'Pending Invoices', projected: 150000, actual: 0 },
  ],
  outflows: [
    { category: 'Salaries', projected: 300000, actual: 0 },
    { category: 'Office Rent', projected: 50000, actual: 50000 },
    { category: 'Vendor Bills', projected: 25000, actual: 0 },
  ]
};

export const MOCK_CASHFLOW = [
  { name: 'Jan', income: 4000, expense: 2400 },
  { name: 'Feb', income: 3000, expense: 1398 },
  { name: 'Mar', income: 2000, expense: 9800 },
  { name: 'Apr', income: 2780, expense: 3908 },
  { name: 'May', income: 1890, expense: 4800 },
  { name: 'Jun', income: 2390, expense: 3800 },
  { name: 'Jul', income: 3490, expense: 4300 },
];

// HRMS Constants
export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'EMP001',
    name: 'Alice Carter',
    email: 'alice@grx10.com',
    role: HRMSRole.HR,
    department: 'Human Resources',
    designation: 'HR Manager',
    joinDate: '2022-01-15',
    avatar: 'https://picsum.photos/200',
    salary: 85000,
    status: 'Active',
    password: 'password123',
    isNewUser: false
  },
  {
    id: 'EMP002',
    name: 'Bob Smith',
    email: 'bob@grx10.com',
    role: HRMSRole.MANAGER,
    department: 'Engineering',
    designation: 'Tech Lead',
    joinDate: '2021-05-20',
    avatar: 'https://picsum.photos/201',
    salary: 120000,
    status: 'Active',
    password: 'password123',
    isNewUser: false
  },
  {
    id: 'EMP003',
    name: 'Charlie Davis',
    email: 'charlie@grx10.com',
    role: HRMSRole.EMPLOYEE,
    department: 'Engineering',
    designation: 'Frontend Engineer',
    joinDate: '2023-02-10',
    managerId: 'EMP002',
    avatar: 'https://picsum.photos/202',
    salary: 90000,
    status: 'Active',
    password: 'password123',
    isNewUser: false
  },
  {
    id: 'EMP004',
    name: 'Diana Evans',
    email: 'diana@grx10.com',
    role: HRMSRole.FINANCE,
    department: 'Finance',
    designation: 'Payroll Specialist',
    joinDate: '2022-08-01',
    avatar: 'https://picsum.photos/203',
    salary: 75000,
    status: 'Active',
    password: 'password123',
    isNewUser: false
  },
  {
    id: 'EMP005',
    name: 'Ethan Hunt',
    email: 'ethan@grx10.com',
    role: HRMSRole.EMPLOYEE,
    department: 'Sales',
    designation: 'Sales Executive',
    joinDate: '2023-06-15',
    avatar: 'https://picsum.photos/204',
    salary: 60000,
    status: 'Active',
    password: 'password123',
    isNewUser: false
  }
];

export const MOCK_LEAVES: LeaveRequest[] = [
  {
    id: 'L001',
    employeeId: 'EMP003',
    type: LeaveType.SICK,
    startDate: '2023-10-10',
    endDate: '2023-10-11',
    reason: 'Viral Fever',
    status: LeaveStatus.APPROVED,
    appliedOn: '2023-10-09'
  },
  {
    id: 'L002',
    employeeId: 'EMP003',
    type: LeaveType.CASUAL,
    startDate: '2023-11-05',
    endDate: '2023-11-05',
    reason: 'Personal work',
    status: LeaveStatus.PENDING,
    appliedOn: '2023-11-01'
  }
];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'A001',
    employeeId: 'EMP003',
    date: '2023-10-25',
    checkIn: '09:05',
    checkOut: '18:10',
    status: 'Present',
    durationHours: 9.1
  },
  {
    id: 'A002',
    employeeId: 'EMP003',
    date: '2023-10-26',
    checkIn: '09:30',
    checkOut: '18:00',
    status: 'Late',
    durationHours: 8.5
  }
];

export const MOCK_REGULARIZATIONS: RegularizationRequest[] = [
  {
    id: 'REG001',
    employeeId: 'EMP003',
    employeeName: 'Charlie Davis',
    date: '2023-10-26',
    type: RegularizationType.MISSING_PUNCH,
    reason: 'Forgot to punch out',
    status: LeaveStatus.PENDING,
    appliedOn: '2023-10-27',
    newCheckIn: '09:30',
    newCheckOut: '18:30'
  },
  {
    id: 'REG002',
    employeeId: 'EMP003',
    employeeName: 'Charlie Davis',
    date: '2023-10-20',
    type: RegularizationType.WFH,
    reason: 'Car breakdown, worked from home',
    status: LeaveStatus.APPROVED,
    appliedOn: '2023-10-20'
  }
];

export const COMPANY_POLICIES = `
  GRX10 Employee Handbook Summary:
  1. Working Hours: 9:00 AM to 6:00 PM. Grace period 15 mins.
  2. Leave Policy: 12 Casual Leaves, 12 Sick Leaves, 15 Earned Leaves per year.
  3. Remote Work: Allowed 2 days per week with Manager approval.
  4. Probation: 3 months for all new joinees.
  5. Insurance: Comprehensive health coverage for employee + 2 dependents.
  6. Payroll: Disbursed on the last working day of the month.
  7. Data Security: Access cards must be worn at all times. No sharing of credentials.
`;
