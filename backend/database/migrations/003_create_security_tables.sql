-- ============================================
-- Migration: Create Security & Workflow Tables
-- ============================================

CREATE TABLE IF NOT EXISTS "Roles" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "code" VARCHAR(255) UNIQUE,
    "description" TEXT,
    "isSystemRole" BOOLEAN DEFAULT false,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Permissions" (
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

CREATE TABLE IF NOT EXISTS "RolePermissions" (
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

CREATE TABLE IF NOT EXISTS "UserRoles" (
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

CREATE TABLE IF NOT EXISTS "ApprovalWorkflows" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "module" VARCHAR(255) NOT NULL,
    "resource" VARCHAR(255) NOT NULL,
    "workflowType" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ApprovalWorkflowSteps" (
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

CREATE TABLE IF NOT EXISTS "ApprovalRequests" (
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

CREATE TABLE IF NOT EXISTS "ApprovalHistory" (
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

CREATE INDEX IF NOT EXISTS "idx_roles_isActive" ON "Roles"("isActive");
CREATE INDEX IF NOT EXISTS "idx_permissions_module" ON "Permissions"("module");
CREATE INDEX IF NOT EXISTS "idx_permissions_resource" ON "Permissions"("resource");
CREATE INDEX IF NOT EXISTS "idx_rolePermissions_roleId" ON "RolePermissions"("roleId");
CREATE INDEX IF NOT EXISTS "idx_rolePermissions_permissionId" ON "RolePermissions"("permissionId");
CREATE INDEX IF NOT EXISTS "idx_userRoles_userId" ON "UserRoles"("userId");
CREATE INDEX IF NOT EXISTS "idx_userRoles_roleId" ON "UserRoles"("roleId");
CREATE INDEX IF NOT EXISTS "idx_approvalRequests_status" ON "ApprovalRequests"("status");
CREATE INDEX IF NOT EXISTS "idx_approvalHistory_requestId" ON "ApprovalHistory"("requestId");
