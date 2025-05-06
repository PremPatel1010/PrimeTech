import ManufacturingStage from '../models/manufacturingStage.model.js';

// Get all manufacturing stages
export const getAllStages = async (req, res) => {
  try {
    const stages = await ManufacturingStage.getAllStages();
    res.json(stages);
  } catch (error) {
    console.error('Error in getAllStages:', error);
    res.status(500).json({ message: 'Error retrieving manufacturing stages' });
  }
};

// Get stage by ID
export const getStageById = async (req, res) => {
  try {
    const { id } = req.params;
    const stage = await ManufacturingStage.getStageById(id);
    
    if (!stage) {
      return res.status(404).json({ message: 'Manufacturing stage not found' });
    }
    
    res.json(stage);
  } catch (error) {
    console.error('Error in getStageById:', error);
    res.status(500).json({ message: 'Error retrieving manufacturing stage' });
  }
};

// Create new stage
export const createStage = async (req, res) => {
  try {
    const { component_type, stage_name, sequence } = req.body;

    // Validate required fields
    if (!component_type || !stage_name || sequence === undefined) {
      return res.status(400).json({ 
        message: 'component_type, stage_name, and sequence are required' 
      });
    }

    // Validate component_type
    const validTypes = ['motor', 'pump', 'combined'];
    if (!validTypes.includes(component_type)) {
      return res.status(400).json({ 
        message: 'component_type must be one of: motor, pump, combined' 
      });
    }

    const newStage = await ManufacturingStage.createStage({
      component_type,
      stage_name,
      sequence
    });

    res.status(201).json(newStage);
  } catch (error) {
    console.error('Error in createStage:', error);
    res.status(500).json({ message: 'Error creating manufacturing stage' });
  }
};

// Update stage
export const updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { component_type, stage_name, sequence } = req.body;

    // Validate component_type if provided
    if (component_type) {
      const validTypes = ['motor', 'pump', 'combined'];
      if (!validTypes.includes(component_type)) {
        return res.status(400).json({ 
          message: 'component_type must be one of: motor, pump, combined' 
        });
      }
    }

    const updatedStage = await ManufacturingStage.updateStage(id, {
      component_type,
      stage_name,
      sequence
    });

    if (!updatedStage) {
      return res.status(404).json({ message: 'Manufacturing stage not found' });
    }

    res.json(updatedStage);
  } catch (error) {
    console.error('Error in updateStage:', error);
    res.status(500).json({ message: 'Error updating manufacturing stage' });
  }
};

// Delete stage
export const deleteStage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStage = await ManufacturingStage.deleteStage(id);

    if (!deletedStage) {
      return res.status(404).json({ message: 'Manufacturing stage not found' });
    }

    res.json({ message: 'Manufacturing stage deleted successfully' });
  } catch (error) {
    console.error('Error in deleteStage:', error);
    res.status(500).json({ message: 'Error deleting manufacturing stage' });
  }
};

// Get stages by component type
export const getStagesByComponentType = async (req, res) => {
  try {
    const { componentType } = req.params;
    
    // Validate component_type
    const validTypes = ['motor', 'pump', 'combined'];
    if (!validTypes.includes(componentType)) {
      return res.status(400).json({ 
        message: 'component_type must be one of: motor, pump, combined' 
      });
    }

    const stages = await ManufacturingStage.getStagesByComponentType(componentType);
    res.json(stages);
  } catch (error) {
    console.error('Error in getStagesByComponentType:', error);
    res.status(500).json({ message: 'Error retrieving manufacturing stages' });
  }
}; 