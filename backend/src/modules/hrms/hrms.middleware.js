/**
 * HRMS Authorization Middleware
 *
 * Provides role-based access control for HRMS endpoints.
 * Uses the Employee.role field ('Admin', 'HR', 'Manager', 'Employee', 'Finance')
 */

// Role hierarchy for HRMS
export const HRMSRoles = {
    ADMIN: 'Admin',
    HR: 'HR',
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee',
    FINANCE: 'Finance'
};

// Sensitive fields that should be filtered based on role
const SENSITIVE_FIELDS = [
    'salary', 'salaryBreakdown', 'bankAccountNumber', 'bankIFSC', 'bankName', 'bankBranch',
    'pan', 'aadhar', 'pfNumber', 'esiNumber', 'uanNumber', 'taxDeclarations', 'password'
];

// Personal fields that Finance should NOT see (they only need payroll-relevant data)
const PERSONAL_FIELDS_HIDDEN_FROM_FINANCE = [
    'dateOfBirth', 'address', 'bloodGroup', 'maritalStatus', 'spouseName',
    'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
    'educationDetails', 'experienceDetails', 'certifications', 'dependents',
    'skills', 'languages', 'employeeReferralId', 'exitInterviewDate'
];

/**
 * Middleware to require authentication
 * Must be applied before any HRMS route.
 * Also rejects users whose employee status is no longer Active
 * (handles stale sessions after separation).
 */
export const requireAuth = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if the employee is still active (guards against stale sessions after separation)
    try {
        const { Employee } = await import('../../config/database.js');
        const employee = await Employee.findByPk(req.user.id);
        if (employee && employee.status !== 'Active') {
            // Destroy the stale session
            req.logout(() => {});
            return res.status(401).json({ error: 'Account is no longer active. Please contact HR.' });
        }
    } catch (e) {
        // If DB check fails, allow request to proceed (fail-open for auth check)
        console.error('Auth status check failed:', e.message);
    }

    next();
};

/**
 * Middleware to require specific HRMS roles
 * Usage: requireHRMSRole(['Admin', 'HR'])
 *
 * @param {string[]} allowedRoles - Array of roles that can access the endpoint
 */
export const requireHRMSRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }

        next();
    };
};

/**
 * Middleware to check if user can access a specific employee's data
 * - Admin/HR can access anyone
 * - Manager can access their direct reportees
 * - Employee can only access themselves
 * - Finance can access salary-related data for payroll
 *
 * @param {Function} getEmployeeId - Function to extract target employee ID from request
 */
export const requireEmployeeAccess = (getEmployeeId) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRole = req.user.role;
        const userId = req.user.id;
        const targetEmployeeId = getEmployeeId(req);

        // Admin and HR can access anyone
        if (userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR) {
            return next();
        }

        // Finance can access for payroll purposes
        if (userRole === HRMSRoles.FINANCE) {
            return next();
        }

        // Employee accessing their own data
        if (targetEmployeeId === userId) {
            return next();
        }

        // Manager accessing reportee's data - check full hierarchy chain (P1-07)
        if (userRole === HRMSRoles.MANAGER) {
            const { Employee } = await import('../../config/database.js');

            // Walk up the manager chain from target employee to see if current user is an ancestor
            let currentManagerId = null;
            const targetEmployee = await Employee.findByPk(targetEmployeeId, { attributes: ['id', 'managerId'] });
            if (targetEmployee) {
                currentManagerId = targetEmployee.managerId;
                const visited = new Set();
                while (currentManagerId && !visited.has(currentManagerId)) {
                    if (currentManagerId === userId) {
                        return next(); // User is in the management chain
                    }
                    visited.add(currentManagerId);
                    const mgr = await Employee.findByPk(currentManagerId, { attributes: ['id', 'managerId'] });
                    currentManagerId = mgr?.managerId || null;
                }
            }
        }

        return res.status(403).json({ error: 'Access denied. You can only access your own data or your reportees.' });
    };
};

/**
 * Filter sensitive fields from employee data based on user role
 *
 * @param {Object} employeeData - Employee data object
 * @param {Object} reqUser - Authenticated user from request
 * @param {string} targetEmployeeId - ID of the employee whose data is being accessed
 * @returns {Object} Filtered employee data
 */
