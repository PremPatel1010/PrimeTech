import pool from '../db/db.js';

// Update QC status and quantities for GRN items
const updateQCStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { materials } = req.body; // Expect an array of materials
    const user_id = req.user?.user_id;

    await client.query('BEGIN');

    for (const material of materials) {
      const { grn_id, material_id, defective_quantity, accepted_quantity, remarks } = material;

      // Update GRN item with QC details
      await client.query(
        `UPDATE purchase.grn_items
         SET defective_quantity = $1,
             qc_status = $2,
             remarks = $3,
             qc_date = NOW(),
             qc_by = $4
         WHERE grn_id = $5 AND material_id = $6`,
        [defective_quantity, material.qc_status || 'completed', remarks, user_id, grn_id, material_id]
      );
    }

    // Check if all items in GRN have completed QC
    // We need the grn_id from one of the materials in the array
    const grn_id = materials[0]?.grn_id;
    if (!grn_id) {
        throw new Error("GRN ID not provided in materials array.");
    }

    const qcStatusResult = await client.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN qc_status = 'completed' THEN 1 END) as completed
       FROM purchase.grn_items
       WHERE grn_id = $1`,
      [grn_id]
    );

    const { total, completed } = qcStatusResult.rows[0];

    // Check if all items in GRN have completed QC and are either sent to store or returned
    const finalStatusResult = await client.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN qc_status = 'passed' THEN 1 END) as completed_flow
       FROM purchase.grn_items
       WHERE grn_id = $1`,
      [grn_id]
    );

    const { total: totalItems, completed_flow } = finalStatusResult.rows[0];

    // Update GRN QC status
    if (totalItems > 0 && totalItems === completed_flow) {
      await client.query(
        `UPDATE purchase.grns
         SET qc_status = 'completed',
             qc_completed_at = NOW(),
             qc_completed_by = $1
         WHERE grn_id = $2`,
        [user_id, grn_id]
      );
    } else if (completed > 0) {
       await client.query(
        `UPDATE purchase.grns
         SET qc_status = 'qc_in_progress'
         WHERE grn_id = $1`,
        [grn_id]
      );
    } else {
      await client.query(
        `UPDATE purchase.grns
         SET qc_status = 'grn_verified'
         WHERE grn_id = $1`,
        [grn_id]
      );
    }

    await client.query('COMMIT');
    // Fetch the updated GRN item and GRN status (fetching all items for consistency)
    const updatedItems = await client.query(
      `SELECT gi.*, rm.material_name
       FROM purchase.grn_items gi
       JOIN inventory.raw_materials rm ON gi.material_id = rm.material_id
       WHERE gi.grn_id = $1`,
      [grn_id]
    );
     const updatedGrn = await client.query(
      `SELECT * FROM purchase.grns WHERE grn_id = $1`,
      [grn_id]
    );
    res.json({ message: 'QC status updated successfully', items: updatedItems.rows, grn: updatedGrn.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating QC status:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Create return entry for defective materials
const createReturn = async (req, res) => {
  const client = await pool.connect();
  try {
    const { grn_id, material_id, quantity, remarks } = req.body;
    const user_id = req.user?.user_id;

    await client.query('BEGIN');

    // Verify defective quantity
    const itemResult = await client.query(
      `SELECT defective_quantity
       FROM purchase.grn_items
       WHERE grn_id = $1 AND material_id = $2`,
      [grn_id, material_id]
    );

    if (itemResult.rows.length === 0) {
      throw new Error('GRN item not found');
    }

    const { defective_quantity } = itemResult.rows[0];
    if (quantity > defective_quantity) {
      throw new Error('Return quantity cannot exceed defective quantity');
    }

    // Create return entry
    await client.query(
      `INSERT INTO purchase.returns
       (grn_id, material_id, quantity_returned, remarks, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [grn_id, material_id, quantity, remarks, user_id]
    );

    // Update GRN item status
    await client.query(
      `UPDATE purchase.grn_items
       SET qc_status = 'returned'
       WHERE grn_id = $1 AND material_id = $2`,
      [grn_id, material_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Return entry created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating return:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Get return history for a GRN
const getReturnHistory = async (req, res) => {
  try {
    const { grn_id } = req.params;

    const result = await pool.query(
      `SELECT r.*, m.name as material_name
       FROM purchase.returns r
       JOIN inventory.raw_materials m ON r.material_id = m.material_id
       WHERE r.grn_id = $1
       ORDER BY r.date DESC`,
      [grn_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching return history:', error);
    res.status(500).json({ error: error.message });
  }
};

export default {
  updateQCStatus,
  createReturn,
  getReturnHistory
};