import express from 'express';
import {
  getAllSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
} from '../controllers/supplier.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all suppliers
router.get('/', authenticate, getAllSuppliers);

// Get a single supplier
router.get('/:supplierId', authenticate, getSupplier);

// Create a new supplier
router.post('/', authenticate, createSupplier);

// Update a supplier
router.put('/:supplierId', authenticate, updateSupplier);

// Delete a supplier
router.delete('/:supplierId', authenticate, deleteSupplier);

export default router; 