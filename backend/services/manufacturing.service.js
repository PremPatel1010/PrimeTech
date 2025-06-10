import ManufacturingBatch from '../models/manufacturing.model.js';
import Product from '../models/products.model.js';

class ManufacturingService {
  static async getAllBatches() {
    try {
      const batches = await ManufacturingBatch.findAll();
      return batches;
    } catch (error) {
      console.error('Error in ManufacturingService.getAllBatches:', error);
      throw error;
    }
  }

  static async getBatchById(batchId) {
    try {
      const batch = await ManufacturingBatch.findById(batchId);
      if (!batch) {
        throw new Error('Manufacturing batch not found');
      }
      return batch;
    } catch (error) {
      console.error('Error in ManufacturingService.getBatchById:', error);
      throw error;
    }
  }

  static async createBatch(batchData) {
    try {
      // Validate product exists
      const product = await Product.findById(batchData.product_id);
      if (!product) {
        throw new Error('Product not found');
      }

    

      // Create batch
      const batch = await ManufacturingBatch.create({
        product_id: batchData.product_id,
        sales_order_id: batchData.sales_order_id,
        quantity: batchData.quantity,
        notes: batchData.notes,
        created_by: batchData.created_by
      });
      return batch;
    } catch (error) {
      console.error('Error in ManufacturingService.createBatch:', error);
      throw error;
    }
  }

  static async updateBatch(batchId, batchData, userId) {
    try {
      const batch = await ManufacturingBatch.findById(batchId);
      if (!batch) {
        throw new Error('Manufacturing batch not found');
      }

      const updatedBatch = await ManufacturingBatch.update(batchId, batchData, userId);
      return updatedBatch;
    } catch (error) {
      console.error('Error in ManufacturingService.updateBatch:', error);
      throw error;
    }
  }

  static async updateWorkflowStatus(batchId, stepId, status, userId) {
    try {
      // Validate batch exists
      const batch = await ManufacturingBatch.findById(batchId);
      if (!batch) {
        throw new Error('Manufacturing batch not found');
      }

      const parsedStepId = parseInt(stepId);
      // Validate step exists in batch workflows
      const stepExists = batch.workflows.some(w => w.step_id === parsedStepId);
      if (!stepExists) {
        throw new Error('Manufacturing step not found in batch');
      }

      // Validate status transition
      const currentStep = batch.workflows.find(w => w.step_id === parsedStepId);
      if (!this.isValidStatusTransition(currentStep.status, status)) {
        throw new Error(`Invalid status transition from ${currentStep.status} to ${status}`);
      }

      // Update workflow status
      const updatedBatch = await ManufacturingBatch.updateWorkflowStatus(
        batchId,
        stepId,
        status,
        userId
      );

      return updatedBatch;
    } catch (error) {
      console.error('Error in ManufacturingService.updateWorkflowStatus:', error);
      throw error;
    }
  }

  static async updateSubComponentStatus(batchId, subComponentId, status, userId) {
    try {
      // Validate batch exists
      const batch = await ManufacturingBatch.findById(batchId);
      if (!batch) {
        throw new Error('Manufacturing batch not found');
      }

      // Validate sub-component exists in batch
      const subComponentExists = batch.sub_components.some(sc => sc.sub_component_id === subComponentId);
      if (!subComponentExists) {
        throw new Error('Sub-component not found in batch');
      }

      // Validate status transition
      const currentSubComponent = batch.sub_components.find(sc => sc.sub_component_id === subComponentId);
      if (!this.isValidStatusTransition(currentSubComponent.status, status)) {
        throw new Error(`Invalid status transition from ${currentSubComponent.status} to ${status}`);
      }

      // Update sub-component status
      const updatedBatch = await ManufacturingBatch.updateSubComponentStatus(
        batchId,
        subComponentId,
        status,
        userId
      );

      return updatedBatch;
    } catch (error) {
      console.error('Error in ManufacturingService.updateSubComponentStatus:', error);
      throw error;
    }
  }

  static async deleteBatch(batchId) {
    try {
      // Validate batch exists
      const batch = await ManufacturingBatch.findById(batchId);
      if (!batch) {
        throw new Error('Manufacturing batch not found');
      }

      // Validate batch can be deleted (not completed)
      if (batch.status === 'completed') {
        throw new Error('Cannot delete completed batch');
      }

      // Delete batch
      await ManufacturingBatch.delete(batchId);
      return { message: 'Batch deleted successfully' };
    } catch (error) {
      console.error('Error in ManufacturingService.deleteBatch:', error);
      throw error;
    }
  }

  // Helper method to validate status transitions
  static isValidStatusTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus) {
      return true; // Allow no-op transitions
    }

    const validTransitions = {
      'pending': ['in_progress', 'skipped'],
      'in_progress': ['completed'], // Removed 'pending'
      'completed': [], // Once completed, no further transitions allowed from here typically
      'skipped': ['pending'] // Allow retrying a skipped step
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}

export default ManufacturingService; 