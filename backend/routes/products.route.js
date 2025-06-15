import express from 'express';
import productController from '../controllers/products.controller.js';

const router = express.Router();

// Product routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Sub-component routes
router.post('/:id/sub-components', productController.addSubComponent);
router.post('/:id/sub-components/:subComponentId/materials', productController.addMaterialToSubComponent);
router.put('/:id/sub-components/:subComponentId', productController.updateSubComponent);
router.delete('/:id/sub-components/:subComponentId', productController.deleteSubComponent);
router.put('/:id/sub-components/:subComponentId/materials/:materialId', productController.updateMaterial);
router.delete('/:id/sub-components/:subComponentId/materials/:materialId', productController.deleteMaterial);

// Manufacturing Steps routes
router.get('/:id/manufacturing-steps', productController.getProductManufacturingSteps);
router.post('/:id/manufacturing-steps', productController.addManufacturingStep);
router.put('/:id/manufacturing-steps/:stepId', productController.updateManufacturingStep);
router.delete('/:id/manufacturing-steps/:stepId', productController.deleteManufacturingStep);

// Sub-component Manufacturing Steps routes
router.get('/:id/sub-components/:subComponentId/manufacturing-steps', productController.getSubComponentManufacturingSteps);
router.post('/:id/sub-components/:subComponentId/manufacturing-steps', productController.addSubComponentManufacturingStep);
router.put('/:id/sub-components/:subComponentId/manufacturing-steps/:stepId', productController.updateSubComponentManufacturingStep);
router.delete('/:id/sub-components/:subComponentId/manufacturing-steps/:stepId', productController.deleteSubComponentManufacturingStep);

// Raw materials routes
router.get('/raw-materials', productController.getAllRawMaterials);
router.get('/raw-materials/low-stock', productController.getLowStockMaterials);
router.get('/raw-materials/:materialId', productController.getRawMaterial);
router.patch('/raw-materials/:materialId/stock', productController.updateMaterialStock);

// Product Materials routes
router.post('/:id/materials', productController.addMaterialToProduct);
router.put('/:id/materials/:materialId', productController.updateProductMaterial);
router.delete('/:id/materials/:materialId', productController.deleteProductMaterial);

export default router;