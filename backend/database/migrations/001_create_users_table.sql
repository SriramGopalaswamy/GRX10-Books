-- ============================================
-- Migration: Create Users Table
-- ============================================
-- This migration creates a Users table for storing admin and user credentials
-- Run this in Supabase SQL Editor or via migration script
-- ============================================

CREATE TABLE IF NOT EXISTS "Users" (
    "id" VARCHAR(255) PRIMARY KEY,
    "username" VARCHAR(255) UNIQUE NOT NULL,
    "email" VARCHAR(255) UNIQUE,
    "passwordHash" VARCHAR(255), -- For future password hashing (bcrypt)
    "displayName" VARCHAR(255),
    "role" VARCHAR(50) DEFAULT 'user', -- 'admin', 'user', 'viewer'
    "isActive" BOOLEAN DEFAULT true,
    "lastLogin" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS "idx_users_username" ON "Users"("username");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "Users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "Users"("role");

-- Insert default admin user (password: admin123)
-- In production, this should be hashed with bcrypt
-- For now, we'll store it as plain text but mark it for hashing
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

-- Note: In production, passwords should be hashed using bcrypt
-- Example: bcrypt.hash('admin123', 10) = '$2b$10$...'

