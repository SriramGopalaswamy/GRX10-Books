# Google AI Studio Prompt - GRX10 Business Suite Replication

## PROMPT

```
Build a complete, production-ready enterprise business management suite called "GRX10 Business Suite" designed for Indian businesses. This is a full-stack application with React 19 frontend, Node.js/Express backend, and PostgreSQL database (with SQLite fallback for development).

## TECH STACK

**Frontend:**
- React 19 with TypeScript
- Vite 6.x as build tool
- Lucide React for icons
- Recharts for data visualization
- Google Generative AI SDK (@google/genai)
- Dark mode support throughout

**Backend:**
- Node.js with Express.js
- Sequelize ORM
- Passport.js for authentication
- Session-based auth (24-hour expiry)
- UUID for ID generation

**Database:**
- PostgreSQL (Supabase) for production
- SQLite for local development
- Auto-sync schema on startup

---

## APPLICATION MODULES

### 1. FINANCIAL SUITE
- **Dashboard**: Revenue metrics, invoice statistics, cash flow overview
- **Invoices**: GST-compliant invoicing with CGST/SGST (intra-state) and IGST (inter-state)
- **Customers**: Customer management with GSTIN, email, balance tracking
- **Vendors**: Vendor management with balance tracking
- **Accounting**: Chart of Accounts (hierarchical), Journal Entries, Ledgers
- **Banking**: Bank statement parsing (via AI), transaction reconciliation
- **Cash Flow**: Projected vs actual inflows/outflows
- **Documents**: Document OCR using Gemini AI
- **Migration**: Zoho Books data import with batch processing
- **AI Assistant**: Financial Q&A with database context injection

### 2. HRMS (Human Resource Management)
- **Dashboard**: Employee stats, attendance overview, leave summary
- **Employees**: Full employee profiles with:
  - Personal: name, email, phone, DOB, blood group, marital status, PAN, Aadhar
  - Employment: department, position, designation, join date, employee type, salary (annual CTC)
  - Banking: account number, IFSC, bank name, branch
  - Education: 10th, 12th, Degree, Post Graduate details
  - Experience: Previous companies, positions, dates
  - Skills & Languages (arrays)
  - Dependents, Tax Declarations
  - Leave Entitlements, Salary Breakdown
  - Certifications
  - Manager-subordinate hierarchy
  - Rehiring support with hiring history
- **Attendance**: Check-in/check-out, status (Present/Absent/Late/Half Day), duration calculation
- **Leaves**: Leave requests with approval workflow, leave balance calculation by type
- **Regularization**: Missing punch, incorrect punch, WFH requests
- **Payroll**: Auto-calculated payslips with Indian salary structure:
  - Earnings: Basic (50%), HRA (40% of Basic), Special Allowance
  - Deductions: PF (12% of Basic, max 1800), ESI (if gross < 21000), TDS (tax slabs), Professional Tax
  - Indian FY 2023-24 tax slabs with Section 87A rebate
- **HR Policy Chat**: AI-powered HR assistant with function calling for:
  - Generate payslips
  - Open regularization forms
  - Get request status
  - Pending approvals (Manager/HR only)
  - Approve/reject requests
  - Initiate onboarding/offboarding (HR only)

### 3. PERFORMANCE OS
- **Dashboard**: Goal completion rates, team scores, company KPIs
- **Goals**: SMART goal management
  - Types: Annual, Quarterly
  - Fields: title, metric, baseline, target, current, timeline
  - Status: On Track, Risk, Off Track, Completed
  - Score: A, B, C, D, F
  - Manager feedback, comments
  - AI optimization suggestions
- **Memos**: Internal communication system
  - From/To (user ID or 'ALL')
  - Subject, Summary, Attachments
  - Status: Draft, Pending Review, Approved, Revision Requested
  - Comments
  - AI critique for clarity and ROI focus

### 4. CONFIGURATION
- Organizations (name, code, address, tax ID)
- Departments (name, code, description)
- Positions (name, code, description)
- HRMS Roles (name, code, permissions)
- Employee Types (Full Time, Part Time, Contract)
- Holidays (name, date, type: National/Regional/Company/Optional)
- Leave Types (name, max days, isPaid, requiresApproval)
- Work Locations (name, address, city, state, country)
- Skills (name, category)
- Languages (name, code)
- Chart of Accounts (code, name, type, parent hierarchy)

### 5. SECURITY & ROLE MANAGEMENT
- **Roles**: System roles with CRUD
- **Permissions**: Module/Resource/Action granular permissions
- **User Roles**: Role assignment with assigner tracking
- **Approval Workflows**:
  - Multi-step approval chains
  - Types: sequential, parallel, any
  - Approver types: role, user, manager, department_head
  - Request tracking with history/audit trail

### 6. REPORTS
**Financial:**
- Trial Balance (with date filtering)
- Balance Sheet
- Profit & Loss

**HR:**
- Employee Directory
- Attendance Summary
- Leave Summary
- Payroll Summary

---

## DATABASE MODELS (25 total)

### Financial Models
```javascript
Customer: { id, name, gstin, email, balance }
Invoice: { id, number, date, dueDate, customerId, customerName, status, subTotal, taxTotal, total }
InvoiceItem: { id, invoiceId, description, hsn, quantity, rate, taxRate, amount }
Ledger: { id, name, type, balance }
Transaction: { id, date, description, amount, type, ledgerId }
ChartOfAccount: { id, code, name, type, parentId, description, isActive }
```

### HRMS Models
```javascript
Employee: {
  id, name, email, role, department, employeePosition, designation, joinDate, terminationDate,
  employeeType, status, isRehired, previousEmployeeId, avatar, managerId, salary, password,
  enableEmailLogin, isNewUser, workLocation, probationEndDate, noticePeriod, lastWorkingDay,
  exitInterviewDate, employeeReferralId, bloodGroup, maritalStatus, spouseName,
  emergencyContactName, emergencyContactRelation, emergencyContactPhone,
  bankAccountNumber, bankIFSC, bankName, bankBranch,
  skills, languages, dependents, taxDeclarations (all JSON TEXT),
  dateOfBirth, phone, address, pan, aadhar, pfNumber,
  educationDetails, experienceDetails, salaryBreakdown, leaveEntitlements, certifications (all JSON TEXT)
}

