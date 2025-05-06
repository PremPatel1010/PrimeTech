import express from 'express';
import RevenueAnalysisController from '../controllers/revenueAnalysis.controller.js';

const router = express.Router();

// Get overall revenue analysis for a specific period
router.get('/analysis', RevenueAnalysisController.getRevenueAnalysis);

// Get dashboard metrics (current month vs previous month, top products, recent orders)
router.get('/dashboard', RevenueAnalysisController.getDashboardMetrics);

// Get performance analysis for a specific product
router.get('/product/:productId', RevenueAnalysisController.getProductPerformance);

// Get trend analysis over time
router.get('/trends', RevenueAnalysisController.getTrendAnalysis);

export default router; 