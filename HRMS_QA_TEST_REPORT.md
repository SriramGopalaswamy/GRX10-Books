# HRMS Module — Full-Spectrum QA Test Report

**Application**: GRX10-Books HRMS Module
**Date**: 2026-02-06
**Stack**: Node.js/Express + React 19 + Sequelize (PostgreSQL/SQLite)
**Auth**: MS 365 OAuth + Email/Password (bcrypt, session-based)
**Roles**: Admin, HR, Manager, Employee, Finance
**Compliance Target**: Indian statutory (PAN, Aadhar, PF, ESI, PT)

---

## PHASE 1 — ENTITY & DATA MODEL DEFINITION

### 1.1 Core Entity: Employee

**Source**: `backend/src/config/database.js:210-267`

| Category | Field | Type | Required | Notes |
|----------|-------|------|----------|-------|
| **Identity** | id | STRING (UUID) | PK | Auto-generated via `uuidv4()` |
| | name | STRING | YES | `allowNull: false` |
| | email | STRING | YES | `allowNull: false, unique: true` |
| | password | STRING | NO | Hashed via bcrypt (10 rounds) |
| | avatar | STRING | NO | Defaults to picsum.photos URL |
| **Employment** | role | STRING | YES | Enum: Admin, HR, Manager, Employee, Finance |
| | department | STRING | NO | References Department config |
| | employeePosition | STRING | NO | Free text |
| | designation | STRING | NO | Free text |
| | joinDate | STRING | NO | YYYY-MM-DD format |
| | terminationDate | STRING | NO | Set on separation |
| | employeeType | STRING | NO | Default: 'Full Time' |
| | status | STRING | NO | Default: 'Active'. Values: Active, Terminated, Resigned, Retired, Inactive |
| | workLocation | STRING | NO | References WorkLocation config |
| | probationEndDate | STRING | NO | |
| | noticePeriod | INTEGER | NO | Default: 30 days |
| | lastWorkingDay | STRING | NO | Set on separation |
| | exitInterviewDate | STRING | NO | |
| **Relationships** | managerId | STRING | NO | Self-referential FK to Employee.id |
| | employeeReferralId | STRING | NO | Self-referential FK |
| | previousEmployeeId | STRING | NO | For rehired employees |
| | isRehired | BOOLEAN | NO | Default: false |
| **Personal** | dateOfBirth | STRING | NO | |
| | phone | STRING | NO | Validated: 10-digit Indian mobile |
| | address | TEXT | NO | |
| | bloodGroup | STRING | NO | |
| | maritalStatus | STRING | NO | Single, Married, Divorced, Widowed |
| | spouseName | STRING | NO | |
| **Emergency** | emergencyContactName | STRING | NO | |
| | emergencyContactRelation | STRING | NO | |
| | emergencyContactPhone | STRING | NO | |
| **Financial** | salary | FLOAT | NO | Annual CTC |
| | bankAccountNumber | STRING | NO | Validated: 9-18 digits |
| | bankIFSC | STRING | NO | Validated: AAAA0XXXXXX |
| | bankName | STRING | NO | |
| | bankBranch | STRING | NO | |
| **Statutory (India)** | pan | STRING | NO | Validated: ABCDE1234F |
| | aadhar | STRING | NO | Validated: 12 digits |
| | pfNumber | STRING | NO | 5-30 chars |
| | esiNumber | STRING | NO | Validated: 17 digits |
| | uanNumber | STRING | NO | Validated: 12 digits |
| **JSON Fields** | salaryBreakdown | TEXT/JSON | NO | {base, hra, specialAllowance, pf, esi, professionalTax, ...} |
| | leaveEntitlements | TEXT/JSON | NO | {casual, sick, earned, ...} |
| | educationDetails | TEXT/JSON | NO | [{level, institution, field, year, percentage}] |
| | experienceDetails | TEXT/JSON | NO | [{company, position, startDate, endDate}] |
| | certifications | TEXT/JSON | NO | [{name, issuer, issueDate, certificateNumber, isMandatory}] |
| | dependents | TEXT/JSON | NO | [{name, relationship, dateOfBirth}] |
| | taxDeclarations | TEXT/JSON | NO | {section80C, section80D, hra, lta, other} |
| | skills | TEXT/JSON | NO | Array of strings |
| | languages | TEXT/JSON | NO | Array of strings |
| **Auth** | enableEmailLogin | BOOLEAN | NO | Default: true |
| | isNewUser | BOOLEAN | NO | Default: false |

**Derived Fields**:
- `avatar`: Auto-generated from name if not provided
- `status`: Derived from separation workflow transitions
- `leaveEntitlements`: Pro-rated on rehire based on join month

**State Machine: Employee Lifecycle**

```
                    ┌──────────────────────────────────┐
                    │                                  │
  [Onboard] ──→ ACTIVE ──→ TERMINATED ──→ [Rehire] ──┘
                  │            ↑
                  ├──→ RESIGNED ─┘
                  │            ↑
                  ├──→ RETIRED ──┘
                  │
                  └──→ INACTIVE (Contract End)
```

Transitions:
- `Active → Terminated`: via DELETE /employees/:id or POST /employees/:id/separate (type: Termination, Layoff, Absconding)
- `Active → Resigned`: via POST /employees/:id/separate (type: Resignation)
- `Active → Retired`: via POST /employees/:id/separate (type: Retirement)
- `Active → Inactive`: via POST /employees/:id/separate (type: Contract End)
- `Terminated/Resigned/Retired/Inactive → Active`: via POST /employees/:id/rehire

---

### 1.2 Core Entity: LeaveRequest

**Source**: `backend/src/config/database.js:285-300`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | STRING (UUID) | PK | |
| employeeId | STRING | YES | FK to Employee |
| type | STRING | YES | Must match active LeaveType config or standard fallbacks |
| startDate | STRING | YES | YYYY-MM-DD |
| endDate | STRING | YES | YYYY-MM-DD, must be >= startDate |
| reason | STRING | NO | Free text |
| status | STRING | NO | Default: 'Pending' |
| appliedOn | STRING | YES | Auto-set to current date |
| approvedBy | STRING | NO | Employee ID of approver |
| approvedOn | STRING | NO | Date of action |
| approverComments | TEXT | NO | |
| workingDays | FLOAT | NO | Computed: excludes weekends & holidays |

**State Machine: LeaveRequest**

```
  [Apply] ──→ PENDING ──→ APPROVED
                │
                ├──→ REJECTED
                │
                └──→ CANCELLED (by employee or HR)
```

