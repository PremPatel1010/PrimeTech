import express from 'express';
import NotificationController from '../controllers/notification.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get user notifications with filters
router.get('/', authenticate, NotificationController.getNotifications);

// Get notification statistics
router.get('/stats', authenticate, NotificationController.getNotificationStats);

// Mark a notification as read
router.put('/:notificationId/read', authenticate, NotificationController.markAsRead);

// Mark notifications as read (with optional filters)
router.put('/read-all', authenticate, NotificationController.markAllAsRead);

// Delete a notification
router.delete('/:notificationId', authenticate, NotificationController.deleteNotification);

// Create global notification (admin only)
router.post('/global', 
  authenticate, 
  authorize(['admin']), 
  NotificationController.createGlobalNotification
);

// Check stock levels and create notifications
router.post('/check-stock-levels', 
  authenticate, 
  authorize(['admin', 'manager']), 
  NotificationController.checkStockLevels
);

export default router; 