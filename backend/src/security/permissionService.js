import { v4 as uuidv4 } from 'uuid';
import { Role, Permission, RolePermission, UserRole, User } from '../config/database.js';
import { EMPLOYEE_ROLE_TO_CODE, PERMISSIONS, ROLE_CODES, ROLE_PERMISSIONS } from './permissions.js';

const deriveUsername = (email, fallback) => {
    if (email && email.includes('@')) {
        return email.split('@')[0];
    }
    return fallback || `user-${uuidv4().slice(0, 8)}`;
};

const getDefaultRoleCode = (employeeRole) => {
    if (employeeRole && EMPLOYEE_ROLE_TO_CODE[employeeRole]) {
        return EMPLOYEE_ROLE_TO_CODE[employeeRole];
    }
    return ROLE_CODES.EMPLOYEE;
};

const normalizePermissions = (permissionRecords) =>
    permissionRecords.map(permission => permission.code);

export const ensureDefaultRolesAndPermissions = async () => {
    const existingRoles = await Role.count();
    const existingPermissions = await Permission.count();
    if (existingRoles === 0) {
        const roleEntries = Object.values(ROLE_CODES).map(roleCode => ({
            id: uuidv4(),
            name: roleCode.replace('_', ' '),
            code: roleCode,
            description: `${roleCode.replace('_', ' ')} role`,
            isSystemRole: true,
            isActive: true
        }));
        await Role.bulkCreate(roleEntries);
    }
    if (existingPermissions === 0) {
        const permissionEntries = PERMISSIONS.map(permission => ({
            id: uuidv4(),
            ...permission,
            isActive: true
        }));
        await Permission.bulkCreate(permissionEntries);
    }
};

const ensureDefaultRoleAssignments = async (userId, employeeRole) => {
    const activeRoles = await UserRole.count({ where: { userId, isActive: true } });
    if (activeRoles > 0) {
        return;
    }
    const roleCode = getDefaultRoleCode(employeeRole);
    const role = await Role.findOne({ where: { code: roleCode, isActive: true } });
    if (!role) {
        return;
    }
    await UserRole.create({
        id: uuidv4(),
        userId,
        roleId: role.id,
        assignedAt: new Date(),
        isActive: true
    });
};

export const ensureUserForEmployee = async (employee) => {
    const existingUser = await User.findOne({
        where: {
            id: employee.id
        }
    });
    if (existingUser) {
        return existingUser;
    }
    const fallbackUser = await User.findOne({ where: { email: employee.email } });
    if (fallbackUser) {
        return fallbackUser;
    }
    return User.create({
        id: employee.id,
        username: deriveUsername(employee.email, employee.id),
        email: employee.email,
        displayName: employee.name,
        role: employee.role || 'user',
        isActive: true
    });
};

export const getPermissionsForUser = async (userId, employeeRole) => {
    const userRoles = await UserRole.findAll({
        where: { userId, isActive: true },
        include: [{
            model: Role,
            as: 'role',
            include: [{
                model: Permission,
                as: 'permissions',
                where: { isActive: true },
                through: { attributes: [] }
            }]
        }]
    });

    const permissionSet = new Set();
    userRoles.forEach(userRole => {
        if (userRole.role && userRole.role.permissions) {
            userRole.role.permissions.forEach(permission => {
                permissionSet.add(permission.code);
            });
        }
    });

    if (permissionSet.size === 0) {
        const fallbackRole = getDefaultRoleCode(employeeRole);
        ROLE_PERMISSIONS[fallbackRole]?.forEach(code => permissionSet.add(code));
    }

    return Array.from(permissionSet);
};

export const buildSessionUser = async (employee, overrides = {}) => {
    await ensureDefaultRolesAndPermissions();
    const userRecord = await ensureUserForEmployee(employee);
    await ensureDefaultRoleAssignments(userRecord.id, employee.role);
    const permissions = await getPermissionsForUser(userRecord.id, employee.role);

    return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        userId: userRecord.id,
        permissions,
        ...overrides
    };
};
