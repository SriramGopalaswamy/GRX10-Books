export const PERMISSIONS = [
    {
        code: 'dashboard.read',
        name: 'Read dashboard summary',
        module: 'dashboard',
        resource: 'summary',
        action: 'read',
        description: 'View dashboard summary metrics'
    },
    {
        code: 'hrms.employee.read.all',
        name: 'Read all employees',
        module: 'hrms',
        resource: 'employees',
        action: 'read_all',
        description: 'View all employee records'
    },
    {
        code: 'hrms.employee.read.team',
        name: 'Read team employees',
        module: 'hrms',
        resource: 'employees',
        action: 'read_team',
        description: 'View direct reportee employee records'
    },
    {
        code: 'hrms.employee.read.self',
        name: 'Read own employee record',
        module: 'hrms',
        resource: 'employees',
        action: 'read_self',
        description: 'View own employee record'
    },
    {
        code: 'hrms.leave.approve',
        name: 'Approve leave',
        module: 'hrms',
        resource: 'leave',
        action: 'approve',
        description: 'Approve or reject leave requests'
    },
    {
        code: 'financial.invoice.manage',
        name: 'Manage invoices',
        module: 'financial',
        resource: 'invoice',
        action: 'manage',
        description: 'Create, update, and approve invoices'
    },
    {
        code: 'os.goal.read.all',
        name: 'Read all goals',
        module: 'os',
        resource: 'goal',
        action: 'read_all',
        description: 'View all goals'
    },
    {
        code: 'os.goal.read.team',
        name: 'Read team goals',
        module: 'os',
        resource: 'goal',
        action: 'read_team',
        description: 'View goals for direct reportees'
    },
    {
        code: 'os.goal.read.self',
        name: 'Read own goals',
        module: 'os',
        resource: 'goal',
        action: 'read_self',
        description: 'View own goals'
    },
    {
        code: 'security.read',
        name: 'Read security configuration',
        module: 'security',
        resource: 'configuration',
        action: 'read',
        description: 'View roles, permissions, and workflows'
    },
    {
        code: 'security.manage',
        name: 'Manage security configuration',
        module: 'security',
        resource: 'configuration',
        action: 'manage',
        description: 'Create/update roles, permissions, workflows, and assignments'
    }
];

export const ROLE_CODES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    HR: 'HR',
    MANAGER: 'MANAGER',
    EMPLOYEE: 'EMPLOYEE',
    FINANCE: 'FINANCE',
    AUDITOR: 'AUDITOR'
};

export const ROLE_PERMISSIONS = {
    [ROLE_CODES.SUPER_ADMIN]: PERMISSIONS.map(permission => permission.code),
    [ROLE_CODES.ADMIN]: PERMISSIONS.map(permission => permission.code),
    [ROLE_CODES.HR]: [
        'dashboard.read',
        'hrms.employee.read.all',
        'hrms.leave.approve',
        'os.goal.read.all',
        'security.read'
    ],
    [ROLE_CODES.MANAGER]: [
        'dashboard.read',
        'hrms.employee.read.team',
        'hrms.employee.read.self',
        'hrms.leave.approve',
        'os.goal.read.team',
        'os.goal.read.self'
    ],
    [ROLE_CODES.EMPLOYEE]: [
        'dashboard.read',
        'hrms.employee.read.self',
        'os.goal.read.self'
    ],
    [ROLE_CODES.FINANCE]: [
        'dashboard.read',
        'financial.invoice.manage',
        'hrms.employee.read.all',
        'os.goal.read.all'
    ],
    [ROLE_CODES.AUDITOR]: [
        'dashboard.read',
        'hrms.employee.read.all',
        'financial.invoice.manage',
        'os.goal.read.all',
        'security.read'
    ]
};

export const EMPLOYEE_ROLE_TO_CODE = {
    Admin: ROLE_CODES.ADMIN,
    HR: ROLE_CODES.HR,
    Manager: ROLE_CODES.MANAGER,
    Employee: ROLE_CODES.EMPLOYEE,
    Finance: ROLE_CODES.FINANCE
};
