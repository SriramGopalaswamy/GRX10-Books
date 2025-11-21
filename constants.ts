import { Invoice, InvoiceStatus, Customer } from './types';

export const APP_NAME = "GRX10 Financial Suite";

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'TechFlow India Pvt Ltd', gstin: '27ABCDE1234F1Z5', email: 'accounts@techflow.in', balance: 0 },
  { id: 'c2', name: 'Reddy Enterprises', gstin: '36XYZAB9876L1Z2', email: 'billing@reddyent.com', balance: 45000 },
  { id: 'c3', name: 'Global Exports Ltd', gstin: '29PQRST5678G1Z9', email: 'finance@globalexports.com', balance: 12000 },
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
    items: []
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
    items: []
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
    items: []
  }
];

export const MOCK_CASHFLOW = [
  { name: 'Jan', income: 4000, expense: 2400 },
  { name: 'Feb', income: 3000, expense: 1398 },
  { name: 'Mar', income: 2000, expense: 9800 },
  { name: 'Apr', income: 2780, expense: 3908 },
  { name: 'May', income: 1890, expense: 4800 },
  { name: 'Jun', income: 2390, expense: 3800 },
  { name: 'Jul', income: 3490, expense: 4300 },
];