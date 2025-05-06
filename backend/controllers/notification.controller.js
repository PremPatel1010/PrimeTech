import Notification from '../models/notification.model.js';

class NotificationController {
  static async getNotifications(req, res) {
    try {
      const userId = req.user.user_id; // Assuming user info is attached by auth middleware
      const { limit = 50, offset = 0 } = req.query;

      const notifications = await Notification.getUserNotifications(userId, limit, offset);
      const unreadCount = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          notifications,
          unread_count: unreadCount
        }
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching notifications',
        error: error.message
      });
    }
  }

  static async markAsRead(req, res) {
    try {
      const userId = req.user.user_id;
      const { notificationId } = req.params;

      const notification = await Notification.markAsRead(notificationId, userId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification
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

      const notifications = await Notification.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
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

      const notification = await Notification.deleteNotification(notificationId, userId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully',
        data: notification
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