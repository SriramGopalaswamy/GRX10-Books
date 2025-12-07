/**
 * Database Seed Script
 * 
 * Seeds the database with initial sample data for testing
 * 
 * Usage: npm run db:seed
 */

import dotenv from 'dotenv';
import { sequelize, Customer, Ledger, User } from '../src/config/database.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Connect to database
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');
        
        // Initialize database (sync models)
        await sequelize.sync();
        console.log('✅ Database models synced\n');

        // Seed Ledgers (Chart of Accounts)
        console.log('📝 Seeding Ledgers...');
        const ledgers = [
            { id: 'ledger-001', name: 'Cash', type: 'Asset', balance: 0 },
            { id: 'ledger-002', name: 'Bank Account', type: 'Asset', balance: 0 },
            { id: 'ledger-003', name: 'Accounts Receivable', type: 'Asset', balance: 0 },
            { id: 'ledger-004', name: 'Sales Revenue', type: 'Income', balance: 0 },
            { id: 'ledger-005', name: 'Cost of Goods Sold', type: 'Expense', balance: 0 },
            { id: 'ledger-006', name: 'Operating Expenses', type: 'Expense', balance: 0 }
        ];
        
        for (const ledger of ledgers) {
            await Ledger.findOrCreate({
                where: { id: ledger.id },
                defaults: ledger
            });
        }
        console.log(`   ✅ Created ${ledgers.length} Ledgers`);

        // Seed Customers
        console.log('📝 Seeding Customers...');
        const customers = [
            { id: 'cust-001', name: 'Acme Corporation', gstin: '29AABCU9603R1ZX', email: 'contact@acme.com', balance: 0 },
            { id: 'cust-002', name: 'Tech Solutions Ltd', gstin: '27AABCT1234M1Z5', email: 'info@techsolutions.com', balance: 0 },
            { id: 'cust-003', name: 'Global Industries', gstin: '19AABCG5678K1Z9', email: 'sales@globalind.com', balance: 0 }
        ];
        
        for (const customer of customers) {
            await Customer.findOrCreate({
                where: { id: customer.id },
                defaults: customer
            });
        }
        console.log(`   ✅ Created ${customers.length} Customers`);

        // Seed Admin User (if not exists)
        console.log('📝 Seeding Admin User...');
        const adminUser = await User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                id: 'admin-001',
                username: 'admin',
                email: 'admin@grx10.com',
                passwordHash: 'admin123', // TODO: Hash with bcrypt in production
                displayName: 'Administrator',
                role: 'admin',
                isActive: true
            }
        });
        console.log('   ✅ Admin user ready (username: admin, password: admin123)');
        
        console.log('\n✅ Database seeded successfully!');
        console.log('📊 Sample data added:');
        console.log(`   - ${customers.length} Sample Customers`);
        console.log(`   - ${ledgers.length} Sample Ledgers (Chart of Accounts)`);
        console.log('   - 1 Admin User (username: admin, password: admin123)');
        
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Database seeding failed:', error.message);
        console.error(error);
        await sequelize.close();
        process.exit(1);
    }
}

// Run directly when executed
seedDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

