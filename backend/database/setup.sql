-- ============================================
-- GRX10 Books - Database Setup Script
-- ============================================
-- This script creates all required tables for the GRX10 Books application
-- Run this script in your Supabase SQL Editor or via psql
-- ============================================

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS "OSNotifications" CASCADE;
DROP TABLE IF EXISTS "OSMemoComments" CASCADE;
DROP TABLE IF EXISTS "OSMemoAttachments" CASCADE;
DROP TABLE IF EXISTS "OSMemos" CASCADE;
DROP TABLE IF EXISTS "OSGoalComments" CASCADE;
DROP TABLE IF EXISTS "OSGoals" CASCADE;
DROP TABLE IF EXISTS "Payslips" CASCADE;
DROP TABLE IF EXISTS "RegularizationRequests" CASCADE;
DROP TABLE IF EXISTS "AttendanceRecords" CASCADE;
DROP TABLE IF EXISTS "LeaveRequests" CASCADE;
DROP TABLE IF EXISTS "Employees" CASCADE;
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
-- HRMS Tables
-- ============================================

-- ============================================
-- Table: Employees
-- ============================================
CREATE TABLE "Employees" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "role" VARCHAR(255) NOT NULL, -- 'Employee', 'Manager', 'HR', 'Finance', 'Admin'
    "department" VARCHAR(255),
    "designation" VARCHAR(255),
    "joinDate" VARCHAR(255),
    "avatar" VARCHAR(255),
    "managerId" VARCHAR(255),
    "salary" DOUBLE PRECISION, -- Annual CTC
    "status" VARCHAR(255) DEFAULT 'Active', -- 'Active', 'Exited'
    "password" VARCHAR(255), -- For direct login (should be hashed in production)
    "isNewUser" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employees_managerId_fkey" FOREIGN KEY ("managerId") 
        REFERENCES "Employees"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================
