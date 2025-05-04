import RawMaterial from '../models/rawMaterial.model.js';

export const getAllRawMaterials = async (req, res) => {
  try {
    const rawMaterials = await RawMaterial.getAllRawMaterials();
    res.json(rawMaterials);
  } catch (error) {
    console.error('Error in getAllRawMaterials:', error);
    res.status(500).json({ message: 'Error fetching raw materials', error: error.message });
  }
};

export const getRawMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const rawMaterial = await RawMaterial.getRawMaterialById(materialId);
    
    if (!rawMaterial) {
      return res.status(404).json({ message: 'Raw material not found' });
    }

    res.json(rawMaterial);
  } catch (error) {
    console.error('Error in getRawMaterial:', error);
    res.status(500).json({ message: 'Error fetching raw material', error: error.message });
  }
};

export const createRawMaterial = async (req, res) => {
  try {
    const { material_code ,material_name,moc, unit_weight, unit, current_stock, minimum_stock, unit_price } = req.body;
    
    // Validate required fields
    if (!material_name || !material_code || !moc || current_stock === undefined || minimum_stock === undefined || unit_price === undefined) {
      return res.status(400).json({ 
        message: 'Material name, material code, moc, current stock, and unit price are required' 
      });
    }

    const rawMaterial = await RawMaterial.createRawMaterial({
      material_name,
      material_code,
      moc,
      unit_weight,
      unit,
      current_stock,
      minimum_stock,
      unit_price
    });

    res.status(201).json({
      message: 'Raw material created successfully',
      rawMaterial
    });
  } catch (error) {
    console.error('Error in createRawMaterial:', error);
    res.status(500).json({ message: 'Error creating raw material', error: error.message });
  }
};

export const updateRawMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const { material_name, material_code, moc, unit_weight, unit, current_stock, minimum_stock, unit_price } = req.body;

    const updatedRawMaterial = await RawMaterial.updateRawMaterial(materialId, {
      material_name,
      material_code,
      moc,
      unit_weight,
      unit,
      current_stock,
      minimum_stock,
      unit_price
    });

    if (!updatedRawMaterial) {
      return res.status(404).json({ message: 'Raw material not found' });
    }

    res.json({
      message: 'Raw material updated successfully',
      rawMaterial: updatedRawMaterial
    });
  } catch (error) {
    console.error('Error in updateRawMaterial:', error);
    res.status(500).json({ message: 'Error updating raw material', error: error.message });
  }
};

export const deleteRawMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const deletedRawMaterial = await RawMaterial.deleteRawMaterial(materialId);

    if (!deletedRawMaterial) {
      return res.status(404).json({ message: 'Raw material not found' });
    }

    res.json({
      message: 'Raw material deleted successfully',
      rawMaterial: deletedRawMaterial
    });
  } catch (error) {
    console.error('Error in deleteRawMaterial:', error);
    res.status(500).json({ message: 'Error deleting raw material', error: error.message });
  }
}; 