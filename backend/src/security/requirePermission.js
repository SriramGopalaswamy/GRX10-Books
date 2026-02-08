export const requirePermission = (permissionCode) => (req, res, next) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    if (!permissions.includes(permissionCode)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
};