-- Table: LeaveRequests
-- ============================================
CREATE TABLE "LeaveRequests" (
    "id" VARCHAR(255) PRIMARY KEY,
    "employeeId" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL, -- 'Sick Leave', 'Casual Leave', 'Earned Leave', 'Loss of Pay'
    "startDate" VARCHAR(255) NOT NULL,
    "endDate" VARCHAR(255) NOT NULL,
    "reason" VARCHAR(255),
    "status" VARCHAR(255) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    "appliedOn" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveRequests_employeeId_fkey" FOREIGN KEY ("employeeId") 
        REFERENCES "Employees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- Table: AttendanceRecords
-- ============================================
CREATE TABLE "AttendanceRecords" (
    "id" VARCHAR(255) PRIMARY KEY,
    "employeeId" VARCHAR(255) NOT NULL,
    "date" VARCHAR(255) NOT NULL,
    "checkIn" VARCHAR(255), -- HH:mm format
    "checkOut" VARCHAR(255), -- HH:mm format
    "status" VARCHAR(255) DEFAULT 'Present', -- 'Present', 'Absent', 'Late', 'Half Day'
    "durationHours" DOUBLE PRECISION,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceRecords_employeeId_fkey" FOREIGN KEY ("employeeId") 
        REFERENCES "Employees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- Table: RegularizationRequests
-- ============================================
CREATE TABLE "RegularizationRequests" (
    "id" VARCHAR(255) PRIMARY KEY,
    "employeeId" VARCHAR(255) NOT NULL,
    "employeeName" VARCHAR(255) NOT NULL,
    "date" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL, -- 'Missing Punch', 'Incorrect Punch', 'Work From Home'
    "reason" VARCHAR(255),
    "status" VARCHAR(255) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    "appliedOn" VARCHAR(255) NOT NULL,
    "newCheckIn" VARCHAR(255),
    "newCheckOut" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegularizationRequests_employeeId_fkey" FOREIGN KEY ("employeeId") 
        REFERENCES "Employees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- Table: Payslips
-- ============================================
CREATE TABLE "Payslips" (
    "id" VARCHAR(255) PRIMARY KEY,
    "employeeId" VARCHAR(255) NOT NULL,
    "month" VARCHAR(255) NOT NULL, -- YYYY-MM format
    "basic" DOUBLE PRECISION DEFAULT 0,
    "hra" DOUBLE PRECISION DEFAULT 0,
    "allowances" DOUBLE PRECISION DEFAULT 0,
    "deductions" DOUBLE PRECISION DEFAULT 0,
    "netPay" DOUBLE PRECISION DEFAULT 0,
    "generatedDate" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payslips_employeeId_fkey" FOREIGN KEY ("employeeId") 
        REFERENCES "Employees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- HRMS Indexes
-- ============================================
CREATE INDEX "idx_employees_email" ON "Employees"("email");
CREATE INDEX "idx_employees_role" ON "Employees"("role");
CREATE INDEX "idx_employees_status" ON "Employees"("status");
CREATE INDEX "idx_employees_managerId" ON "Employees"("managerId");

CREATE INDEX "idx_leaveRequests_employeeId" ON "LeaveRequests"("employeeId");
CREATE INDEX "idx_leaveRequests_status" ON "LeaveRequests"("status");
CREATE INDEX "idx_leaveRequests_startDate" ON "LeaveRequests"("startDate");

CREATE INDEX "idx_attendanceRecords_employeeId" ON "AttendanceRecords"("employeeId");
CREATE INDEX "idx_attendanceRecords_date" ON "AttendanceRecords"("date");

CREATE INDEX "idx_regularizationRequests_employeeId" ON "RegularizationRequests"("employeeId");
CREATE INDEX "idx_regularizationRequests_status" ON "RegularizationRequests"("status");

CREATE INDEX "idx_payslips_employeeId" ON "Payslips"("employeeId");
CREATE INDEX "idx_payslips_month" ON "Payslips"("month");

-- ============================================
-- OS (Performance OS) Tables
-- ============================================

-- ============================================
-- Table: OSGoals
-- ============================================
CREATE TABLE "OSGoals" (
    "id" VARCHAR(255) PRIMARY KEY,
    "ownerId" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "type" VARCHAR(255) NOT NULL, -- 'Annual', 'Quarterly'
    "metric" VARCHAR(255) NOT NULL,
    "baseline" DOUBLE PRECISION NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "current" DOUBLE PRECISION DEFAULT 0,
    "timeline" VARCHAR(255) NOT NULL, -- ISO Date
    "status" VARCHAR(255) DEFAULT 'On Track', -- 'On Track', 'Risk', 'Off Track', 'Completed'
    "score" VARCHAR(1), -- 'A', 'B', 'C', 'D', 'F'
    "managerFeedback" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: OSGoalComments
-- ============================================
CREATE TABLE "OSGoalComments" (
    "id" VARCHAR(255) PRIMARY KEY,
    "goalId" VARCHAR(255) NOT NULL,
    "authorId" VARCHAR(255) NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OSGoalComments_goalId_fkey" FOREIGN KEY ("goalId") 
        REFERENCES "OSGoals"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- Table: OSMemos
-- ============================================
CREATE TABLE "OSMemos" (
    "id" VARCHAR(255) PRIMARY KEY,
    "fromId" VARCHAR(255) NOT NULL,
    "toId" VARCHAR(255) NOT NULL, -- User ID or 'ALL'
    "date" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "status" VARCHAR(255) DEFAULT 'Draft', -- 'Draft', 'Pending Review', 'Approved', 'Revision Requested'
    "summary" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: OSMemoAttachments
-- ============================================
CREATE TABLE "OSMemoAttachments" (
    "id" VARCHAR(255) PRIMARY KEY,
    "memoId" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "size" VARCHAR(255),
    "type" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OSMemoAttachments_memoId_fkey" FOREIGN KEY ("memoId") 
        REFERENCES "OSMemos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- Table: OSMemoComments
-- ============================================
CREATE TABLE "OSMemoComments" (
    "id" VARCHAR(255) PRIMARY KEY,
    "memoId" VARCHAR(255) NOT NULL,
    "authorId" VARCHAR(255) NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OSMemoComments_memoId_fkey" FOREIGN KEY ("memoId") 
        REFERENCES "OSMemos"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- Table: OSNotifications
-- ============================================
CREATE TABLE "OSNotifications" (
    "id" VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(255) DEFAULT 'info', -- 'alert', 'info'
    "read" BOOLEAN DEFAULT false,
    "timestamp" VARCHAR(255) NOT NULL,
    "actionLink" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- OS Indexes
-- ============================================
CREATE INDEX "idx_osGoals_ownerId" ON "OSGoals"("ownerId");
CREATE INDEX "idx_osGoals_status" ON "OSGoals"("status");
CREATE INDEX "idx_osGoals_timeline" ON "OSGoals"("timeline");

CREATE INDEX "idx_osGoalComments_goalId" ON "OSGoalComments"("goalId");

CREATE INDEX "idx_osMemos_fromId" ON "OSMemos"("fromId");
CREATE INDEX "idx_osMemos_toId" ON "OSMemos"("toId");
CREATE INDEX "idx_osMemos_status" ON "OSMemos"("status");
CREATE INDEX "idx_osMemos_date" ON "OSMemos"("date");

CREATE INDEX "idx_osMemoAttachments_memoId" ON "OSMemoAttachments"("memoId");

CREATE INDEX "idx_osMemoComments_memoId" ON "OSMemoComments"("memoId");

CREATE INDEX "idx_osNotifications_userId" ON "OSNotifications"("userId");
CREATE INDEX "idx_osNotifications_read" ON "OSNotifications"("read");

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
    RAISE NOTICE '📊 Financial Tables: Customers, Invoices, InvoiceItems, Ledgers, Transactions, Users';
    RAISE NOTICE '📊 HRMS Tables: Employees, LeaveRequests, AttendanceRecords, RegularizationRequests, Payslips';
    RAISE NOTICE '📊 OS Tables: OSGoals, OSGoalComments, OSMemos, OSMemoAttachments, OSMemoComments, OSNotifications';
END $$;

