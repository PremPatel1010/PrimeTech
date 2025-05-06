import pool from '../db/db.js';

class Notification {
  static async createNotification(notificationData) {
    const { user_id, title, message, type, reference_id, reference_type } = notificationData;
    
    const result = await pool.query(
      `INSERT INTO auth.notifications 
       (user_id, title, message, type, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, title, message, type, reference_id, reference_type]
    );
    
    return result.rows[0];
  }

  static async getUserNotifications(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM auth.notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows;
  }

  static async getUnreadCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM auth.notifications 
       WHERE user_id = $1 AND status = 'unread'`,
      [userId]
    );
    
    return parseInt(result.rows[0].count);
  }

  static async markAsRead(notificationId, userId) {
    const result = await pool.query(
      `UPDATE auth.notifications 
       SET status = 'read', read_at = CURRENT_TIMESTAMP 
       WHERE notification_id = $1 AND user_id = $2 
       RETURNING *`,
      [notificationId, userId]
    );
    
    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    const result = await pool.query(
      `UPDATE auth.notifications 
       SET status = 'read', read_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND status = 'unread' 
       RETURNING *`,
      [userId]
    );
    
    return result.rows;
  }

  static async deleteNotification(notificationId, userId) {
    const result = await pool.query(
      `DELETE FROM auth.notifications 
       WHERE notification_id = $1 AND user_id = $2 
       RETURNING *`,
      [notificationId, userId]
    );
    
    return result.rows[0];
  }

  // Helper method to create notifications for specific events
  static async createOrderNotification(userId, orderId, orderNumber, event) {
    const notifications = {
      'created': {
        title: 'New Order Created',
        message: `Order ${orderNumber} has been created.`
      },
      'completed': {
        title: 'Order Completed',
        message: `Order ${orderNumber} has been completed.`
      },
      'cancelled': {
        title: 'Order Cancelled',
        message: `Order ${orderNumber} has been cancelled.`
      }
    };

    if (notifications[event]) {
      return await this.createNotification({
        user_id: userId,
        title: notifications[event].title,
        message: notifications[event].message,
        type: 'order',
        reference_id: orderId,
        reference_type: 'sales_order'
      });
    }
  }

  static async createManufacturingNotification(userId, manufacturingId, stageName, event) {
    const notifications = {
      'started': {
        title: 'Manufacturing Started',
        message: `Manufacturing process has started for stage: ${stageName}`
      },
      'completed': {
        title: 'Manufacturing Stage Completed',
        message: `Manufacturing stage ${stageName} has been completed.`
      }
    };

    if (notifications[event]) {
      return await this.createNotification({
        user_id: userId,
        title: notifications[event].title,
        message: notifications[event].message,
        type: 'manufacturing',
        reference_id: manufacturingId,
        reference_type: 'manufacturing_progress'
      });
    }
  }

  static async createInventoryNotification(userId, itemId, itemName, itemType, currentStock, minimumStock) {
    const notifications = {
      'raw_material': {
        title: 'Low Raw Material Alert',
        message: `Raw material "${itemName}" is running low. Current stock: ${currentStock} ${itemType}, Minimum required: ${minimumStock} ${itemType}`
      },
      'finished_product': {
        title: 'Low Finished Product Alert',
        message: `Finished product "${itemName}" is running low. Current stock: ${currentStock} units, Minimum required: ${minimumStock} units`
      }
    };

    if (notifications[itemType]) {
      return await this.createNotification({
        user_id: userId,
        title: notifications[itemType].title,
        message: notifications[itemType].message,
        type: 'inventory',
        reference_id: itemId,
        reference_type: itemType
      });
    }
  }

  static async checkAndCreateLowStockNotifications() {
    // Get all users with admin/manager role
    const users = await pool.query(
      `SELECT user_id FROM auth.users WHERE role IN ('admin', 'manager')`
    );

    // Check raw materials
    const lowRawMaterials = await pool.query(`
      SELECT 
        material_id,
        material_name,
        current_stock,
        minimum_stock,
        unit
      FROM inventory.raw_materials
      WHERE current_stock <= minimum_stock
    `);

    // Check finished products
    const lowFinishedProducts = await pool.query(`
      SELECT 
        fp.finished_product_id,
        p.product_name,
        fp.quantity_available as current_stock,
        fp.minimum_stock
      FROM inventory.finished_products fp
      JOIN products.product p ON fp.product_id = p.product_id
      WHERE fp.quantity_available <= fp.minimum_stock
    `);

    // Create notifications for each user
    for (const user of users.rows) {
      // Raw materials notifications
      for (const material of lowRawMaterials.rows) {
        await this.createInventoryNotification(
          user.user_id,
          material.material_id,
          material.material_name,
          'raw_material',
          material.current_stock,
          material.minimum_stock,
          material.unit
        );
      }

      // Finished products notifications
      for (const product of lowFinishedProducts.rows) {
        await this.createInventoryNotification(
          user.user_id,
          product.finished_product_id,
          product.product_name,
          'finished_product',
          product.current_stock,
          product.minimum_stock
        );
      }
    }
  }
}

export default Notification; 