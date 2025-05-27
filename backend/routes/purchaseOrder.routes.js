import express from 'express';
import PurchaseOrderController from '../controllers/purchaseOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Material and Supplier Routes (specific routes first)
router.get('/materials', authenticate, PurchaseOrderController.listMaterials);
router.get('/suppliers', authenticate, PurchaseOrderController.listSuppliers);

// Purchase Order Routes
router.post('/', authenticate, PurchaseOrderController.createPurchaseOrder);
router.get('/', authenticate, PurchaseOrderController.listPurchaseOrders);

// GRN Routes
router.post('/:poId/grns', authenticate, PurchaseOrderController.createGRN);
router.post('/:poId/replacement-grns', authenticate, PurchaseOrderController.createReplacementGRN);
router.get('/grns/:id', authenticate, PurchaseOrderController.getGRN);

// QC Routes
router.patch(
    '/:poId/grns/:grnId/materials/:materialId/qc',
    authenticate,
    PurchaseOrderController.updateGRNMaterialQC
);

// Pending Quantities
router.get('/:poId/pending-quantities', authenticate, PurchaseOrderController.getPendingQuantities);

// Parameterized routes last
router.get('/:id', authenticate, PurchaseOrderController.getPurchaseOrder);
router.patch('/:id/status', authenticate, PurchaseOrderController.updatePOStatus);

export default router; 