EmployeeHiringHistory: { id, employeeId, hireDate, terminationDate, employeeType, department, employeePosition, designation, salary, managerId, reasonForTermination, isRehire, previousEmployeeId }

LeaveRequest: { id, employeeId, type, startDate, endDate, reason, status, appliedOn }
AttendanceRecord: { id, employeeId, date, checkIn, checkOut, status, durationHours }
RegularizationRequest: { id, employeeId, employeeName, date, type, reason, status, appliedOn, newCheckIn, newCheckOut }
Payslip: { id, employeeId, month, basic, hra, allowances, deductions, netPay, generatedDate }
```

### Configuration Models
```javascript
Organization: { id, name, code, address, phone, email, website, taxId, isActive }
Department: { id, name, code, description, isActive }
Position: { id, name, code, description, isActive }
HRMSRole: { id, name, code, description, permissions, isActive }
EmployeeType: { id, name, code, description, isActive }
Holiday: { id, name, date, type, description, isActive }
LeaveType: { id, name, code, description, maxDays, isPaid, requiresApproval, isActive }
WorkLocation: { id, name, code, address, city, state, country, isActive }
Skill: { id, name, category, description, isActive }
Language: { id, name, code, isActive }
```

### OS Models
```javascript
OSGoal: { id, ownerId, title, type, metric, baseline, target, current, timeline, status, score, managerFeedback }
OSGoalComment: { id, goalId, authorId, text, timestamp }
OSMemo: { id, fromId, toId, date, subject, status, summary }
OSMemoAttachment: { id, memoId, name, size, type }
OSMemoComment: { id, memoId, authorId, text, timestamp }
OSNotification: { id, userId, title, message, type, read, timestamp, actionLink }
```

### Security Models
```javascript
Role: { id, name, code, description, isSystemRole, isActive }
Permission: { id, name, code, module, resource, action, description, isActive }
RolePermission: { id, roleId, permissionId }
UserRole: { id, userId, roleId, assignedBy, assignedAt, isActive }
ApprovalWorkflow: { id, name, module, resource, workflowType, isActive }
ApprovalWorkflowStep: { id, workflowId, stepOrder, approverType, approverId, isRequired, canDelegate, timeoutHours }
ApprovalRequest: { id, workflowId, module, resource, resourceId, requestedBy, currentStep, status, priority, requestData, comments, completedAt }
ApprovalHistory: { id, requestId, stepOrder, approverId, action, comments, actionDate }
User: { id, username, email, passwordHash, displayName, role, isActive, lastLogin }
```

---

## KEY RELATIONSHIPS

- Customer hasMany Invoice
- Invoice hasMany InvoiceItem
- Ledger hasMany Transaction
- Employee hasMany LeaveRequest, AttendanceRecord, RegularizationRequest, Payslip
- Employee belongsTo Employee (manager), hasMany Employee (subordinates)
- Employee belongsTo Employee (previousEmployee for rehires)
- Employee hasMany EmployeeHiringHistory
- ChartOfAccount self-referential (parent/children)
- Role belongsToMany Permission (through RolePermission)
- User belongsToMany Role (through UserRole)
- ApprovalWorkflow hasMany ApprovalWorkflowStep, ApprovalRequest
- ApprovalRequest hasMany ApprovalHistory
- OSGoal hasMany OSGoalComment
- OSMemo hasMany OSMemoAttachment, OSMemoComment

---

## API ENDPOINTS

```
POST /api/auth/login - Employee login (email/password)
GET  /api/auth/status - Check session
POST /api/auth/logout - End session
GET  /api/auth/microsoft - Microsoft OAuth
GET  /api/auth/microsoft/callback

