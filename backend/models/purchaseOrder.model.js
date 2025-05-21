import pool from '../db/db.js';
import RawMaterial from './rawMaterial.model.js';

const STATUS_FLOW = [
  'ordered',
  'arrived',
  'grn_verified',
  'qc_in_progress',
  'returned_to_vendor',
  'in_store',
  'completed'
];

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
              'unit', poi.unit,
              'unit_price', poi.unit_price,
              'total_price', poi.total_price
            )
          ) FILTER (WHERE poi.item_id IS NOT NULL), '[]') as materials
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
    const poRes = await pool.query(
      `SELECT po.*, s.supplier_name FROM purchase.purchase_order po LEFT JOIN purchase.suppliers s ON po.supplier_id = s.supplier_id WHERE po.purchase_order_id = $1`,
      [poId]
    );
    const po = poRes.rows[0];
    if (!po) return null;
    const itemsRes = await pool.query(
      `SELECT i.*, rm.material_name FROM purchase.purchase_order_items i LEFT JOIN inventory.raw_materials rm ON i.material_id = rm.material_id WHERE i.purchase_order_id = $1`,
      [poId]
    );
    const grnsRes = await pool.query(
      `SELECT * FROM purchase.grns WHERE purchase_order_id = $1 ORDER BY grn_date`,
      [poId]
    );
    const qcRes = await pool.query(
      `SELECT q.*, rm.material_name FROM purchase.qc_reports q LEFT JOIN inventory.raw_materials rm ON q.material_id = rm.material_id WHERE q.grn_id IN (SELECT grn_id FROM purchase.grns WHERE purchase_order_id = $1)`,
      [poId]
    );
    const logsRes = await pool.query(
      `SELECT l.*, u.username as changed_by_name FROM purchase.purchase_order_status_logs l LEFT JOIN auth.users u ON l.created_by = u.user_id WHERE l.purchase_order_id = $1 ORDER BY l.created_at`,
      [poId]
    );
    return {
      ...po,
      materials: itemsRes.rows,
      grns: grnsRes.rows,
      qc_reports: qcRes.rows,
      status_logs: logsRes.rows
    };
  }

  // Create a new purchase order
  static async createPurchaseOrder({ order_date, supplier_id, supplier_name, status, discount, gst, materials }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Handle supplier
      let sid = supplier_id;
      if (!sid && supplier_name) {
        const supplier = await this.getOrCreateSupplier({ supplier_name });
        sid = supplier.supplier_id;
      }

      if (!sid) {
        throw new Error('Supplier ID or name is required');
      }

      // Generate next order number
      const order_number = await this.getNextOrderNumber();

      // Calculate total amount from materials
      const total_amount = materials.reduce((sum, m) => sum + (m.quantity * m.unit_price), 0);

      // Create purchase order
      const poRes = await client.query(
        `INSERT INTO purchase.purchase_order 
        (order_number, order_date, supplier_id, status, discount, gst, total_amount)
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *`,
        [order_number, order_date, sid, status || 'ordered', discount || 0, gst || 18, total_amount]
      );

      const po = poRes.rows[0];

      // Validate materials
      if (!materials || !Array.isArray(materials) || materials.length === 0) {
        throw new Error('At least one material is required');
      }

      // Insert materials
      for (const m of materials) {
        if (!m.material_id || !m.quantity || !m.unit_price) {
          throw new Error('Each material must have material_id, quantity, and unit_price');
        }

        await client.query(
          `INSERT INTO purchase.purchase_order_items 
          (purchase_order_id, material_id, quantity, unit, unit_price)
          VALUES ($1, $2, $3, $4, $5)`,
          [po.purchase_order_id, m.material_id, m.quantity, m.unit || 'pcs', m.unit_price]
        );
      }

      // Log initial status
      await client.query(
        `INSERT INTO purchase.purchase_order_status_logs 
        (purchase_order_id, status, notes) 
        VALUES ($1, $2, $3)`,
        [po.purchase_order_id, po.status, 'PO created']
      );

      await client.query('COMMIT');
      return await this.getPurchaseOrderById(po.purchase_order_id);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in createPurchaseOrder:', error);
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

      // Get the current status before updating
      const currentOrder = await client.query('SELECT status FROM purchase.purchase_order WHERE purchase_order_id = $1', [poId]);
      const prevStatus = currentOrder.rows[0]?.status;

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
      if (updateData.discount !== undefined) {
        setClauses.push(`discount = $${paramCount}`);
        values.push(updateData.discount);
        paramCount++;
      }
      if (updateData.gst !== undefined) {
        setClauses.push(`gst = $${paramCount}`);
        values.push(updateData.gst);
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
          (purchase_order_id, material_id, quantity, unit, unit_price)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;

        for (const item of updateData.items) {
          const itemValues = [
            poId,
            item.material_id,
            item.quantity,
            item.unit || 'pcs',
            item.unit_price
          ];
          await client.query(itemQuery, itemValues);
        }
      }

      // If status changed to 'arrived', add materials to inventory
      if (updateData.status === 'arrived' && prevStatus !== 'arrived') {
        // Get all materials for this purchase order
        const materialsRes = await client.query(
          `SELECT material_id, quantity FROM purchase.purchase_order_items WHERE purchase_order_id = $1`,
          [poId]
        );
        for (const mat of materialsRes.rows) {
          // Get current stock
          const material = await client.query(
            `SELECT current_stock FROM inventory.raw_materials WHERE material_id = $1`,
            [mat.material_id]
          );
          const currentStock = material.rows[0]?.current_stock || 0;
          // Update stock
          await client.query(
            `UPDATE inventory.raw_materials SET current_stock = $1 WHERE material_id = $2`,
            [Number(currentStock) + Number(mat.quantity), mat.material_id]
          );
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

  static async getNextOrderNumber() {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    const result = await pool.query(
      `SELECT order_number FROM purchase.purchase_order WHERE order_number LIKE $1 ORDER BY order_number DESC LIMIT 1`,
      [`${prefix}%`]
    );
    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastOrderNumber = result.rows[0].order_number;
      const match = lastOrderNumber.match(/PO-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }

  // Create or get supplier by name
  static async getOrCreateSupplier({ supplier_name }) {
    const result = await pool.query(
      'INSERT INTO purchase.suppliers (supplier_name) VALUES ($1) ON CONFLICT (supplier_name) DO UPDATE SET supplier_name=EXCLUDED.supplier_name RETURNING *',
      [supplier_name]
    );
    return result.rows[0];
  }

  // Get PO status history
  static async getPOStatusHistory(poId) {
    const result = await pool.query(
      `SELECT l.*, u.username as changed_by_name FROM purchase.purchase_order_status_logs l LEFT JOIN auth.users u ON l.created_by = u.user_id WHERE l.purchase_order_id = $1 ORDER BY l.created_at`,
      [poId]
    );
    return result.rows;
  }

  // Get PO quantities summary
  static async getPOQuantitiesSummary(poId) {
    const result = await pool.query(
      `SELECT
        SUM(poi.quantity) as ordered_quantity,
        COALESCE(SUM(qc.accepted_quantity), 0) as accepted_quantity,
        COALESCE(SUM(qc.defective_quantity), 0) as defective_quantity,
        COALESCE(SUM(g.received_quantity), 0) as received_quantity,
        (SUM(poi.quantity) - COALESCE(SUM(qc.accepted_quantity), 0) - COALESCE(SUM(qc.defective_quantity), 0)) as pending_quantity
      FROM purchase.purchase_order_items poi
      LEFT JOIN purchase.grns g ON g.purchase_order_id = poi.purchase_order_id
      LEFT JOIN purchase.qc_reports qc ON qc.grn_id = g.grn_id AND qc.material_id = poi.material_id
      WHERE poi.purchase_order_id = $1`,
      [poId]
    );
    return result.rows[0];
  }

  // Create GRN (Goods Receipt Note)
  static async createGRN({ purchase_order_id, received_quantity, grn_date, matched_with_po, user_id }) {
    // Only allow if PO status is 'arrived'
    const poRes = await pool.query('SELECT status FROM purchase.purchase_order WHERE purchase_order_id = $1', [purchase_order_id]);
    if (!poRes.rows.length || poRes.rows[0].status !== 'arrived') throw new Error('PO not in ARRIVED stage');
    const grnRes = await pool.query(
      `INSERT INTO purchase.grns (purchase_order_id, received_quantity, grn_date, matched_with_po, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [purchase_order_id, received_quantity, grn_date, matched_with_po, user_id]
    );
    // Calculate total received so far
    const totalOrderedRes = await pool.query('SELECT SUM(quantity) as ordered FROM purchase.purchase_order_items WHERE purchase_order_id = $1', [purchase_order_id]);
    const totalOrdered = Number(totalOrderedRes.rows[0]?.ordered || 0);
    const totalReceivedRes = await pool.query('SELECT SUM(received_quantity) as received FROM purchase.grns WHERE purchase_order_id = $1', [purchase_order_id]);
    const totalReceived = Number(totalReceivedRes.rows[0]?.received || 0);
    const pending = totalOrdered - totalReceived;
    // If all received, move to grn_verified, else stay in arrived
    if (pending <= 0) {
      await PurchaseOrder.updateStatus(purchase_order_id, 'grn_verified', user_id, 'All items received, GRN verified');
    } else {
      // Optionally, send notification here about pending items
      // Do not change status, keep as 'arrived'
    }
    return {
      ...grnRes.rows[0],
      totalOrdered,
      totalReceived,
      pending
    };
  }

  // Create QC Report
  static async createQCReport({ grn_id, material_id, inspected_quantity, defective_quantity, accepted_quantity, remarks, user_id }) {
    // Validate quantities
    if (inspected_quantity !== defective_quantity + accepted_quantity) throw new Error('Inspected ≠ Defective + Accepted');
    const grnRes = await pool.query('SELECT purchase_order_id FROM purchase.grns WHERE grn_id = $1', [grn_id]);
    if (!grnRes.rows.length) throw new Error('GRN not found');
    const poId = grnRes.rows[0].purchase_order_id;
    await pool.query(
      `INSERT INTO purchase.qc_reports (grn_id, material_id, inspected_quantity, defective_quantity, accepted_quantity, remarks, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [grn_id, material_id, inspected_quantity, defective_quantity, accepted_quantity, remarks, user_id]
    );
    // If defective, mark PO as returned_to_vendor, else in_store
    if (defective_quantity > 0) {
      await PurchaseOrder.updateStatus(poId, 'returned_to_vendor', user_id, 'Defective found in QC');
    } else {
      await PurchaseOrder.updateStatus(poId, 'in_store', user_id, 'QC passed');
    }
    // Check if all materials are accepted for this PO
    const itemsRes = await pool.query('SELECT SUM(quantity) as ordered FROM purchase.purchase_order_items WHERE purchase_order_id = $1', [poId]);
    const acceptedRes = await pool.query('SELECT SUM(accepted_quantity) as accepted FROM purchase.qc_reports WHERE grn_id IN (SELECT grn_id FROM purchase.grns WHERE purchase_order_id = $1)', [poId]);
    if (Number(itemsRes.rows[0].ordered) === Number(acceptedRes.rows[0].accepted)) {
      await PurchaseOrder.updateStatus(poId, 'completed', user_id, 'All materials accepted');
    }
    return true;
  }

  // Update PO status with validation and logging
  static async updateStatus(poId, newStatus, userId, notes = null) {
    // Enforce valid transitions
    const poRes = await pool.query('SELECT status FROM purchase.purchase_order WHERE purchase_order_id = $1', [poId]);
    if (!poRes.rows.length) throw new Error('PO not found');
    const current = poRes.rows[0].status;
    const currentIdx = STATUS_FLOW.indexOf(current);
    const nextIdx = STATUS_FLOW.indexOf(newStatus);
    if (nextIdx !== currentIdx + 1 && !(current === 'qc_in_progress' && newStatus === 'returned_to_vendor')) {
      throw new Error('Invalid status transition');
    }
    await pool.query('UPDATE purchase.purchase_order SET status = $1, updated_at = NOW() WHERE purchase_order_id = $2', [newStatus, poId]);
    await pool.query('INSERT INTO purchase.purchase_order_status_logs (purchase_order_id, status, created_by, notes) VALUES ($1, $2, $3, $4)', [poId, newStatus, userId, notes]);
    return true;
  }

  static async getProgress(poId) {
    // Ordered, Received, QC Passed, Returned, Remaining
    const orderedRes = await pool.query('SELECT material_id, SUM(quantity) as ordered FROM purchase.purchase_order_items WHERE purchase_order_id = $1 GROUP BY material_id', [poId]);
    const receivedRes = await pool.query('SELECT material_id, SUM(received_quantity) as received FROM purchase.grns WHERE purchase_order_id = $1 GROUP BY material_id', [poId]);
    const qcRes = await pool.query('SELECT material_id, SUM(accepted_qty) as qc_passed, SUM(defective_qty) as returned FROM purchase.qc_reports WHERE grn_id IN (SELECT grn_id FROM purchase.grns WHERE purchase_order_id = $1) GROUP BY material_id', [poId]);
    const progress = {};
    for (const row of orderedRes.rows) {
      progress[row.material_id] = {
        ordered: Number(row.ordered),
        received: 0,
        qc_passed: 0,
        returned: 0
      };
    }
    for (const row of receivedRes.rows) {
      if (!progress[row.material_id]) progress[row.material_id] = {};
      progress[row.material_id].received = Number(row.received);
    }
    for (const row of qcRes.rows) {
      if (!progress[row.material_id]) progress[row.material_id] = {};
      progress[row.material_id].qc_passed = Number(row.qc_passed);
      progress[row.material_id].returned = Number(row.returned);
    }
    for (const matId in progress) {
      const p = progress[matId];
      p.remaining = (p.ordered || 0) - (p.qc_passed || 0) - (p.returned || 0);
    }
    return progress;
  }

  static async verifyGRN(grnId) {
    await pool.query('UPDATE purchase.grns SET verified = TRUE WHERE grn_id = $1', [grnId]);
    return true;
  }
}

export default PurchaseOrder; 