import express from 'express';
import KPIController from '../controllers/kpi.controller.js';

const router = express.Router();

// Get inventory values (raw materials and finished products)
router.get('/inventory-values', KPIController.getInventoryValues);

// Get manufacturing efficiency metrics
router.get('/manufacturing-efficiency', KPIController.getManufacturingEfficiency);

// Get order status distribution
router.get('/order-status-distribution', KPIController.getOrderStatusDistribution);

// Get sales trend
router.get('/sales-trend', KPIController.getSalesTrend);

export default router; 