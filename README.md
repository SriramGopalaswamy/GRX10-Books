<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GRX10 Business Suite

A comprehensive business management application with three main modules:
- **Financial Suite**: Accounting, Invoicing, Banking, Cash Flow Management
- **HRMS**: Human Resource Management System with Employee Management, Attendance, Leaves, and Payroll
- **Performance OS**: Goals and Memos Management System

## 📚 Documentation

All documentation is available in the `userdocs/` folder:

- **[Implementation Guide](./userdocs/IMPLEMENTATION_GUIDE.md)** - Complete setup and implementation guide
- **[TODO List](./userdocs/TODO.md)** - Current status and remaining tasks
- **[Security Implementation](./userdocs/SECURITY_IMPLEMENTATION.md)** - Role management, security (RBAC), and approval workflows

## 🏗️ Architecture

The project is organized into separate frontend and backend directories:

```
GRX10-Books/
├── frontend/          # React + TypeScript + Vite frontend
├── backend/           # Node.js + Express backend
├── Dockerfile         # Docker configuration for deployment
└── README.md          # This file
```

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Port:** 8100
- **Features:** Feature-based architecture with shared components

### Backend
- **Framework:** Node.js + Express
- **Database:** PostgreSQL (Supabase) / SQLite (local dev)
- **ORM:** Sequelize
- **Port:** 8101
- **Authentication:** Passport.js (Microsoft OAuth + Admin login)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account (for production database)
- (Optional) Microsoft Azure AD app (for OAuth)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd GRX10-Books

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Environment Setup

#### Backend Environment Variables

Create `backend/.env` file:

```env
# Database (REQUIRED)
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

# Or use Supabase credentials
SUPABASEURL=https://PROJECT_REF.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_PWD=your_database_password
SUPABASE_REGION=ap-south-1

# Session & Security (REQUIRED for production)
SESSION_SECRET=your-strong-random-secret-key

# Admin Login (Optional - has defaults)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Microsoft OAuth (Optional)
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id

# AI Features (Optional)
GEMINI_API_KEY=your_gemini_api_key

# Server Configuration (Optional)
PORT=8101
NODE_ENV=development
DB_LOGGING=false
```

#### Frontend Environment Variables

Create `frontend/.env.local` file (optional):

```env
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Database Setup

#### Option 1: Automatic (Recommended)

Tables are automatically created when you start the server:

```bash
cd backend
npm start
```

#### Option 2: Manual SQL Script

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste `backend/database/setup.sql`
3. Click Run

#### Option 3: Node.js Script

```bash
cd backend
npm run db:setup
```

### 4. Seed Database (Optional)

Add sample data for testing:

```bash
cd backend
npm run db:seed
```

This creates:
- **Configuration Data:**
  - 2 Organizations
  - 10 Departments
  - 20 Positions
  - 5 HRMS Roles
  - 6 Employee Types
  - 20 Holidays (2024-2025)
  - 10 Leave Types
  - 7 Work Locations
  - 28 Skills
  - 17 Languages
  - 48 Chart of Accounts entries
- **Sample Data:**
  - 3 Sample Customers
  - 6 Sample Ledgers
  - 5 Sample Employees (including admin)
  - 105+ Attendance Records (last 30 days for all employees)
  - 2 Sample Leave Requests
  - 2 Sample Regularization Requests

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
Backend will be available at `http://localhost:8101`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will be available at `http://localhost:8100`

## 📊 Database Schema

### Financial Tables
- **Customers** - Customer information (name, GSTIN, email, balance)
- **Invoices** - Invoice headers (number, date, customer, totals, status)
- **InvoiceItems** - Invoice line items (description, HSN, quantity, rate, tax, amount)
- **Ledgers** - Chart of accounts (name, type, balance)
- **Transactions** - Accounting transactions (date, description, amount, type, ledger)

### HRMS Tables
- **Employees** - Employee information with comprehensive fields (also used for authentication)
- **LeaveRequests** - Leave request management
- **AttendanceRecords** - Attendance tracking with check-in/check-out
- **RegularizationRequests** - Attendance regularization
- **Payslips** - Payroll processing with automatic calculations
- **EmployeeHiringHistory** - Employee rehire tracking