export const filterSensitiveData = (employeeData, reqUser, targetEmployeeId = null) => {
    if (!employeeData) return employeeData;

    const userRole = reqUser?.role;
    const userId = reqUser?.id;

    // Admin, HR can see all data (except password)
    if (userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR) {
        const { password, ...dataWithoutPassword } = employeeData;
        return dataWithoutPassword;
    }

    // Finance can see payroll-relevant data but NOT personal details
    if (userRole === HRMSRoles.FINANCE) {
        const filteredData = { ...employeeData };
        delete filteredData.password;
        PERSONAL_FIELDS_HIDDEN_FROM_FINANCE.forEach(field => {
            delete filteredData[field];
        });
        return filteredData;
    }

    // User viewing their own data can see most things
    if (targetEmployeeId === userId || employeeData.id === userId) {
        const { password, ...dataWithoutPassword } = employeeData;
        return dataWithoutPassword;
    }

    // Manager viewing reportee or others - filter sensitive fields
    const filteredData = { ...employeeData };
    SENSITIVE_FIELDS.forEach(field => {
        delete filteredData[field];
    });

    return filteredData;
};

/**
 * Filter an array of employees based on user role
 *
 * @param {Array} employees - Array of employee data
 * @param {Object} reqUser - Authenticated user from request
 * @returns {Array} Filtered array of employees
 */
export const filterEmployeeList = (employees, reqUser) => {
    if (!Array.isArray(employees)) return employees;

    return employees.map(emp => filterSensitiveData(emp, reqUser, emp.id));
};

/**
 * Middleware to handle manager-scoped data access
 * For list endpoints, filters data to only show relevant records
 * - Admin/HR: All records
 * - Manager: Only direct reportees
 * - Employee: Only own records
 * - Finance: All records (for payroll)
 *
 * Adds `req.hrmsScope` with { type: 'all' | 'manager' | 'self', employeeIds: [] }
 */
export const scopeByRole = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    // Admin, HR, Finance can see all
    if (userRole === HRMSRoles.ADMIN || userRole === HRMSRoles.HR || userRole === HRMSRoles.FINANCE) {
        req.hrmsScope = { type: 'all', employeeIds: null };
        return next();
    }

    // Manager can see all subordinates (direct + skip-level) (P1-07)
    if (userRole === HRMSRoles.MANAGER) {
        const { Employee } = await import('../../config/database.js');

        // Recursively find all subordinates (BFS traversal of manager tree)
        const allSubordinateIds = [];
        const queue = [userId];
        const visited = new Set();

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const directReports = await Employee.findAll({
                where: { managerId: currentId, status: 'Active' },
                attributes: ['id']
            });

            for (const report of directReports) {
                allSubordinateIds.push(report.id);
                queue.push(report.id); // Continue traversal for skip-level reports
            }
        }

        // Manager can also see their own data
        allSubordinateIds.push(userId);

        req.hrmsScope = { type: 'manager', employeeIds: allSubordinateIds };
        return next();
    }

    // Employee can only see their own data
    req.hrmsScope = { type: 'self', employeeIds: [userId] };
    next();
};

/**
 * Role groups for convenience
 */
export const RoleGroups = {
    // Can manage all employees
    FULL_ACCESS: [HRMSRoles.ADMIN, HRMSRoles.HR],

    // Can view/manage team data
    TEAM_ACCESS: [HRMSRoles.ADMIN, HRMSRoles.HR, HRMSRoles.MANAGER],

    // Can access payroll data
    PAYROLL_ACCESS: [HRMSRoles.ADMIN, HRMSRoles.HR, HRMSRoles.FINANCE],

    // All authenticated users
    ALL_AUTHENTICATED: [HRMSRoles.ADMIN, HRMSRoles.HR, HRMSRoles.MANAGER, HRMSRoles.EMPLOYEE, HRMSRoles.FINANCE]
};

/**
 * Validation patterns for Indian statutory fields
 */
