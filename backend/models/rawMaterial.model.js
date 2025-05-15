import pool from '../db/db.js';

class RawMaterial {
  // Get all raw materials
  static async getAllRawMaterials() {
    try {
      const query = `
        SELECT 
          MIN(material_id) AS material_id,
          material_code,
          material_name,
          moc,
          unit_weight,
          unit,
          SUM(current_stock) AS current_stock,
          MIN(minimum_stock) AS minimum_stock,
          MAX(unit_price) AS unit_price,
          MAX(updated_at) AS updated_at,
          MAX(created_at) AS created_at
        FROM inventory.raw_materials
        GROUP BY material_code, material_name, moc, unit_weight, unit
        ORDER BY material_name
      `;
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
    // Delete from purchase_order_items and products.bom first
    const deletePurchaseOrderItemsQuery = `
      DELETE FROM purchase.purchase_order_items
      WHERE material_id = $1
    `;
    const deleteBOMQuery = `
      DELETE FROM products.bom
      WHERE material_id = $1
    `;
    const deleteRawMaterialQuery = `
      DELETE FROM inventory.raw_materials
      WHERE material_id = $1
      RETURNING *
    `;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete dependent records first
      await client.query(deletePurchaseOrderItemsQuery, [materialId]);
      await client.query(deleteBOMQuery, [materialId]);

      // Then delete the raw material
      const result = await client.query(deleteRawMaterialQuery, [materialId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default RawMaterial; 