Transitions:
- `Pending → Approved`: Manager (of employee) or HR/Admin
- `Pending → Rejected`: Manager (of employee) or HR/Admin
- `Pending → Cancelled`: Employee (own) or HR/Admin
- HR/Admin can change ANY status (override capability)
- Manager CANNOT approve own leave
- Non-Pending leaves cannot be modified by non-HR/Admin

**Validation Rules** (from `hrms.routes.js:806-998`):
- Start date cannot be in past (unless HR/Admin)
- Overlapping Pending/Approved leaves rejected
- Leave balance checked but NOT blocked (warning only, HR can approve negative)
- Working days exclude weekends (Sat/Sun) and non-Optional holidays

---

### 1.3 Core Entity: AttendanceRecord

**Source**: `backend/src/config/database.js:302-310`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | STRING (UUID) | PK | |
| employeeId | STRING | YES | FK to Employee |
| date | STRING | YES | YYYY-MM-DD |
| checkIn | STRING | NO | HH:mm format |
| checkOut | STRING | NO | HH:mm format |
| status | STRING | NO | Default: 'Present'. Values: Present, Absent, Late, Half Day, WFH |
| durationHours | FLOAT | NO | Computed on checkout |

**State Machine: AttendanceRecord (daily)**

```
  [No Record] ──→ CHECKED-IN (checkIn set, no checkOut)
                      │
                      └──→ CHECKED-OUT (both set, status computed)
```

Status determination on check-out:
- `Present`: Duration >= halfDayHours AND checked in within grace period
- `Late`: Checked in after shift start + grace minutes
- `Half Day`: Duration < halfDayHours
- `WFH`: Set via regularization approval (type: Work From Home)
- `Absent`: No attendance record for a past working day

**IST Timezone**: All times computed as UTC+5:30 (`hrms.routes.js:1527`)

---

### 1.4 Core Entity: RegularizationRequest

**Source**: `backend/src/config/database.js:312-327`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | STRING (UUID) | PK | |
| employeeId | STRING | YES | FK to Employee |
| employeeName | STRING | YES | Denormalized |
| date | STRING | YES | Date being regularized |
| type | STRING | YES | 'Missing Punch', 'Incorrect Punch', 'Work From Home' |
| reason | STRING | NO | |
| status | STRING | NO | Default: 'Pending' |
| appliedOn | STRING | YES | Auto-set |
| newCheckIn | STRING | NO | For Missing/Incorrect Punch |
| newCheckOut | STRING | NO | For Missing/Incorrect Punch |
| approvedBy | STRING | NO | |
| approvedOn | STRING | NO | |
| approverComments | TEXT | NO | |

**State Machine**: Same as LeaveRequest (Pending → Approved/Rejected)

**Side Effect on Approval**: When approved, the attendance record for that date is automatically updated with newCheckIn/newCheckOut values, and duration is recalculated. If no attendance record exists, one is created (`hrms.routes.js:2069-2116`).

---

### 1.5 Core Entity: Payslip

**Source**: `backend/src/config/database.js:329-351`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | STRING (UUID) | PK | |
| employeeId | STRING | YES | FK to Employee |
| month | STRING | YES | YYYY-MM format |
| basic | FLOAT | NO | Default: 0 |
| hra | FLOAT | NO | Default: 0 |
| allowances | FLOAT | NO | Default: 0 |
| deductions | FLOAT | NO | Default: 0 |
| netPay | FLOAT | NO | Default: 0 |
| generatedDate | STRING | YES | |
| workingDays | INTEGER | NO | |
| presentDays | FLOAT | NO | |
| lopDays | FLOAT | NO | Default: 0 |
| lopDeduction | FLOAT | NO | Default: 0 |
| status | STRING | NO | Default: 'Draft'. Values: Draft, Finalized, Paid |
| finalizedBy | STRING | NO | |
| finalizedOn | STRING | NO | |
| paidOn | STRING | NO | |
| breakdown | TEXT | NO | JSON with full earnings/deductions detail |

**State Machine: Payslip**

```
  [Generate] ──→ DRAFT ──→ FINALIZED ──→ PAID
```

- `Draft → Finalized`: PAYROLL_ACCESS roles (Admin, HR, Finance)
- `Finalized → Paid`: PAYROLL_ACCESS roles
- Already Finalized/Paid cannot be re-finalized

**Computation** (from `hrms.routes.js:2236-2578`):
- Basic = 50% of monthly gross (or from salaryBreakdown)
- HRA = 40% of Basic
- PF Employee = 12% of Basic, capped at 1800
- ESI Employee = 0.75% if gross < 21000
- TDS = Indian FY 2023-24 slabs with Sec 87A rebate
- Professional Tax = State-wise from ProfessionalTaxSlab table
- LOP = (gross / workingDays) * lopDays
- Uses database transaction with row-level locking

---

### 1.6 Core Entity: Manager Relationship

**Source**: `database.js:650-651`

- Self-referential: `Employee.belongsTo(Employee, { foreignKey: 'managerId', as: 'manager' })`
- `Employee.hasMany(Employee, { foreignKey: 'managerId', as: 'subordinates' })`
- A Manager can see: own data + direct reportees' data
- Manager does NOT see indirect reportees (no hierarchy traversal)
- Managers eligible for selection: Active employees with role Manager, HR, or Admin (`OnboardingModal.tsx:65-68`)

---

### 1.7 Core Entity: Role Assignment

Roles are stored directly on Employee.role field (not via junction table).

HRMS middleware role definitions (`hrms.middleware.js:9-15`):
```
Admin, HR, Manager, Employee, Finance
```

Role Groups:
- `FULL_ACCESS`: [Admin, HR] — manage all employees
- `TEAM_ACCESS`: [Admin, HR, Manager] — view/manage team data
- `PAYROLL_ACCESS`: [Admin, HR, Finance] — payroll operations
- `ALL_AUTHENTICATED`: all roles

**Separate RBAC system** exists at `security.routes.js` with granular Permission model (module + resource + action), but is NOT integrated into HRMS middleware — HRMS uses its own role-based checks.

---

### 1.8 Configuration Entities

| Entity | Key Fields | Used By |
|--------|-----------|---------|
| Department | name (unique), code, isActive | Employee.department dropdown |
| Position | name (unique), code, isActive | Employee.employeePosition |
| HRMSRole | name (unique), permissions (JSON), isActive | Not directly linked to Employee.role |
| EmployeeType | name (unique), code, isActive | Employee.employeeType |
| Holiday | name, date, type (National/Regional/Company/Optional), isActive | Leave balance & payroll calculation |
| LeaveType | name (unique), code, maxDays, isPaid, requiresApproval, isActive | Leave request validation |
| ShiftTiming | name, startTime, endTime, graceMinutes, halfDayHours, fullDayHours, isDefault | Attendance check-in/out |
| WorkLocation | name, code, address, city, state, country, isActive | PT state lookup for payroll |
| ProfessionalTaxSlab | state, stateCode, minSalary, maxSalary, taxAmount, gender, effectiveFrom/To | Payroll PT calculation |
| Skill | name (unique), category, isActive | Employee.skills |
| Language | name (unique), code, isActive | Employee.languages |

