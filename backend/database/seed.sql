-- ============================================
-- GRX10 Books - Database Seed Data
-- ============================================
-- Optional: Seed initial data for testing
-- Run this after setup.sql
-- ============================================

-- Sample Ledgers (Chart of Accounts)
INSERT INTO "Ledgers" ("id", "name", "type", "balance", "createdAt", "updatedAt") VALUES
('ledger-001', 'Cash', 'Asset', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ledger-002', 'Bank Account', 'Asset', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ledger-003', 'Accounts Receivable', 'Asset', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ledger-004', 'Sales Revenue', 'Income', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ledger-005', 'Cost of Goods Sold', 'Expense', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ledger-006', 'Operating Expenses', 'Expense', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Sample Customers
INSERT INTO "Customers" ("id", "name", "gstin", "email", "balance", "createdAt", "updatedAt") VALUES
('cust-001', 'Acme Corporation', '29AABCU9603R1ZX', 'contact@acme.com', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cust-002', 'Tech Solutions Ltd', '27AABCT1234M1Z5', 'info@techsolutions.com', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cust-003', 'Global Industries', '19AABCG5678K1Z9', 'sales@globalind.com', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Note: Sample invoices and transactions can be added through the application UI

