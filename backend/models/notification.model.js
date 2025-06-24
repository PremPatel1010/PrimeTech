import pool from '../db/db.js';

class Notification {
  static async createNotification(notificationData) {
    const {
      user_id,
      title,
      message,
      module,
      type,
      priority = 'normal',
      status = 'unread'
    } = notificationData;

    const query = `
      INSERT INTO auth.notifications 
      (user_id, title, message, module, type, priority, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [user_id, title, message, module, type, priority, status];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getUserNotifications(userId, filters = {}) {
    const {
      limit = 1000,
      offset = 0,
      module,
      type,
      status,
      priority,
      startDate,
      endDate
    } = filters;

    let query = `
      SELECT * FROM auth.notifications 
      WHERE user_id = $1
    `;
    const queryParams = [userId];
    let paramCount = 1;

    if (module) {
      paramCount++;
      query += ` AND module = $${paramCount}`;
      queryParams.push(module);
    }

    if (type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      queryParams.push(type);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    if (priority) {
      paramCount++;
      query += ` AND priority = $${paramCount}`;
      queryParams.push(priority);
    }

    if (startDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      queryParams.push(endDate);
    }

    query += ` ORDER BY 
      CASE 
        WHEN priority = 'high' THEN 1
        WHEN priority = 'normal' THEN 2
        WHEN priority = 'low' THEN 3
      END,
      created_at DESC 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM auth.notifications
      WHERE user_id = $1 AND status = 'unread'
    `;
    
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  static async markAsRead(notificationId, userId) {
    const query = `
      UPDATE auth.notifications 
      SET status = 'read'
      WHERE notification_id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [notificationId, userId]);
    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    const query = `
      UPDATE auth.notifications 
      SET status = 'read'
      WHERE user_id = $1 AND status = 'unread'
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async deleteNotification(notificationId, userId) {
    const query = `
      DELETE FROM auth.notifications 
      WHERE notification_id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [notificationId, userId]);
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

  // New helper methods for specific notification types
  static async createPurchaseOrderNotification(poId, poNumber, event, userId) {
    const notifications = {
      'created': {
        title: 'New Purchase Order Created',
        message: `Purchase Order ${poNumber} has been created.`,
        type: 'purchase_order',
        module: 'purchase',
        priority: 'normal'
      },
      'updated': {
        title: 'Purchase Order Updated',
        message: `Purchase Order ${poNumber} has been updated.`,
        type: 'purchase_order',
        module: 'purchase',
        priority: 'normal'
      },
      'approved': {
        title: 'Purchase Order Approved',
        message: `Purchase Order ${poNumber} has been approved.`,
        type: 'purchase_order',
        module: 'purchase',
        priority: 'high'
      },
      'rejected': {
        title: 'Purchase Order Rejected',
        message: `Purchase Order ${poNumber} has been rejected.`,
        type: 'purchase_order',
        module: 'purchase',
        priority: 'high'
      }
    };

    if (notifications[event]) {
      return await this.createNotification({
        ...notifications[event],
        reference_id: poId,
        reference_type: 'purchase_order',
        target_type: 'user',
        target_id: userId,
        link: `/purchase-orders/${poId}`
      });
    }
  }

  static async createGRNNotification(grnId, grnNumber, event, userId) {
    const notifications = {
      'created': {
        title: 'New GRN Created',
        message: `GRN ${grnNumber} has been created.`,
        type: 'grn',
        module: 'purchase',
        priority: 'normal'
      },
      'approved': {
        title: 'GRN Approved',
        message: `GRN ${grnNumber} has been approved.`,
        type: 'grn',
        module: 'purchase',
        priority: 'high'
      },
      'rejected': {
        title: 'GRN Rejected',
        message: `GRN ${grnNumber} has been rejected.`,
        type: 'grn',
        module: 'purchase',
        priority: 'high'
      }
    };

    if (notifications[event]) {
      return await this.createNotification({
        ...notifications[event],
        reference_id: grnId,
        reference_type: 'grn',
        target_type: 'user',
        target_id: userId,
        link: `/grns/${grnId}`
      });
    }
  }

  static async createQCNotification(qcId, materialName, event, userId) {
    const notifications = {
      'failed': {
        title: 'QC Failed',
        message: `Quality check failed for ${materialName}.`,
        type: 'qc',
        module: 'purchase',
        priority: 'high'
      },
      'passed': {
        title: 'QC Passed',
        message: `Quality check passed for ${materialName}.`,
        type: 'qc',
        module: 'purchase',
        priority: 'normal'
      }
    };

    if (notifications[event]) {
      return await this.createNotification({
        ...notifications[event],
        reference_id: qcId,
        reference_type: 'qc',
        target_type: 'user',
        target_id: userId,
        link: `/qc/${qcId}`
      });
    }
  }

  static async createManufacturingNotification(batchId, batchNumber, event, userId) {
    const notifications = {
      'started': {
        title: 'Manufacturing Batch Started',
        message: `Manufacturing batch ${batchNumber} has started.`,
        type: 'manufacturing',
        module: 'manufacturing',
        priority: 'normal'
      },
      'completed': {
        title: 'Manufacturing Batch Completed',
        message: `Manufacturing batch ${batchNumber} has been completed.`,
        type: 'manufacturing',
        module: 'manufacturing',
        priority: 'high'
      }
    };

    if (notifications[event]) {
      return await this.createNotification({
        ...notifications[event],
        reference_id: batchId,
        reference_type: 'manufacturing_batch',
        target_type: 'user',
        target_id: userId,
        link: `/manufacturing/batches/${batchId}`
      });
    }
  }

  static async createUserManagementNotification(userId, username, event) {
    const notifications = {
      'created': {
        title: 'New User Added',
        message: `New user ${username} has been added to the system.`,
        type: 'user_management',
        module: 'admin',
        priority: 'normal',
        target_type: 'role',
        target_id: 'admin'
      },
      'role_changed': {
        title: 'User Role Changed',
        message: `Role for user ${username} has been updated.`,
        type: 'user_management',
        module: 'admin',
        priority: 'high',
        target_type: 'role',
        target_id: 'admin'
      },
      'permissions_updated': {
        title: 'User Permissions Updated',
        message: `Permissions for user ${username} have been updated.`,
        type: 'user_management',
        module: 'admin',
        priority: 'high',
        target_type: 'role',
        target_id: 'admin'
      }
    };

    if (notifications[event]) {
      return await this.createNotification({
        ...notifications[event],
        reference_id: userId,
        reference_type: 'user',
        link: `/admin/users/${userId}`
      });
    }
  }

  // Helper method to prevent duplicate notifications
  static async checkDuplicateNotification(userId, type, referenceId, timeWindow = 300) { // 5 minutes default
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM auth.notifications 
       WHERE user_id = $1 
       AND type = $2 
       AND reference_id = $3 
       AND created_at > NOW() - INTERVAL '${timeWindow} seconds'`,
      [userId, type, referenceId]
    );
    
    return parseInt(result.rows[0].count) > 0;
  }

  static async getNotificationStats(userId) {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'unread' THEN 1 END) as unread,
        COUNT(CASE WHEN priority = 'high' AND status = 'unread' THEN 1 END) as high_priority_unread,
        COUNT(CASE WHEN module = 'purchase' AND status = 'unread' THEN 1 END) as purchase_unread,
        COUNT(CASE WHEN module = 'sales' AND status = 'unread' THEN 1 END) as sales_unread,
        COUNT(CASE WHEN module = 'manufacturing' AND status = 'unread' THEN 1 END) as manufacturing_unread,
        COUNT(CASE WHEN module = 'inventory' AND status = 'unread' THEN 1 END) as inventory_unread,
        COUNT(CASE WHEN module = 'admin' AND status = 'unread' THEN 1 END) as admin_unread,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
      FROM auth.notifications 
      WHERE user_id = $1
    `, [userId]);

    return stats.rows[0];
  }

  static async getNotificationById(notificationId) {
    const result = await pool.query(
      'SELECT * FROM auth.notifications WHERE notification_id = $1',
      [notificationId]
    );
    return result.rows[0];
  }

  static async getNotificationsByUserId(conditions, params, limit, offset) {
    const query = `
      SELECT 
        notification_id,
        user_id,
        title,
        message,
        module,
        type,
        priority,
        status,
        created_at
      FROM auth.notifications 
      WHERE ${conditions}
      ORDER BY 
        CASE 
          WHEN priority = 'high' AND status = 'unread' THEN 1
          WHEN status = 'unread' THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }
}

export default Notification; 