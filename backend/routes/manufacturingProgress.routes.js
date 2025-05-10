import express from 'express';
import {
  getProgressByOrderId,
  getStagesSummary,
  updateStage,
  completeManufacturing,
  getAllBatches,
  createBatch,
  updateBatchStage,
  editBatch,
  deleteBatch
} from '../controllers/manufacturingProgress.controller.js';

const router = express.Router();

// New batch endpoints
router.get('/batches', getAllBatches);
router.post('/batches', createBatch);
router.patch('/batches/:trackingId/stage', updateBatchStage);
router.patch('/batches/:trackingId', editBatch);
router.delete('/batches/:trackingId', deleteBatch);

// Get progress by order ID
router.get('/order/:orderId', getProgressByOrderId);

// Get stages summary
router.get('/order/:orderId/summary', getStagesSummary);

// Update manufacturing stage
router.put('/order/:orderId/item/:orderItemId/stage', updateStage);

// Complete manufacturing
router.put('/order/:orderId/item/:orderItemId/complete', completeManufacturing);

export default router; 