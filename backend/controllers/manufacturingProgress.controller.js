import ManufacturingProgress from '../models/manufacturingProgress.model.js';
import ManufacturingStage from '../models/manufacturingStage.model.js';

// Get progress by order ID
export const getProgressByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const progress = await ManufacturingProgress.getProgressByOrderId(orderId);
    res.json(progress);
  } catch (error) {
    console.error('Error in getProgressByOrderId:', error);
    res.status(500).json({ message: 'Error fetching manufacturing progress' });
  }
};

// Get stages summary
export const getStagesSummary = async (req, res) => {
  try {
    const { orderId } = req.params;
    const summary = await ManufacturingProgress.getStagesSummary(orderId);
    res.json(summary);
  } catch (error) {
    console.error('Error in getStagesSummary:', error);
    res.status(500).json({ message: 'Error fetching stages summary' });
  }
};

// Get current stage for a product in an order
export const getCurrentStage = async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const currentStage = await ManufacturingProgress.getCurrentStage(orderId, productId);
    
    if (!currentStage) {
      return res.status(404).json({ message: 'No manufacturing progress found for this product' });
    }
    
    res.json(currentStage);
  } catch (error) {
    console.error('Error in getCurrentStage:', error);
    res.status(500).json({ message: 'Error retrieving current stage' });
  }
};

// Update manufacturing stage
export const updateStage = async (req, res) => {
  try {
    const { orderId, orderItemId } = req.params;
    const { newStageId, quantity } = req.body;
    
    const updatedProgress = await ManufacturingProgress.updateManufacturingStage(
      orderId,
      orderItemId,
      newStageId,
      quantity
    );
    
    if (!updatedProgress) {
      return res.status(404).json({ message: 'Manufacturing progress not found' });
    }

    res.json(updatedProgress);
  } catch (error) {
    console.error('Error in updateStage:', error);
    res.status(500).json({ message: 'Error updating manufacturing stage' });
  }
};

// Complete manufacturing
export const completeManufacturing = async (req, res) => {
  try {
    const { orderId, orderItemId } = req.params;
    const completedProgress = await ManufacturingProgress.completeManufacturing(orderId, orderItemId);
    
    if (!completedProgress) {
      return res.status(404).json({ message: 'Manufacturing progress not found' });
    }

    res.json({
      message: 'Manufacturing completed and added to inventory',
      completedProgress
    });
  } catch (error) {
    console.error('Error in completeManufacturing:', error);
    if (error.message === 'Cannot complete manufacturing: not in final stage') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error completing manufacturing' });
  }
};

// Get all manufacturing batches
export const getAllBatches = async (req, res) => {
  try {
    const batches = await ManufacturingProgress.getAllBatches();
    res.json(batches);
  } catch (error) {
    console.error('Error in getAllBatches:', error);
    res.status(500).json({ message: 'Error fetching manufacturing batches' });
  }
};

// Create a new manufacturing batch
export const createBatch = async (req, res) => {
  try {
    const batch = await ManufacturingProgress.createBatch(req.body);
    res.status(201).json(batch);
  } catch (error) {
    console.error('Error in createBatch:', error);
    res.status(500).json({ message: 'Error creating manufacturing batch' });
  }
};

// Update a batch's stage and progress
export const updateBatchStage = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const updated = await ManufacturingProgress.updateBatchStage(trackingId, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error in updateBatchStage:', error);
    res.status(500).json({ message: 'Error updating batch stage' });
  }
};

// Edit a manufacturing batch
export const editBatch = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const update = req.body;
    const updated = await ManufacturingProgress.editBatch(trackingId, update);
    res.json(updated);
  } catch (error) {
    console.error('Error in editBatch:', error);
    res.status(500).json({ message: 'Error editing manufacturing batch' });
  }
};

// Delete a manufacturing batch
export const deleteBatch = async (req, res) => {
  try {
    const { trackingId } = req.params;
    await ManufacturingProgress.deleteBatch(trackingId);
    res.json({ message: 'Batch deleted' });
  } catch (error) {
    console.error('Error in deleteBatch:', error);
    res.status(500).json({ message: 'Error deleting manufacturing batch' });
  }
}; 