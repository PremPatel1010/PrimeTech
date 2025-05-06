import express from 'express';
import {
  getAllStages,
  getStageById,
  createStage,
  updateStage,
  deleteStage,
  getStagesByComponentType
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

export default router; 