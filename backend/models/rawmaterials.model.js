import pool from "../db/db.js";

class RawMaterial {
  static async findAll() {
    try {
      const query = `
        SELECT material_id as id, material_name as name, unit, stock_quantity, min_stock_level, cost_per_unit, supplier_id, created_at, updated_at
        FROM inventory.raw_materials
        ORDER BY name ASC
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        unit: row.unit,
        stockQuantity: parseFloat(row.stock_quantity),
        minStockLevel: parseFloat(row.min_stock_level),
        costPerUnit: parseFloat(row.cost_per_unit),
        supplierId: row.supplier_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          material_id as id,
          material_code,
          material_name as name,
          moc,
          unit_weight,
          unit,
          current_stock as stockQuantity,
          minimum_stock as minStockLevel,
          unit_price as costPerUnit,
          created_at as createdAt,
          updated_at as updatedAt
        FROM inventory.raw_materials
        WHERE material_id = $1
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in RawMaterial.findById:', error);
      throw error;
    }
  }

  static async create(materialData) {
    try {
      const query = `
        INSERT INTO inventory.raw_materials (material_name, unit, stock_quantity, min_stock_level, cost_per_unit, supplier_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING material_id as id, name, unit, stock_quantity, min_stock_level, cost_per_unit, supplier_id, created_at, updated_at
      `;
      
      const result = await pool.query(query, [
        materialData.name,
        materialData.unit,
        materialData.stockQuantity || 0,
        materialData.minStockLevel || 0,
        materialData.costPerUnit || 0,
        materialData.supplierId || null
      ]);
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.material_name,
        unit: row.unit,
        stockQuantity: parseFloat(row.stock_quantity),
        minStockLevel: parseFloat(row.min_stock_level),
        costPerUnit: parseFloat(row.cost_per_unit),
        supplierId: row.supplier_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(id, materialData) {
    try {
      const query = `
        UPDATE inventory.raw_materials 
        SET material_name = $1, unit = $2, stock_quantity = $3, min_stock_level = $4, 
            cost_per_unit = $5, supplier_id = $6, updated_at = NOW()
        WHERE material_id = $7
        RETURNING material_id as id, name, unit, stock_quantity, min_stock_level, cost_per_unit, supplier_id, created_at, updated_at
      `;
      
      const result = await pool.query(query, [
        materialData.name,
        materialData.unit,
        materialData.stockQuantity,
        materialData.minStockLevel,
        materialData.costPerUnit,
        materialData.supplierId,
        id
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('Raw material not found');
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.material_name,
        unit: row.unit,
        stockQuantity: parseFloat(row.stock_quantity),
        minStockLevel: parseFloat(row.min_stock_level),
        costPerUnit: parseFloat(row.cost_per_unit),
        supplierId: row.supplier_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateStock(id, newStock) {
    try {
      const query = `
        UPDATE inventory.raw_materials 
        SET stock_quantity = $1, updated_at = NOW()
        WHERE material_id = $2
        RETURNING material_id as id, name, unit, stock_quantity, min_stock_level, cost_per_unit, supplier_id, created_at, updated_at
      `;
      
      const result = await pool.query(query, [newStock, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Raw material not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getLowStockMaterials() {
    try {
      const query = `
        SELECT 
          material_id as id,
          material_name as name,
          unit,
          stock_quantity,
          min_stock_level,
          cost_per_unit,
          supplier_id,
          created_at,
          updated_at
        FROM inventory.raw_materials
        WHERE stock_quantity <= min_stock_level
        ORDER BY (stock_quantity::float / NULLIF(min_stock_level, 0)) ASC
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => ({
        id: row.id,
        name: row.material_name,
        unit: row.unit,
        stockQuantity: parseFloat(row.stock_quantity),
        minStockLevel: parseFloat(row.min_stock_level),
        costPerUnit: parseFloat(row.cost_per_unit),
        supplierId: row.supplier_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = 'DELETE FROM inventory.raw_materials WHERE material_id = $1 RETURNING material_id as id';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Raw material not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

export default RawMaterial;