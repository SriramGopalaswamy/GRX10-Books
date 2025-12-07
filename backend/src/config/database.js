// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extract Supabase project reference from SUPABASEURL
const getSupabaseProjectRef = () => {
  // Priority 1: Extract from SUPABASEURL (e.g., https://ctkbmfobxdpdedoqukrt.supabase.co)
  if (process.env.SUPABASEURL) {
    try {
      const url = new URL(process.env.SUPABASEURL);
      // Extract project ref from hostname: ctkbmfobxdpdedoqukrt.supabase.co -> ctkbmfobxdpdedoqukrt
      const hostname = url.hostname;
      const projectRef = hostname.split('.')[0];
      if (projectRef) {
        return projectRef;
      }
    } catch (error) {
      console.warn('Could not extract project ref from SUPABASEURL');
    }
  }
  
  // Priority 2: Extract from SUPABASE_KEY (JWT token)
  if (process.env.SUPABASE_KEY) {
    try {
      const payload = process.env.SUPABASE_KEY.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      return decoded.ref;
    } catch (error) {
      console.warn('Could not extract project ref from SUPABASE_KEY');
    }
  }
  
  // Fallback: use SUPABASE_PROJECT_REF env var
  return process.env.SUPABASE_PROJECT_REF || 'ctkbmfobxdpdedoqukrt';
};

// Build Supabase DATABASE_URL from SUPABASE_PWD
const buildSupabaseUrl = () => {
  if (process.env.SUPABASE_PWD) {
    const projectRef = getSupabaseProjectRef();
    const password = encodeURIComponent(process.env.SUPABASE_PWD);
    
    // Use connection pooler by default (IPv4 compatible, works on most networks)
    // Direct connection requires IPv6 which many networks don't support
    // Format: postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
    const region = process.env.SUPABASE_REGION || 'us-east-1';
    const poolerUrl = `postgresql://postgres.${projectRef}:${password}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
    const maskedUrl = `postgresql://postgres.${projectRef}:***@aws-0-${region}.pooler.supabase.com:5432/postgres`;
    
    console.log(`🔗 Building Supabase connection for project: ${projectRef}`);
    console.log(`🔗 Using CONNECTION POOLER (IPv4 compatible): ${maskedUrl}`);
    console.log(`💡 Direct connection (db.*.supabase.co) requires IPv6 - using pooler instead`);
    
    return poolerUrl;
  }
  return null;
};

// Database configuration: Use Supabase PostgreSQL if credentials are provided, otherwise use SQLite
const getDatabaseConfig = () => {
  // Priority 1: Try DATABASE_URL first (usually pooler - IPv4 compatible)
  if (process.env.DATABASE_URL) {
    const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@');
    console.log('🔗 Trying DATABASE_URL (Priority 1 - usually pooler/IPv4):');
    console.log(`   ${maskedUrl}`);
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
  
  // Priority 2: Try DB_URL (usually direct - IPv6)
  if (process.env.DB_URL) {
    const maskedUrl = process.env.DB_URL.replace(/:[^:@]+@/, ':***@');
    console.log('🔗 Trying DB_URL (Priority 2 - usually direct/IPv6):');
    console.log(`   ${maskedUrl}`);
    return new Sequelize(process.env.DB_URL, {
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
  
  // Priority 2: Build DATABASE_URL from SUPABASE_PWD
  const supabaseUrl = buildSupabaseUrl();
  if (supabaseUrl) {
    console.log('✅ Using Supabase PostgreSQL database');
    return new Sequelize(supabaseUrl, {
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
  
  // If we reach here, SUPABASE_PWD is required
  throw new Error('SUPABASE_PWD environment variable is required for database connection');
};

const sequelize = getDatabaseConfig();

// Define Models

const Customer = sequelize.define('Customer', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    gstin: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    balance: { type: DataTypes.FLOAT, defaultValue: 0 }
});

const Invoice = sequelize.define('Invoice', {
    id: { type: DataTypes.STRING, primaryKey: true },
    number: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    dueDate: { type: DataTypes.STRING },
    customerId: { type: DataTypes.STRING, allowNull: false },
    customerName: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'Draft' },
    subTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
    taxTotal: { type: DataTypes.FLOAT, defaultValue: 0 },
    total: { type: DataTypes.FLOAT, defaultValue: 0 }
});

const InvoiceItem = sequelize.define('InvoiceItem', {
    id: { type: DataTypes.STRING, primaryKey: true },
    invoiceId: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    hsn: { type: DataTypes.STRING },
    quantity: { type: DataTypes.FLOAT },
    rate: { type: DataTypes.FLOAT },
    taxRate: { type: DataTypes.FLOAT },
    amount: { type: DataTypes.FLOAT }
});

const Ledger = sequelize.define('Ledger', {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING }, // Asset, Liability, Income, Expense, Equity
    balance: { type: DataTypes.FLOAT, defaultValue: 0 }
});

const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.STRING, primaryKey: true },
    date: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    type: { type: DataTypes.STRING }, // Debit / Credit
    ledgerId: { type: DataTypes.STRING, allowNull: false }
});

const User = sequelize.define('User', {
    id: { type: DataTypes.STRING, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: { type: DataTypes.STRING, unique: true },
    passwordHash: { type: DataTypes.STRING }, // For future password hashing (bcrypt)
    displayName: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING, defaultValue: 'user' }, // 'admin', 'user', 'viewer'
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    lastLogin: { type: DataTypes.DATE }
});

// Relationships
Customer.hasMany(Invoice, { foreignKey: 'customerId' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId' });

Ledger.hasMany(Transaction, { foreignKey: 'ledgerId' });
Transaction.belongsTo(Ledger, { foreignKey: 'ledgerId' });

const initDb = async () => {
    try {
        await sequelize.authenticate();
        const dbType = sequelize.getDialect();
        console.log(`✅ Database connection established successfully!`);
        console.log(`📊 Database type: ${dbType.toUpperCase()}`);
        
        // Log which connection string was used
        if (process.env.DATABASE_URL) {
            console.log(`✅ Successfully connected using DATABASE_URL (pooler/IPv4)`);
        } else if (process.env.DB_URL) {
            console.log(`✅ Successfully connected using DB_URL (direct/IPv6)`);
        } else {
            console.log(`✅ Successfully connected using SUPABASE_PWD (auto-built)`);
        }
        
        await sequelize.sync({ alter: true }); // Update schema if changed
        console.log('📋 Database synchronized.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        
        // Provide helpful error messages
        if (process.env.DATABASE_URL) {
            console.error('💡 DATABASE_URL connection failed. Error details above.');
            if (process.env.DB_URL) {
                console.error('💡 Will not try DB_URL because DATABASE_URL is set.');
            }
        } else if (process.env.DB_URL) {
            console.error('💡 DB_URL connection failed. This might be an IPv6 issue.');
            console.error('💡 Try using DATABASE_URL with the pooler format instead.');
        } else if (process.env.SUPABASE_PWD) {
            console.error('💡 Auto-built connection failed. Check SUPABASE_PWD and SUPABASE_REGION.');
        }
        
        throw error;
    }
};

export { sequelize, initDb, Customer, Invoice, InvoiceItem, Ledger, Transaction, User };
