import PurchaseOrder from '../models/purchaseOrder.model.js';
import pool  from '../db/db.js'
import GRN from '../models/grn.model.js';

export const getAllPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.getAllPurchaseOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error in getAllPurchaseOrders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

export const getPurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.getPurchaseOrderById(req.params.id);
    if (!po) return res.status(404).json({ error: 'Not found' });
    res.json(po);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier_name, ...poData } = req.body;
    
    // Validate required fields
    if (!poData.order_date || !poData.materials || !poData.materials.length) {
      return res.status(400).json({ 
        error: 'Missing required fields: order_date and materials are required' 
      });
    }

    // Handle supplier creation/selection
    let supplier_id = poData.supplier_id;
    if (supplier_name && !supplier_id) {
      try {
        const supplier = await PurchaseOrder.getOrCreateSupplier({ supplier_name });
        supplier_id = supplier.supplier_id;
      } catch (error) {
        return res.status(400).json({ error: 'Failed to create/select supplier: ' + error.message });
      }
    }

    // Create purchase order with supplier
    const po = await PurchaseOrder.createPurchaseOrder({
      ...poData,
      supplier_id,
      supplier_name
    });

    res.status(201).json(po);
  } catch (error) {
    console.error('Error in createPurchaseOrder:', error);
    if (error.code === '42P01') { // Table doesn't exist error
      res.status(500).json({ 
        error: 'Database tables not properly initialized. Please contact system administrator.' 
      });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const { supplier_name, ...updateData } = req.body;
    
    // Handle supplier creation/selection
    if (supplier_name && !updateData.supplier_id) {
      const supplier = await PurchaseOrder.getOrCreateSupplier({ supplier_name });
      updateData.supplier_id = supplier.supplier_id;
    }

    const order = await PurchaseOrder.updatePurchaseOrder(req.params.poId, updateData);
    res.json(order);
  } catch (error) {
    console.error('Error in updatePurchaseOrder:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    await PurchaseOrder.deletePurchaseOrder(req.params.poId);
    res.status(204).send();
  } catch (error) {
    console.error('Error in deletePurchaseOrder:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getNextOrderNumber = async (req, res) => {
  try {
    const nextNumber = await PurchaseOrder.getNextOrderNumber();
    res.json({ nextOrderNumber: nextNumber });
  } catch (error) {
    console.error('Error in getNextOrderNumber:', error);
    res.status(500).json({ error: 'Failed to generate next order number' });
  }
};

export const getPOStatusHistory = async (req, res) => {
  try {
    const history = await PurchaseOrder.getPOStatusHistory(req.params.poId);
    res.json(history);
  } catch (error) {
    console.error('Error in getPOStatusHistory:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPOQuantitiesSummary = async (req, res) => {
  try {
    const summary = await PurchaseOrder.getPOQuantitiesSummary(req.params.poId);
    res.json(summary);
  } catch (error) {
    console.error('Error in getPOQuantitiesSummary:', error);
    res.status(500).json({ error: error.message });
  }
};

export const createGRN = async (req, res) => {
  try {
    const grn = await PurchaseOrder.createGRN({
      purchase_order_id: req.params.poId,
      ...req.body
    });
    // If not all items received, send notification (placeholder)
    if (grn.pending > 0) {
      // TODO: Integrate with notification system
      console.log(`Notification: Only ${grn.totalReceived} of ${grn.totalOrdered} items received. ${grn.pending} pending.`);
    }
    res.status(201).json(grn);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

export const createQCReport = async (req, res) => {
  try {
    const { materials } = req.body;
    
    // Validate input
    if (!materials || !Array.isArray(materials)) {
      return res.status(400).json({ error: 'Invalid input: materials array is required' });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update QC status for each material
      for (const m of materials) {
        // Validate material data
        if (!m.grn_id || !m.material_id || typeof m.defective_quantity !== 'number' || 
            typeof m.accepted_quantity !== 'number') {
          throw new Error('Invalid material data');
        }

        // Update QC status
        await client.query(
          `UPDATE grn_materials 
           SET defective_quantity = $1,
               accepted_quantity = $2,
               remarks = $3,
               qc_status = $4,
               updated_at = NOW()
           WHERE grn_id = $5 AND material_id = $6`,
          [m.defective_quantity, m.accepted_quantity, m.remarks, m.qc_status, m.grn_id, m.material_id]
        );

        // If material is being sent to store, update store status
        
      }

      // Update overall GRN status
      const grnStatus = await client.query(
        `SELECT 
          CASE 
            WHEN COUNT(*) = COUNT(CASE WHEN qc_status = 'completed' THEN 1 END) THEN 'completed'
            WHEN COUNT(*) = COUNT(CASE WHEN qc_status = 'returned' THEN 1 END) THEN 'returned'
            ELSE 'in_progress'
          END as status
         FROM grn_materials 
         WHERE grn_id = $1`,
        [materials[0].grn_id]
      );

      await client.query(
        `UPDATE grns 
         SET status = $1,
             updated_at = NOW()
         WHERE grn_id = $2`,
        [grnStatus.rows[0].status, materials[0].grn_id]
      );

       // After updating GRN items, update the overall PO status
       if (materials.length > 0 && materials[0].grn_id) {
           const poIdResult = await client.query('SELECT purchase_order_id FROM purchase.grns WHERE grn_id = $1', [materials[0].grn_id]);
           if (poIdResult.rows.length > 0) {
               await PurchaseOrder.updateStatus(poIdResult.rows[0].purchase_order_id);
           }
       }

      await client.query('COMMIT');
      res.status(201).json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error in createQCReport:', e);
    res.status(400).json({ error: e.message });
  }
};

export const handleReturn = async (req, res) => {
  try {
    const { grn_id, material_id, quantity, remarks } = req.body;
    
    // Validate input
    if (!grn_id || !material_id || !quantity || !remarks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create return record
      const returnResult = await client.query(
        `INSERT INTO grn_returns 
         (grn_id, material_id, quantity, remarks, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING return_id`,
        [grn_id, material_id, quantity, remarks]
      );

      // Update material status
      await client.query(
        `UPDATE grn_materials 
         SET qc_status = 'returned',
             updated_at = NOW()
         WHERE grn_id = $1 AND material_id = $2`,
        [grn_id, material_id]
      );

      // Update GRN status if all materials are returned
      const grnStatus = await client.query(
        `SELECT 
          CASE 
            WHEN COUNT(*) = COUNT(CASE WHEN qc_status = 'returned' THEN 1 END) THEN 'returned'
            ELSE 'in_progress'
          END as status
         FROM grn_materials 
         WHERE grn_id = $1`,
        [grn_id]
      );

      await client.query(
        `UPDATE grns 
         SET status = $1,
             updated_at = NOW()
         WHERE grn_id = $2`,
        [grnStatus.rows[0].status, grn_id]
      );

      await client.query('COMMIT');
      res.status(201).json({ 
        success: true, 
        return_id: returnResult.rows[0].return_id 
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Error in handleReturn:', e);
    res.status(400).json({ error: e.message });
  }
};

export const updatePOStatus = async (req, res) => {
  const { poId } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE purchase.purchase_order 
       SET status = $1, 
           updated_at = NOW() 
       WHERE purchase_order_id = $2 
       RETURNING *`,
      [status, poId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating PO status:', error);
    res.status(500).json({ error: 'Failed to update purchase order status' });
  }
};

export const getProgress = async (req, res) => {
  try {
    const progress = await PurchaseOrder.getProgress(req.params.poId);
    res.json(progress);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

export const verifyGRN = async (req, res) => {
  try {
    const { grnId } = req.params;
    await PurchaseOrder.verifyGRN(grnId);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// New endpoint to update QC status for a single GRN item
export const updateGRNItemQCStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { grnItemId } = req.params;
    // Allow both defective_quantity and accepted_quantity in the body, 
    // and qc_status ('passed' or 'returned')
    const { defective_quantity, accepted_quantity, remarks, qc_status } = req.body; 

    // Validate input based on qc_status
    if (!qc_status || (qc_status !== 'passed' && qc_status !== 'returned')) {
         await client.query('ROLLBACK');
         return res.status(400).json({ error: 'Invalid or missing qc_status.' });
    }

    let finalDefectiveQuantity = defective_quantity || 0;
    let finalAcceptedQuantity = accepted_quantity || 0;

    // Get the GRN item to ensure it exists and get its received quantity
    const grnItemRes = await client.query(
      `SELECT received_quantity, grn_id FROM purchase.grn_items WHERE grn_item_id = $1`,
      [grnItemId]
    );

    if(grnItemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'GRN item not found' });
    }

    const receivedQuantity = grnItemRes.rows[0].received_quantity;
    const grnId = grnItemRes.rows[0].grn_id;

    // If status is 'passed', calculate quantities based on received and provided defective (if any)
    if (qc_status === 'passed') {
        // If defective_quantity is provided, use it to calculate accepted
        if (defective_quantity !== undefined) {
            finalDefectiveQuantity = defective_quantity;
            finalAcceptedQuantity = receivedQuantity - finalDefectiveQuantity;
        } else if (accepted_quantity !== undefined) {
             // If accepted_quantity is provided, use it to calculate defective
             finalAcceptedQuantity = accepted_quantity;
             finalDefectiveQuantity = receivedQuantity - finalAcceptedQuantity;
        } else {
            // If neither is provided, assume all received is accepted
             finalAcceptedQuantity = receivedQuantity;
             finalDefectiveQuantity = 0;
        }

         // Ensure calculated quantities are not negative and do not exceed received
         finalDefectiveQuantity = Math.max(0, Math.min(finalDefectiveQuantity, receivedQuantity));
         finalAcceptedQuantity = receivedQuantity - finalDefectiveQuantity;

    } else if (qc_status === 'returned') {
        // If status is 'returned', the defective_quantity is the quantity being returned.
        // The accepted_quantity should represent the quantity NOT returned.
        if (defective_quantity === undefined || defective_quantity <= 0) {
             await client.query('ROLLBACK');
             return res.status(400).json({ error: 'Defective quantity must be provided and positive for returned items.' });
        }
        finalDefectiveQuantity = defective_quantity; // This is the quantity marked as defective/returned
        // The quantity that passed QC and is eligible for store is the received minus defective
        finalAcceptedQuantity = receivedQuantity - finalDefectiveQuantity;

        // Ensure defective quantity does not exceed received quantity
         if (finalDefectiveQuantity > receivedQuantity) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Defective quantity cannot exceed received quantity.' });
         }
    }

    // Call GRN model to update QC status and quantities
    // Pass qc_passed_quantity explicitly, which is equivalent to finalAcceptedQuantity
    await GRN.updateQCStatus(grnItemId, {
         status: qc_status,
         defective_quantity: finalDefectiveQuantity,
         notes: remarks || null,
         qc_passed_quantity: finalAcceptedQuantity // Use finalAcceptedQuantity for qc_passed_quantity
    });

    // After updating the item, update the overall PO status
    if (grnItemRes.rows[0].purchase_order_id) {
        await PurchaseOrder.updateStatus(grnItemRes.rows[0].purchase_order_id);
    } else {
        console.warn(`Cannot update Purchase Order status: purchase_order_id is null for GRN item ${grnItemId}`);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `GRN item QC status updated to '${qc_status}' successfully` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in updateGRNItemQCStatus:', error);
    res.status(500).json({ error: error.message });
  }
};

export const returnGRNItem = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { grnItemId } = req.params;
    const { quantity, remarks } = req.body; // quantity here should be the defective quantity

    // Validate input
    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid quantity provided for return.' });
    }

    // Get GRN item to verify it exists and get PO ID
    const grnItemRes = await client.query(
      `SELECT gi.grn_id, g.purchase_order_id, gi.received_quantity, gi.defective_quantity, gi.qc_status, g.verified
       FROM purchase.grn_items gi
       JOIN purchase.grns g ON gi.grn_id = g.grn_id
       WHERE gi.grn_item_id = $1`,
      [grnItemId]
    );

    if (grnItemRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'GRN item not found.' });
    }
    const grnItem = grnItemRes.rows[0];

    // Update GRN item status and defective quantity
    const newDefectiveQuantity = quantity; // The quantity being returned now
    const newAcceptedQuantity = grnItem.received_quantity - newDefectiveQuantity; // Remaining accepted quantity
    const newQcPassedQuantity = newAcceptedQuantity; // If returned, the passed quantity is the non-returned part

    await client.query(
      `UPDATE purchase.grn_items 
       SET qc_status = 'returned',
           defective_quantity = $1,
           remarks = $2,
           qc_date = NOW(),
           qc_by = $3,
           qc_passed_quantity = $4
       WHERE grn_item_id = $5`,
      [
        newDefectiveQuantity,
        remarks || null,
        req.user?.user_id || null,
        newQcPassedQuantity,
        grnItemId
      ]
    );

    // Create a return record for tracking
    await client.query(
      `INSERT INTO purchase.returns 
       (grn_id, material_id, quantity_returned, remarks)
       VALUES ($1, $2, $3, $4)`,
      [
        grnItem.grn_id,
        grnItem.material_id,
        quantity,
        remarks,
      ]
    );

    // Update purchase order status based on the changes to the GRN item
    await PurchaseOrder.updateStatus(grnItem.purchase_order_id, 'returned_to_vendor', req.user?.user_id);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Item marked as returned.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in returnGRNItem:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export const getQuantitiesSummary = async (req, res) => {
  const { poId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        COUNT(CASE WHEN gi.qc_status = 'pending' THEN 1 END) as qc_pending_count,
        COUNT(CASE WHEN gi.qc_status = 'passed' THEN 1 END) as qc_passed_count,
        COUNT(CASE WHEN gi.qc_status = 'returned' THEN 1 END) as qc_returned_count
      FROM purchase.grn_items gi
      JOIN purchase.grn g ON gi.grn_id = g.grn_id
      WHERE g.purchase_order_id = $1
    `, [poId]);

    const summary = result.rows[0];
    res.json(summary || { qc_pending_count: 0, qc_passed_count: 0, qc_returned_count: 0 });
  } catch (error) {
    console.error('Error getting quantities summary:', error);
    res.status(500).json({ error: 'Failed to get quantities summary' });
  }
}; 