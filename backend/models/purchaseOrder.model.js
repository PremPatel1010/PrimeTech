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

// Add status transition validation
const VALID_STATUS_TRANSITIONS = {
  'ordered': ['arrived'],
  'arrived': ['grn_verified', 'returned_to_vendor'],
  'grn_verified': ['qc_in_progress', 'returned_to_vendor'],
  'qc_in_progress': ['returned_to_vendor', 'in_store'],
  'returned_to_vendor': ['in_store'],
  'in_store': ['completed'],
  'completed': []
};

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
      const orders = result.rows;
      // Fetch GRNs for each order
      for (const order of orders) {
        const grnsRes = await pool.query(
          `SELECT * FROM purchase.grns WHERE purchase_order_id = $1 ORDER BY grn_date`,
          [order.purchase_order_id]
        );
        // Add status to each GRN
        const grns = grnsRes.rows.map((grn, idx, arr) => {
          let grnStatus = 'arrived';
          if (grn.verified) grnStatus = 'grn_verified';
          // If this is the latest GRN and PO is in QC or later, mark as qc_in_progress
          if (
            idx === arr.length - 1 &&
            ['qc_in_progress', 'returned_to_vendor', 'in_store', 'completed'].includes(order.status)
          ) {
            grnStatus = order.status === 'qc_in_progress' ? 'qc_in_progress' : grnStatus;
            if (order.status === 'returned_to_vendor') grnStatus = 'returned_to_vendor';
            if (order.status === 'in_store') grnStatus = 'in_store';
            if (order.status === 'completed') grnStatus = 'completed';
          }
          return { ...grn, status: grnStatus };
        });
        // Fetch GRN items for each GRN
        for (const grn of grns) {
          const grnItemsRes = await pool.query(
            `SELECT gi.*, rm.material_name
             FROM purchase.grn_items gi
             JOIN inventory.raw_materials rm ON gi.material_id = rm.material_id
             WHERE gi.grn_id = $1`,
            [grn.grn_id]
          );
          grn.materials = grnItemsRes.rows;
        }
        order.grns = grns;
      }
      return orders;
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
      `SELECT i.*, rm.material_name, rm.current_stock 
       FROM purchase.purchase_order_items i 
       LEFT JOIN inventory.raw_materials rm ON i.material_id = rm.material_id 
       WHERE i.purchase_order_id = $1`,
      [poId]
    );
    const grnsRes = await pool.query(
      `SELECT * FROM purchase.grns WHERE purchase_order_id = $1 ORDER BY grn_date`,
      [poId]
    );
    const logsRes = await pool.query(
      `SELECT l.*, u.username as changed_by_name FROM purchase.purchase_order_status_logs l LEFT JOIN auth.users u ON l.created_by = u.user_id WHERE l.purchase_order_id = $1 ORDER BY l.created_at`,
      [poId]
    );

    // Fetch overall summary and returned items using the new methods
    const overallSummary = await this.getOverallPOQuantitiesSummary(poId);
    const returnedItems = await this.getReturnedItemsForPO(poId);

    return {
      ...po,
      materials: itemsRes.rows,
      grns: grnsRes.rows,
      status_logs: logsRes.rows,
      overall_summary: overallSummary,
      returned_items: returnedItems
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
    const query = `
        SELECT
            SUM(poi.quantity) AS ordered,
            SUM(gri.received_quantity) AS total_received_in_grns,
            SUM(CASE WHEN gri.qc_status = 'passed' THEN gri.qc_passed_quantity ELSE 0 END) AS passed_qc,
            SUM(CASE WHEN gri.qc_status = 'returned' THEN gri.defective_quantity ELSE 0 END) AS returned_to_vendor
        FROM purchase.purchase_order_items poi
        LEFT JOIN purchase.grn_items gri ON poi.material_id = gri.material_id
            AND gri.grn_id IN (SELECT grn_id FROM purchase.grns WHERE purchase_order_id = $1)
        WHERE poi.purchase_order_id = $1
        GROUP BY poi.purchase_order_id;
    `;
    const result = await pool.query(query, [poId]);
    const summary = result.rows[0];
    if (summary) {
        const totalOrdered = Number(summary.ordered) || 0;
        const totalReceivedInGrns = Number(summary.total_received_in_grns) || 0;
        const totalPassedQc = Number(summary.passed_qc) || 0;
        const totalReturnedToVendor = Number(summary.returned_to_vendor) || 0;

        summary.received = totalReceivedInGrns;
        summary.pending = totalOrdered - totalReceivedInGrns;
        summary.passed_qc = totalPassedQc;
        summary.defective = totalReturnedToVendor;
        summary.in_store = totalReceivedInGrns - totalReturnedToVendor;

        // Clean up intermediate fields
        delete summary.total_received_in_grns;
    }
    return summary || { ordered: 0, received: 0, pending: 0, passed_qc: 0, defective: 0, in_store: 0, returned_to_vendor: 0 };
  }

  // Create GRN (Goods Receipt Note)
  static async createGRN({ purchase_order_id, materials, grn_date, matched_with_po, remarks, user_id }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate total received_quantity from materials
      const totalReceived = materials.reduce((sum, m) => sum + m.received_quantity, 0);

      // Insert GRN header
      const grnRes = await client.query(
        `INSERT INTO purchase.grns (purchase_order_id, grn_date, matched_with_po, remarks, received_quantity, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [purchase_order_id, grn_date, matched_with_po, remarks, totalReceived, user_id]
      );
      const grn = grnRes.rows[0];

      // Insert GRN items
      for (const m of materials) {
        await client.query(
          `INSERT INTO purchase.grn_items (grn_id, material_id, received_quantity, defective_quantity, remarks)
           VALUES ($1, $2, $3, $4, $5)`,
          [grn.grn_id, m.material_id, m.received_quantity, m.defective_quantity, m.remarks]
        );
      }

      await client.query('COMMIT');
      return grn;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in createGRN:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Create QC Report
  static async createQCReport({ grn_id, material_id, inspected_quantity, defective_quantity, accepted_quantity, remarks, user_id }) {
    // This function seems to be for creating initial QC reports, potentially redundant with grn_items qc_status.
    // We will rely on updating grn_items directly via editGRNForQC.
    throw new Error('createQCReport is deprecated. Use editGRNForQC for updating material QC status.');
  }

  // Add method to validate status transition
  static async validateStatusTransition(currentStatus, newStatus) {
    if (!VALID_STATUS_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
    return true;
  }

  // Update the updateStatus method to use validation
  static async updateStatus(poId, newStatus, userId = null, notes = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current status
      const currentStatusRes = await client.query(
        'SELECT status FROM purchase.purchase_order WHERE purchase_order_id = $1',
        [poId]
      );
      const currentStatus = currentStatusRes.rows[0]?.status;

      // Determine the new status based on GRN item statuses
      const grnItemsStatusRes = await client.query(
        `SELECT
           COUNT(*) as total_items,
           COUNT(CASE WHEN gi.qc_status = 'pending' THEN 1 END) as qc_pending_count,
           COUNT(CASE WHEN gi.qc_status = 'passed' THEN 1 END) as qc_passed_count,
           COUNT(CASE WHEN gi.qc_status = 'returned' THEN 1 END) as qc_returned_count
         FROM purchase.grn_items gi
         JOIN purchase.grns g ON gi.grn_id = g.grn_id
         WHERE g.purchase_order_id = $1`,
        [poId]
      );

      const statusCounts = grnItemsStatusRes.rows[0];

      let determinedStatus = currentStatus; // Default to current status

      if (!statusCounts || Number(statusCounts.total_items) === 0) {
        // No GRN items yet, status is likely 'ordered' or 'arrived' based on GRN existence
         const grnCountRes = await client.query('SELECT COUNT(*) FROM purchase.grns WHERE purchase_order_id = $1', [poId]);
         const grnCount = Number(grnCountRes.rows[0]?.count || 0);
         if (grnCount > 0) {
             // Check if all GRNs are verified
             const unverifiedGrnsRes = await client.query('SELECT COUNT(*) FROM purchase.grns WHERE purchase_order_id = $1 AND verified IS FALSE', [poId]);
             const unverifiedGrnCount = Number(unverifiedGrnsRes.rows[0]?.count || 0);

             if (unverifiedGrnCount === 0) {
                  // Check if all GRN items are in pending QC after verification
                  const pendingQcCountRes = await client.query('SELECT COUNT(*) FROM purchase.grn_items gi JOIN purchase.grns g ON gi.grn_id = g.grn_id WHERE g.purchase_order_id = $1 AND gi.qc_status = \'pending\'', [poId]);
                  const pendingQcCount = Number(pendingQcCountRes.rows[0]?.count || 0);

                  if (pendingQcCount > 0) {
                       determinedStatus = 'grn_verified'; // GRN verified, QC is pending
                  } else {
                       determinedStatus = 'grn_verified'; // All items might have moved past pending QC already
                  }

             } else {
                  determinedStatus = 'arrived';
             }
         } else {
             determinedStatus = 'ordered';
         }

      } else if (Number(statusCounts.qc_pending_count) > 0 || Number(statusCounts.qc_passed_count) > 0) {
        determinedStatus = 'qc_in_progress';
      } else if (Number(statusCounts.qc_returned_count) > 0) {
          // Some items have returned QC but not all items are QC'd
           determinedStatus = 'returned_to_vendor';
      }

      // If status hasn't changed based on determination and no specific status was provided,
      // or if an explicit status is provided and is the same as current, do nothing.
      if ((newStatus === undefined && currentStatus === determinedStatus) ||
           (newStatus !== undefined && currentStatus === newStatus)) {
          await client.query('COMMIT');
          return currentStatus; // No change needed or explicit status is the same
      }

       // Determine the final status to update. Explicit newStatus from a controller call takes precedence.
       let finalStatusToUpdate = determinedStatus;
       if(newStatus !== undefined) {
           // Optional: Add validation here to ensure explicit newStatus is a valid transition from currentStatus
           // For now, we allow explicit status updates from controllers.
           finalStatusToUpdate = newStatus;
       }

      // Update the status
      await client.query(
        'UPDATE purchase.purchase_order SET status = $1 WHERE purchase_order_id = $2',
        [finalStatusToUpdate, poId]
      );

      // Add a small delay to prevent duplicate status entries
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to insert status log, but don't fail if it's a duplicate
      try {
        await client.query(
          `INSERT INTO purchase.purchase_order_status_logs 
           (purchase_order_id, status, notes, created_by) 
           VALUES ($1, $2, $3, $4)`,
          [poId, finalStatusToUpdate, notes || `Status changed to ${finalStatusToUpdate}`, userId]
        );
        console.log('Status log inserted:', { poId, newStatus: finalStatusToUpdate, notes, userId });
      } catch (error) {
        // If it's a duplicate status error, just log it and continue
        if (error.message.includes('duplicate key value violates unique constraint')) { // Use a more general duplicate key error check
          console.log('Duplicate status entry detected, continuing...');
        } else {
          throw error;
        }
      }

      await client.query('COMMIT');
      return finalStatusToUpdate; // Return the new status
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async verifyGRN(grnId) {
    const client = await pool.connect();
    try {
       await client.query('BEGIN');
       const result = await client.query('UPDATE purchase.grns SET verified = TRUE WHERE grn_id = $1 RETURNING purchase_order_id', [grnId]);
       const poId = result.rows[0]?.purchase_order_id;
       if (poId) {
         await this.updateStatus(poId, 'grn_verified');
       }
       await client.query('COMMIT');
       return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error verifying GRN:', error);
        throw error;
    } finally {
        client.release();
    }
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

  // Add a method to get overall PO quantities summary
  static async getOverallPOQuantitiesSummary(poId) {
      const query = `
          SELECT
              SUM(poi.quantity) AS ordered,
              COALESCE(SUM(gri.received_quantity), 0) AS total_received,
              COALESCE(SUM(CASE WHEN gri.qc_status = 'passed' THEN gri.qc_passed_quantity ELSE 0 END), 0) AS total_qc_passed,
              COALESCE(SUM(CASE WHEN gri.qc_status = 'returned' THEN gri.defective_quantity ELSE 0 END), 0) AS total_defective
          FROM purchase.purchase_order_items poi
          LEFT JOIN purchase.grn_items gri ON poi.material_id = gri.material_id
              AND gri.grn_id IN (SELECT grn_id FROM purchase.grns WHERE purchase_order_id = $1)
          WHERE poi.purchase_order_id = $1;
      `;
      const result = await pool.query(query, [poId]);
      const summary = result.rows[0] || {};
      summary.total_ordered = Number(summary.total_ordered) || 0;
      summary.total_received = Number(summary.total_received) || 0;
      summary.total_qc_passed = Number(summary.total_qc_passed) || 0;
      summary.total_defective = Number(summary.total_defective) || 0;
      summary.total_in_store = summary.total_received - summary.total_defective; // In store is received minus defective
      summary.total_pending = summary.total_ordered - summary.total_received; // Keep this as it reflects ordered vs received
      return summary;
  }

  // Add a method to get returned items for a PO
  static async getReturnedItemsForPO(poId) {
      const query = `
          SELECT r.*, rm.material_name
          FROM purchase.returns r
          JOIN purchase.grns g ON r.grn_id = g.grn_id
          JOIN inventory.raw_materials rm ON r.material_id = rm.material_id
          WHERE g.purchase_order_id = $1
          ;
      `;
      const result = await pool.query(query, [poId]);
      return result.rows;
  }
}

export default PurchaseOrder;