---

## PHASE 2 — PAGE & FORM DATA ENTRY TESTING

### 2.1 PAGE: Onboarding Modal (Employee Creation)

**Source**: `frontend/src/features/hrms/components/OnboardingModal.tsx`
**ROLE**: Admin or HR (enforced by backend `requireHRMSRole(RoleGroups.FULL_ACCESS)`)

**Step 1 — Personal Information**

| Field | Type | Valid Input | Invalid Input | Boundary | Expected Validation | Observed/Inferred Behavior |
|-------|------|-------------|---------------|----------|--------------------|-----------------------------|
| Full Name | text | "Priya Sharma" | "" (empty) | Single char "A", 255 chars | Required (frontend check: `!formData.name` disables Next) | **ISSUE**: Only checks empty name for Step 1 Next button. No max-length, no special-char, no SQL injection filter on frontend. Backend has no name length validation either. |
| Email Address | email | "priya@grx10.com" | "priya", "priya@", "@grx10.com" | "a@b.c" | Backend validates `^[^\s@]+@[^\s@]+\.[^\s@]+$`. Unique constraint. | **ISSUE**: Frontend has type="email" but no explicit validation. User can advance to Step 2 with invalid/empty email. Backend rejects on POST. |
| Joining Date | date | "2026-02-10" | "abc" | "1900-01-01", "2099-12-31" | HTML date picker prevents free-text. | **ISSUE**: No min/max date validation. Can set join date in distant past or future. No business rule for "cannot be before company incorporation date." |

**Step 2 — Role & Department**

| Field | Type | Valid Input | Invalid Input | Boundary | Expected Validation | Observed/Inferred Behavior |
|-------|------|-------------|---------------|----------|--------------------|-----------------------------|
| Department | select | "Engineering" | "" (no selection) | Only active departments shown | Populated from `getActiveDepartments()` | **ISSUE**: No required validation. Employee can be created without department. Backend accepts null. |
| Designation | text | "Senior Developer" | "" (empty) | Very long string | None | **ISSUE**: No validation at all. Can be empty or 10,000 chars. |
| System Role | select | "Employee" | N/A (pre-populated) | All 5 roles available | Defaults to "Employee" | **ISSUE**: Any HR/Admin user can assign the Admin role during onboarding. No confirmation or audit log for elevated role assignment. |
| Reporting Manager | select | "Bob (Engineering Lead)" | "" (no selection) | No managers in system | Filtered: Active + (Manager/HR/Admin roles) | **ISSUE**: Manager can be blank. Employee can exist without reporting chain. This breaks leave approval — who approves their leave? |

**Step 3 — Compensation & Documents**

| Field | Type | Valid Input | Invalid Input | Boundary | Expected Validation | Observed/Inferred Behavior |
|-------|------|-------------|---------------|----------|--------------------|-----------------------------|
| Annual CTC | number | 600000 | -1, 0, NaN | 0, 999999999 | `parseInt(e.target.value)` — truncates decimals | **ISSUE**: No min/max validation. Can enter 0 or negative salary. `parseInt` on empty = NaN, stored as null. No currency validation (label says USD but system does INR payroll calc). |
| Offer Letter | file | valid.pdf | malware.exe, 100MB file | 0-byte file | Frontend says "PDF or DOCX up to 5MB" | **ISSUE**: No file type or size validation in code. The file is captured in state but never uploaded to backend — offer letter upload is non-functional. File state is lost on submit. |

**Empty Submission Test**: Step 1 Next button is disabled only when name is empty. If name is "x", user can proceed to Step 3 and submit with: name="x", email="", department="", designation="", salary=NaN, managerId="".

**Partial Submission Test**: Frontend generates client-side ID `EMP${Math.floor(Math.random() * 10000)}` — this is overwritten by backend UUID, but the random ID could theoretically collide in the frontend state before backend round-trip.

---

### 2.2 PAGE: Offboarding Modal (Employee Separation)

**Source**: `frontend/src/features/hrms/components/OffboardingModal.tsx`
**ROLE**: Admin or HR (implied by page access)

| Field | Type | Valid Input | Invalid Input | Boundary | Expected Validation | Observed/Inferred Behavior |
|-------|------|-------------|---------------|----------|--------------------|-----------------------------|
| Select Employee | select | Active employee | "" (no selection) | Only active employees listed | Required (submit disabled without selection) | Works correctly. |
| Last Working Day | date | "2026-03-01" | "" | Past date, far future date | Required (submit disabled without date) | **ISSUE**: No validation that date >= today or >= notice period. Can set LWD in the past. |
| Reason for Exit | textarea | "Resignation - better opportunity" | "" (empty) | 10,000 chars | None — optional field | **ISSUE**: Reason is captured but NOT sent to backend. The `handleSubmit` calls `updateEmployee(selectedId, { status: 'Exited' })` — the status 'Exited' is NOT a valid backend status. Backend accepts: Terminated, Resigned, Retired, Inactive. |
| Confirmation checkbox | checkbox | checked | unchecked | N/A | Required for submit | Works correctly. |

**CRITICAL ISSUE**: The offboarding modal sets `status: 'Exited'` which is NOT one of the backend's recognized statuses (Active, Terminated, Resigned, Retired, Inactive). The backend `PUT /employees/:id` endpoint will accept it because there's no enum validation — creating an orphan status that breaks the rehire workflow (which checks for `['Terminated', 'Resigned', 'Retired', 'Inactive']`).

**CRITICAL ISSUE**: The offboarding modal calls `updateEmployee()` (PUT) not the dedicated separation endpoint `POST /employees/:id/separate`. This means:
- No EmployeeHiringHistory record is created
- No pending leave requests are auto-cancelled
- No transaction safety
- Exit data (reason, interview notes) is lost

---

### 2.3 PAGE: Leave Application

**Source**: `frontend/src/features/hrms/pages/Leaves.tsx`
**ROLE**: Any authenticated user

