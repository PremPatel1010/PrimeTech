import ManufacturingBatch from '../models/manufacturingbatch.model.js';
import BatchWorkflow from '../models/batchworkflow.model.js';
import WorkflowMaterialConsumption from '../models/workflowmaterial.model.js';
import Product from '../models/products.model.js';
import RawMaterial from '../models/rawmaterial.model.js';
import ManufacturingProgress from '../models/manufacturingProgress.model.js';
import ManufacturingStage from '../models/manufacturingStage.model.js';
import pool from '../db/db.js';

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

  // Create workflow for a batch
  static async createBatchWorkflow(req, res) {
    try {
      const { batchId } = req.params;
      const workflowData = req.body;

      // Check if batch exists
      const batch = await ManufacturingBatch.findById(batchId);
      if (!batch) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing batch not found'
        });
      }

      // Add batchId to workflow data
      workflowData.batch_id = batchId;
      
      const workflow = await BatchWorkflow.create(workflowData);
      
      res.status(201).json({
        success: true,
        message: 'Batch workflow created successfully',
        data: workflow
      });
    } catch (error) {
      console.error('Error creating batch workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create batch workflow',
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

  // Get all workflows
  static async getAllWorkflows(req, res) {
    try {
      const workflows = await BatchWorkflow.findAll();
      res.json({
        success: true,
        data: workflows,
        count: workflows.length
      });
    } catch (error) {
      console.error('Error fetching all workflows:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflows',
        error: error.message
      });
    }
  }

  // Get workflow by ID
  static async getWorkflowById(req, res) {
    try {
      const { id } = req.params;
      const workflow = await BatchWorkflow.findById(id);
      
      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        data: workflow
      });
    } catch (error) {
      console.error('Error fetching workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch workflow',
        error: error.message
      });
    }
  }

  // Update workflow
  static async updateWorkflow(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const workflow = await BatchWorkflow.update(id, updateData);
      
      if (!workflow) {
        return res.status(404).json({
          success: false,
          message: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        message: 'Workflow updated successfully',
        data: workflow
      });
    } catch (error) {
      console.error('Error updating workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update workflow',
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
      if (!workflowData.componentName || !workflowData.component_type || !workflowData.quantity) {
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

  // Get all material consumption
  static async getAllConsumption(req, res) {
    try {
      const consumption = await WorkflowMaterialConsumption.findAll();
      res.json({
        success: true,
        data: consumption,
        count: consumption.length
      });
    } catch (error) {
      console.error('Error fetching all consumption:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch material consumption',
        error: error.message
      });
    }
  }

  // Create material consumption
  static async createConsumption(req, res) {
    try {
      const consumption = await WorkflowMaterialConsumption.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Material consumption created successfully',
        data: consumption
      });
    } catch (error) {
      console.error('Error creating consumption:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create material consumption',
        error: error.message
      });
    }
  }

  // Get consumption by ID
  static async getConsumptionById(req, res) {
    try {
      const { id } = req.params;
      const consumption = await WorkflowMaterialConsumption.findById(id);
      
      if (!consumption) {
        return res.status(404).json({
          success: false,
          message: 'Material consumption not found'
        });
      }

      res.json({
        success: true,
        data: consumption
      });
    } catch (error) {
      console.error('Error fetching consumption:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch material consumption',
        error: error.message
      });
    }
  }

  // Update consumption
  static async updateConsumption(req, res) {
    try {
      const { id } = req.params;
      const consumption = await WorkflowMaterialConsumption.update(id, req.body);
      
      if (!consumption) {
        return res.status(404).json({
          success: false,
          message: 'Material consumption not found'
        });
      }

      res.json({
        success: true,
        message: 'Material consumption updated successfully',
        data: consumption
      });
    } catch (error) {
      console.error('Error updating consumption:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update material consumption',
        error: error.message
      });
    }
  }

  // Delete consumption
  static async deleteConsumption(req, res) {
    try {
      const { id } = req.params;
      const deleted = await WorkflowMaterialConsumption.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Material consumption not found'
        });
      }

      res.json({
        success: true,
        message: 'Material consumption deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting consumption:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete material consumption',
        error: error.message
      });
    }
  }

  // Get progress by order ID
  static async getProgressByOrderId(req, res) {
    try {
      const { orderId } = req.params;
      const progress = await ManufacturingProgress.getProgressByOrderId(orderId);
      res.json(progress);
    } catch (error) {
      console.error('Error in getProgressByOrderId:', error);
      res.status(500).json({ message: 'Error fetching manufacturing progress' });
    }
  }

  // Get workflow steps
  static async getWorkflowSteps(req, res) {
    try {
      const { workflowId } = req.params;
      const steps = await BatchWorkflow.getWorkflowSteps(workflowId);
      res.json({
        success: true,
        data: steps
      });
    } catch (error) {
      console.error('Error getting workflow steps:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow steps'
      });
    }
  }

  // Update workflow step status
  static async updateWorkflowStep(req, res) {
    try {
      const { workflowId } = req.params;
      const { stepCode, status } = req.body;
      
      if (!['not_started', 'in_progress', 'completed', 'on_hold'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status provided'
        });
      }

      const updatedStep = await BatchWorkflow.updateWorkflowStep(workflowId, stepCode, status);
      
      res.json({
        success: true,
        data: updatedStep
      });
    } catch (error) {
      console.error('Error updating workflow step:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update workflow step'
      });
    }
  }

  // Get manufacturing steps
  static async getManufacturingSteps(req, res) {
    try {
      const query = 'SELECT * FROM manufacturing.steps ORDER BY sequence ASC';
      const result = await pool.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error getting manufacturing steps:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get manufacturing steps'
      });
    }
  }
}

export default ManufacturingController;