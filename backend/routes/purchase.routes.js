import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as grnController from '../controllers/grn.controller.js';

const router = express.Router();

// GRN Routes
router.post('/:purchase_order_id/grn', authenticate, grnController.createGRN);
router.get('/:purchase_order_id/grns', authenticate, grnController.getGRNsByPO);
router.get('/:purchase_order_id/material-summary', authenticate, grnController.getMaterialSummary);
router.put('/:purchase_order_id/grn/:grn_id/verify', authenticate, grnController.verifyGRN);
router.get('/:purchase_order_id/grn/:grn_id/download', authenticate, grnController.downloadGRNPDF);
router.get('/purchase-orders/grn/:id/pdf', grnController.generateGRNPDF);
router.patch('/:purchase_order_id/grn/:grn_id/qc', grnController.editGRNForQC);
router.post('/:purchase_order_id/grn/:grn_id/return', grnController.createReturnEntry);
router.post('/:purchase_order_id/grn/:grn_id/store', grnController.sendToStore);
router.get('/:purchase_order_id/grn/:grn_id/returns', grnController.getReturnHistoryForGRN);

export default router; 