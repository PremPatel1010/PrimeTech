import express from 'express';
import ManufacturingController from '../controllers/manufacturing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all manufacturing batches
router.get('/batches', ManufacturingController.getAllBatches);

// Get a specific batch by ID
router.get('/batches/:batchId', ManufacturingController.getBatchById);

// Create a new manufacturing batch
router.post('/batches', ManufacturingController.createBatch);

// Update a manufacturing batch
router.put('/batches/:batchId', ManufacturingController.updateBatch);

// Update workflow status for a batch step
router.patch('/batches/:batchId/steps/:stepId/status', ManufacturingController.updateWorkflowStatus);

// Update sub-component status for a batch
router.patch('/batches/:batchId/sub-components/:subComponentId/status', ManufacturingController.updateSubComponentStatus);

// Delete a manufacturing batch
router.delete('/batches/:batchId', ManufacturingController.deleteBatch);

export default router; 