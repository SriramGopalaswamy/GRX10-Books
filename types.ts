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

export enum View {
  DASHBOARD = 'DASHBOARD',
  INVOICES = 'INVOICES',
  BANKING = 'BANKING',
  MIGRATION = 'MIGRATION',
  ASSISTANT = 'ASSISTANT',
  REPORTS = 'REPORTS'
}