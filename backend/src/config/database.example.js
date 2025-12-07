import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database configuration based on environment
const getDatabaseConfig = () => {
  // If DATABASE_URL is provided, use it (PostgreSQL/MySQL in production)
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    const dialect = url.protocol.replace(':', '');
    
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: dialect === 'postgres' ? 'postgres' : 'mysql',
      logging: process.env.DB_LOGGING === 'true',
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' && dialect === 'postgres' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }
  
  // Local development: Use SQLite
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database.sqlite');
  return new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.DB_LOGGING === 'true'
  });
};

const sequelize = getDatabaseConfig();

// Define Models (same as before)
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
    type: { type: DataTypes.STRING },
    balance: { type: DataTypes.FLOAT, defaultValue: 0 }
});

const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.STRING, primaryKey: true },
    date: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    type: { type: DataTypes.STRING },
    ledgerId: { type: DataTypes.STRING, allowNull: false }
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
        console.log('Database connection established successfully.');
        console.log(`Database: ${sequelize.getDialect()}`);
        await sequelize.sync({ alter: true });
        console.log('Database synchronized.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
};

export { sequelize, initDb, Customer, Invoice, InvoiceItem, Ledger, Transaction };

