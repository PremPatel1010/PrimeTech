import pool from '../db/db.js';
import FinishedProduct from './finishedProduct.model.js';

class ManufacturingProgress {
  static async getProgressByOrderId(orderId) {
    const result = await pool.query(`
      SELECT 
        mp.*,
        s.stage_name,
        s.sequence,
        s.component_type,
        soi.quantity as order_quantity,
        soi.product_category,
        so.order_number,
        so.customer_name
      FROM manufacturing.product_manufacturing mp
      JOIN manufacturing.stages s ON mp.current_stage_id = s.stage_id
      JOIN sales.sales_order_items soi ON mp.sales_order_item_id = soi.item_id
      JOIN sales.sales_order so ON mp.sales_order_id = so.sales_order_id
      WHERE mp.sales_order_id = $1
      ORDER BY s.sequence ASC
    `, [orderId]);
    return result.rows;
  }

  static async getStagesSummary(orderId) {
    const result = await pool.query(`
      WITH stage_summary AS (
        SELECT 
          s.stage_id,
          s.stage_name,
          s.sequence,
          s.component_type,
          COUNT(mp.tracking_id) as items_in_stage,
          SUM(mp.quantity_in_process) as total_quantity
        FROM manufacturing.stages s
        LEFT JOIN manufacturing.product_manufacturing mp ON s.stage_id = mp.current_stage_id
        LEFT JOIN sales.sales_order_items soi ON mp.sales_order_item_id = soi.item_id
        WHERE mp.sales_order_id = $1
        GROUP BY s.stage_id, s.stage_name, s.sequence, s.component_type
      )
      SELECT 
        stage_id,
        stage_name,
        sequence,
        component_type,
        items_in_stage,
        total_quantity,
        (SELECT SUM(quantity) FROM sales.sales_order_items WHERE sales_order_id = $1) as total_order_quantity
      FROM stage_summary
      ORDER BY sequence ASC
    `, [orderId]);
    return result.rows;
  }

  static async createManufacturingProgress(orderId, orderItemId, productId, stageId, quantity) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // First verify if the product exists
      const productCheck = await client.query(`
        SELECT product_id FROM products.product WHERE product_id = $1
      `, [productId]);

      if (productCheck.rows.length === 0) {
        throw new Error(`Product with ID ${productId} does not exist`);
      }

