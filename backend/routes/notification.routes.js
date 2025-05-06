import express from 'express';
import NotificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get user notifications
router.get('/', authenticate, NotificationController.getNotifications);

// Mark a notification as read
router.put('/:notificationId/read', authenticate, NotificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', authenticate, NotificationController.markAllAsRead);

// Delete a notification
router.delete('/:notificationId', authenticate, NotificationController.deleteNotification);

// Check stock levels and create notifications
router.post('/check-stock-levels', authenticate, NotificationController.checkStockLevels);

export default router; 