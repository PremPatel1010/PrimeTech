import SubComponent from '../models/subComponent.model.js';

export const getAllSubComponents = async (req, res) => {
  try {
    const components = await SubComponent.getAll();
    res.json({
      success: true,
      data: components
    });
  } catch (error) {
    console.error('Error in getAllSubComponents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sub-components',
      error: error.message
    });
  }
};

export const getSubComponentById = async (req, res) => {
  try {
    const component = await SubComponent.getById(req.params.id);
    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Sub-component not found'
      });
    }
    res.json({
      success: true,
      data: component
    });
  } catch (error) {
    console.error('Error in getSubComponentById:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sub-component',
      error: error.message
    });
  }
};

export const createSubComponent = async (req, res) => {
  try {
    const componentData = {
      ...req.body,
      created_by: req.user.userId
    };
    const component = await SubComponent.create(componentData);
    res.status(201).json({
      success: true,
      data: component
    });
  } catch (error) {
    console.error('Error in createSubComponent:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sub-component',
      error: error.message
    });
  }
};

export const updateSubComponent = async (req, res) => {
  try {
    const updates = {
      ...req.body,
      updated_by: req.user.userId
    };
    const component = await SubComponent.update(req.params.id, updates);
    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Sub-component not found'
      });
    }
    res.json({
      success: true,
      data: component
    });
  } catch (error) {
    console.error('Error in updateSubComponent:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating sub-component',
      error: error.message
    });
  }
};

export const deleteSubComponent = async (req, res) => {
  try {
    const component = await SubComponent.delete(req.params.id);
    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Sub-component not found'
      });
    }
    res.json({
      success: true,
      data: component
    });
  } catch (error) {
    console.error('Error in deleteSubComponent:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting sub-component',
      error: error.message
    });
  }
};

export const getSubComponentTransactions = async (req, res) => {
  try {
    const transactions = await SubComponent.getTransactions(req.params.id);
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error in getSubComponentTransactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sub-component transactions',
      error: error.message
    });
  }
};

export const getLowStockComponents = async (req, res) => {
  try {
    const components = await SubComponent.getLowStockComponents();
    res.json({
      success: true,
      data: components
    });
  } catch (error) {
    console.error('Error in getLowStockComponents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock components',
      error: error.message
    });
  }
}; 