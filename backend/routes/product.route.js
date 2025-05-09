import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/auth.middleware.js';
import * as controller from '../controllers/product.controller.js';

const router = express.Router();

router.get('/', authenticate, controller.listProducts);
router.get('/:productId/bom', authenticate, controller.getProductBOM);
router.post('/', authenticate,  controller.createProduct);
router.post('/:productId/bom',  controller.addBOMItems);
router.get('/:productId', authenticate, controller.getProduct);
router.get('/', authenticate, controller.getAllProducts);
router.put('/:productId', authenticate, controller.updateProduct);
router.delete('/:productId', authenticate, controller.deleteProduct);

export default router;