# Invoices
GET    /api/accounting/invoices
POST   /api/accounting/invoices
GET    /api/accounting/invoices/:id
PUT    /api/accounting/invoices/:id
DELETE /api/accounting/invoices/:id

# Customers
GET    /api/accounting/customers
POST   /api/accounting/customers
PUT    /api/accounting/customers/:id
DELETE /api/accounting/customers/:id

# HRMS
GET    /api/hrms/employees
POST   /api/hrms/employees
GET    /api/hrms/employees/:id
PUT    /api/hrms/employees/:id
DELETE /api/hrms/employees/:id (soft delete - sets status to Terminated)

GET    /api/hrms/employees/:id/hiring-history
POST   /api/hrms/employees/:id/hiring-history

GET    /api/hrms/leaves
POST   /api/hrms/leaves
PUT    /api/hrms/leaves/:id
GET    /api/hrms/leaves/balance/:employeeId

GET    /api/hrms/attendance
POST   /api/hrms/attendance
POST   /api/hrms/attendance/checkin
GET    /api/hrms/attendance/today/:employeeId

GET    /api/hrms/regularizations
POST   /api/hrms/regularizations
PUT    /api/hrms/regularizations/:id

GET    /api/hrms/payslips
POST   /api/hrms/payslips
POST   /api/hrms/payslips/generate (auto-calculate)
GET    /api/hrms/payslips/:id

# Configuration (all have GET, POST, PUT, DELETE)
/api/config/organizations
/api/config/departments
/api/config/positions
/api/config/roles
/api/config/employee-types
/api/config/holidays
/api/config/leave-types
/api/config/work-locations
/api/config/skills
/api/config/languages
/api/config/chart-of-accounts

# OS
GET    /api/os/goals
POST   /api/os/goals
PUT    /api/os/goals/:id
DELETE /api/os/goals/:id
POST   /api/os/goals/:id/comments

GET    /api/os/memos
POST   /api/os/memos
PUT    /api/os/memos/:id
DELETE /api/os/memos/:id

# Security
/api/security/roles
/api/security/permissions
/api/security/user-roles
/api/security/approval-workflows

# Reports
GET /api/reports/trial-balance
GET /api/reports/balance-sheet
GET /api/reports/profit-loss
GET /api/reports/employee-directory
GET /api/reports/attendance
GET /api/reports/leaves
GET /api/reports/payroll

# AI
POST /api/ai/chat - Financial assistant with DB context