### OS Tables
- **OSGoals** - Goals management
- **OSGoalComments** - Goal comments
- **OSMemos** - Memos system
- **OSMemoAttachments** - Memo attachments
- **OSMemoComments** - Memo comments
- **OSNotifications** - Notifications

### Configuration Tables
- **Organizations** - Organization setup
- **Departments** - Department management
- **Positions** - Position management
- **HRMSRoles** - HRMS role management
- **EmployeeTypes** - Employee type management
- **Holidays** - Holiday calendar
- **LeaveTypes** - Leave type configuration
- **WorkLocations** - Work location management
- **Skills** - Skills catalog
- **Languages** - Languages catalog
- **ChartOfAccounts** - Chart of Accounts management

### Security & Role Management Tables
- **Roles** - System roles
- **Permissions** - Granular permissions (module/resource/action)
- **RolePermissions** - Role-Permission mapping
- **UserRoles** - User-Role assignments
- **ApprovalWorkflows** - Approval workflow definitions
- **ApprovalWorkflowSteps** - Workflow step configuration
- **ApprovalRequests** - Approval requests
- **ApprovalHistory** - Approval audit trail

### System Tables
- **Users** - Legacy user accounts (used primarily for OAuth mapping; all authentication now uses Employees table)

See `backend/database/setup.sql` for complete schema.

## 🔐 Authentication

### Employee Login (All Users)
- **All employees login through the Employee table** (including admin)
- **Admin Employee:** 
  - Email: `admin@grx10.com`
  - Password: `admin123`
  - ID: `admin-001`
- **Other Sample Employees:**
  - Alice Carter (HR): `alice@grx10.com` / `password123`
  - Bob Smith (Manager): `bob@grx10.com` / `password123`
  - Charlie Davis (Employee): `charlie@grx10.com` / `password123`
  - Diana Evans (Finance): `diana@grx10.com` / `password123`
  - Ethan Hunt (Employee): `ethan@grx10.com` / `password123`

### Microsoft OAuth (Optional)
- Configure `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, and `MICROSOFT_TENANT_ID`
- Email whitelist configured in `backend/src/auth/auth.routes.js`
- OAuth users are mapped to Employee records by email

### Role-Based Access Control
- **Admin/HR:** See all records (Attendance, Leaves, Payroll)
- **Manager:** See records of their direct reportees
- **Employee:** See only their own records
- **Finance:** See all payroll records

## 🛠️ Available Scripts

### Backend
```bash
npm start          # Start production server
npm run dev        # Start development server with watch mode
npm run db:setup   # Run database setup script
npm run db:seed    # Seed database with sample data
```

### Frontend
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

## 🐳 Docker Deployment

Build and run with Docker:

```bash
docker build -t grx10-books .
docker run -p 8080:8080 --env-file backend/.env grx10-books
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── auth/              # Authentication routes & middleware
│   ├── config/            # Database configuration
│   ├── modules/            # Feature modules (invoices, customers, AI, etc.)
│   └── server.js          # Express server entry point
├── database/               # Database scripts
│   ├── setup.sql          # SQL setup script
│   ├── seed.sql           # SQL seed data
│   ├── setup.js           # Node.js setup script
│   └── seed.js            # Node.js seed script
└── .env                   # Environment variables

frontend/
├── src/
│   ├── app/               # App entry point
│   ├── features/          # Feature-based modules
│   ├── router/            # Routing configuration
│   └── shared/            # Shared components, services, utilities
└── .env.local             # Frontend environment variables
```

## 🔧 Configuration

### Database Connection

The application supports multiple database connection methods:

1. **DATABASE_URL** (Priority 1) - Direct connection string
2. **DB_URL** (Priority 2) - Alternative connection string
3. **SUPABASE_PWD** (Priority 3) - Auto-build from Supabase credentials

For Supabase, use the **connection pooler** format (IPv4 compatible):
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-REGION.pooler.supabase.com:5432/postgres
```

### Ports
- Frontend: `8100`
- Backend: `8101`
- Docker: `8080` (Cloud Run default)

## 🚢 Deployment

### Render.com
See `render.yaml` for Render deployment configuration.

### Google Cloud Run
The `Dockerfile` is configured for Cloud Run deployment.

