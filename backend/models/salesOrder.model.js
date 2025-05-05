import pool from '../db/db.js';

class SalesOrder {
  static async getAllSalesOrders() {
    const result = await pool.query(`
      SELECT so.*, 
        (SELECT json_agg(items.*) 
         FROM sales.sales_order_items items 
         WHERE items.sales_order_id = so.sales_order_id) as order_items
      FROM sales.sales_order so
      ORDER BY so.created_at DESC
    `);
    return result.rows;
  }

  static async getSalesOrderById(salesOrderId) {
    const result = await pool.query(`
      SELECT so.*, 
        (SELECT json_agg(items.*) 
         FROM sales.sales_order_items items 
         WHERE items.sales_order_id = so.sales_order_id) as order_items
      FROM sales.sales_order so
      WHERE so.sales_order_id = $1
    `, [salesOrderId]);
    return result.rows[0];
  }

  static async createSalesOrder(salesOrderData) {
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
        items
      } = salesOrderData;

      // Insert sales order
      const orderResult = await client.query(
        `INSERT INTO sales.sales_order 
         (order_number, order_date, customer_name, discount, gst, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [order_number, order_date, customer_name, discount, gst, total_amount]
      );

      const salesOrderId = orderResult.rows[0].sales_order_id;

      // Insert order items
      for (const item of items) {
        await client.query(
          `INSERT INTO sales.sales_order_items 
           (sales_order_id, product_category, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [salesOrderId, item.product_category, item.product_id, item.quantity, item.unit_price]
        );
      }

      // Get the complete order with items
      const completeOrder = await this.getSalesOrderById(salesOrderId);

      await client.query('COMMIT');
      return completeOrder;
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
}

export default SalesOrder; 