/**
 * Bootstrap Module
 *
 * Creates initial admin user on startup if no users exist.
 * This ensures the system is always accessible, even with an empty database.
 *
 * Security:
 * - Passwords are hashed with bcrypt before storage
 * - Credentials come from environment variables only
 * - Bootstrap is idempotent (won't create duplicates)
 * - No auto-creation on login attempts
 */

import bcrypt from 'bcrypt';
import { Employee } from './database.js';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Bootstrap the initial admin user if no employees exist.
 *
 * Environment Variables:
 * - ADMIN_EMAIL: Email for the admin user (required for bootstrap)
 * - ADMIN_PASSWORD: Password for the admin user (required for bootstrap)
 * - ADMIN_NAME: Display name for the admin user (optional, defaults to 'Administrator')
 *
 * @returns {Promise<{bootstrapped: boolean, message: string}>}
 */
export async function bootstrapAdminUser() {
    try {
        // Check if any admin users exist
        const adminCount = await Employee.count({
            where: {
                role: 'Admin',
                status: 'Active'
            }
        });

        if (adminCount > 0) {
            console.log('🔒 Bootstrap: Admin user(s) already exist, skipping bootstrap');
            return { bootstrapped: false, message: 'Admin user already exists' };
        }

        // Check for required environment variables
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminName = process.env.ADMIN_NAME || 'Administrator';

        if (!adminEmail || !adminPassword) {
            console.warn('⚠️  Bootstrap: No admin users exist and ADMIN_EMAIL/ADMIN_PASSWORD not set');
            console.warn('   Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables to create initial admin');
            return {
                bootstrapped: false,
                message: 'Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables'
            };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(adminEmail)) {
            console.error('❌ Bootstrap: Invalid ADMIN_EMAIL format');
            return { bootstrapped: false, message: 'Invalid ADMIN_EMAIL format' };
        }

        // Validate password strength (minimum 8 characters)
        if (adminPassword.length < 8) {
            console.error('❌ Bootstrap: ADMIN_PASSWORD must be at least 8 characters');
            return { bootstrapped: false, message: 'ADMIN_PASSWORD too short (minimum 8 characters)' };
        }

        // Check if an employee with this email already exists (idempotency)
        const existingEmployee = await Employee.findOne({
            where: { email: adminEmail }
        });

        if (existingEmployee) {
            console.log('🔒 Bootstrap: Employee with ADMIN_EMAIL already exists, skipping');
            return { bootstrapped: false, message: 'Employee with specified email already exists' };
        }

        // Hash the password
        console.log('🔐 Bootstrap: Hashing admin password...');
        const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);

        // Generate unique admin ID
        const adminId = `admin-${Date.now()}`;

        // Create the admin user
        console.log('👤 Bootstrap: Creating initial admin user...');
        await Employee.create({
            id: adminId,
            name: adminName,
            email: adminEmail,
            password: passwordHash,
            role: 'Admin',
            department: 'Administration',
            designation: 'System Administrator',
            joinDate: new Date().toISOString().split('T')[0],
            status: 'Active',
            enableEmailLogin: true,
            isNewUser: false,
            employeeType: 'Full Time'
        });

        console.log('✅ Bootstrap: Initial admin user created successfully');
        console.log(`   Email: ${adminEmail}`);
        console.log('   Role: Admin');
        console.log('   ⚠️  Please change the admin password after first login');

        return {
            bootstrapped: true,
            message: `Admin user created with email: ${adminEmail}`
        };

    } catch (error) {
        console.error('❌ Bootstrap error:', error.message);
        // Don't throw - bootstrap failure shouldn't prevent server startup
        return { bootstrapped: false, message: `Bootstrap error: ${error.message}` };
    }
}

export default { bootstrapAdminUser };
