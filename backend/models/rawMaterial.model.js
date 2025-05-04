import pool from '../db/db.js';

class RawMaterial {
  // Get all raw materials
  static async getAllRawMaterials() {
    try {
      const query = 'SELECT * FROM inventory.raw_materials ORDER BY material_name';
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error in RawMaterial.getAllRawMaterials:', error);
      throw error;
    }
  }

  // Get a single raw material by ID
  static async getRawMaterialById(materialId) {
    try {
      const query = 'SELECT * FROM inventory.raw_materials WHERE material_id = $1';
      const result = await pool.query(query, [materialId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in RawMaterial.getRawMaterialById:', error);
      throw error;
    }
  }

  // Create a new raw material
  static async createRawMaterial({ material_name, material_code, moc, unit_weight, unit, current_stock, minimum_stock, unit_price }) {
    try {
      const query = `
        INSERT INTO inventory.raw_materials 
        (material_name, material_code, moc, unit_weight, unit, current_stock, minimum_stock, unit_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [material_name, material_code, moc, unit_weight, unit, current_stock, minimum_stock, unit_price];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in RawMaterial.createRawMaterial:', error);
      throw error;
    }
  }

  // Update a raw material
  static async updateRawMaterial(materialId, updateData) {
    try {
      const setClauses = [];
      const values = [];
      let paramCount = 1;

      if (updateData.material_name !== undefined) {
        setClauses.push(`material_name = $${paramCount}`);
        values.push(updateData.material_name);
        paramCount++;
      }
      if (updateData.material_code !== undefined) {
        setClauses.push(`material_code = $${paramCount}`);
        values.push(updateData.material_code);
        paramCount++;
      }
      if (updateData.moc !== undefined) {
        setClauses.push(`moc = $${paramCount}`);
        values.push(updateData.moc);
        paramCount++;
      }
      if (updateData.current_stock !== undefined) {
        setClauses.push(`current_stock = $${paramCount}`);
        values.push(updateData.current_stock);
        paramCount++;
      }
      if (updateData.minimum_stock !== undefined) {
        setClauses.push(`minimum_stock = $${paramCount}`);
        values.push(updateData.minimum_stock);
        paramCount++;
      }
      if (updateData.unit_price !== undefined) {
        setClauses.push(`unit_price = $${paramCount}`);
        values.push(updateData.unit_price);
        paramCount++;
      }
      if (updateData.unit_weight !== undefined) {
        setClauses.push(`unit_weight = $${paramCount}`);
        values.push(updateData.unit_weight);
        paramCount++;
      }
      if (updateData.unit !== undefined) {
        setClauses.push(`unit = $${paramCount}`);
        values.push(updateData.unit);
        paramCount++;
      }
      

      if (setClauses.length === 0) {
        return null;
      }

      values.push(materialId);

      const query = `
        UPDATE inventory.raw_materials
        SET ${setClauses.join(', ')}
        WHERE material_id = $${paramCount}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in RawMaterial.updateRawMaterial:', error);
      throw error;
    }
  }

  // Delete a raw material
  static async deleteRawMaterial(materialId) {
    try {
      const query = 'DELETE FROM inventory.raw_materials WHERE material_id = $1 RETURNING *';
      const result = await pool.query(query, [materialId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in RawMaterial.deleteRawMaterial:', error);
      throw error;
    }
  }
}

export default RawMaterial; 