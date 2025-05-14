import express from 'express';
import {
  getAllStages,
  getStageById,
  createStage,
  updateStage,
  deleteStage,
  getStagesByComponentType,
  getStagesByProductId,
  createProductStages,
  deleteProductStages
} from '../controllers/manufacturingStage.controller.js';

const router = express.Router();

// Get all manufacturing stages
router.get('/', getAllStages);

// Get stages by component type
router.get('/component-type/:componentType', getStagesByComponentType);

// Get stage by ID
router.get('/:id', getStageById);

// Create new stage
router.post('/', createStage);

// Update stage
router.put('/:id', updateStage);

// Delete stage
router.delete('/:id', deleteStage);

// Product-specific stage routes
router.get('/product/:productId', getStagesByProductId);
router.post('/product/:productId', createProductStages);
router.delete('/product/:productId', deleteProductStages);

export default router; 