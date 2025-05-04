import express from 'express';
import {
  getAllRawMaterials,
  getRawMaterial,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial
} from '../controllers/rawMaterial.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all raw materials
router.get('/', authenticate,getAllRawMaterials);

// Get a single raw material
router.get('/:materialId', authenticate,getRawMaterial);

// Create a new raw material
router.post('/', authenticate,createRawMaterial);

// Update a raw material
router.put('/:materialId', authenticate,updateRawMaterial);

// Delete a raw material
router.delete('/:materialId', authenticate,deleteRawMaterial);

export default router; 