# Dashboard
GET /api/dashboard/stats
```

---

## ROLE-BASED ACCESS CONTROL

Roles: Admin, HR, Manager, Finance, Employee

**Data Visibility Rules:**
- Admin/HR: See all employees and data
- Manager: See own data + subordinates' data
- Employee: See only own data
- Finance: Access financial suite, limited HR access

---

## AI INTEGRATION (Google Gemini)

### 1. Financial Chat (Backend - Context Injection)
```javascript
// Inject DB stats into prompt
const context = `Total Invoices: ${count}, Revenue: ${sum}, Customers: ${customerCount}`;
const prompt = `System: You are an expert Indian financial assistant.\n${context}\n\nUser: ${message}`;
```

### 2. Document OCR (Frontend)
```javascript
// Parse invoices/bills from images
await ai.models.generateContent({
  model: 'gemini-1.5-flash',
  contents: [{ parts: [
    { inlineData: { data: base64, mimeType } },
    { text: "Extract: title, date, amount, items, summary as JSON" }
  ]}]
});
```

### 3. Bank Statement Parser
```javascript
// Extract transactions from statement images
// Return JSON array: { date, description, withdrawal, deposit }
```

### 4. Goal Optimization
```javascript
// Refine goals to be SMART with numeric baseline/target
```

### 5. Memo Critique
```javascript
// Act as Amazon/Cypress exec, demand "No Fluff", ROI focus
```

### 6. HR Assistant with Function Calling
```javascript
const hrTools = [
  { name: "generatePayslip", params: { month, year } },
  { name: "openRegularizationForm" },
  { name: "getMyRegularizationRequests" },
  { name: "getPendingApprovals" }, // Manager/HR only
  { name: "approveRejectRequest", params: { requestId, decision } },
  { name: "initiateOnboarding" }, // HR only
  { name: "initiateOffboarding" } // HR only
];
```

---

## INDIAN PAYROLL LOGIC

```javascript
// Monthly Calculation from Annual CTC
const monthlyGross = annualCTC / 12;
const basic = monthlyGross * 0.5;
const hra = basic * 0.4;
const specialAllowance = monthlyGross - basic - hra;

// Deductions
const pfEmployee = Math.min(basic * 0.12, 1800);
const esiEmployee = grossSalary < 21000 ? grossSalary * 0.0075 : 0;
const professionalTax = 200;

// TDS (FY 2023-24 slabs)
if (annualTaxable <= 250000) tds = 0;
else if (annualTaxable <= 500000) tds = (annualTaxable - 250000) * 0.05;
else if (annualTaxable <= 1000000) tds = 12500 + (annualTaxable - 500000) * 0.20;
else tds = 112500 + (annualTaxable - 1000000) * 0.30;

// Section 87A rebate
if (annualTaxable <= 500000) tds = Math.max(0, tds - 12500);

const netPay = grossSalary - pfEmployee - esiEmployee - (tds/12) - professionalTax;
```

---

## FRONTEND VIEWS (40+ pages)

Use a collapsible sidebar with sections:
- **Main**: Dashboard
- **Financial**: Invoices, Customers, Vendors, Accounting, Banking, Cash Flow, Documents, Migration, AI Assistant
- **HRMS**: Dashboard, Employees, Attendance, Leaves, Payroll, HR Policy Chat
- **Performance OS**: Dashboard, Goals, Memos
- **Configuration**: Organizations, Departments, Positions, Roles, Employee Types, Holidays, Leave Types, Work Locations, Skills, Languages, Chart of Accounts
- **Security**: Roles, Permissions, User Roles, Approval Workflows
- **Reports**: Trial Balance, Balance Sheet, P&L, Employee Directory, Attendance, Leaves, Payroll

---

## AUTHENTICATION FLOW

1. Login page with email/password OR Microsoft SSO button
2. Check `/api/auth/status` on app load
3. Session-based auth with 24-hour expiry
4. Store user object: { id, name, email, role, department }
5. Show role-appropriate dashboard and sidebar items

---

## DARK MODE

Full dark mode support with:
- ThemeContext with localStorage persistence
- Toggle button in header
- Classes: `dark:bg-slate-900`, `dark:text-slate-100`, etc.

---

## DEPLOYMENT

Docker multi-stage build:
1. Build frontend with Vite
2. Copy to backend/public
3. Serve static files from Express
4. Cloud Run compatible (PORT 8080)

Environment Variables:
- DATABASE_URL or SUPABASE_PWD
- SESSION_SECRET
- GEMINI_API_KEY
- MICROSOFT_CLIENT_ID/SECRET/TENANT_ID (optional)

---

Generate the complete application with all models, routes, components, and styling. Use Tailwind CSS for styling. Ensure all TypeScript types match the database models. Include proper error handling, loading states, and form validation throughout.
```