      // Create initial manufacturing progress
      const result = await client.query(`
        INSERT INTO manufacturing.product_manufacturing 
        (sales_order_id, sales_order_item_id, product_id, current_stage_id, quantity_in_process, status)
        VALUES ($1, $2, $3, $4, $5, 'in_progress')
        RETURNING *
      `, [orderId, orderItemId, productId, stageId, quantity]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateManufacturingStage(orderId, orderItemId, newStageId, quantity) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update the manufacturing progress
      const result = await client.query(`
        UPDATE manufacturing.product_manufacturing
        SET 
          current_stage_id = $1,
          quantity_in_process = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE sales_order_id = $3 AND sales_order_item_id = $4
        RETURNING *
      `, [newStageId, quantity, orderId, orderItemId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async completeManufacturing(orderId, orderItemId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the manufacturing progress details
      const progressResult = await client.query(`
        SELECT 
          mp.*,
          soi.quantity,
          soi.product_id,
          s.sequence,
          (SELECT MAX(sequence) FROM manufacturing.stages WHERE component_type = 
            (SELECT component_type FROM manufacturing.stages WHERE stage_id = mp.current_stage_id)
          ) as max_sequence
        FROM manufacturing.product_manufacturing mp
        JOIN sales.sales_order_items soi ON mp.sales_order_item_id = soi.item_id
        JOIN manufacturing.stages s ON mp.current_stage_id = s.stage_id
        WHERE mp.sales_order_id = $1 AND mp.sales_order_item_id = $2
      `, [orderId, orderItemId]);

      const progress = progressResult.rows[0];
      
      if (!progress) {
        throw new Error('Manufacturing progress not found');
      }

      // Check if this is the final stage
      if (progress.sequence !== progress.max_sequence) {
        throw new Error('Cannot complete manufacturing: not in final stage');
      }

      // Mark manufacturing as completed
      const result = await client.query(`
        UPDATE manufacturing.product_manufacturing
        SET 
          status = 'completed',
          updated_at = CURRENT_TIMESTAMP
        WHERE sales_order_id = $1 AND sales_order_item_id = $2
        RETURNING *
      `, [orderId, orderItemId]);

      // Add to finished products inventory
      const finishedProductData = {
        product_id: progress.product_id,
        quantity_available: progress.quantity,
        status: 'available',
        storage_location: 'Default Storage' // You might want to make this configurable
      };

      // Check if product already exists in inventory
      const existingInventory = await client.query(`
        SELECT finished_product_id, quantity_available 
        FROM inventory.finished_products 
        WHERE product_id = $1
      `, [progress.product_id]);

      if (existingInventory.rows.length > 0) {
        // Update existing inventory
        await client.query(`
          UPDATE inventory.finished_products 
          SET quantity_available = quantity_available + $1
          WHERE product_id = $2
        `, [progress.quantity, progress.product_id]);
      } else {
        // Create new inventory entry
        await client.query(`
          INSERT INTO inventory.finished_products 
          (product_id, quantity_available, status, storage_location)
          VALUES ($1, $2, $3, $4)
        `, [
          progress.product_id,
          progress.quantity,
          'available',
          'Default Storage'
        ]);
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getCurrentStage(orderId, orderItemId) {
    const result = await pool.query(`
      SELECT 
        mp.*,
        s.stage_name,
        s.sequence,
        s.component_type,
        soi.quantity as order_quantity
      FROM manufacturing.product_manufacturing mp
      JOIN manufacturing.stages s ON mp.current_stage_id = s.stage_id
      JOIN sales.sales_order_items soi ON mp.sales_order_item_id = soi.item_id
      WHERE mp.sales_order_id = $1 AND mp.sales_order_item_id = $2
      ORDER BY mp.updated_at DESC
      LIMIT 1
    `, [orderId, orderItemId]);
    return result.rows[0];
  }

  // Get all manufacturing batches
  static async getAllBatches() {
    const result = await pool.query(`
      SELECT * FROM manufacturing.product_manufacturing
      ORDER BY updated_at DESC
    `);
    return result.rows;
  }

  // Create a new manufacturing batch
  static async createBatch(batchData) {
    // Destructure all possible fields
    const {
      batch_number,
      product_name,
      stage_completion_dates,
      progress,
      estimated_completion_date,
      start_date,
      linked_sales_order_id,
      sales_order_id,
      sales_order_item_id,
      product_id,
      current_stage_id,
      quantity_in_process,
      status
    } = batchData;

    // Build dynamic columns and values for optional sales_order_id/item_id
    const columns = [
      'batch_number', 'product_name', 'stage_completion_dates', 'progress', 'estimated_completion_date', 'start_date', 'linked_sales_order_id',
      'product_id', 'current_stage_id', 'quantity_in_process', 'status'
    ];
    const values = [
      batch_number, product_name, stage_completion_dates, progress, estimated_completion_date, start_date, linked_sales_order_id,
      product_id, current_stage_id, quantity_in_process, status || 'in_progress'
    ];
    if (sales_order_id) {
      columns.push('sales_order_id');
      values.push(sales_order_id);
    }
    if (sales_order_item_id) {
      columns.push('sales_order_item_id');
      values.push(sales_order_item_id);
    }
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO manufacturing.product_manufacturing (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Update batch stage and progress
  static async updateBatchStage(trackingId, updateData) {
    let { current_stage_id, progress, stage_completion_dates, status } = updateData;
    // If the stage is completed (progress 100 or status completed), set status to 'completed'
    if ((progress === 100 || status === 'completed') && status !== 'completed') {
      status = 'completed';
    }
    const result = await pool.query(`
      UPDATE manufacturing.product_manufacturing
      SET current_stage_id = COALESCE($1, current_stage_id),
          progress = COALESCE($2, progress),
          stage_completion_dates = COALESCE($3, stage_completion_dates),
          status = COALESCE($4, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE tracking_id = $5
      RETURNING *
    `, [current_stage_id, progress, stage_completion_dates, status, trackingId]);
    return result.rows[0];
  }

  // Edit a manufacturing batch
  static async editBatch(trackingId, update) {
    // Only allow valid columns to be updated
    const validColumns = [
      'batch_number', 'product_name', 'stage_completion_dates', 'progress', 'estimated_completion_date', 'start_date', 'linked_sales_order_id',
      'product_id', 'current_stage_id', 'quantity_in_process', 'status', 'sales_order_id', 'sales_order_item_id'
    ];
    const keys = Object.keys(update).filter(k => validColumns.includes(k));
    if (keys.length === 0) throw new Error('No valid fields to update');
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = keys.map(k => update[k]);
    values.push(trackingId);
    const result = await pool.query(
      `UPDATE manufacturing.product_manufacturing SET ${setClause} WHERE tracking_id = $${values.length} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  // Delete a manufacturing batch
  static async deleteBatch(trackingId) {
    await pool.query(
      'DELETE FROM manufacturing.product_manufacturing WHERE tracking_id = $1',
      [trackingId]
    );
  }
}

export default ManufacturingProgress; 