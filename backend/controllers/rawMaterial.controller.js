import RawMaterial from '../models/rawMaterial.model.js';

export const getAllRawMaterials = async (req, res) => {
  try {
    const rawMaterials = await RawMaterial.getAllRawMaterials();
    const mappedRawMaterials = rawMaterials.map(rm => ({
      material_id: rm.material_id,
      material_code: rm.material_code,
      material_name: rm.material_name,
      moc: rm.moc,
      unit_weight: rm.unit_weight,
      unit: rm.unit,
      current_stock: rm.current_stock,
      minimum_stock: rm.minimum_stock,
      unit_price: rm.unit_price,
      created_at: rm.created_at,
      updated_at: rm.updated_at
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
    const { 
      material_code,
      material_name,
      moc,
      unit_weight,
      unit,
      current_stock,
      minimum_stock,
      unit_price
    } = req.body;

    const newRawMaterial = await RawMaterial.createRawMaterial({
      material_code,
      material_name,
      moc,
      unit_weight,
      unit,
      current_stock,
      minimum_stock,
      unit_price
    });

    res.status(201).json({
      material_id: newRawMaterial.material_id,
      material_code: newRawMaterial.material_code,
      material_name: newRawMaterial.material_name,
      moc: newRawMaterial.moc,
      unit_weight: newRawMaterial.unit_weight,
      unit: newRawMaterial.unit,
      current_stock: newRawMaterial.current_stock,
      minimum_stock: newRawMaterial.minimum_stock,
      unit_price: newRawMaterial.unit_price,
      created_at: newRawMaterial.created_at,
      updated_at: newRawMaterial.updated_at
    });
  } catch (error) {
    console.error('Error creating raw material:', error);
    res.status(500).json({ message: 'Error creating raw material' });
  }
};

export const updateRawMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const { 
      material_code,
      material_name,
      moc,
      unit_weight,
      unit,
      current_stock,
      minimum_stock,
      unit_price
    } = req.body;

    const updatedRawMaterial = await RawMaterial.updateRawMaterial(materialId, {
      material_code,
      material_name,
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
      material_id: updatedRawMaterial.material_id,
      material_code: updatedRawMaterial.material_code,
      material_name: updatedRawMaterial.material_name,
      moc: updatedRawMaterial.moc,
      unit_weight: updatedRawMaterial.unit_weight,
      unit: updatedRawMaterial.unit,
      current_stock: updatedRawMaterial.current_stock,
      minimum_stock: updatedRawMaterial.minimum_stock,
      unit_price: updatedRawMaterial.unit_price,
      created_at: updatedRawMaterial.created_at,
      updated_at: updatedRawMaterial.updated_at
    });
  } catch (error) {
    console.error('Error updating raw material:', error);
    res.status(500).json({ message: 'Error updating raw material' });
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