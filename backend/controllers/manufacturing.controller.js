import ManufacturingBatch from '../models/manufacturingbatch.model.js';
import BatchWorkflow from '../models/batchworkflow.model.js';
import WorkflowMaterialConsumption from '../models/workflowmaterial.model.js';
import Product from '../models/products.model.js';
import RawMaterial from '../models/rawmaterial.model.js';

class ManufacturingController {
  // Get all manufacturing batches
  static async getAllBatches(req, res) {
    try {
      const { status, priority, product_id } = req.query;
      const filters = {};
      
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (product_id) filters.product_id = product_id;

      const batches = await ManufacturingBatch.findAll(filters);
      
      res.json({
        success: true,
        data: batches,
        count: batches.length
      });
    } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturing batches',
        error: error.message
      });
    }
  }

  // Get batch by ID
  static async getBatchById(req, res) {
    try {
      const { id } = req.params;
      const batch = await ManufacturingBatch.findById(id);
      
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing batch not found'
        });
      }

      res.json({
        success: true,
        data: batch
      });
    } catch (error) {
      console.error('Error fetching batch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturing batch',
        error: error.message
      });
    }
  }

  // Create new manufacturing batch
  static async createBatch(req, res) {
    try {
      const batchData = req.body;
      console.log(batchData);
      
      // Check if product exists
      const product = await Product.findById(batchData.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const batch = await ManufacturingBatch.create(batchData);
      
      res.status(201).json({
        success: true,
        message: 'Manufacturing batch created successfully',
        data: batch
      });
    } catch (error) {
      console.error('Error creating batch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create manufacturing batch',
        error: error.message
      });
    }
  }

  // Update manufacturing batch
  static async updateBatch(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const batch = await ManufacturingBatch.update(id, updateData);
      
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing batch not found'
        });
      }

      res.json({
        success: true,
        message: 'Manufacturing batch updated successfully',
        data: batch
      });
    } catch (error) {
      console.error('Error updating batch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update manufacturing batch',
        error: error.message
      });
    }
  }

  // Update batch status
  static async updateBatchStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['planning', 'in_progress', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: planning, in_progress, completed, cancelled'
        });
      }

      const batch = await ManufacturingBatch.updateStatus(id, status);
      
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing batch not found'
        });
      }

      res.json({
        success: true,
        message: 'Batch status updated successfully',
        data: batch
      });
    } catch (error) {
      console.error('Error updating batch status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update batch status',
        error: error.message
      });
    }
  }

  // Delete manufacturing batch
  static async deleteBatch(req, res) {
    try {
      const { id } = req.params;
      const deleted = await ManufacturingBatch.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing batch not found'
        });
      }

      res.json({
        success: true,
        message: 'Manufacturing batch deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting batch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete manufacturing batch',
        error: error.message
      });
    }
  }

  // Get batch workflows
  static async getBatchWorkflows(req, res) {
    try {
      const { batchId } = req.params;
      const workflows = await BatchWorkflow.findByBatchId(batchId);
      
      res.json({
        success: true,
        data: workflows,
        count: workflows.length
      });
    } catch (error) {
      console.error('Error fetching workflows:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch batch workflows',
        error: error.message
      });
    }
  }

  // Create workflow
  static async createWorkflow(req, res) {
    try {
      const { batchId } = req.params;
      const workflowData = { ...req.body, batch_id: batchId };

      // Validate required fields
      if (!workflowData.componentName || !workflowData.componentType || !workflowData.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Component name, type, and quantity are required'
        });
      }

      const workflow = await BatchWorkflow.create(workflowData);
      
      res.status(201).json({
        success: true,
        message: 'Workflow created successfully',
        data: workflow
      });
    } catch (error) {
      console.error('Error creating workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create workflow',
        error: error.message
      });
    }
  }

  // Update workflow status
  static async updateWorkflowStatus(req, res) {
    try {
      const { workflowId } = req.params;
      const { status } = req.body;

      if (!['not_started', 'in_progress', 'completed', 'on_hold'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: not_started, in_progress, completed, on_hold'
        });
      }

      const workflow = await BatchWorkflow.updateStatus(workflowId, status);
      
      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        message: 'Workflow status updated successfully',
        data: workflow
      });
    } catch (error) {
      console.error('Error updating workflow status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update workflow status',
        error: error.message
      });
    }
  }

  // Delete workflow
  static async deleteWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const deleted = await BatchWorkflow.delete(workflowId);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete workflow',
        error: error.message
      });
    }
  }

  // Get batch progress
  static async getBatchProgress(req, res) {
    try {
      const { batchId } = req.params;
      const progress = await BatchWorkflow.calculateBatchProgress(batchId);
      
      res.json({
        success: true,
        data: {
          batchId,
          progress: progress.percentage,
          totalWorkflows: progress.total,
          completedWorkflows: progress.completed,
          inProgressWorkflows: progress.inProgress,
          notStartedWorkflows: progress.notStarted
        }
      });
    } catch (error) {
      console.error('Error calculating batch progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate batch progress',
        error: error.message
      });
    }
  }

  // Get production capacity
  static async getProductionCapacity(req, res) {
    try {
      const capacity = await ManufacturingBatch.getProductionCapacity();
      
      res.json({
        success: true,
        data: capacity
      });
    } catch (error) {
      console.error('Error fetching production capacity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch production capacity',
        error: error.message
      });
    }
  }

  // Get material requirements for a product
  static async getMaterialRequirements(req, res) {
    try {
      const { productId } = req.params;
      const { quantity = 1 } = req.query;

      const requirements = await Product.getMaterialRequirements(productId, parseInt(quantity));
      
      res.json({
        success: true,
        data: requirements
      });
    } catch (error) {
      console.error('Error fetching material requirements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch material requirements',
        error: error.message
      });
    }
  }

  // Record material consumption
  static async recordMaterialConsumption(req, res) {
    try {
      const { workflowId } = req.params;
      const consumptionData = { ...req.body, workflow_id: workflowId };

      const consumption = await WorkflowMaterialConsumption.create(consumptionData);
      
      res.status(201).json({
        success: true,
        message: 'Material consumption recorded successfully',
        data: consumption
      });
    } catch (error) {
      console.error('Error recording material consumption:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record material consumption',
        error: error.message
      });
    }
  }

  // Get workflow material consumption
  static async getWorkflowMaterialConsumption(req, res) {
    try {
      const { workflowId } = req.params;
      const consumption = await WorkflowMaterialConsumption.findByWorkflowId(workflowId);
      
      res.json({
        success: true,
        data: consumption,
        count: consumption.length
      });
    } catch (error) {
      console.error('Error fetching material consumption:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch material consumption',
        error: error.message
      });
    }
  }
}

export default ManufacturingController;