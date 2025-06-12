import { JobworkVendor, JobworkOrder, JobworkReceipt } from '../models/jobwork.model.js';

// Vendor Controllers
export const getAllVendors = async (req, res) => {
  try {
    const vendors = await JobworkVendor.getAllVendors();
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendors', error: error.message });
  }
};

export const getVendor = async (req, res) => {
  try {
    const vendor = await JobworkVendor.getVendorById(req.params.vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendor', error: error.message });
  }
};

export const createVendor = async (req, res) => {
  try {
    const vendorData = {
      ...req.body,
      createdBy: req.user.userId
    };
    const vendor = await JobworkVendor.createVendor(vendorData);
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Error creating vendor', error: error.message });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const vendorData = {
      ...req.body,
      updatedBy: req.user.userId
    };
    const vendor = await JobworkVendor.updateVendor(req.params.vendorId, vendorData);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ message: 'Error updating vendor', error: error.message });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    await JobworkVendor.deleteVendor(req.params.vendorId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting vendor', error: error.message });
  }
};

// Order Controllers
export const getAllOrders = async (req, res) => {
  try {
    const orders = await JobworkOrder.getAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await JobworkOrder.getOrderById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
};

export const getNextOrderNumber = async (req, res) => {
  try {
    const orderNumber = await JobworkOrder.getNextOrderNumber();
    res.json({ orderNumber });
  } catch (error) {
    res.status(500).json({ message: 'Error generating order number', error: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      createdBy: req.user.userId
    };
    const order = await JobworkOrder.createOrder(orderData);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      updated_by: req.user.userId
    };
    const order = await JobworkOrder.updateOrder(req.params.orderId, orderData);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await JobworkOrder.updateStatus(req.params.orderId, status, req.user.userId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

export const getOrdersByStatus = async (req, res) => {
  try {
    const orders = await JobworkOrder.getOrdersByStatus(req.params.status);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders by status', error: error.message });
  }
};

export const getOrdersByVendor = async (req, res) => {
  try {
    const orders = await JobworkOrder.getOrdersByVendor(req.params.vendorId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders by vendor', error: error.message });
  }
};

export const getOrderByJobworkNumber = async (req, res) => {
  try {
    const { jobworkNumber } = req.params;
    const order = await JobworkOrder.getOrderByJobworkNumber(jobworkNumber);
    if (!order) {
      return res.status(404).json({ message: 'Jobwork order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching jobwork order by number', error: error.message });
  }
};

export const getOverdueOrders = async (req, res) => {
  try {
    const orders = await JobworkOrder.getOverdueOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching overdue orders', error: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    await JobworkOrder.deleteOrder(orderId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
};

// Receipt Controllers
export const createReceipt = async (req, res) => {
  try {
    const receiptData = {
      ...req.body,
      createdBy: req.user.userId
    };
    const receipt = await JobworkReceipt.createReceipt(receiptData);
    res.status(201).json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Error creating receipt', error: error.message });
  }
};

export const getReceiptsByOrder = async (req, res) => {
  try {
    const receipts = await JobworkReceipt.getReceiptsByOrder(req.params.orderId);
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching receipts', error: error.message });
  }
}; 