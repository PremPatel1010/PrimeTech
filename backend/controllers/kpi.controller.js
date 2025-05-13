import KPIModel from '../models/kpi.model.js';

class KPIController {
  static async getInventoryValues(req, res) {
    try {
      const values = await KPIModel.getInventoryValues();
      res.json({
        success: true,
        data: values
      });
    } catch (error) {
      console.error('Error in getInventoryValues:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving inventory values',
        error: error.message
      });
    }
  }

  static async getManufacturingEfficiency(req, res) {
    try {
      const efficiency = await KPIModel.getManufacturingEfficiency();
      res.json({
        success: true,
        data: efficiency
      });
    } catch (error) {
      console.error('Error in getManufacturingEfficiency:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving manufacturing efficiency',
        error: error.message
      });
    }
  }

  static async getOrderStatusDistribution(req, res) {
    try {
      const distribution = await KPIModel.getOrderStatusDistribution();
      res.json({
        success: true,
        data: distribution
      });
    } catch (error) {
      console.error('Error in getOrderStatusDistribution:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving order status distribution',
        error: error.message
      });
    }
  }

  static async getSalesTrend(req, res) {
    try {
      const { periodType = 'day', startDate, endDate } = req.query;
      const trend = await KPIModel.getSalesTrend(periodType, startDate, endDate);
      res.json({
        success: true,
        data: trend
      });
    } catch (error) {
      console.error('Error in getSalesTrend:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving sales trend',
        error: error.message
      });
    }
  }
}

export default KPIController; 