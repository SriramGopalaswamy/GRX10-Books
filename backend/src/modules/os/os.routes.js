import express from 'express';
import { Op } from 'sequelize';
import { 
    OSGoal, 
    OSGoalComment,
    OSMemo,
    OSMemoAttachment,
    OSMemoComment,
    OSNotification
} from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ============================================
// GOALS
// ============================================

// Get all goals
router.get('/goals', async (req, res) => {
    try {
        const { ownerId, status, type } = req.query;
        const where = {};
        if (ownerId) where.ownerId = ownerId;
        if (status) where.status = status;
        if (type) where.type = type;

        const goals = await OSGoal.findAll({
            where,
            include: [{ model: OSGoalComment, as: 'comments' }],
            order: [['timeline', 'DESC']]
        });
        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get goal by ID
router.get('/goals/:id', async (req, res) => {
    try {
        const goal = await OSGoal.findByPk(req.params.id, {
            include: [{ model: OSGoalComment, as: 'comments' }]
        });
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        res.json(goal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create goal
router.post('/goals', async (req, res) => {
    try {
        const {
            ownerId,
            title,
            type,
            metric,
            baseline,
            target,
            current,
            timeline,
            status,
            score,
            managerFeedback
        } = req.body;

        const goal = await OSGoal.create({
            id: uuidv4(),
            ownerId,
            title,
            type,
            metric,
            baseline,
            target,
            current: current || 0,
            timeline,
            status: status || 'On Track',
            score,
            managerFeedback
        });

        res.status(201).json(goal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update goal
router.put('/goals/:id', async (req, res) => {
    try {
        const goal = await OSGoal.findByPk(req.params.id);
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        await goal.update(req.body);
        res.json(goal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete goal
router.delete('/goals/:id', async (req, res) => {
    try {
        const goal = await OSGoal.findByPk(req.params.id);
        if (!goal) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        await OSGoalComment.destroy({ where: { goalId: goal.id } });
        await goal.destroy();
        res.json({ message: 'Goal deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// GOAL COMMENTS
// ============================================

// Get comments for a goal
router.get('/goals/:goalId/comments', async (req, res) => {
    try {
        const comments = await OSGoalComment.findAll({
            where: { goalId: req.params.goalId },
            order: [['timestamp', 'ASC']]
        });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add comment to goal
router.post('/goals/:goalId/comments', async (req, res) => {
    try {
        const { authorId, text, timestamp } = req.body;

        const comment = await OSGoalComment.create({
            id: uuidv4(),
            goalId: req.params.goalId,
            authorId,
            text,
            timestamp: timestamp || new Date().toISOString()
        });

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// MEMOS
// ============================================

// Get all memos
router.get('/memos', async (req, res) => {
    try {
        const { fromId, toId, status } = req.query;
        const where = {};
        if (fromId) where.fromId = fromId;
        if (toId) where.toId = toId;
        if (status) where.status = status;

        const memos = await OSMemo.findAll({
            where,
            include: [
                { model: OSMemoAttachment, as: 'attachments' },
                { model: OSMemoComment, as: 'comments' }
            ],
            order: [['date', 'DESC']]
        });
        res.json(memos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get memo by ID
router.get('/memos/:id', async (req, res) => {
    try {
        const memo = await OSMemo.findByPk(req.params.id, {
            include: [
                { model: OSMemoAttachment, as: 'attachments' },
                { model: OSMemoComment, as: 'comments' }
            ]
        });
        if (!memo) {
            return res.status(404).json({ error: 'Memo not found' });
        }
        res.json(memo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create memo
router.post('/memos', async (req, res) => {
    try {
        const { fromId, toId, date, subject, status, summary, attachments } = req.body;

        const memo = await OSMemo.create({
            id: uuidv4(),
            fromId,
            toId,
            date: date || new Date().toISOString().split('T')[0],
            subject,
            status: status || 'Draft',
            summary
        });

        // Create attachments if provided
        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                await OSMemoAttachment.create({
                    id: uuidv4(),
                    memoId: memo.id,
                    name: att.name,
                    size: att.size,
                    type: att.type
                });
            }
        }

        const createdMemo = await OSMemo.findByPk(memo.id, {
            include: [
                { model: OSMemoAttachment, as: 'attachments' },
                { model: OSMemoComment, as: 'comments' }
            ]
        });

        res.status(201).json(createdMemo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update memo
router.put('/memos/:id', async (req, res) => {
    try {
        const memo = await OSMemo.findByPk(req.params.id);
        if (!memo) {
            return res.status(404).json({ error: 'Memo not found' });
        }

        await memo.update(req.body);
        res.json(memo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete memo
router.delete('/memos/:id', async (req, res) => {
    try {
        const memo = await OSMemo.findByPk(req.params.id);
        if (!memo) {
            return res.status(404).json({ error: 'Memo not found' });
        }

        await OSMemoComment.destroy({ where: { memoId: memo.id } });
        await OSMemoAttachment.destroy({ where: { memoId: memo.id } });
        await memo.destroy();
        res.json({ message: 'Memo deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// MEMO COMMENTS
// ============================================

// Get comments for a memo
router.get('/memos/:memoId/comments', async (req, res) => {
    try {
        const comments = await OSMemoComment.findAll({
            where: { memoId: req.params.memoId },
            order: [['timestamp', 'ASC']]
        });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add comment to memo
router.post('/memos/:memoId/comments', async (req, res) => {
    try {
        const { authorId, text, timestamp } = req.body;

        const comment = await OSMemoComment.create({
            id: uuidv4(),
            memoId: req.params.memoId,
            authorId,
            text,
            timestamp: timestamp || new Date().toISOString()
        });

        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// MEMO ATTACHMENTS
// ============================================

// Add attachment to memo
router.post('/memos/:memoId/attachments', async (req, res) => {
    try {
        const { name, size, type } = req.body;

        const attachment = await OSMemoAttachment.create({
            id: uuidv4(),
            memoId: req.params.memoId,
            name,
            size,
            type
        });

        res.status(201).json(attachment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete attachment
router.delete('/memos/:memoId/attachments/:id', async (req, res) => {
    try {
        const attachment = await OSMemoAttachment.findByPk(req.params.id);
        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        await attachment.destroy();
        res.json({ message: 'Attachment deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// NOTIFICATIONS
// ============================================

// Get notifications for user
router.get('/notifications/:userId', async (req, res) => {
    try {
        const { read } = req.query;
        const where = { userId: req.params.userId };
        if (read !== undefined) where.read = read === 'true';

        const notifications = await OSNotification.findAll({
            where,
            order: [['timestamp', 'DESC']]
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create notification
router.post('/notifications', async (req, res) => {
    try {
        const { userId, title, message, type, actionLink } = req.body;

        const notification = await OSNotification.create({
            id: uuidv4(),
            userId,
            title,
            message,
            type: type || 'info',
            read: false,
            timestamp: new Date().toISOString(),
            actionLink
        });

        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const notification = await OSNotification.findByPk(req.params.id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await notification.update({ read: true });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark all notifications as read for user
router.put('/notifications/user/:userId/read-all', async (req, res) => {
    try {
        await OSNotification.update(
            { read: true },
            { where: { userId: req.params.userId, read: false } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

