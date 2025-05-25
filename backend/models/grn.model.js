import pool from '../db/db.js';
import PurchaseOrder from './purchaseOrder.model.js';

class GRN {
  static async verifyGRN(grn_id, user_id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the GRN and its items
      const grnRes = await client.query(
        `SELECT g.*, gi.* 
         FROM purchase.grns g
         JOIN purchase.grn_items gi ON g.grn_id = gi.grn_id
         WHERE g.grn_id = $1`,
        [grn_id]
      );

      if (grnRes.rows.length === 0) {
        throw new Error('GRN not found');
      }

      const grn = grnRes.rows[0];

      // Update GRN verification status
      await client.query(
        'UPDATE purchase.grns SET verified = true, verified_by = $1, verified_at = NOW() WHERE grn_id = $2',
        [user_id, grn_id]
      );

      // Update GRN items to pending QC
      await client.query(
        'UPDATE purchase.grn_items SET qc_status = $1 WHERE grn_id = $2',
        ['pending', grn_id]
      );

      // Update purchase order status
      await PurchaseOrder.updateStatus(grn.purchase_order_id);

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateQCStatus(grn_item_id, qc_data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the GRN item
      const grnItemRes = await client.query(
        `SELECT gi.*, g.purchase_order_id, g.verified
         FROM purchase.grn_items gi
         JOIN purchase.grns g ON gi.grn_id = g.grn_id
         WHERE gi.grn_item_id = $1`,
        [grn_item_id]
      );

      if (grnItemRes.rows.length === 0) {
        throw new Error('GRN item not found');
      }

      const grnItem = grnItemRes.rows[0];

      // Verify that GRN is verified before allowing QC
      if (!grnItem.verified) {
        throw new Error('Cannot perform QC on unverified GRN');
      }

      // Validate quantities
      const receivedQuantity = Number(grnItem.received_quantity);
      const defectiveQuantity = Number(qc_data.defective_quantity || 0);
      const qcPassedQuantity = Number(qc_data.qc_passed_quantity || 0);

      if (defectiveQuantity + qcPassedQuantity !== receivedQuantity) {
        throw new Error('Sum of defective and passed quantities must equal received quantity');
      }

      if (defectiveQuantity < 0 || qcPassedQuantity < 0) {
        throw new Error('Quantities cannot be negative');
      }

      // Update QC status and quantities
      await client.query(
        `UPDATE purchase.grn_items 
         SET qc_status = $1::TEXT,
             defective_quantity = $2,
             qc_notes = $3,
             qc_updated_at = NOW(),
             qc_passed_quantity = $4
         WHERE grn_item_id = $5`,
        [
          qc_data.status,
          defectiveQuantity,
          qc_data.notes || null,
          qcPassedQuantity,
          grn_item_id
        ]
      );

      // Add accepted quantity to inventory
      if ((qc_data.status === 'passed' || qc_data.status === 'returned') && qcPassedQuantity > 0) {
        await client.query(
          `UPDATE inventory.raw_materials 
           SET current_stock = current_stock + $1
           WHERE material_id = $2`,
          [qcPassedQuantity, grnItem.material_id]
        );
      }

      // Record defective quantity in returns table
      if (defectiveQuantity > 0) {
        await client.query(
          `INSERT INTO purchase.returns (grn_id, material_id, quantity_returned, remarks, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [grnItem.grn_id, grnItem.material_id, defectiveQuantity, qc_data.notes || grnItem.remarks || null, 'pending']
        );
      }

      // Update purchase order status
      await PurchaseOrder.updateStatus(grnItem.purchase_order_id);

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default GRN; 