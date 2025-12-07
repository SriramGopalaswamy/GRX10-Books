-- ============================================
-- GRX10 Books - Database Setup Script
-- ============================================
-- This script creates all required tables for the GRX10 Books application
-- Run this script in your Supabase SQL Editor or via psql
-- ============================================

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS "Transactions" CASCADE;
DROP TABLE IF EXISTS "InvoiceItems" CASCADE;
DROP TABLE IF EXISTS "Invoices" CASCADE;
DROP TABLE IF EXISTS "Customers" CASCADE;
DROP TABLE IF EXISTS "Ledgers" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;

-- ============================================
-- Table: Customers
-- ============================================
CREATE TABLE "Customers" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "gstin" VARCHAR(255),
    "email" VARCHAR(255),
    "balance" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: Ledgers
-- ============================================
CREATE TABLE "Ledgers" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255), -- Asset, Liability, Income, Expense, Equity
    "balance" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: Invoices
-- ============================================
CREATE TABLE "Invoices" (
    "id" VARCHAR(255) PRIMARY KEY,
    "number" VARCHAR(255) NOT NULL,
    "date" VARCHAR(255) NOT NULL,
    "dueDate" VARCHAR(255),
    "customerId" VARCHAR(255) NOT NULL,
    "customerName" VARCHAR(255),
    "status" VARCHAR(255) DEFAULT 'Draft',
    "subTotal" DOUBLE PRECISION DEFAULT 0,
    "taxTotal" DOUBLE PRECISION DEFAULT 0,
    "total" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoices_customerId_fkey" FOREIGN KEY ("customerId") 
        REFERENCES "Customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- Table: InvoiceItems
-- ============================================
CREATE TABLE "InvoiceItems" (
    "id" VARCHAR(255) PRIMARY KEY,
    "invoiceId" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "hsn" VARCHAR(255),
    "quantity" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION,
    "taxRate" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceItems_invoiceId_fkey" FOREIGN KEY ("invoiceId") 
        REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- Table: Transactions
-- ============================================
CREATE TABLE "Transactions" (
    "id" VARCHAR(255) PRIMARY KEY,
    "date" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "amount" DOUBLE PRECISION NOT NULL,
    "type" VARCHAR(255), -- Debit / Credit
    "ledgerId" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transactions_ledgerId_fkey" FOREIGN KEY ("ledgerId") 
        REFERENCES "Ledgers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- Table: Users
-- ============================================
CREATE TABLE "Users" (
    "id" VARCHAR(255) PRIMARY KEY,
    "username" VARCHAR(255) UNIQUE NOT NULL,
    "email" VARCHAR(255) UNIQUE,
    "passwordHash" VARCHAR(255), -- For password hashing (bcrypt)
    "displayName" VARCHAR(255),
    "role" VARCHAR(50) DEFAULT 'user', -- 'admin', 'user', 'viewer'
    "isActive" BOOLEAN DEFAULT true,
    "lastLogin" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for better query performance
-- ============================================
CREATE INDEX "idx_invoices_customerId" ON "Invoices"("customerId");
CREATE INDEX "idx_invoices_number" ON "Invoices"("number");
CREATE INDEX "idx_invoices_date" ON "Invoices"("date");
CREATE INDEX "idx_invoices_status" ON "Invoices"("status");

CREATE INDEX "idx_invoiceItems_invoiceId" ON "InvoiceItems"("invoiceId");

CREATE INDEX "idx_transactions_ledgerId" ON "Transactions"("ledgerId");
CREATE INDEX "idx_transactions_date" ON "Transactions"("date");

CREATE INDEX "idx_customers_email" ON "Customers"("email");
CREATE INDEX "idx_customers_gstin" ON "Customers"("gstin");

CREATE INDEX "idx_users_username" ON "Users"("username");
CREATE INDEX "idx_users_email" ON "Users"("email");
CREATE INDEX "idx_users_role" ON "Users"("role");

-- ============================================
-- Success message
-- ============================================
-- Insert default admin user (if not exists)
INSERT INTO "Users" ("id", "username", "email", "passwordHash", "displayName", "role", "isActive", "createdAt", "updatedAt") 
VALUES (
    'admin-001',
    'admin',
    'admin@grx10.com',
    'admin123', -- TODO: Hash this with bcrypt in production
    'Administrator',
    'admin',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT ("username") DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✅ Database tables created successfully!';
    RAISE NOTICE '📊 Tables: Customers, Invoices, InvoiceItems, Ledgers, Transactions, Users';
END $$;

