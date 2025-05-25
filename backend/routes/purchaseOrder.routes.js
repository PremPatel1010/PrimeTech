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
  verifyGRN,
  updateGRNItemQCStatus,
  returnGRNItem
} from '../controllers/purchaseOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Protected routes
router.use(authenticate);

// Purchase Order main routes
router.get('/', getAllPurchaseOrders);
router.get('/next-number', getNextOrderNumber);
router.get('/:id', getPurchaseOrder);
router.post('/', createPurchaseOrder);
router.put('/:poId', updatePurchaseOrder);
router.delete('/:poId', deletePurchaseOrder);
router.get('/:poId/status-history', getPOStatusHistory);
router.put('/:poId/status', updatePOStatus);
router.get('/:poId/quantities', getPOQuantitiesSummary);
router.get('/:poId/progress', getProgress);

// GRN and QC routes
router.post('/:poId/grn', createGRN);
router.post('/:poId/qc', createQCReport);
router.put('/:poId/grn/:grnId/verify', verifyGRN);

// Item-level actions
router.patch('/grn-item/:grnItemId/qc', updateGRNItemQCStatus);
router.put('/grn-item/:grnItemId/return', returnGRNItem);

export default router; 