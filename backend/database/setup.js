/**
 * Database Setup Script
 * 
 * This script creates all required tables in the database.
 * It can be run independently or the tables will be auto-created via sequelize.sync()
 * 
 * Usage: node database/setup.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';
import { sequelize, initDb } from '../src/config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
    try {
        console.log('🚀 Starting database setup...\n');

        // Initialize database connection
        await initDb();
        console.log('✅ Database connection established\n');

        // Read and execute SQL setup script
        const sqlPath = path.join(__dirname, 'setup.sql');
        const sqlScript = readFileSync(sqlPath, 'utf8');
        
        console.log('📝 Executing SQL setup script...');
        
        // Split by semicolons and execute each statement
        const statements = sqlScript
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('DO $$'));

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await sequelize.query(statement);
                } catch (error) {
                    // Ignore "table does not exist" errors for DROP statements
                    if (!error.message.includes('does not exist')) {
                        console.warn(`⚠️  Warning: ${error.message}`);
                    }
                }
            }
        }

        // Use Sequelize sync to ensure tables match models
        console.log('\n🔄 Syncing database models...');
        await sequelize.sync({ alter: true });
        
        console.log('\n✅ Database setup completed successfully!');
        console.log('📊 Tables created:');
        console.log('   - Customers');
        console.log('   - Invoices');
        console.log('   - InvoiceItems');
        console.log('   - Ledgers');
        console.log('   - Transactions');
        
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.error(error);
        await sequelize.close();
        process.exit(1);
    }
}

setupDatabase();

