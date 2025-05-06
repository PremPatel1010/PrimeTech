import express from 'express';
import {
  getAllFinishedProducts,
  getFinishedProductById,
  createFinishedProduct,
  updateFinishedProduct,
  deleteFinishedProduct,
  updateQuantity,
  getProductInventory
} from '../controllers/finishedProduct.controller.js';

const router = express.Router();

// Get all finished products
router.get('/', getAllFinishedProducts);

// Get finished product by ID
router.get('/:id', getFinishedProductById);

// Create finished product
router.post('/', createFinishedProduct);

// Update finished product
router.put('/:id', updateFinishedProduct);

// Delete finished product
router.delete('/:id', deleteFinishedProduct);

// Update quantity
router.patch('/:id/quantity', updateQuantity);

// Get product inventory
router.get('/product/:productId/inventory', getProductInventory);

export default router; 