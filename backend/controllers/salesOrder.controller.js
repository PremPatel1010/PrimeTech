import SalesOrder from '../models/salesOrder.model.js';

import ManufacturingProgress from '../models/manufacturingProgress.model.js';
import FinishedProduct from '../models/finishedProduct.model.js';

// Get all sales orders
export const getAllSalesOrders = async (req, res) => {
  try {
    const salesOrders = await SalesOrder.getAllSalesOrders();
    res.json(salesOrders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales orders', error: error.message });
  }
};

// Get a single sales order
export const getSalesOrder = async (req, res) => {
  try {
    const { salesOrderId } = req.params;
    
    if (!salesOrderId || isNaN(parseInt(salesOrderId))) {
      return res.status(400).json({ message: 'Invalid sales order ID' });
    }

    const salesOrder = await SalesOrder.getSalesOrderById(salesOrderId);
    
    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales order not found' });
    }
    
    res.json(salesOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sales order', error: error.message });
  }
};

// Create a new sales order
export const createSalesOrder = async (req, res) => {
  try {
    const {
      order_date,
      customer_name,
      discount,
      gst,
      total_amount,
      items
    } = req.body;

    // Validate required fields
    if (!order_date) {
      return res.status(400).json({ message: 'Order date is required' });
    }
    if (!customer_name) {
      return res.status(400).json({ message: 'Customer name is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // Validate order date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(order_date)) {
      return res.status(400).json({ message: 'Invalid order date format. Use YYYY-MM-DD' });
    }

    // Validate numeric fields
    if (discount !== undefined && (isNaN(discount) || discount < 0 || discount > 100)) {
      return res.status(400).json({ message: 'Discount must be a number between 0 and 100' });
    }
    if (gst !== undefined && (isNaN(gst) || gst < 0 || gst > 100)) {
      return res.status(400).json({ message: 'GST must be a number between 0 and 100' });
    }
   
    if (total_amount !== undefined && (isNaN(total_amount) || total_amount < 0)) {
      return res.status(400).json({ message: 'Total amount must be a positive number' });
    }

    // Validate items
    for (const item of items) {
      if (!item.product_category) {
        return res.status(400).json({ message: 'Product category is required for each item' });
      }
      if (!item.product_id || isNaN(parseInt(item.product_id))) {
        return res.status(400).json({ message: 'Valid product ID is required for each item' });
      }
      if (!item.quantity || isNaN(parseInt(item.quantity)) || item.quantity <= 0) {
        return res.status(400).json({ message: 'Valid quantity is required for each item' });
      }
      if (!item.unit_price || isNaN(parseFloat(item.unit_price)) || item.unit_price <= 0) {
        return res.status(400).json({ message: 'Valid unit price is required for each item' });
      }
    }

    // Always generate a unique order number
    const order_number = await SalesOrder.getNextOrderNumber();

    const salesOrderData = {
      order_number,
      order_date,
      customer_name,
      discount,
      gst,
      total_amount,
      items
    };

    const salesOrder = await SalesOrder.createSalesOrder(salesOrderData);
    
    // Emit order placed event
   
    
    res.status(201).json(salesOrder);
  } catch (error) {
    console.error('Error creating sales order:', error);
    res.status(500).json({ message: 'Error creating sales order', error: error.message });
  }
};

// Update a sales order
export const updateSalesOrder = async (req, res) => {
  try {
    const { salesOrderId } = req.params;
    
    if (!salesOrderId || isNaN(parseInt(salesOrderId))) {
      return res.status(400).json({ message: 'Invalid sales order ID' });
    }

    const updateData = req.body;

    // Validate order date format if provided
    if (updateData.order_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(updateData.order_date)) {
        return res.status(400).json({ message: 'Invalid order date format. Use YYYY-MM-DD' });
      }
    }

    // Validate numeric fields if provided
    if (updateData.discount !== undefined && (isNaN(updateData.discount) || updateData.discount < 0 || updateData.discount > 100)) {
      return res.status(400).json({ message: 'Discount must be a number between 0 and 100' });
    }
    if (updateData.gst !== undefined && (isNaN(updateData.gst) || updateData.gst < 0 || updateData.gst > 100)) {
      return res.status(400).json({ message: 'GST must be a number between 0 and 100' });
    }
    if (updateData.total_amount !== undefined && (isNaN(updateData.total_amount) || updateData.total_amount < 0)) {
      return res.status(400).json({ message: 'Total amount must be a positive number' });
    }

    // Validate status if provided
    if (updateData.status && !['pending', 'completed', 'cancelled'].includes(updateData.status)) {
      return res.status(400).json({ message: 'Invalid status. Must be pending, completed, or cancelled' });
    }

    // Validate items if provided
    if (updateData.items) {
      if (!Array.isArray(updateData.items) || updateData.items.length === 0) {
        return res.status(400).json({ message: 'At least one item is required' });
      }
      for (const item of updateData.items) {
        if (!item.product_category) {
          return res.status(400).json({ message: 'Product category is required for each item' });
        }
        if (!item.product_id || isNaN(parseInt(item.product_id))) {
          return res.status(400).json({ message: 'Valid product ID is required for each item' });
        }
        if (!item.quantity || isNaN(parseInt(item.quantity)) || item.quantity <= 0) {
          return res.status(400).json({ message: 'Valid quantity is required for each item' });
        }
        if (!item.unit_price || isNaN(parseFloat(item.unit_price)) || item.unit_price <= 0) {
          return res.status(400).json({ message: 'Valid unit price is required for each item' });
        }
      }
    }

    const salesOrder = await SalesOrder.updateSalesOrder(salesOrderId, updateData);
    
    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales order not found' });
    }
    
    res.json(salesOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error updating sales order', error: error.message });
  }
};

// Delete a sales order
export const deleteSalesOrder = async (req, res) => {
  try {
    const { salesOrderId } = req.params;
    
    if (!salesOrderId || isNaN(parseInt(salesOrderId))) {
      return res.status(400).json({ message: 'Invalid sales order ID' });
    }

    const salesOrder = await SalesOrder.deleteSalesOrder(salesOrderId);
    
    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales order not found' });
    }
    
    res.json({ message: 'Sales order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting sales order', error: error.message });
  }
};

// Update sales order status
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, completed, cancelled'
      });
    }

    try {
      // Get the current order
      const currentOrder = await SalesOrder.getSalesOrderById(id);
      if (!currentOrder) {
        return res.status(404).json({
          success: false,
          message: 'Sales order not found'
        });
      }

      // If completing the order, check inventory and deduct stock
      if (status === 'completed') {
        // Check if all required manufacturing batches are completed
        const manufacturingProgress = await ManufacturingProgress.getProgressByOrderId(id);
        const incompleteBatches = manufacturingProgress.filter(
          progress => progress.status !== 'completed'
        );

        if (incompleteBatches.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Cannot complete order: Some manufacturing batches are not completed'
          });
        }

        // Check inventory for each product in the order
        for (const item of currentOrder.order_items) {
          const productInventory = await FinishedProduct.getProductInventory(item.product_id);
          
          if (!productInventory || productInventory.quantity_available < item.quantity) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for product ID ${item.product_id}. Required: ${item.quantity}, Available: ${productInventory?.quantity_available || 0}`
            });
          }
        }

        // Deduct inventory for each product
        for (const item of currentOrder.order_items) {
          await FinishedProduct.updateQuantity(
            item.product_id,
            -item.quantity // Negative value to deduct
          );
        }
      }

      // Update the order status
      const result = await SalesOrder.updateStatus(id, status);

      // Emit order status changed event
      emitEvent(SOCKET_EVENTS.ORDER_PLACED, {
        type: 'status_updated',
        order: result
      });

      // If order is completed, also emit inventory update
      if (status === 'completed') {
        emitEvent(SOCKET_EVENTS.INVENTORY_UPDATED, {
          type: 'order_completed',
          order: result
        });
      }

      res.json({
        success: true,
        message: 'Sales order status updated successfully',
        data: result
      });
    } catch (error) {
      // Handle specific inventory-related errors
      if (error.message.includes('No finished product found')) {
        return res.status(400).json({
          success: false,
          message: 'Cannot complete order: Some products are not available in inventory'
        });
      }
      if (error.message.includes('Insufficient quantity')) {
        return res.status(400).json({
          success: false,
          message: 'Cannot complete order: Insufficient inventory quantity'
        });
      }
      throw error; // Re-throw other errors to be caught by outer catch
    }
  } catch (error) {
    console.error('Error updating sales order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating sales order status',
      error: error.message
    });
  }
};

// Add this after other exports
export const getNextOrderNumber = async (req, res) => {
  try {
    const nextOrderNumber = await SalesOrder.getNextOrderNumber();
    res.json({ nextOrderNumber });
  } catch (error) {
    res.status(500).json({ message: 'Error generating next order number', error: error.message });
  }
};

export const checkProductStockAndRawMaterial = async (req, res) => {
  try {
    const productId = req.query.productId || req.body.productId;
    const quantity = Number(req.query.quantity || req.body.quantity);
    if (!productId || isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'productId and valid quantity are required' });
    }
    const result = await SalesOrder.checkProductStockAndRawMaterial(productId, quantity);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error checking stock and raw material', error: error.message });
  }
};

export const checkOrderAvailability = async (req, res) => {
  try {
    const orderData = req.body;
    const availabilityResults = await SalesOrder.checkOrderAvailability(orderData);
    
    // Calculate overall order status
    const overallStatus = {
      can_fulfill_completely: availabilityResults.every(result => 
        result.can_fulfill_from_stock || 
        (result.can_manufacture && result.max_manufacturable_quantity >= result.requested_quantity)
      ),
      can_fulfill_partially: availabilityResults.some(result => 
        result.can_fulfill_from_stock || 
        (result.can_manufacture && result.max_manufacturable_quantity > 0)
      ),
      suggested_quantities: availabilityResults.map(result => ({
        product_id: result.product_id,
        suggested_quantity: Math.min(
          result.requested_quantity,
          result.available_in_stock + (result.can_manufacture ? result.max_manufacturable_quantity : 0)
        )
      }))
    };

    res.json({
      availability_results: availabilityResults,
      overall_status: overallStatus
    });
  } catch (error) {
    console.error('Error in checkOrderAvailability:', error);
    res.status(500).json({ message: 'Error checking order availability', error: error.message });
  }
}; 