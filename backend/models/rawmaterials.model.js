import pool from "../db/db.js";

class RawMaterial {
  static async findAll() {
    try {
      const query = `
        SELECT id, name, unit, stock_quantity, min_stock_level, cost_per_unit, supplier_id, created_at, updated_at
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
        SELECT id, name, unit, stock_quantity, min_stock_level, cost_per_unit, supplier_id, created_at, updated_at
        FROM inventory.raw_materials
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
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

  static async create(materialData) {
    try {
      const query = `
        INSERT INTO inventory.raw_materials (name, unit, stock_quantity, min_stock_level, cost_per_unit, supplier_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
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
        name: row.name,
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
        SET name = $1, unit = $2, stock_quantity = $3, min_stock_level = $4, 
            cost_per_unit = $5, supplier_id = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *
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
        name: row.name,
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
        WHERE id = $2
        RETURNING *
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
          current_stock as stock_quantity,
          minimum_stock as min_stock_level,
          unit_price as cost_per_unit,
          supplier_id,
          created_at,
          updated_at
        FROM inventory.raw_materials
        WHERE current_stock <= minimum_stock
        ORDER BY (current_stock::float / NULLIF(minimum_stock, 0)) ASC
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

  static async delete(id) {
    try {
      const query = 'DELETE FROM inventory.raw_materials WHERE id = $1 RETURNING *';
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