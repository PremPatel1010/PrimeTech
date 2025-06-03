import express from 'express';
const router = express.Router();
import manufacturingController from '../controllers/manufacturing.controller.js';

// Manufacturing Batch routes
router.get('/batches', manufacturingController.getAllBatches);
router.get('/batches/:id', manufacturingController.getBatchById);
router.post('/batches', manufacturingController.createBatch);
router.put('/batches/:id', manufacturingController.updateBatch);
router.patch('/batches/:id/status', manufacturingController.updateBatchStatus);
router.delete('/batches/:id', manufacturingController.deleteBatch);

// Batch Workflow routes
router.get('/batches/:batchId/workflows', manufacturingController.getBatchWorkflows);
router.post('/batches/:batchId/workflows', manufacturingController.createWorkflow);
router.patch('/workflows/:workflowId/status', manufacturingController.updateWorkflowStatus);
router.delete('/workflows/:workflowId', manufacturingController.deleteWorkflow);

// Manufacturing Analytics routes
router.get('/analytics/batch-progress/:batchId', manufacturingController.getBatchProgress);
router.get('/analytics/production-capacity', manufacturingController.getProductionCapacity);
router.get('/analytics/material-requirements/:productId', manufacturingController.getMaterialRequirements);

// Material consumption tracking
router.post('/workflows/:workflowId/material-consumption', manufacturingController.recordMaterialConsumption);
router.get('/workflows/:workflowId/material-consumption', manufacturingController.getWorkflowMaterialConsumption);
  
export default router;  