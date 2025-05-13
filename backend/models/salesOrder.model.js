import pool from '../db/db.js';
import ManufacturingProgress from './manufacturingProgress.model.js';
import ManufacturingStage from './manufacturingStage.model.js';
import FinishedProduct from './finishedProduct.model.js';

class SalesOrder {
  static async getAllSalesOrders() {
    const result = await pool.query(`
      SELECT so.*, 
        (SELECT json_agg(json_build_object(
            'item_id', items.item_id,
            'product_category', items.product_category,
            'product_id', items.product_id,
            'quantity', items.quantity,
            'unit_price', items.unit_price,
            'fulfilled_from_inventory', items.fulfilled_from_inventory,
            'product_name', p.product_name
        ))
         FROM sales.sales_order_items items
         LEFT JOIN products.product p ON items.product_id = p.product_id
         WHERE items.sales_order_id = so.sales_order_id) as order_items
      FROM sales.sales_order so
      ORDER BY so.created_at DESC
    `);
    return result.rows;
  }

  static async getSalesOrderById(salesOrderId, client = null) {
    try {
      const queryClient = client || pool;
      
      const result = await queryClient.query(`
        SELECT 
          so.*,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'product_category', soi.product_category,
                'product_id', soi.product_id,
                'quantity', soi.quantity,
                'unit_price', soi.unit_price,
                'fulfilled_from_inventory', soi.fulfilled_from_inventory,
                'product_name', p.product_name
              ))
              FROM sales.sales_order_items soi
              LEFT JOIN products.product p ON soi.product_id = p.product_id
              WHERE soi.sales_order_id = so.sales_order_id
            ),
            '[]'::json
          ) as order_items
        FROM sales.sales_order so
        WHERE so.sales_order_id = $1
      `, [salesOrderId]);

      console.log('getSalesOrderById result:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getSalesOrderById:', error);
      throw error;
    }
  }

