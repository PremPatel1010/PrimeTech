import RawMaterial from '../models/rawMaterial.model.js';

export const getAllRawMaterials = async (req, res) => {
  try {
    const rawMaterials = await RawMaterial.getAllRawMaterials();
    const mappedRawMaterials = rawMaterials.map(rm => ({
      id: rm.material_id.toString(),
      name: rm.material_name,
      unit: rm.unit,
      quantity: rm.current_stock,
      pricePerUnit: rm.unit_price,
      lastUpdated: rm.updated_at,
      minThreshold: rm.minimum_stock
    }));
    res.json(mappedRawMaterials);
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

    const mappedRawMaterial = {
      id: rawMaterial.material_id.toString(),
      name: rawMaterial.material_name,
      unit: rawMaterial.unit,
      quantity: rawMaterial.current_stock,
      pricePerUnit: rawMaterial.unit_price,
      lastUpdated: rawMaterial.updated_at,
      minThreshold: rawMaterial.minimum_stock
    };

    res.json(mappedRawMaterial);
  } catch (error) {
    console.error('Error in getRawMaterial:', error);
    res.status(500).json({ message: 'Error fetching raw material', error: error.message });
  }
};

export const createRawMaterial = async (req, res) => {
  try {
    const { material_code, material_name, moc, unit_weight, unit, current_stock, minimum_stock, unit_price } = req.body;
    
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

    const mappedRawMaterial = {
      id: rawMaterial.material_id.toString(),
      name: rawMaterial.material_name,
      unit: rawMaterial.unit,
      quantity: rawMaterial.current_stock,
      pricePerUnit: rawMaterial.unit_price,
      lastUpdated: rawMaterial.updated_at,
      minThreshold: rawMaterial.minimum_stock
    };

    res.status(201).json({
      message: 'Raw material created successfully',
      rawMaterial: mappedRawMaterial
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

    const mappedRawMaterial = {
      id: updatedRawMaterial.material_id.toString(),
      name: updatedRawMaterial.material_name,
      unit: updatedRawMaterial.unit,
      quantity: updatedRawMaterial.current_stock,
      pricePerUnit: updatedRawMaterial.unit_price,
      lastUpdated: updatedRawMaterial.updated_at,
      minThreshold: updatedRawMaterial.minimum_stock
    };

    res.json({
      message: 'Raw material updated successfully',
      rawMaterial: mappedRawMaterial
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

    const mappedRawMaterial = {
      id: deletedRawMaterial.material_id.toString(),
      name: deletedRawMaterial.material_name,
      unit: deletedRawMaterial.unit,
      quantity: deletedRawMaterial.current_stock,
      pricePerUnit: deletedRawMaterial.unit_price,
      lastUpdated: deletedRawMaterial.updated_at,
      minThreshold: deletedRawMaterial.minimum_stock
    };

    res.json({
      message: 'Raw material deleted successfully',
      rawMaterial: mappedRawMaterial
    });
  } catch (error) {
    console.error('Error in deleteRawMaterial:', error);
    res.status(500).json({ message: 'Error deleting raw material', error: error.message });
  }
}; 