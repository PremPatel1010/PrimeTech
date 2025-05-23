import PurchaseOrder from '../models/purchaseOrder.model.js';

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
    await PurchaseOrder.createQCReport(req.body);
    res.status(201).json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

export const updatePOStatus = async (req, res) => {
  try {
    await PurchaseOrder.updateStatus(req.params.poId, req.body.status, req.user?.user_id, req.body.notes);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
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