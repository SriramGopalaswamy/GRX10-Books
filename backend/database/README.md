# Database Setup Guide

This directory contains scripts to set up and seed the GRX10 Books database.

## Tables Created

The database setup creates the following tables:

1. **Customers** - Customer information (name, GSTIN, email, balance)
2. **Invoices** - Invoice headers (number, date, customer, totals, status)
3. **InvoiceItems** - Invoice line items (description, HSN, quantity, rate, tax, amount)
4. **Ledgers** - Chart of accounts (name, type, balance)
5. **Transactions** - Accounting transactions (date, description, amount, type, ledger)

## Setup Methods

### Method 1: Automatic (Recommended)

The tables are automatically created when you start the server. The `sequelize.sync({ alter: true })` in `src/config/database.js` will create/update tables to match the models.

**Just start your server:**
```bash
npm start
```

### Method 2: SQL Script (Manual)

Run the SQL script directly in your Supabase SQL Editor:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `setup.sql`
4. Click **Run**

Or via command line:
```bash
psql $DATABASE_URL -f database/setup.sql
```

### Method 3: Node.js Setup Script

Run the Node.js setup script:

```bash
npm run db:setup
```

This script will:
- Connect to the database
- Execute the SQL setup script
- Sync Sequelize models
- Verify all tables are created

## Seeding Initial Data (Optional)

To add sample data for testing:

### Via SQL Script

1. Go to Supabase SQL Editor
2. Copy and paste `seed.sql`
3. Click **Run**

### Via Node.js

```bash
npm run db:seed
```

## Database Schema

### Customers
- `id` (String, Primary Key)
- `name` (String, Required)
- `gstin` (String, Optional)
- `email` (String, Optional)
- `balance` (Float, Default: 0)

### Invoices
- `id` (String, Primary Key)
- `number` (String, Required)
- `date` (String, Required)
- `dueDate` (String, Optional)
- `customerId` (String, Foreign Key → Customers)
- `customerName` (String, Optional)
- `status` (String, Default: 'Draft')
- `subTotal` (Float, Default: 0)
- `taxTotal` (Float, Default: 0)
- `total` (Float, Default: 0)

### InvoiceItems
- `id` (String, Primary Key)
- `invoiceId` (String, Foreign Key → Invoices)
- `description` (String, Optional)
- `hsn` (String, Optional)
- `quantity` (Float, Optional)
- `rate` (Float, Optional)
- `taxRate` (Float, Optional)
- `amount` (Float, Optional)

### Ledgers
- `id` (String, Primary Key)
- `name` (String, Required)
- `type` (String, Optional) - Asset, Liability, Income, Expense, Equity
- `balance` (Float, Default: 0)

### Transactions
- `id` (String, Primary Key)
- `date` (String, Required)
- `description` (String, Optional)
- `amount` (Float, Required)
- `type` (String, Optional) - Debit / Credit
- `ledgerId` (String, Foreign Key → Ledgers)

## Relationships

- **Customer** → has many **Invoices**
- **Invoice** → belongs to **Customer**
- **Invoice** → has many **InvoiceItems**
- **InvoiceItem** → belongs to **Invoice**
- **Ledger** → has many **Transactions**
- **Transaction** → belongs to **Ledger**

## Indexes

The following indexes are created for better query performance:

- `idx_invoices_customerId` - On Invoices.customerId
- `idx_invoices_number` - On Invoices.number
- `idx_invoices_date` - On Invoices.date
- `idx_invoices_status` - On Invoices.status
- `idx_invoiceItems_invoiceId` - On InvoiceItems.invoiceId
- `idx_transactions_ledgerId` - On Transactions.ledgerId
- `idx_transactions_date` - On Transactions.date
- `idx_customers_email` - On Customers.email
- `idx_customers_gstin` - On Customers.gstin

## Troubleshooting

### Tables already exist
If you see errors about tables already existing, you can:
1. Drop and recreate (use `setup.sql` which includes DROP statements)
2. Use `sequelize.sync({ alter: true })` which updates existing tables

### Connection issues
Make sure your `DATABASE_URL` in `.env` is correct and the database is accessible.

### Foreign key errors
Ensure tables are created in the correct order (Customers and Ledgers first, then Invoices and Transactions).

