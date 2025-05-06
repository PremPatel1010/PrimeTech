import express from 'express';
import {
  getAllSalesOrders,
  getSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  updateStatus
} from '../controllers/salesOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';


const router = express.Router();

// Get all sales orders
router.get('/', authenticate, getAllSalesOrders);

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

export default router; 