  static async createSalesOrder(orderData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create sales order
      const orderResult = await client.query(`
        INSERT INTO sales.sales_order (order_number, order_date, customer_name, discount, gst, total_amount, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING sales_order_id
      `, [
        orderData.order_number,
        orderData.order_date,
        orderData.customer_name,
        orderData.discount || 0,
        orderData.gst || 18,
        orderData.total_amount,
        orderData.status || 'pending'
      ]);

      const salesOrderId = orderResult.rows[0].sales_order_id;

      // Create order items and handle inventory/manufacturing
      for (const item of orderData.items) {
        // Verify product exists before proceeding
        const productCheck = await client.query(`
          SELECT product_id FROM products.product WHERE product_id = $1
        `, [item.product_id]);

        if (productCheck.rows.length === 0) {
          throw new Error(`Product with ID ${item.product_id} does not exist`);
        }

        // Check finished product inventory
        const inventoryRows = await FinishedProduct.getProductInventory(item.product_id);
        let availableQty = 0;
        let finishedProductId = null;
        if (inventoryRows && inventoryRows.length > 0) {
          availableQty = inventoryRows[0].quantity_available;
          finishedProductId = inventoryRows[0].finished_product_id;
        }

        let toManufacture = 0;
        let toDeduct = 0;
        if (availableQty >= item.quantity) {
          // Enough inventory, deduct all
          toDeduct = item.quantity;
        } else if (availableQty > 0) {
          // Partial inventory, deduct what is available, manufacture the rest
          toDeduct = availableQty;
          toManufacture = item.quantity - availableQty;
        } else {
          // No inventory, manufacture all
          toManufacture = item.quantity;
        }

        // Deduct from inventory if possible
        if (toDeduct > 0 && finishedProductId) {
          await FinishedProduct.updateQuantity(finishedProductId, -toDeduct);
        }

        // Map product_category to valid component_type for manufacturing stages
        let componentType = (item.product_category || '').toLowerCase();
        if (!['motor', 'pump', 'combined'].includes(componentType)) {
          componentType = 'combined';
        }

        // Create order item for deducted quantity (from inventory)
        if (toDeduct > 0) {
          const orderItemResult = await client.query(`
            INSERT INTO sales.sales_order_items 
            (sales_order_id, product_category, product_id, quantity, unit_price, fulfilled_from_inventory)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING item_id
          `, [salesOrderId, item.product_category, item.product_id, toDeduct, item.unit_price, true]);
        }

        // Create order item and manufacturing progress for quantity to manufacture
        if (toManufacture > 0) {
          const orderItemResult = await client.query(`
            INSERT INTO sales.sales_order_items 
            (sales_order_id, product_category, product_id, quantity, unit_price, fulfilled_from_inventory)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING item_id
          `, [salesOrderId, item.product_category, item.product_id, toManufacture, item.unit_price, false]);
          const orderItemId = orderItemResult.rows[0].item_id;

          // Get stages for this product type
          const stagesResult = await client.query(`
            SELECT stage_id, component_type, stage_name, sequence
            FROM manufacturing.stages
            WHERE component_type = $1
            ORDER BY sequence
          `, [componentType]);

          if (stagesResult.rows.length === 0) {
            throw new Error(`No manufacturing stages found for product category: ${componentType}`);
          }

          // Create manufacturing progress with first stage
          await client.query(`
            INSERT INTO manufacturing.product_manufacturing 
            (sales_order_id, sales_order_item_id, product_id, current_stage_id, quantity_in_process, status)
            VALUES ($1, $2, $3, $4, $5, 'in_progress')
          `, [salesOrderId, orderItemId, item.product_id, stagesResult.rows[0].stage_id, toManufacture]);
        }
      }

      await client.query('COMMIT');
      return orderResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateSalesOrder(salesOrderId, updateData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        order_number,
        order_date,
        customer_name,
        discount,
        gst,
        total_amount,
        status,
        items
      } = updateData;

      // Update sales order
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (order_number !== undefined) {
        updateFields.push(`order_number = $${paramCount}`);
        values.push(order_number);
        paramCount++;
      }
      if (order_date !== undefined) {
        updateFields.push(`order_date = $${paramCount}`);
        values.push(order_date);
        paramCount++;
      }
      if (customer_name !== undefined) {
        updateFields.push(`customer_name = $${paramCount}`);
        values.push(customer_name);
        paramCount++;
      }
      if (discount !== undefined) {
        updateFields.push(`discount = $${paramCount}`);
        values.push(discount);
        paramCount++;
      }
      if (gst !== undefined) {
        updateFields.push(`gst = $${paramCount}`);
        values.push(gst);
        paramCount++;
      }
      if (total_amount !== undefined) {
        updateFields.push(`total_amount = $${paramCount}`);
        values.push(total_amount);
        paramCount++;
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (updateFields.length > 0) {
        values.push(salesOrderId);
        const updateQuery = `
          UPDATE sales.sales_order 
          SET ${updateFields.join(', ')}
          WHERE sales_order_id = $${paramCount}
          RETURNING *
        `;
        await client.query(updateQuery, values);
      }

      // Update items if provided
      if (items) {
        // Delete existing items
        await client.query(
          'DELETE FROM sales.sales_order_items WHERE sales_order_id = $1',
          [salesOrderId]
        );

        // Insert new items
        for (const item of items) {
          await client.query(
            `INSERT INTO sales.sales_order_items 
             (sales_order_id, product_category, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [salesOrderId, item.product_category, item.product_id, item.quantity, item.unit_price]
          );
        }
      }

      // Get the complete updated order
      const completeOrder = await this.getSalesOrderById(salesOrderId);

      if (!completeOrder) {
        throw new Error('Sales order not found');
      }

      await client.query('COMMIT');
      return completeOrder;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteSalesOrder(salesOrderId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        'DELETE FROM sales.sales_order WHERE sales_order_id = $1 RETURNING *',
        [salesOrderId]
      );

      if (result.rows.length === 0) {
        throw new Error('Sales order not found');
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

  static async updateStatus(id, status) {
    console.log("code reach here")
    const result = await pool.query(
      `UPDATE sales.sales_order 
       SET status = $1
       WHERE sales_order_id = $2 
       RETURNING *`,
      [status, id]
    );
    console.log("result", result.rows[0])
    return result.rows[0];
  }

  static async getNextOrderNumber() {
    const year = new Date().getFullYear();
    const prefix = `SO-${year}-`;
    const result = await pool.query(
      `SELECT order_number FROM sales.sales_order WHERE order_number LIKE $1 ORDER BY order_number DESC LIMIT 1`,
      [`${prefix}%`]
    );
    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastOrderNumber = result.rows[0].order_number;
      const match = lastOrderNumber.match(/SO-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }
}

export default SalesOrder; 