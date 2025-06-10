import express from 'express';
import ManufacturingController from '../controllers/manufacturing.controller.js';
import  {authenticate}  from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Manufacturing batch routes
router.get('/batches', ManufacturingController.getAllBatches);
router.post('/batches', ManufacturingController.createBatch);
router.get('/batches/:id', ManufacturingController.getBatchById);
router.put('/batches/:id', ManufacturingController.updateBatch);
router.delete('/batches/:id', ManufacturingController.deleteBatch);

// Manufacturing workflow routes
router.get('/workflows', ManufacturingController.getAllWorkflows);
router.post('/workflows', ManufacturingController.createWorkflow);
router.post('/batches/:batchId/workflows', ManufacturingController.createBatchWorkflow);
router.get('/workflows/:id', ManufacturingController.getWorkflowById);
router.put('/workflows/:id', ManufacturingController.updateWorkflow);
router.delete('/workflows/:id', ManufacturingController.deleteWorkflow);

// Manufacturing steps routes
router.get('/steps', ManufacturingController.getManufacturingSteps);
router.get('/workflows/:workflowId/steps', ManufacturingController.getWorkflowSteps);
router.put('/workflows/:workflowId/steps', ManufacturingController.updateWorkflowStep);

// Material consumption routes
router.get('/consumption', ManufacturingController.getAllConsumption);
router.post('/consumption', ManufacturingController.createConsumption);
router.get('/consumption/:id', ManufacturingController.getConsumptionById);
router.put('/consumption/:id', ManufacturingController.updateConsumption);
router.delete('/consumption/:id', ManufacturingController.deleteConsumption);

// Manufacturing progress routes
router.get('/progress/:orderId', ManufacturingController.getProgressByOrderId);
router.get('/analytics/batch-progress/:batchId', ManufacturingController.getBatchProgress);

export default router;