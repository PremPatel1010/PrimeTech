import express from 'express';
import {
  getAllPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getNextOrderNumber
} from '../controllers/purchaseOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all purchase orders
router.get('/', authenticate, getAllPurchaseOrders);

// Add route for next order number
router.get('/next-order-number', getNextOrderNumber);

// Get a single purchase order
router.get('/:poId', authenticate, getPurchaseOrder);

// Create a new purchase order
router.post('/', authenticate, createPurchaseOrder);

// Update a purchase order
router.put('/:poId', authenticate, updatePurchaseOrder);

// Delete a purchase order
router.delete('/:poId', authenticate, deletePurchaseOrder);

export default router; 