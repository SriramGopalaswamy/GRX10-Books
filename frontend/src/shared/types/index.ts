
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
  DOCUMENTS = 'DOCUMENTS'
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
