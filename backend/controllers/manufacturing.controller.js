import ManufacturingService from '../services/manufacturing.service.js';
import { validateBatchData, validateStatusUpdate } from '../utils/validators.js';

class ManufacturingController {
  static async getAllBatches(req, res) {
    try {
      const batches = await ManufacturingService.getAllBatches();
      res.json(batches);
    } catch (error) {
      console.error('Error in ManufacturingController.getAllBatches:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }

  static async getBatchById(req, res) {
    try {
      const { batchId } = req.params;
      const batch = await ManufacturingService.getBatchById(batchId);
      res.json(batch);
    } catch (error) {
      console.error('Error in ManufacturingController.getBatchById:', error);
      if (error.message === 'Manufacturing batch not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }
  }

  static async createBatch(req, res) {
    try {
      // Validate request data
      
      const validationError = validateBatchData(req.body);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      // Add user ID from auth middleware
      const batchData = {
        product_id: req.body.product_id,
        sales_order_id: req.body.sales_order_id,
        quantity: req.body.quantity,
        notes: req.body.notes,
        created_by: req.user.userId
      };

      const batch = await ManufacturingService.createBatch(batchData);
      res.status(201).json(batch);
    } catch (error) {
      console.error('Error in ManufacturingController.createBatch:', error);
      if (error.message === 'Product not found' || 
          error.message === 'Product has no manufacturing steps defined' ||
          error.message === 'Product has no sub-components defined') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }
  }

  static async updateBatch(req, res) {
    try {
      const { batchId } = req.params;
      const { product_id, sales_order_id, quantity, notes } = req.body;

      const batchData = {
        product_id,
        sales_order_id: sales_order_id || null,
        quantity,
        notes
      };

      const updatedBatch = await ManufacturingService.updateBatch(
        parseInt(batchId),
        batchData,
        req.user.userId
      );
      res.json(updatedBatch);
    } catch (error) {
      console.error('Error in ManufacturingController.updateBatch:', error);
      if (error.message === 'Manufacturing batch not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }
  }

  static async updateWorkflowStatus(req, res) {
    try {
      const { batchId, stepId } = req.params;
      const { status } = req.body;

      // Validate status update
      const validationError = validateStatusUpdate(status);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const batch = await ManufacturingService.updateWorkflowStatus(
        batchId,
        stepId,
        status,
        req.user.userId
      );
      res.json(batch);
    } catch (error) {
      console.error('Error in ManufacturingController.updateWorkflowStatus:', error);
      if (error.message === 'Manufacturing batch not found' ||
          error.message === 'Manufacturing step not found in batch' ||
          error.message.includes('Invalid status transition') ||
          error.message.includes('Insufficient raw material stock')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }
  }

  static async updateSubComponentStatus(req, res) {
    try {
      const { batchId, subComponentId } = req.params;
      const { status } = req.body;

      // Validate status update
      const validationError = validateStatusUpdate(status);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const batch = await ManufacturingService.updateSubComponentStatus(
        batchId,
        subComponentId,
        status,
        req.user.userId
      );
      res.json(batch);
    } catch (error) {
      console.error('Error in ManufacturingController.updateSubComponentStatus:', error);
      if (error.message === 'Manufacturing batch not found' ||
          error.message === 'Sub-component not found in batch' ||
          error.message.includes('Invalid status transition')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }
  }

  static async deleteBatch(req, res) {
    try {
      const { batchId } = req.params;
      await ManufacturingService.deleteBatch(parseInt(batchId));
      res.json({ message: 'Batch deleted successfully' });
    } catch (error) {
      console.error('Error in ManufacturingController.deleteBatch:', error);
      if (error.message === 'Manufacturing batch not found' ||
          error.message === 'Cannot delete completed batch') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }
  }

  static async checkRawMaterialAvailability(req, res) {
    try {
      const { batchId } = req.params;
      const insufficientMaterials = await ManufacturingService.checkRawMaterialAvailability(parseInt(batchId));
      res.json(insufficientMaterials);
    } catch (error) {
      console.error('Error in ManufacturingController.checkRawMaterialAvailability:', error);
      if (error.message === 'Manufacturing batch not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    }
  }
}

export default ManufacturingController; 