import pool from '../db/db.js';

class PurchaseOrder {
  // Get all purchase orders
  static async getAllPurchaseOrders() {
    try {
      const query = `
        SELECT 
          po.*,
          s.supplier_name,
          COALESCE(json_agg(
            json_build_object(
              'item_id', poi.item_id,
              'material_id', poi.material_id,
              'material_name', rm.material_name,
              'quantity', poi.quantity,
              'unit_price', poi.unit_price,
              'total_price', poi.total_price
            )
          ) FILTER (WHERE poi.item_id IS NOT NULL), '[]') as items
        FROM purchase.purchase_order po
        LEFT JOIN purchase.suppliers s ON po.supplier_id = s.supplier_id
        LEFT JOIN purchase.purchase_order_items poi ON po.purchase_order_id = poi.purchase_order_id
        LEFT JOIN inventory.raw_materials rm ON poi.material_id = rm.material_id
        GROUP BY po.purchase_order_id, s.supplier_name
        ORDER BY po.created_at DESC
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error in PurchaseOrder.getAllPurchaseOrders:', error);
      throw error;
    }
  }

  // Get a single purchase order by ID
  static async getPurchaseOrderById(poId) {
    try {
      const query = `
        SELECT 
          po.*,
          s.supplier_name,
          COALESCE(json_agg(
            json_build_object(
              'item_id', poi.item_id,
              'material_id', poi.material_id,
              'material_name', rm.material_name,
              'quantity', poi.quantity,
              'unit_price', poi.unit_price,
              'total_price', poi.total_price
            )
          ) FILTER (WHERE poi.item_id IS NOT NULL), '[]') as items
        FROM purchase.purchase_order po
        LEFT JOIN purchase.suppliers s ON po.supplier_id = s.supplier_id
        LEFT JOIN purchase.purchase_order_items poi ON po.purchase_order_id = poi.purchase_order_id
        LEFT JOIN inventory.raw_materials rm ON poi.material_id = rm.material_id
        WHERE po.purchase_order_id = $1
        GROUP BY po.purchase_order_id, s.supplier_name
      `;
      const result = await pool.query(query, [poId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in PurchaseOrder.getPurchaseOrderById:', error);
      throw error;
    }
  }

  // Create a new purchase order
  static async createPurchaseOrder({ 
    order_number, 
    order_date,
    supplier_id,
    status, 
    payment_details,
    items 
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert purchase order header
      const poQuery = `
        INSERT INTO purchase.purchase_order 
        (order_number, order_date, supplier_id, status, payment_details)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const poValues = [
        order_number, 
        order_date, 
        supplier_id,
        status, 
        payment_details
      ];
      
      const poResult = await client.query(poQuery, poValues);
      const purchaseOrder = poResult.rows[0];

      // Insert purchase order items
      if (items && items.length > 0) {
        const itemQuery = `
          INSERT INTO purchase.purchase_order_items 
          (purchase_order_id, material_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;

        for (const item of items) {
          const itemValues = [
            purchaseOrder.purchase_order_id,
            item.material_id,
            item.quantity,
            item.unit_price
          ];
          await client.query(itemQuery, itemValues);
        }
      }

      await client.query('COMMIT');
      return purchaseOrder;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in PurchaseOrder.createPurchaseOrder:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update a purchase order
  static async updatePurchaseOrder(poId, updateData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update purchase order header
      const setClauses = [];
      const values = [];
      let paramCount = 1;

      if (updateData.order_number !== undefined) {
        setClauses.push(`order_number = $${paramCount}`);
        values.push(updateData.order_number);
        paramCount++;
      }
      if (updateData.order_date !== undefined) {
        setClauses.push(`order_date = $${paramCount}`);
        values.push(updateData.order_date);
        paramCount++;
      }
      if (updateData.supplier_id !== undefined) {
        setClauses.push(`supplier_id = $${paramCount}`);
        values.push(updateData.supplier_id);
        paramCount++;
      }
      if (updateData.status !== undefined) {
        setClauses.push(`status = $${paramCount}`);
        values.push(updateData.status);
        paramCount++;
      }
      if (updateData.payment_details !== undefined) {
        setClauses.push(`payment_details = $${paramCount}`);
        values.push(updateData.payment_details);
        paramCount++;
      }

      if (setClauses.length > 0) {
        values.push(poId);
        const poQuery = `
          UPDATE purchase.purchase_order
          SET ${setClauses.join(', ')}
          WHERE purchase_order_id = $${paramCount}
          RETURNING *
        `;
        await client.query(poQuery, values);
      }

      // Update purchase order items if provided
      if (updateData.items) {
        // Delete existing items
        await client.query('DELETE FROM purchase.purchase_order_items WHERE purchase_order_id = $1', [poId]);

        // Insert new items
        const itemQuery = `
          INSERT INTO purchase.purchase_order_items 
          (purchase_order_id, material_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;

        for (const item of updateData.items) {
          const itemValues = [
            poId,
            item.material_id,
            item.quantity,
            item.unit_price
          ];
          await client.query(itemQuery, itemValues);
        }
      }

      await client.query('COMMIT');
      return await this.getPurchaseOrderById(poId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in PurchaseOrder.updatePurchaseOrder:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete a purchase order
  static async deletePurchaseOrder(poId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete purchase order items first (will be handled by CASCADE)
      const query = 'DELETE FROM purchase.purchase_order WHERE purchase_order_id = $1 RETURNING *';
      const result = await client.query(query, [poId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in PurchaseOrder.deletePurchaseOrder:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default PurchaseOrder; 