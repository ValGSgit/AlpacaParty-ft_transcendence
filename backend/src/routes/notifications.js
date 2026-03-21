/**
 * Notification Routes — /api/notifications
 */
import express from 'express';
import {
  listNotifications, markRead, markAllRead, deleteNotification,
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', listNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
