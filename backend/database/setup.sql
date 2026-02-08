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
DROP TABLE IF EXISTS "EmployeeHiringHistory" CASCADE;
DROP TABLE IF EXISTS "Employees" CASCADE;
DROP TABLE IF EXISTS "Transactions" CASCADE;
DROP TABLE IF EXISTS "InvoiceItems" CASCADE;
DROP TABLE IF EXISTS "Invoices" CASCADE;
DROP TABLE IF EXISTS "Customers" CASCADE;
DROP TABLE IF EXISTS "Ledgers" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;
-- Configuration Tables
DROP TABLE IF EXISTS "Holidays" CASCADE;
DROP TABLE IF EXISTS "ChartOfAccounts" CASCADE;
DROP TABLE IF EXISTS "Departments" CASCADE;
DROP TABLE IF EXISTS "Positions" CASCADE;
DROP TABLE IF EXISTS "HRMSRoles" CASCADE;
DROP TABLE IF EXISTS "EmployeeTypes" CASCADE;
DROP TABLE IF EXISTS "LeaveTypes" CASCADE;
DROP TABLE IF EXISTS "WorkLocations" CASCADE;
DROP TABLE IF EXISTS "Skills" CASCADE;
DROP TABLE IF EXISTS "Languages" CASCADE;
DROP TABLE IF EXISTS "Organizations" CASCADE;
-- Security & Approval Tables
DROP TABLE IF EXISTS "ApprovalHistory" CASCADE;
DROP TABLE IF EXISTS "ApprovalRequests" CASCADE;
DROP TABLE IF EXISTS "ApprovalWorkflows" CASCADE;
DROP TABLE IF EXISTS "UserRoles" CASCADE;
DROP TABLE IF EXISTS "Permissions" CASCADE;
DROP TABLE IF EXISTS "Roles" CASCADE;

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
    "employeePosition" VARCHAR(255), -- Employee Role/Position
    "designation" VARCHAR(255),
    "joinDate" VARCHAR(255),
    "terminationDate" VARCHAR(255),
    "employeeType" VARCHAR(255) DEFAULT 'Full Time', -- 'Full Time', 'Part Time', 'Contract'
    "status" VARCHAR(255) DEFAULT 'Active', -- 'Active', 'Terminated'
    "isRehired" BOOLEAN DEFAULT false,
    "previousEmployeeId" VARCHAR(255), -- For rehired employees
    "avatar" VARCHAR(255),
    "managerId" VARCHAR(255),
    "salary" DOUBLE PRECISION, -- Annual CTC
    "password" VARCHAR(255), -- For direct login (should be hashed in production)
    "isNewUser" BOOLEAN DEFAULT false,
    -- Additional Traditional HR Fields
    "workLocation" VARCHAR(255), -- Office Location/Address
    "probationEndDate" VARCHAR(255),
    "noticePeriod" INTEGER DEFAULT 30, -- Days
    "lastWorkingDay" VARCHAR(255),
    "exitInterviewDate" VARCHAR(255),
    "employeeReferralId" VARCHAR(255), -- ID of employee who referred
    "bloodGroup" VARCHAR(10),
    "maritalStatus" VARCHAR(50), -- 'Single', 'Married', 'Divorced', 'Widowed'
    "spouseName" VARCHAR(255),
    "emergencyContactName" VARCHAR(255),
    "emergencyContactRelation" VARCHAR(100),
    "emergencyContactPhone" VARCHAR(255),
    "bankAccountNumber" VARCHAR(255),
    "bankIFSC" VARCHAR(20),
    "bankName" VARCHAR(255),
    "bankBranch" VARCHAR(255),
    "skills" TEXT, -- JSON array of skills
    "languages" TEXT, -- JSON array of languages known
    "dependents" TEXT, -- JSON array of dependents
    "taxDeclarations" TEXT, -- JSON object for tax declarations (80C, 80D, HRA, etc.)
    -- Personal Details
    "dateOfBirth" VARCHAR(255),
    "phone" VARCHAR(255),
    "address" TEXT,
    "pan" VARCHAR(255),
    "aadhar" VARCHAR(255),
    "pfNumber" VARCHAR(255),
    -- Education Details (stored as JSON)
    "educationDetails" TEXT, -- JSON array of education records
    -- Experience Details (stored as JSON)
    "experienceDetails" TEXT, -- JSON array of experience records
    -- Salary Breakdown (stored as JSON)
    "salaryBreakdown" TEXT, -- JSON object with base, pf, deductions, etc.
    -- Leave Entitlements (stored as JSON)
    "leaveEntitlements" TEXT, -- JSON object with casual, sick, earned, etc.
    -- Certifications (stored as JSON)
    "certifications" TEXT, -- JSON array of certifications
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Employees_managerId_fkey" FOREIGN KEY ("managerId") 
        REFERENCES "Employees"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employees_previousEmployeeId_fkey" FOREIGN KEY ("previousEmployeeId") 
        REFERENCES "Employees"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Employees_employeeReferralId_fkey" FOREIGN KEY ("employeeReferralId") 
        REFERENCES "Employees"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================
