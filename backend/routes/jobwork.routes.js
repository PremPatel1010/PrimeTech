import express from 'express';
import {
  // Vendor controllers
  getAllVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  
  // Order controllers
  getAllOrders,
  getOrder,
  getNextOrderNumber,
  createOrder,
  updateOrder,
  updateOrderStatus,
  getOrdersByStatus,
  getOrdersByVendor,
  getOverdueOrders,
  getOrderByJobworkNumber,
  deleteOrder
} from '../controllers/jobwork.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Vendor routes
router.get('/vendors', getAllVendors);
router.get('/vendors/:vendorId', getVendor);
router.post('/vendors', createVendor);
router.put('/vendors/:vendorId', updateVendor);
router.delete('/vendors/:vendorId', deleteVendor);

// Order routes
router.get('/orders', getAllOrders);
router.get('/orders/next-number', getNextOrderNumber);
router.get('/orders/:orderId', getOrder);
router.post('/orders', createOrder);
router.get('/orders/by-number/:jobworkNumber', getOrderByJobworkNumber);
router.put('/orders/:orderId', updateOrder);
router.patch('/orders/:orderId/status', updateOrderStatus);
router.delete('/orders/:orderId', deleteOrder);
router.get('/orders/status/:status', getOrdersByStatus);
router.get('/orders/vendor/:vendorId', getOrdersByVendor);
router.get('/orders/overdue', getOverdueOrders);



export default router; 