import express from 'express';
import {
  getAllSubComponents,
  getSubComponentById,
  createSubComponent,
  updateSubComponent,
  deleteSubComponent,
  getSubComponentTransactions,
  getLowStockComponents
} from '../controllers/subComponent.controller.js';
import {authenticate}  from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all sub-components
router.get('/', getAllSubComponents);

// Get low stock components
router.get('/low-stock', getLowStockComponents);

// Get sub-component by ID
router.get('/:id', getSubComponentById);

// Create new sub-component
router.post('/', createSubComponent);

// Update sub-component
router.put('/:id', updateSubComponent);

// Delete sub-component
router.delete('/:id', deleteSubComponent);

// Get sub-component transactions
router.get('/:id/transactions', getSubComponentTransactions);

export default router; 