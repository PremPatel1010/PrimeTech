import SalesOrder from '../models/salesOrder.model.js';

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
      order_number,
      order_date,
      customer_name,
      discount,
      gst,
      total_amount,
      items
    } = req.body;

    // Validate required fields
    if (!order_number) {
      return res.status(400).json({ message: 'Order number is required' });
    }
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

    const salesOrderData = {
      order_number,
      order_date,
      customer_name,
      discount: discount || 0,
      gst: gst || 18,
      total_amount,
      items
    };

    const salesOrder = await SalesOrder.createSalesOrder(salesOrderData);
    res.status(201).json(salesOrder);
  } catch (error) {
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

    const {
      order_number,
      order_date,
      customer_name,
      discount,
      gst,
      total_amount,
      status,
      items
    } = req.body;

    // Validate order date format if provided
    if (order_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(order_date)) {
        return res.status(400).json({ message: 'Invalid order date format. Use YYYY-MM-DD' });
      }
    }

    // Validate numeric fields if provided
    if (discount !== undefined && (isNaN(discount) || discount < 0 || discount > 100)) {
      return res.status(400).json({ message: 'Discount must be a number between 0 and 100' });
    }
    if (gst !== undefined && (isNaN(gst) || gst < 0 || gst > 100)) {
      return res.status(400).json({ message: 'GST must be a number between 0 and 100' });
    }
    if (total_amount !== undefined && (isNaN(total_amount) || total_amount < 0)) {
      return res.status(400).json({ message: 'Total amount must be a positive number' });
    }

    // Validate status if provided
    if (status && !['pending', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be pending, completed, or cancelled' });
    }

    // Validate items if provided
    if (items) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'At least one item is required' });
      }

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
    }

    const updateData = {
      order_number,
      order_date,
      customer_name,
      discount,
      gst,
      total_amount,
      status,
      items
    };

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