| Field | Type | Valid Input | Invalid Input | Boundary | Expected Validation | Observed/Inferred Behavior |
|-------|------|-------------|---------------|----------|--------------------|-----------------------------|
| Leave Type | select | "Sick Leave" | "" (empty) | Only active leave types | Required (form validates + submit disabled) | Works. Backend validates against LeaveType config with standard fallbacks. |
| Start Date | date | "2026-02-10" | "" | Today's date (min enforced) | Required. min=today. Backend: past dates rejected for non-HR. | Works. **ISSUE**: Backend uses `new Date()` at UTC, but attendance uses IST. Date boundary mismatches possible around midnight IST. |
| End Date | date | "2026-02-12" | "" | Before start date | Required. min=startDate. Custom validation: end >= start. | Works. Backend also validates start <= end. |
| Reason | textarea | "Medical appointment" | "" (empty) | Very long text | Not required | Backend accepts null. No max-length validation. |

**Additional Backend Validations** (not visible in frontend):
- Overlapping leave check (Pending/Approved leaves)
- Employee must be Active
- Leave type must exist in config or standard list
- Working days calculated excluding weekends and holidays
- Leave balance warning (not blocking)

**ISSUE**: The frontend leave balance display reads `data` as array from `/api/hrms/leaves/balance/:id`, but after submission it reads `balanceData.balances` as object. The response format differs — balance endpoint returns `{ balances: {...}, summary: {...} }` but the `useEffect` handler treats it as an array. This means after submission, balances won't refresh correctly (line 246: `setLeaveBalances(balanceData.balances || {})` vs line 86-96 array parsing).

---

### 2.4 PAGE: Attendance (Check-in/Check-out)

**Source**: `frontend/src/features/hrms/pages/Attendance.tsx`
**ROLE**: Any authenticated user (check-in for self; HR/Admin for others)

| Action | Valid Input | Invalid Input | Boundary | Observed/Inferred Behavior |
|--------|-------------|---------------|----------|----------------------------|
| Check In | Click button (no form) | N/A | Exactly at shift start time | Backend creates record with IST time. Status: 'Present' or 'Late' based on shift grace period. |
| Check Out | Click button (no form) | N/A | Duration exactly = halfDayHours | Backend updates record, computes duration. Status re-evaluated. |
| Double Check Out | Click after already checked out | N/A | N/A | Backend returns 400: "Already checked in and out for today" |

**ISSUE**: If default shift timing doesn't exist in DB, fallback is hardcoded (09:00-18:00, 15min grace). No way for employee to know their actual shift or grace period from the UI.

**ISSUE**: Attendance date uses IST offset calculated as `now.getTime() + 5.5 * 60 * 60 * 1000` — this does NOT account for JavaScript `Date` already being in the server's timezone. If server is in UTC, this works. If server is in IST, the date is doubled-offset, putting attendance in the wrong day.

---

### 2.5 PAGE: Regularization Request

**ROLE**: Any authenticated user

| Field | Type | Valid Input | Invalid Input | Boundary | Observed/Inferred Behavior |
|-------|------|-------------|---------------|----------|----------------------------|
| Date | date | Past work date | Future date, weekend | Holiday date | **ISSUE**: No validation that the date is a past working day. Can request regularization for a future date or holiday. |
| Type | select | "Missing Punch" | N/A | N/A | Fixed 3 options. |
| Reason | text | "Forgot to punch out" | "" | N/A | Optional. |
| New Check-in | time | "09:15" | "25:00" | "00:00" | Only for Missing/Incorrect Punch types. **ISSUE**: No validation that newCheckIn < newCheckOut. |
| New Check-out | time | "18:00" | N/A | "23:59" | **ISSUE**: Can set check-out before check-in (e.g., checkIn: 18:00, checkOut: 09:00) → negative duration calculated. |

---

### 2.6 PAGE: Payroll (Payslip Generation)

**ROLE**: Admin, HR, or Finance

| Field | Type | Valid Input | Invalid Input | Boundary | Observed/Inferred Behavior |
|-------|------|-------------|---------------|----------|----------------------------|
| Employee | select | Active employee | Terminated employee | N/A | **ISSUE**: Backend doesn't check employee status for payslip generation. Can generate payslip for terminated employee. |
| Month | month picker | "2026-01" | Future month, "1999-01" | Current month | **ISSUE**: No validation preventing generation for future months or very old months. Duplicate month is blocked. |

---

## PHASE 3 — MULTI-ROLE WORKFLOW SIMULATION

### Test Employee Record

```
Name:        Priya Sharma
Email:       priya.sharma@grx10.com
Employee ID: (auto-generated UUID)
Department:  Engineering
Designation: Senior Developer
Role:        Employee
Manager:     Bob (bob@grx10.com, ID: emp-003, role: Manager)
Salary:      900000 (Annual CTC)
Join Date:   2026-02-10
```

---

### SCENARIO 1: Employee Onboarding

**Step 1**: HR logs in → Opens Employees page → Clicks "Onboard Employee"
- **Role**: HR (alice@grx10.com)
- **Action**: Fills OnboardingModal
- **Data Entered**:
  - Step 1: Name="Priya Sharma", Email="priya.sharma@grx10.com", JoinDate="2026-02-10"
  - Step 2: Department="Engineering", Designation="Senior Developer", Role="Employee", Manager="Bob"
  - Step 3: Salary=900000, Offer Letter=priya_offer.pdf
- **Backend**: POST /api/hrms/employees → 201 Created

**Step 2**: Admin reviews employee list
- **Role**: Admin (admin@grx10.com)
- **Action**: GET /api/hrms/employees → sees Priya in list
- **Data Reviewed**: All fields visible (Admin has FULL_ACCESS)
- **Expected**: Name, email, department, salary, bank details (once populated) all visible

