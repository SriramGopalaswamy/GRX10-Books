
import { UserRole, Role, Permission } from '../../config/database.js';

/**
 * Middleware to check if user has required permission
 * Usage: requirePermission('hrms', 'employees', 'create')
 */
export const requirePermission = (module, resource, action) => {
    return async (req, res, next) => {
        try {
            // Get user from session
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Get user's active roles
            const userRoles = await UserRole.findAll({
                where: { userId, isActive: true },
                include: [{
                    model: Role,
                    as: 'role',
                    where: { isActive: true },
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        where: {
                            module,
                            resource,
                            action,
                            isActive: true
                        },
                        through: { attributes: [] }
                    }]
                }]
            });

            // Check if user has the permission through any role
            const hasPermission = userRoles.some(userRole => 
                userRole.role && userRole.role.permissions && userRole.role.permissions.length > 0
            );

            if (!hasPermission) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    required: `${module}.${resource}.${action}`
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ error: 'Permission check failed' });
        }
    };
};

/**
 * Middleware to check if user has any of the required permissions
 * Usage: requireAnyPermission([['hrms', 'employees', 'create'], ['hrms', 'employees', 'update']])
 */
export const requireAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const userRoles = await UserRole.findAll({
                where: { userId, isActive: true },
                include: [{
                    model: Role,
                    as: 'role',
                    where: { isActive: true },
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        where: {
                            isActive: true
                        },
                        through: { attributes: [] }
                    }]
                }]
            });

            // Collect all user permissions
            const userPermissions = new Set();
            userRoles.forEach(userRole => {
                if (userRole.role && userRole.role.permissions) {
                    userRole.role.permissions.forEach(permission => {
                        userPermissions.add(`${permission.module}.${permission.resource}.${permission.action}`);
                    });
                }
            });

            // Check if user has any of the required permissions
            const hasAnyPermission = permissions.some(([module, resource, action]) => 
                userPermissions.has(`${module}.${resource}.${action}`)
            );

            if (!hasAnyPermission) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions',
                    required: permissions
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ error: 'Permission check failed' });
        }
    };
};

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRoles = await UserRole.findAll({
            where: { userId, isActive: true },
            include: [{
                model: Role,
                as: 'role',
                where: { 
                    isActive: true,
                    code: 'admin' // Assuming admin role has code 'admin'
                }
            }]
        });

        if (userRoles.length === 0) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ error: 'Admin check failed' });
    }
};

/**
 * Helper function to get user permissions (for use in routes)
 */
export const getUserPermissions = async (userId) => {
    try {
        const userRoles = await UserRole.findAll({
            where: { userId, isActive: true },
            include: [{
                model: Role,
                as: 'role',
                where: { isActive: true },
                include: [{
                    model: Permission,
                    as: 'permissions',
                    where: { isActive: true },
                    through: { attributes: [] }
                }]
            }]
        });

        const permissions = new Map();
        userRoles.forEach(userRole => {
            if (userRole.role && userRole.role.permissions) {
                userRole.role.permissions.forEach(permission => {
                    permissions.set(permission.code, {
                        id: permission.id,
                        code: permission.code,
                        module: permission.module,
                        resource: permission.resource,
                        action: permission.action
                    });
                });
            }
        });

        return Array.from(permissions.values());
    } catch (error) {
        console.error('Get user permissions error:', error);
        return [];
    }
};

