import PurchaseOrder from '../models/purchaseOrder.model.js';

export const getAllPurchaseOrders = async (req, res) => {
  try {
    const purchaseOrders = await PurchaseOrder.getAllPurchaseOrders();
    res.json(purchaseOrders);
  } catch (error) {
    console.error('Error in getAllPurchaseOrders:', error);
    res.status(500).json({ message: 'Error fetching purchase orders', error: error.message });
  }
};

export const getPurchaseOrder = async (req, res) => {
  try {
    const { poId } = req.params;
    const purchaseOrder = await PurchaseOrder.getPurchaseOrderById(poId);
    
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    res.json(purchaseOrder);
  } catch (error) {
    console.error('Error in getPurchaseOrder:', error);
    res.status(500).json({ message: 'Error fetching purchase order', error: error.message });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const {
      order_number,
      order_date,
      supplier_id,
      status,
      payment_details,
      discount,
      gst,
      materials // frontend sends 'materials' not 'items'
    } = req.body;

    // Validate required fields
    if (!order_number || !order_date || !supplier_id || !status) {
      return res.status(400).json({
        message: 'Order number, order date, supplier ID, and status are required'
      });
    }

    // Accept status values from frontend
    if (!['ordered', 'arrived', 'cancelled'].includes(status)) {
      return res.status(400).json({
        message: 'Status must be one of: ordered, arrived, cancelled'
      });
    }

    // Validate materials
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        message: 'At least one material is required'
      });
    }

    // Validate each material
    for (const item of materials) {
      if (!item.material_id || !item.quantity || !item.unit_price) {
        return res.status(400).json({
          message: 'Each material must have material_id, quantity, and unit_price'
        });
      }
    }

    // Map 'materials' to 'items' for the model
    const items = materials.map(({ material_id, quantity, unit_price }) => ({
      material_id,
      quantity,
      unit_price
    }));

    const purchaseOrder = await PurchaseOrder.createPurchaseOrder({
      order_number,
      order_date,
      supplier_id,
      status,
      payment_details,
      discount,
      gst,
      items
    });

    res.status(201).json({
      message: 'Purchase order created successfully',
      purchaseOrder
    });
  } catch (error) {
    console.error('Error in createPurchaseOrder:', error);
    res.status(500).json({ message: 'Error creating purchase order', error: error.message });
  }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const { poId } = req.params;
    const { 
      order_number, 
      order_date, 
      supplier_id, 
      status, 
      payment_details,
      discount,
      gst,
      materials, // Accept materials from frontend
      items // Keep items for backward compatibility
    } = req.body;

    // Validate status if provided
    if (status && !['ordered', 'arrived', 'cancelled'].includes(status)) {
      return res.status(400).json({ 
        message: 'Status must be one of: ordered, arrived, cancelled' 
      });
    }

    // Use materials if provided, otherwise use items
    const itemsToUpdate = materials || items;

    const updatedPurchaseOrder = await PurchaseOrder.updatePurchaseOrder(poId, {
      order_number,
      order_date,
      supplier_id,
      status,
      payment_details,
      discount,
      gst,
      items: itemsToUpdate
    });

    if (!updatedPurchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    res.json({
      message: 'Purchase order updated successfully',
      purchaseOrder: updatedPurchaseOrder
    });
  } catch (error) {
    console.error('Error in updatePurchaseOrder:', error);
    res.status(500).json({ message: 'Error updating purchase order', error: error.message });
  }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    const { poId } = req.params;
    const deletedPurchaseOrder = await PurchaseOrder.deletePurchaseOrder(poId);

    if (!deletedPurchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    res.json({
      message: 'Purchase order deleted successfully',
      purchaseOrder: deletedPurchaseOrder
    });
  } catch (error) {
    console.error('Error in deletePurchaseOrder:', error);
    res.status(500).json({ message: 'Error deleting purchase order', error: error.message });
  }
};

export const getNextOrderNumber = async (req, res) => {
  try {
    const nextOrderNumber = await PurchaseOrder.getNextOrderNumber();
    res.json({ nextOrderNumber });
  } catch (error) {
    res.status(500).json({ message: 'Error generating next order number', error: error.message });
  }
}; 