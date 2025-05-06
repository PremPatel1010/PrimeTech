import RevenueAnalysis from '../models/revenueAnalysis.model.js';

class RevenueAnalysisController {
  static async getRevenueAnalysis(req, res) {
    try {
      const { periodType, startDate, endDate } = req.query;
      
      if (!periodType || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Period type, start date, and end date are required'
        });
      }

      const analysis = await RevenueAnalysis.getRevenueAnalysis(periodType, startDate, endDate);
      
      if (!analysis) {
        return res.status(404).json({
          success: false,
          message: 'No revenue analysis found for the specified period'
        });
      }

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error in getRevenueAnalysis:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving revenue analysis',
        error: error.message
      });
    }
  }

  static async getDashboardMetrics(req, res) {
    try {
      const metrics = await RevenueAnalysis.getDashboardMetrics();
      
      if (!metrics) {
        return res.status(404).json({
          success: false,
          message: 'No dashboard metrics available'
        });
      }

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error in getDashboardMetrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving dashboard metrics',
        error: error.message
      });
    }
  }

  static async getProductPerformance(req, res) {
    try {
      const { productId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const performance = await RevenueAnalysis.getProductPerformance(productId, startDate, endDate);
      
      if (!performance) {
        return res.status(404).json({
          success: false,
          message: 'No performance data found for the specified product and period'
        });
      }

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error in getProductPerformance:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving product performance',
        error: error.message
      });
    }
  }

  static async getTrendAnalysis(req, res) {
    try {
      const { periodType, startDate, endDate } = req.query;

      if (!periodType || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Period type, start date, and end date are required'
        });
      }

      const trends = await RevenueAnalysis.getTrendAnalysis(periodType, startDate, endDate);
      
      if (!trends || trends.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No trend data found for the specified period'
        });
      }

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('Error in getTrendAnalysis:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving trend analysis',
        error: error.message
      });
    }
  }
}

export default RevenueAnalysisController; 