### Environment Variables
Set all required environment variables in your deployment platform:
- `DATABASE_URL` or Supabase credentials
- `SESSION_SECRET`
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` (or use database)
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` (optional)
- `GEMINI_API_KEY` (optional)

## ⚙️ Configuration System

The application includes a comprehensive configuration system accessible via the sidebar. **You can either set up manually or use the seed script (`npm run db:seed`) to populate all configuration data automatically.**

### Configuration Items:
1. **Organizations** - At least one organization
2. **Departments** - Company departments
3. **Positions** - Job positions
4. **HRMS Roles** - Business roles (HR, Manager, Employee, Finance, Admin)
5. **Employee Types** - Full Time, Part Time, Contract, Intern, Consultant, Temporary
6. **Work Locations** - Office locations
7. **Holidays** - Company holiday calendar (Indian holidays included in seed data)
8. **Leave Types** - Leave type definitions (Indian leave types: CL, SL, EL, CO, LWP, ML, PL, etc.)
9. **Skills** - Skills catalog (Technical, Soft, Domain skills)
10. **Languages** - Languages catalog
11. **Chart of Accounts** - Financial account structure

All dropdowns throughout the application use these configurations. The seed script automatically creates all configuration data with realistic sample values. See [Implementation Guide](./userdocs/IMPLEMENTATION_GUIDE.md) for detailed setup instructions.

## 🔐 Security & Role Management

The application includes a comprehensive role-based access control (RBAC) system:

1. **System Roles** - Create and manage system roles (Admin, Manager, Employee, HR, Finance)
2. **Permissions** - Granular permissions by module/resource/action
3. **User Roles** - Assign roles to users
4. **Approval Workflows** - Multi-step approval workflows for leaves, expenses, invoices
5. **Approval Requests** - Track and process approval requests

See [Security Implementation Guide](./userdocs/SECURITY_IMPLEMENTATION.md) for detailed setup and usage instructions.

## 🎨 Features

### Dark Mode
- Toggle between light and dark themes
- Theme preference is saved in localStorage
- All screens support dark mode

### Role-Based Data Access
- **Attendance, Leaves, Payroll** pages automatically filter data based on user role:
  - Admin/HR: View all records
  - Manager: View team records (direct reportees)
  - Employee: View own records only
- Employee name column appears automatically when viewing multiple employees' data

### Form Validation
- Comprehensive form validation for all input forms
- Real-time error display
- Validation rules for required fields, dates, numbers, etc.

### Reports
- **Financial Reports:** Trial Balance, Balance Sheet, Profit & Loss
- **HR Reports:** Employee Directory, Attendance Summary, Leave Summary, Payroll Summary

## 📝 Notes

### Authentication
- **All employees (including admin) login through the Employee table.** The Users table is primarily for OAuth mapping.
- **Admin Employee:** Email `admin@grx10.com`, Password `admin123`, ID `admin-001`
- Login endpoint: `/api/auth/admin/login` (accepts email or employee ID as username)
- Session-based authentication with Passport.js

### Security
- **Passwords:** Stored as bcrypt hashes. Passwords are hashed on creation and updates, and verified using `bcrypt.compare()`.
- **Role-Based Access:** Data is automatically filtered based on user role (Admin/HR see all, Manager sees reportees, Employee sees own)

### Database
- Tables are auto-created via `sequelize.sync({ alter: true })` on server start
- **Seed Data:** Running `npm run db:seed` creates:
  - All configuration data (Organizations, Departments, Positions, etc.)
  - 5 Sample Employees (including admin)
  - 105+ Attendance Records (last 30 working days)
  - Sample Leave Requests and Regularization Requests
  - Sample Customers and Ledgers

### Configuration
- Configuration items must be set up before creating employees or invoices
- Use the seed script (`npm run db:seed`) to populate all configuration data automatically
- All dropdowns throughout the application use these configurations

### UI/UX
- **Dark Mode:** Fully implemented across all screens
- **Form Validation:** Real-time validation with error messages
- **Responsive Design:** Works on desktop and tablet devices
- **User-Friendly:** All screens maintain their structure even when data is loading or empty

## 📄 License

[Your License Here]

## 🤝 Contributing

[Contributing Guidelines]

---

**Built with ❤️ for GRX10**
