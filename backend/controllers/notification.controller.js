import Notification from '../models/notification.model.js';
import { validateNotificationFilters } from '../utils/validators.js';

class NotificationController {
  static async getNotifications(req, res) {
    try {
      const userId = req.user.user_id;
      const { module, status, priority, page = 1, limit = 20 } = req.query;

      // Get notification stats
      const stats = await Notification.getNotificationStats(userId);

      // Build query conditions
      const conditions = ['user_id = $1'];
      const params = [userId];
      let paramCount = 1;

      if (module) {
        paramCount++;
        conditions.push(`module = $${paramCount}`);
        params.push(module);
      }

      if (status) {
        paramCount++;
        conditions.push(`status = $${paramCount}`);
        params.push(status);
      }

      if (priority) {
        paramCount++;
        conditions.push(`priority = $${paramCount}`);
        params.push(priority);
      }

      // Calculate pagination
      const offset = (page - 1) * limit;
      paramCount++;
      params.push(limit);
      paramCount++;
      params.push(offset);

      // Get paginated notifications
      const notifications = await Notification.getNotificationsByUserId(
        conditions.join(' AND '),
        params,
        limit,
        offset
      );

      res.json({
        success: true,
        data: {
          notifications,
          stats,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(stats.total),
            totalPages: Math.ceil(stats.total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
        details: error.message
      });
    }
  }

  static async markAsRead(req, res) {
    try {
      const userId = req.user.user_id;
      const { notificationId } = req.params;

      console.log('Attempting to mark notification as read:', {
        notificationId: notificationId,
        userId: userId
      });

      // Check if notification exists and belongs to user
      const notification = await Notification.getNotificationById(notificationId);
      console.log('Retrieved notification:', notification);

      if (!notification || String(notification.user_id) !== String(userId)) {
        console.error('Notification not found or unauthorized:', { notification, userId });
        return res.status(404).json({
          success: false,
          message: 'Notification not found or unauthorized'
        });
      }

      const updatedNotification = await Notification.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: updatedNotification
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking notification as read',
        error: error.message
      });
    }
  }

  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.user_id;
      const { module, type } = req.query;

      const notifications = await Notification.markAllAsRead(userId, { module, type });

      res.json({
        success: true,
        message: 'Notifications marked as read',
        data: {
          count: notifications.length
        }
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking all notifications as read',
        error: error.message
      });
    }
  }

  static async deleteNotification(req, res) {
    try {
      const userId = req.user.user_id;
      const { notificationId } = req.params;

      // Check if notification exists and belongs to user
      const notification = await Notification.getNotificationById(notificationId);
      if (!notification || notification.user_id !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or unauthorized'
        });
      }

      const deletedNotification = await Notification.deleteNotification(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification deleted successfully',
        data: deletedNotification
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting notification',
        error: error.message
      });
    }
  }

  static async getNotificationStats(req, res) {
    try {
      const userId = req.user.user_id;
      const stats = await Notification.getNotificationStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting notification stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting notification statistics',
        error: error.message
      });
    }
  }

  static async createGlobalNotification(req, res) {
    try {
      const { title, message, type, module, priority, target_type, target_id } = req.body;

      // Validate required fields
      if (!title || !message || !type || !module || !target_type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Only admin can create global notifications
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can create global notifications'
        });
      }

      const notifications = await Notification.createNotification({
        title,
        message,
        type,
        module,
        priority: priority || 'normal',
        target_type,
        target_id,
        reference_type: 'global',
        link: req.body.link
      });

      res.status(201).json({
        success: true,
        message: 'Global notification created successfully',
        data: notifications
      });
    } catch (error) {
      console.error('Error creating global notification:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating global notification',
        error: error.message
      });
    }
  }

  static async checkStockLevels(req, res) {
    try {
      await Notification.checkAndCreateLowStockNotifications();
      
      res.json({
        success: true,
        message: 'Stock levels checked and notifications created if needed'
      });
    } catch (error) {
      console.error('Error checking stock levels:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking stock levels',
        error: error.message
      });
    }
  }
}

export default NotificationController; 