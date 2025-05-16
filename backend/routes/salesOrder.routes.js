import express from 'express';
import {
  getAllSalesOrders,
  getSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  updateStatus,
  getNextOrderNumber,
  checkOrderAvailability
} from '../controllers/salesOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';


const router = express.Router();

// Get all sales orders
router.get('/', authenticate, getAllSalesOrders);

// Get next order number
router.get('/next-order-number', getNextOrderNumber);

// Get a single sales order
router.get('/:salesOrderId', authenticate, getSalesOrder);

// Create a new sales order
router.post('/', authenticate, createSalesOrder);

// Update a sales order
router.put('/:salesOrderId', authenticate, updateSalesOrder);

// Delete a sales order
router.delete('/:salesOrderId', authenticate, deleteSalesOrder);

// Update sales order status
router.put('/:id/status', updateStatus);

// Add new route for checking order availability
router.post('/check-availability', checkOrderAvailability);

export default router; 