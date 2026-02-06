/**
 * Audit Service - Immutable audit logging for all financial operations.
 *
 * Every create, update, status change, approval, and reversal in the
 * financial system is recorded here. Audit logs cannot be updated or deleted.
 */

import { AuditLog } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export async function createAuditLog({
    tableName,
    recordId,
    action,
    userId,
    userName,
    previousValues,
    newValues,
    description,
    ipAddress,
    userAgent
}) {
    return AuditLog.create({
        id: uuidv4(),
        tableName,
        recordId,
        action,
        userId: userId || 'system',
        userName: userName || 'System',
        timestamp: new Date().toISOString(),
        previousValues: previousValues ? JSON.stringify(previousValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        description,
        ipAddress,
        userAgent
    });
}

export async function getAuditLogs({ tableName, recordId, userId, action, startDate, endDate, limit = 100, offset = 0 }) {
    const { Op } = await import('sequelize');
    const where = {};

    if (tableName) where.tableName = tableName;
    if (recordId) where.recordId = recordId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (startDate && endDate) {
        where.timestamp = { [Op.between]: [startDate, endDate] };
    }

    return AuditLog.findAndCountAll({
        where,
        order: [['timestamp', 'DESC']],
        limit,
        offset
    });
}
