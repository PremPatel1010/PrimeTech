import express from 'express';
import {
  getAllPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  getNextOrderNumber,
  getPOStatusHistory,
  getPOQuantitiesSummary,
  createGRN,
  createQCReport,
  updatePOStatus,
  getProgress,
  verifyGRN
} from '../controllers/purchaseOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Specific routes (must come before parameterized routes)
router.get('/next-number', getNextOrderNumber);

// Basic CRUD routes
router.get('/', getAllPurchaseOrders);
router.post('/', createPurchaseOrder);

// Status and history routes
router.get('/:poId/status-history', getPOStatusHistory);
router.get('/:poId/quantities', getPOQuantitiesSummary);
router.put('/:poId/status', updatePOStatus);

// GRN and QC routes
router.post('/:poId/grn', createGRN);
router.post('/:poId/qc', createQCReport);
router.put('/:poId/grn/:grnId/verify', verifyGRN);

// Progress route
router.get('/:poId/progress', getProgress);

// Parameterized routes (moved to end)
router.get('/:poId', getPurchaseOrder);
router.put('/:poId', updatePurchaseOrder);
router.delete('/:poId', deletePurchaseOrder);

export default router; 