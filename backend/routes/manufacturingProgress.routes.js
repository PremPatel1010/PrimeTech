import express from 'express';
import {
  getProgressByOrderId,
  getStagesSummary,
  updateStage,
  completeManufacturing
} from '../controllers/manufacturingProgress.controller.js';

const router = express.Router();

// Get progress by order ID
router.get('/order/:orderId', getProgressByOrderId);

// Get stages summary
router.get('/order/:orderId/summary', getStagesSummary);

// Update manufacturing stage
router.put('/order/:orderId/item/:orderItemId/stage', updateStage);

// Complete manufacturing
router.put('/order/:orderId/item/:orderItemId/complete', completeManufacturing);

export default router; 