-- Table: EmployeeHiringHistory
-- ============================================
CREATE TABLE "EmployeeHiringHistory" (
    "id" VARCHAR(255) PRIMARY KEY,
    "employeeId" VARCHAR(255) NOT NULL,
    "hireDate" VARCHAR(255) NOT NULL,
    "terminationDate" VARCHAR(255),
    "employeeType" VARCHAR(255), -- 'Full Time', 'Part Time', 'Contract'
    "department" VARCHAR(255),
    "employeePosition" VARCHAR(255),
    "designation" VARCHAR(255),
    "salary" DOUBLE PRECISION,
    "managerId" VARCHAR(255),
    "reasonForTermination" TEXT,
    "isRehire" BOOLEAN DEFAULT false,
    "previousEmployeeId" VARCHAR(255), -- Link to previous employee record if rehired
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeHiringHistory_employeeId_fkey" FOREIGN KEY ("employeeId") 
        REFERENCES "Employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeeHiringHistory_previousEmployeeId_fkey" FOREIGN KEY ("previousEmployeeId") 
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
CREATE INDEX "idx_employees_employeeType" ON "Employees"("employeeType");
CREATE INDEX "idx_employees_isRehired" ON "Employees"("isRehired");
CREATE INDEX "idx_employees_previousEmployeeId" ON "Employees"("previousEmployeeId");

CREATE INDEX "idx_employeeHiringHistory_employeeId" ON "EmployeeHiringHistory"("employeeId");
CREATE INDEX "idx_employeeHiringHistory_hireDate" ON "EmployeeHiringHistory"("hireDate");

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
-- Security & Approval Tables
-- ============================================

CREATE TABLE "Roles" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "code" VARCHAR(255) UNIQUE,
    "description" TEXT,
    "isSystemRole" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Permissions" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "code" VARCHAR(255) UNIQUE NOT NULL,
    "module" VARCHAR(255) NOT NULL,
    "resource" VARCHAR(255) NOT NULL,
    "action" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "RolePermissions" (
    "id" VARCHAR(255) PRIMARY KEY,
    "roleId" VARCHAR(255) NOT NULL,
    "permissionId" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RolePermissions_roleId_fkey" FOREIGN KEY ("roleId")
        REFERENCES "Roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolePermissions_permissionId_fkey" FOREIGN KEY ("permissionId")
        REFERENCES "Permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserRoles" (
    "id" VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "roleId" VARCHAR(255) NOT NULL,
    "assignedBy" VARCHAR(255),
    "assignedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRoles_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRoles_roleId_fkey" FOREIGN KEY ("roleId")
        REFERENCES "Roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ApprovalWorkflows" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "module" VARCHAR(255) NOT NULL,
    "resource" VARCHAR(255) NOT NULL,
    "workflowType" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ApprovalWorkflowSteps" (
    "id" VARCHAR(255) PRIMARY KEY,
    "workflowId" VARCHAR(255) NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverType" VARCHAR(255) NOT NULL,
    "approverId" VARCHAR(255),
    "isRequired" BOOLEAN DEFAULT true,
    "canDelegate" BOOLEAN DEFAULT false,
    "timeoutHours" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalWorkflowSteps_workflowId_fkey" FOREIGN KEY ("workflowId")
        REFERENCES "ApprovalWorkflows"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ApprovalRequests" (
    "id" VARCHAR(255) PRIMARY KEY,
    "workflowId" VARCHAR(255) NOT NULL,
    "module" VARCHAR(255) NOT NULL,
    "resource" VARCHAR(255) NOT NULL,
    "resourceId" VARCHAR(255) NOT NULL,
    "requestedBy" VARCHAR(255) NOT NULL,
    "currentStep" INTEGER DEFAULT 1,
    "status" VARCHAR(255) DEFAULT 'Pending',
    "priority" VARCHAR(255) DEFAULT 'Normal',
    "requestData" TEXT,
    "comments" TEXT,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalRequests_workflowId_fkey" FOREIGN KEY ("workflowId")
        REFERENCES "ApprovalWorkflows"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ApprovalHistory" (
    "id" VARCHAR(255) PRIMARY KEY,
    "requestId" VARCHAR(255) NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverId" VARCHAR(255) NOT NULL,
    "action" VARCHAR(255) NOT NULL,
    "comments" TEXT,
    "actionDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalHistory_requestId_fkey" FOREIGN KEY ("requestId")
        REFERENCES "ApprovalRequests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_roles_isActive" ON "Roles"("isActive");
CREATE INDEX "idx_permissions_module" ON "Permissions"("module");
CREATE INDEX "idx_permissions_resource" ON "Permissions"("resource");
CREATE INDEX "idx_rolePermissions_roleId" ON "RolePermissions"("roleId");
CREATE INDEX "idx_rolePermissions_permissionId" ON "RolePermissions"("permissionId");
CREATE INDEX "idx_userRoles_userId" ON "UserRoles"("userId");
CREATE INDEX "idx_userRoles_roleId" ON "UserRoles"("roleId");
CREATE INDEX "idx_approvalRequests_status" ON "ApprovalRequests"("status");
CREATE INDEX "idx_approvalHistory_requestId" ON "ApprovalHistory"("requestId");

-- ============================================
-- Configuration Tables
-- ============================================

-- ============================================
-- Table: Organizations
-- ============================================
CREATE TABLE "Organizations" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(100) UNIQUE,
    "address" TEXT,
    "phone" VARCHAR(255),
    "email" VARCHAR(255),
    "website" VARCHAR(255),
    "taxId" VARCHAR(255),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: Departments
-- ============================================
CREATE TABLE "Departments" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "code" VARCHAR(100),
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: Positions
-- ============================================
CREATE TABLE "Positions" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "code" VARCHAR(100),
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: HRMSRoles
-- ============================================
CREATE TABLE "HRMSRoles" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "code" VARCHAR(100),
    "description" TEXT,
    "permissions" TEXT, -- JSON array of permissions
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: EmployeeTypes
-- ============================================
CREATE TABLE "EmployeeTypes" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "code" VARCHAR(100),
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: Holidays
-- ============================================
CREATE TABLE "Holidays" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "date" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100), -- 'National', 'Regional', 'Company', 'Optional'
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: LeaveTypes
-- ============================================
CREATE TABLE "LeaveTypes" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "code" VARCHAR(100),
    "description" TEXT,
    "maxDays" INTEGER,
    "isPaid" BOOLEAN DEFAULT true,
    "requiresApproval" BOOLEAN DEFAULT true,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: WorkLocations
-- ============================================
CREATE TABLE "WorkLocations" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "code" VARCHAR(100),
    "address" TEXT,
    "city" VARCHAR(255),
    "state" VARCHAR(255),
    "country" VARCHAR(255),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: Skills
-- ============================================
CREATE TABLE "Skills" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "category" VARCHAR(255), -- 'Technical', 'Soft', 'Domain', etc.
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: Languages
-- ============================================
CREATE TABLE "Languages" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "code" VARCHAR(10), -- ISO 639-1 code
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: ChartOfAccounts
-- ============================================
CREATE TABLE "ChartOfAccounts" (
    "id" VARCHAR(255) PRIMARY KEY,
    "code" VARCHAR(100) NOT NULL UNIQUE,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL, -- 'Asset', 'Liability', 'Income', 'Expense', 'Equity'
    "parentId" VARCHAR(255),
    "description" TEXT,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChartOfAccounts_parentId_fkey" FOREIGN KEY ("parentId") 
        REFERENCES "ChartOfAccounts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================
-- Configuration Indexes
-- ============================================
CREATE INDEX "idx_organizations_isActive" ON "Organizations"("isActive");
CREATE INDEX "idx_departments_isActive" ON "Departments"("isActive");
CREATE INDEX "idx_positions_isActive" ON "Positions"("isActive");
CREATE INDEX "idx_hrmsRoles_isActive" ON "HRMSRoles"("isActive");
CREATE INDEX "idx_employeeTypes_isActive" ON "EmployeeTypes"("isActive");
CREATE INDEX "idx_holidays_date" ON "Holidays"("date");
CREATE INDEX "idx_holidays_isActive" ON "Holidays"("isActive");
CREATE INDEX "idx_leaveTypes_isActive" ON "LeaveTypes"("isActive");
CREATE INDEX "idx_workLocations_isActive" ON "WorkLocations"("isActive");
CREATE INDEX "idx_skills_isActive" ON "Skills"("isActive");
CREATE INDEX "idx_languages_isActive" ON "Languages"("isActive");
CREATE INDEX "idx_chartOfAccounts_type" ON "ChartOfAccounts"("type");
CREATE INDEX "idx_chartOfAccounts_isActive" ON "ChartOfAccounts"("isActive");
CREATE INDEX "idx_chartOfAccounts_parentId" ON "ChartOfAccounts"("parentId");

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
    RAISE NOTICE '📊 HRMS Tables: Employees, EmployeeHiringHistory, LeaveRequests, AttendanceRecords, RegularizationRequests, Payslips';
    RAISE NOTICE '📊 OS Tables: OSGoals, OSGoalComments, OSMemos, OSMemoAttachments, OSMemoComments, OSNotifications';
    RAISE NOTICE '📊 Configuration Tables: Organizations, Departments, Positions, HRMSRoles, EmployeeTypes, Holidays, LeaveTypes, WorkLocations, Skills, Languages, ChartOfAccounts';
    RAISE NOTICE '📊 Security Tables: Roles, Permissions, RolePermissions, UserRoles, ApprovalWorkflows, ApprovalWorkflowSteps, ApprovalRequests, ApprovalHistory';
END $$;