export const StatutoryValidators = {
    // PAN format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
    PAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/,

    // Aadhar: 12 digits (may be space-separated in groups of 4)
    AADHAR: /^[0-9]{12}$/,

    // UAN (Universal Account Number): 12 digits
    UAN: /^[0-9]{12}$/,

    // ESI Number: 17 digits
    ESI: /^[0-9]{17}$/,

    // PF Number: Regional code/Establishment code/Account number
    // Format varies by region, common pattern: XX/XXX/XXXXXXX/XXX/XXXXXXX
    PF_NUMBER: /^[A-Z]{2}\/[A-Z]{3}\/\d{7}\/\d{3}\/\d{7}$/,

    // Email validation
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

    // Phone number: 10 digits (Indian mobile)
    PHONE: /^[6-9][0-9]{9}$/,

    // Bank IFSC: 4 letters + 0 + 6 alphanumeric
    IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,

    // Bank Account: 9-18 digits
    BANK_ACCOUNT: /^[0-9]{9,18}$/
};

/**
 * Validate statutory field value
 *
 * @param {string} field - Field name (pan, aadhar, esiNumber, uanNumber, pfNumber)
 * @param {string} value - Value to validate
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export const validateStatutoryField = (field, value) => {
    if (!value || value.trim() === '') {
        return { valid: true }; // Empty values are allowed (not mandatory)
    }

    const cleanValue = value.replace(/\s/g, '').toUpperCase();

    switch (field.toLowerCase()) {
        case 'pan':
            if (!StatutoryValidators.PAN.test(cleanValue)) {
                return {
                    valid: false,
                    error: 'Invalid PAN format. Expected format: ABCDE1234F (5 letters + 4 digits + 1 letter)'
                };
            }
            break;

        case 'aadhar':
            const aadharClean = value.replace(/\s/g, '');
            if (!StatutoryValidators.AADHAR.test(aadharClean)) {
                return {
                    valid: false,
                    error: 'Invalid Aadhar format. Expected 12 digits'
                };
            }
            break;

        case 'esinumber':
        case 'esi':
            if (!StatutoryValidators.ESI.test(cleanValue)) {
                return {
                    valid: false,
                    error: 'Invalid ESI number format. Expected 17 digits'
                };
            }
            break;

        case 'uannumber':
        case 'uan':
            if (!StatutoryValidators.UAN.test(cleanValue)) {
                return {
                    valid: false,
                    error: 'Invalid UAN format. Expected 12 digits'
                };
            }
            break;

        case 'pfnumber':
        case 'pf':
            // PF number has multiple valid formats, be lenient
            // Just check it's not empty and has reasonable length
            if (cleanValue.length < 5 || cleanValue.length > 30) {
                return {
                    valid: false,
                    error: 'Invalid PF number format'
                };
            }
            break;

        case 'bankifsc':
        case 'ifsc':
            if (!StatutoryValidators.IFSC.test(cleanValue)) {
                return {
                    valid: false,
                    error: 'Invalid IFSC code format. Expected format: AAAA0XXXXXX'
                };
            }
            break;

        case 'bankaccountnumber':
            const accountClean = value.replace(/\s/g, '');
            if (!StatutoryValidators.BANK_ACCOUNT.test(accountClean)) {
                return {
                    valid: false,
                    error: 'Invalid bank account number. Expected 9-18 digits'
                };
            }
            break;

        case 'phone':
            const phoneClean = value.replace(/[\s\-+]/g, '');
            // Remove country code if present
            const phoneDigits = phoneClean.replace(/^91/, '');
            if (!StatutoryValidators.PHONE.test(phoneDigits)) {
                return {
                    valid: false,
                    error: 'Invalid phone number. Expected 10 digit Indian mobile number'
                };
            }
            break;

        case 'email':
            if (!StatutoryValidators.EMAIL.test(value)) {
                return {
                    valid: false,
                    error: 'Invalid email format'
                };
            }
            break;

        default:
            return { valid: true };
    }

    return { valid: true };
};

/**
 * Middleware to validate statutory fields in employee data
 * Apply to create/update employee endpoints
 */
export const validateEmployeeData = (req, res, next) => {
    const fieldsToValidate = [
        'pan', 'aadhar', 'pfNumber', 'esiNumber', 'uanNumber',
        'bankIFSC', 'bankAccountNumber', 'phone', 'email'
    ];

    const errors = [];

    for (const field of fieldsToValidate) {
        if (req.body[field]) {
            const result = validateStatutoryField(field, req.body[field]);
            if (!result.valid) {
                errors.push({ field, message: result.error });
            }
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};