**Step 3**: Manager sees new reportee
- **Role**: Manager Bob (bob@grx10.com)
- **Action**: GET /api/hrms/employees → scopeByRole filters to self + reportees
- **Expected**: Bob sees Priya (managerId = Bob's ID). Salary, bank, PAN, Aadhar fields should be FILTERED OUT by `filterSensitiveData`.

**Step 4**: Priya logs in for first time
- **Role**: Employee Priya
- **Action**: POST /api/auth/admin/login with email + password
- **Expected**: Session created, GET /api/hrms/employees/me returns her full record

**Expected Final State**:
- Employee record: Active, all fields populated
- Visibility: HR/Admin see all, Manager sees non-sensitive, Priya sees own full record
- Audit trail: NONE — no creation audit log exists in the system

**Actual/Inferred Issues**:
- **P1**: No audit trail for employee creation. No record of who created the employee or when (beyond Sequelize timestamps).
- **P1**: Offer letter upload is non-functional (file never sent to backend).
- **P2**: Password is not set during onboarding — employee cannot log in unless `isNewUser` flow is used or password is set separately.
- **P2**: `leaveEntitlements` not set during onboarding — employee has no leave balance until HR manually configures it or accrual runs.
- **P2**: No email notification to new employee with login credentials.

---

### SCENARIO 2: Leave Request → Approval → Rejection → Re-submission

**Step 1**: Priya applies for Casual Leave
- **Role**: Employee (Priya)
- **Action**: POST /api/hrms/leaves
- **Data**: type="Casual Leave", startDate="2026-03-02", endDate="2026-03-04", reason="Family function"
- **Backend**: Validates dates, checks overlaps, computes workingDays=3 (Mon-Wed), creates with status=Pending

**Step 2**: Manager Bob reviews pending leaves
- **Role**: Manager (Bob)
- **Action**: GET /api/hrms/leaves → sees Priya's leave (scopeByRole: manager scope includes reportees)
- **Data Reviewed**: Leave type, dates, reason, status=Pending

**Step 3**: Manager Bob rejects the leave
- **Role**: Manager (Bob)
- **Action**: PUT /api/hrms/leaves/:id → { status: "Rejected", approverComments: "Critical sprint deadline" }
- **Backend**: Validates Bob is Priya's manager, sets approvedBy=Bob, approvedOn=today
- **Result**: Leave status = Rejected

**Step 4**: Priya views rejected leave
- **Role**: Employee (Priya)
- **Action**: GET /api/hrms/leaves?employeeId=priya-id
- **Expected**: Sees leave with status=Rejected, approverComments visible

**Step 5**: Priya re-submits with different dates
- **Role**: Employee (Priya)
- **Action**: POST /api/hrms/leaves → type="Casual Leave", startDate="2026-03-16", endDate="2026-03-18", reason="Family function - rescheduled"
- **Backend**: New leave request created (Rejected leave doesn't count as overlapping)

**Step 6**: Manager Bob approves
- **Role**: Manager (Bob)
- **Action**: PUT /api/hrms/leaves/:new-id → { status: "Approved" }
- **Backend**: Sets approvedBy=Bob, approvedOn=today

**Expected Final State**:
- Two leave records: #1 Rejected (Mar 2-4), #2 Approved (Mar 16-18)
- Leave balance: Casual Leave used = 3 days (only Approved counts)
- Manager sees both records. Employee sees both records. HR/Admin sees all.

**Actual/Inferred Issues**:
- **P2**: Cannot modify a rejected leave request — must create new one. No "re-submit" workflow; it's a brand new request. The link between original and re-submission is lost.
- **P1**: Employee cannot edit their own PENDING leave. The frontend only has "Apply" — no edit form for existing pending requests. Backend allows PUT from owner if Pending, but frontend lacks the UI.
- **P2**: No notification system — Bob doesn't know a leave was applied. Priya doesn't know it was rejected. All discovery is manual.
- **P1**: `Cancelled` status exists in the backend state machine but the frontend `LeaveStatus` enum only has `Pending, Approved, Rejected` — Cancelled leaves render with the Pending amber badge color, misleading the user.

---

### SCENARIO 3: Manager Change Mid-Workflow

**Step 1**: Priya has a pending leave request (manager = Bob)
- **Setup**: Priya submits leave. Bob hasn't approved yet.

**Step 2**: HR changes Priya's manager from Bob to Diana
- **Role**: HR
- **Action**: PUT /api/hrms/employees/:priya-id → { managerId: "diana-id" }
- **Result**: Priya.managerId now points to Diana

**Step 3**: Bob tries to approve Priya's pending leave
- **Role**: Manager (Bob)
- **Action**: PUT /api/hrms/leaves/:id → { status: "Approved" }
- **Backend Check**: `leave.Employee?.managerId === userId` → Priya's managerId is now Diana, NOT Bob
- **Result**: 403 — "Only managers or HR can approve/reject leave requests"

**Step 4**: Diana sees Priya's pending leave
- **Role**: Manager (Diana)
- **Action**: GET /api/hrms/leaves → scopeByRole queries `Employee.findAll({ where: { managerId: diana-id } })`
- **Result**: Diana sees Priya's pending leave and can approve

**Expected Final State**:
- Priya's leave can only be approved by Diana (new manager) or HR/Admin
- Bob can no longer see Priya's data

**Actual/Inferred Issues**:
- **P1**: If Bob opened the leave approval page BEFORE the manager change, the frontend may have cached the leave list. Bob sees the leave, clicks Approve, gets 403. Poor UX — no explanation of why approval failed.
- **P2**: No audit trail for manager change. No notification to old manager, new manager, or employee.
- **P0**: If the manager change happens AFTER Bob clicked "Approve" but BEFORE the backend processes it (race condition), the check `leave.Employee?.managerId === userId` loads from DB in real-time, so this is safe. However, the leave request doesn't store the manager at time of application — the approval authority is always the CURRENT manager, not the manager at time of request. This could cause confusion in audit.
- **P1**: `scopeByRole` for Manager only checks DIRECT reportees. If Bob was Diana's manager, and Diana is now Priya's manager, Bob cannot see Priya's data at all. No multi-level hierarchy support.

---

### SCENARIO 4: Role Change (Employee Becomes Manager)

**Step 1**: Priya is promoted to Manager
- **Role**: HR
- **Action**: PUT /api/hrms/employees/:priya-id → { role: "Manager", designation: "Engineering Lead" }
- **Result**: Priya.role = "Manager"

**Step 2**: New employee Raj is onboarded with Priya as manager
- **Role**: HR
- **Action**: POST /api/hrms/employees → { ..., managerId: priya-id }
- **Result**: Raj.managerId = priya-id

**Step 3**: Priya views employees
- **Role**: Manager (Priya)
- **Action**: GET /api/hrms/employees → scopeByRole filters to Priya + Raj
- **Result**: Priya sees herself and Raj

**Step 4**: Raj applies for leave, Priya approves
- This should work because Priya is now Manager role and Raj's managerId = Priya

**Step 5**: Priya applies for her own leave
- **Who approves?** Priya's managerId. If it's still Bob/Diana, they approve. If managerId is null, NOBODY except HR/Admin can approve.
- **ISSUE**: Priya cannot approve her own leave (backend enforces: `isOwnLeave && !isHROrAdmin → 403`)

**Expected Final State**:
- Priya: role=Manager, can see/approve Raj's requests
- Priya's own requests: only her manager or HR/Admin can approve
- All previous data (attendance, old leaves) is preserved

**Actual/Inferred Issues**:
- **P1**: Role change has no effective date or history tracking on the Employee record. The role just changes instantly. Previous actions under the old role are not distinguishable.
- **P2**: If Priya had pending leave requests when she was Employee, those requests' visibility changes. Her old manager can still approve (if managerId unchanged), but the leave list page rendering changes because her role now shows different UI elements (Employee column appears in table).
- **P1**: No EmployeeHiringHistory entry is created for role changes — only for termination/rehire. Promotion history is lost.

---

### SCENARIO 5: Employee Exit

**Step 1**: Priya resigns — HR processes separation
- **Role**: HR
- **Action**: POST /api/hrms/employees/:priya-id/separate
- **Data**: { separationType: "Resignation", lastWorkingDay: "2026-04-10", reason: "Personal reasons", noticePeriodServed: 30 }
- **Backend**:
  1. Creates EmployeeHiringHistory record
  2. Sets status="Resigned", terminationDate="2026-04-10", lastWorkingDay="2026-04-10"
  3. Cancels pending leave requests with startDate > lastWorkingDay
  4. All in a transaction

**Step 2**: Priya's pending leave for March (before LWD) is NOT cancelled
- **Backend Logic**: Only cancels leaves with `startDate > lastWorkingDay` (April 10)
- Priya's March leaves remain Pending/Approved

**Step 3**: Raj (who reported to Priya) is now orphaned
- **Role**: Manager (Raj's view)
- **Expected**: Raj's managerId still points to Priya (now Resigned)
- **ISSUE**: No automatic re-assignment of reportees when a manager exits

**Step 4**: Payroll processes Priya's final payslip for April
- **Role**: Finance
- **Action**: POST /api/hrms/payslips/generate → { employeeId: priya-id, month: "2026-04" }
- **Backend**: Does NOT check employee status — generates payslip for resigned employee
- **ISSUE**: LOP calculation uses working days for full April, but Priya only worked 1-10 April

**Step 5**: Finance tries to login as Priya (to verify access revocation)
- **ISSUE**: Priya's password and `enableEmailLogin` are NOT changed on separation. She can still log in. The separation endpoint does not revoke credentials.

**Expected Final State**:
- Priya: status=Resigned, all historical data preserved
- Raj: orphaned (no valid manager), leave approvals blocked
- Access: Priya should NOT be able to log in

**Actual/Inferred Issues**:
- **P0**: Separated employee can still log in. No credential revocation or session invalidation on separation. Priya can still access the system, view data, and potentially apply for leave.
- **P0**: Reportees of exiting manager are orphaned. No warning, no automatic reassignment, no block. Raj cannot get leaves approved.
- **P0**: Final payslip calculation doesn't account for partial month (only 10 working days, not full month). LOP deduction may be incorrect or the gross calculation doesn't pro-rate.
- **P1**: The OffboardingModal (frontend) uses `updateEmployee(id, { status: 'Exited' })` which does NOT call the separation endpoint at all. Frontend and backend offboarding flows are disconnected.
- **P2**: Exit interview date, full-and-final date, recovery amount are captured by the backend separation endpoint but NOT exposed in the frontend OffboardingModal.

---

## PHASE 4 — CROSS-ROLE VISIBILITY & PERMISSION TESTING

### 4.1 Role × Data Access Matrix

**Record**: Priya Sharma (Employee), managed by Bob (Manager)

| Data Field | Admin | HR | Finance | Manager (Bob) | Employee (Priya) | Employee (Charlie - unrelated) |
|-----------|-------|-----|---------|--------------|-----------------|-------------------------------|
| name | R/W | R/W | R | R | R | R (via list) |
| email | R/W | R/W | R | R | R | R (via list) |
| department | R/W | R/W | R | R | R | R (via list) |
| designation | R/W | R/W | R | R | R | R (via list) |
| **salary** | R/W | R/W | R | **HIDDEN** | R (own) | **HIDDEN** |
| **bankAccountNumber** | R/W | R/W | R | **HIDDEN** | R (own) | **HIDDEN** |
| **bankIFSC** | R/W | R/W | R | **HIDDEN** | R (own) | **HIDDEN** |
| **pan** | R/W | R/W | R | **HIDDEN** | R (own) | **HIDDEN** |
| **aadhar** | R/W | R/W | R | **HIDDEN** | R (own) | **HIDDEN** |
| **pfNumber** | R/W | R/W | R | **HIDDEN** | R (own) | **HIDDEN** |
| **password** | **HIDDEN** | **HIDDEN** | **HIDDEN** | **HIDDEN** | **HIDDEN** | **HIDDEN** |
| **salaryBreakdown** | R/W | R/W | R | **HIDDEN** | R (own) | **HIDDEN** |
| **taxDeclarations** | R/W | R/W | R | **HIDDEN** | R (own) | **HIDDEN** |
| leave requests | R/W | R/W | via scope | R (reportees) | R (own) | **NO ACCESS** |
| attendance | R/W | R/W | via scope | R (reportees) | R (own) | **NO ACCESS** |
| payslips | R/W | R/W | R/W | **NO ACCESS** | R (own) | **NO ACCESS** |

R = Read, W = Write, HIDDEN = Filtered by `filterSensitiveData`

### 4.2 Permission Violations Found

| # | Violation | Severity | Details |
|---|-----------|----------|---------|
| V1 | **Finance sees all employee personal data** | **P0** | Finance role gets `type: 'all'` scope in `scopeByRole` AND bypasses `filterSensitiveData` (line 120: Finance included with Admin/HR). Finance should only see salary-related fields for payroll, not personal address, blood group, marital status, etc. |
| V2 | **Manager can see employee list but filter doesn't consistently apply** | P1 | `GET /employees` uses `scopeByRole` which returns reportee IDs. But `GET /employees/:id` uses `requireEmployeeAccess` which does a separate DB lookup. If an employee is reassigned between the two calls, inconsistent results occur. |
| V3 | **Employee self-update allows password change without current password verification** | **P0** | The `PUT /employees/:id` endpoint allows `password` in the self-update allowed fields list (line 341). Employee can change their password without providing the current password. An attacker who gains session access can permanently lock out the employee. |
| V4 | **No rate limiting on login** | P1 | `POST /api/auth/admin/login` has no rate limiting or account lockout. Brute-force attack on employee passwords is possible. |
| V5 | **Attendance check-in has no IP/geo restriction** | P2 | Any authenticated user can check in from anywhere. For office-based attendance, there's no location validation. |
| V6 | **GET /leaves/:id has no scope enforcement** | P1 | The individual leave endpoint checks `isHROrAdmin || isOwnLeave || isManagerOfEmployee` but `isManagerOfEmployee` checks `leave.Employee?.managerId`. If the `Employee` include fails or is null, the check falls through. An employee could potentially see another employee's leave if the include join fails silently. |
| V7 | **PUT /attendance/:id allows arbitrary field update** | **P0** | The attendance update endpoint (`router.put('/attendance/:id', requireHRMSRole(RoleGroups.FULL_ACCESS), async (req, res) => { await attendance.update(req.body); })`) passes `req.body` directly to `update()` with no field filtering. An HR/Admin could inject fields like `employeeId` to reassign attendance records, or inject Sequelize-specific keys. |
| V8 | **LeaveRequest status enum not enforced in model** | P1 | The `status` field on LeaveRequest is a free STRING with no enum constraint in Sequelize. Backend validates on PUT (Approved/Rejected/Cancelled), but a direct POST could set status to any string. Actually, POST hardcodes status='Pending', so this is only exploitable via direct DB access. Reduced to P2. |

### 4.3 Timing-Based Visibility Tests

| Scenario | Before | After | Issue |
|----------|--------|-------|-------|
| Leave submitted, before approval | Employee: sees Pending. Manager: sees Pending. HR: sees Pending. | After approval: Employee sees Approved. Manager sees Approved. | **No issue** — all roles see real-time status. |
| Payslip generated as Draft | Employee: sees Draft payslip (via GET /payslips). | After finalization: Employee sees Finalized. | **ISSUE**: Employee can see Draft payslips. Drafts may contain errors. Employee should only see Finalized/Paid payslips. |
| Employee terminated | Before: Employee sees all own data. | After: Employee can STILL log in and see data. | **P0**: No access revocation on termination. |

---

## PHASE 5 — DATA CONSISTENCY OVER TIME

### 5.1 Historical Records

**Scenario**: Priya's salary changes from 900,000 to 1,200,000 on 2026-06-01.

| Test | Expected | Actual/Inferred |
|------|----------|-----------------|
| May 2026 payslip | Based on 900,000 CTC | Correct — payslip already generated with old salary |
| June 2026 payslip | Based on 1,200,000 CTC | Correct — reads current Employee.salary at generation time |
| Re-generate May payslip after salary change | Should use 900,000 | **ISSUE**: Cannot re-generate — "Payslip already exists for this month" error (duplicate check). If the May payslip is deleted and re-generated, it will use the NEW salary (1,200,000). There is no historical salary snapshot. |
| Salary history query | Show 900K before June, 1.2M after | **ISSUE**: No salary history table. Only EmployeeHiringHistory records salary on termination/rehire, not on salary revision. |

### 5.2 Backdated Changes

**Scenario**: On 2026-03-15, HR discovers Priya's join date should have been 2026-02-01, not 2026-02-10.

| Test | Expected | Actual/Inferred |
|------|----------|-----------------|
| Update joinDate | HR updates via PUT /employees/:id → { joinDate: "2026-02-01" } | Accepted. No validation on date change. |
| February payslip | Should reflect 28 working days (Feb 1-28), not 19 (Feb 10-28) | **P0 ISSUE**: If February payslip was already generated, it used joinDate=Feb 10. The generated payslip is now incorrect. There is no recalculation trigger. |
| Leave balance | Should reflect full February accrual | **ISSUE**: Leave entitlements are stored as a static JSON, not computed dynamically. Changing joinDate does not trigger re-accrual. |
| Attendance records Feb 1-9 | Should show as absent/need regularization | **ISSUE**: No attendance records exist for Feb 1-9. They are not auto-generated. Payslip generator would count them as LOP for past dates. |

### 5.3 Corrections After Payroll Cut-off

**Scenario**: March payslip is Finalized. HR discovers Priya was on approved leave March 5-7 but was marked LOP.

| Test | Expected | Actual/Inferred |
|------|----------|-----------------|
| Correct leave status | HR approves the leave backdated | POST /api/hrms/leaves can be created for past dates by HR (allowed). PUT to Approved. |
| Re-calculate payslip | March payslip should recalculate with 3 fewer LOP days | **P0 ISSUE**: Finalized payslip CANNOT be regenerated. There is no "Revision" or "Supplementary" payslip mechanism. The only option is to adjust in the next month's payslip manually, but there's no field for adjustments. |
| Net pay difference | Should be credited | **ISSUE**: No arrears/adjustment mechanism in payroll. The difference is silently lost unless Finance manually creates a new entry or modifies the existing payslip via direct DB access. |

### 5.4 Data Drift Scenarios

| Scenario | Risk | Severity |
|----------|------|----------|
| LeaveType.maxDays changed from 12 to 15 mid-year | Employees who already exhausted 12 days won't see the new 3 days. Balance calc uses current config, so they'd actually see 3 new days. But employees who were denied leave at 12 were incorrectly denied. | P1 |
| Holiday added/removed after payslip generation | Past payslips won't reflect the change. Working days calculated at generation time are stored as static fields. | P1 |
| Department renamed | Employee records store department as STRING not FK. Old employees still show the old department name. No cascade update. | P2 |
| Shift timing changed | Past attendance records keep their old Late/Present status. No retroactive re-evaluation. A check-in at 09:20 marked "Late" with 15-min grace is still "Late" even if grace is later changed to 30 minutes. | P2 |
| ProfessionalTaxSlab updated | Past payslips use the old PT amount (stored in breakdown). Future payslips use the new slab. No retroactive correction. | P1 |

### 5.5 Retroactive Inconsistencies

| Data Point | Stored In | Updated On Change? | Risk |
|-----------|-----------|-------------------|------|
| Employee salary | Employee.salary | Overwritten | All payslips generated after change use new salary. No history. |
| Leave entitlements | Employee.leaveEntitlements (JSON) | Only via explicit accrual API | Stale entitlements if not manually refreshed annually. |
| Manager assignment | Employee.managerId | Overwritten | Past leave approvals still show old approver. Current approval workflow uses new manager. |
| Regularization employeeName | RegularizationRequest.employeeName | NEVER | If employee name changes (marriage, legal), old regularization records show old name. Denormalized field drifts. |
| Payslip breakdown | Payslip.breakdown (JSON) | NEVER (immutable) | Correct behavior — payslip is a point-in-time snapshot. |

---

## PHASE 6 — FAILURE CONSOLIDATION & SEVERITY

### P0 — Payroll/Compliance Risk

| ID | Finding | Category | Source |
|----|---------|----------|--------|
| P0-01 | **Separated employee can still log in** — No credential revocation or session invalidation on termination/resignation | Role-Permission Violation | Phase 3, Scenario 5, Step 5 |
| P0-02 | **Finance role sees all personal data** — Finance gets full data access equivalent to Admin/HR, including non-payroll personal information (address, blood group, marital status, emergency contacts) | Role-Permission Violation | Phase 4, V1 |
| P0-03 | **Password change without current password** — Self-update endpoint allows password field without verifying existing password | Role-Permission Violation | Phase 4, V3 |
| P0-04 | **No salary history** — Salary changes overwrite with no audit trail. Previously generated payslips cannot be verified against the salary at time of generation. | Data Validation Failure | Phase 5, Section 5.1 |
| P0-05 | **Finalized payslip cannot be corrected** — No revision, supplementary, or arrears mechanism. Post-finalization errors in LOP, leave adjustments, or attendance corrections are permanently locked. | Workflow Break | Phase 5, Section 5.3 |
| P0-06 | **Backdated joinDate change doesn't trigger payslip/leave recalculation** — Changing an employee's join date after payroll has run creates permanent discrepancy. | Data Validation Failure | Phase 5, Section 5.2 |
| P0-07 | **Payslip generated for terminated employees** — Backend doesn't validate employee status before payslip generation. Can generate payslip for resigned/terminated employees. | Workflow Break | Phase 2, Section 2.6 |
| P0-08 | **Attendance update accepts arbitrary req.body** — `PUT /attendance/:id` passes unsanitized request body to Sequelize `update()`. Could allow field injection or data corruption. | Data Validation Failure | Phase 4, V7 |
| P0-09 | **Reportees orphaned on manager exit** — When a manager is separated, their direct reports are not reassigned. These employees cannot get leaves approved. | Workflow Break | Phase 3, Scenario 5 |
| P0-10 | **IST timezone double-offset risk** — Attendance check-in computes IST as `new Date().getTime() + 5.5h`. If server runs in IST, the offset is applied twice, recording attendance for the wrong date (next day). | Data Validation Failure | Phase 2, Section 2.4 |

### P1 — Functional Break

| ID | Finding | Category | Source |
|----|---------|----------|--------|
| P1-01 | **Offboarding modal uses wrong status and endpoint** — Frontend sets `status: 'Exited'` (invalid) via PUT instead of using `POST /employees/:id/separate`. No hiring history, no leave cancellation, no transaction safety. | Workflow Break | Phase 2, Section 2.2 |
| P1-02 | **Leave balance display breaks after submission** — Initial load parses as array, post-submission reads `.balances` property. Response format mismatch causes balance cards to go blank. | Data Validation Failure | Phase 2, Section 2.3 |
| P1-03 | **Cancelled status not in frontend enum** — Backend supports `Cancelled` leave status but frontend `LeaveStatus` enum only has Pending/Approved/Rejected. Cancelled leaves render with wrong badge. | Workflow Break | Phase 3, Scenario 2 |
| P1-04 | **No edit UI for pending leave requests** — Employees cannot modify their own pending leave requests from the frontend, even though the backend supports it. | Workflow Break | Phase 3, Scenario 2 |
| P1-05 | **No notification system** — No email, in-app, or push notifications for any HRMS events (leave applied, approved, rejected; attendance anomalies; payslip generated). All discovery is manual. | Workflow Break | Phase 3, Scenario 2 |
| P1-06 | **No password set during onboarding** — New employee cannot log in after onboarding unless password is set separately. No first-login / activation flow exposed in onboarding UI. | Workflow Break | Phase 3, Scenario 1 |
| P1-07 | **No multi-level hierarchy** — Manager scope only shows direct reports. A VP cannot see their skip-level reports. No organization tree traversal. | Workflow Break | Phase 3, Scenario 3 |
| P1-08 | **Employee can see Draft payslips** — Draft payslips (potentially incorrect) are visible to employees. Should be hidden until Finalized. | Role-Permission Violation | Phase 4, Section 4.3 |
| P1-09 | **No rate limiting on auth endpoints** — Brute-force password attacks are possible against `/api/auth/admin/login`. | Role-Permission Violation | Phase 4, V4 |
| P1-10 | **Regularization time validation missing** — Can submit newCheckIn > newCheckOut, resulting in negative duration on approval. | Data Validation Failure | Phase 2, Section 2.5 |
| P1-11 | **No creation audit log** — Employee creation, role changes, salary changes, and other administrative actions have no audit trail beyond Sequelize `createdAt`/`updatedAt`. | Data Validation Failure | Phase 3, Scenario 1 |
| P1-12 | **ProfessionalTaxSlab retroactive changes undetected** — Changed PT slabs don't flag or recalculate past payslips. Compliance risk if state revises PT rates retroactively. | Data Validation Failure | Phase 5, Section 5.4 |

### P2 — Usability Issue

| ID | Finding | Category | Source |
|----|---------|----------|--------|
| P2-01 | **Onboarding form: no validation on Steps 2-3** — Department, designation, salary can all be empty. No email format check on frontend. | Data Validation Failure | Phase 2, Section 2.1 |
| P2-02 | **Offer letter upload non-functional** — File is captured in React state but never sent to backend. Silently discarded on submit. | Workflow Break | Phase 2, Section 2.1 |
| P2-03 | **CTC label says "USD" but payroll calculates in INR** — Salary input shows "$" prefix but all payroll logic uses Indian salary structure (Basic/HRA/PF/ESI/PT). | Data Validation Failure | Phase 2, Section 2.1 |
| P2-04 | **No min/max on join date or exit date** — Can set dates in 1900 or 2099. No business validation for reasonable date range. | Data Validation Failure | Phase 2, Sections 2.1, 2.2 |
| P2-05 | **Regularization allows future dates** — Can request regularization for a date that hasn't occurred yet. | Data Validation Failure | Phase 2, Section 2.5 |
| P2-06 | **Department stored as string, not FK** — Renaming a department doesn't cascade to employee records. Leads to orphaned department names over time. | Data Validation Failure | Phase 5, Section 5.4 |
| P2-07 | **RegularizationRequest.employeeName denormalized** — Name changes (marriage, legal) don't propagate to existing regularization records. | Data Validation Failure | Phase 5, Section 5.5 |
| P2-08 | **Shift timing not visible to employees** — No UI shows the configured shift start time, grace period, or half-day threshold. Employees don't know when they'll be marked "Late". | Workflow Break | Phase 2, Section 2.4 |
| P2-09 | **No leave re-submission workflow** — Rejected leaves must be re-created from scratch. No link between original and re-submitted request. | Workflow Break | Phase 3, Scenario 2 |
| P2-10 | **LeaveEntitlements not auto-initialized on onboarding** — New employees have no leave balance until HR runs accrual manually. | Workflow Break | Phase 3, Scenario 1 |

---

### Summary Statistics

| Severity | Count | Categories |
|----------|-------|------------|
| **P0** | 10 | Payroll/compliance: 5, Role-permission: 3, Data validation: 2 |
| **P1** | 12 | Workflow break: 7, Data validation: 3, Role-permission: 2 |
| **P2** | 10 | Data validation: 6, Workflow break: 4 |
| **Total** | **32** | |

---

*Report generated from static code analysis of GRX10-Books HRMS module. No runtime testing was performed. All findings are based on code-level inference from the actual source files.*
