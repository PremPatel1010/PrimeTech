import pool from '../db/db.js';

class ManufacturingStage {
  static async getAllStages() {
    const result = await pool.query(`
      SELECT * FROM manufacturing.stages
      ORDER BY sequence ASC
    `);
    return result.rows;
  }

  static async getStageById(stageId) {
    const result = await pool.query(`
      SELECT * FROM manufacturing.stages
      WHERE stage_id = $1
    `, [stageId]);
    return result.rows[0];
  }

  static async createStage(stageData) {
    const { component_type, stage_name, sequence } = stageData;
    
    const result = await pool.query(`
      INSERT INTO manufacturing.stages 
      (component_type, stage_name, sequence)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [component_type, stage_name, sequence]);
    
    return result.rows[0];
  }

  static async updateStage(stageId, updateData) {
    const { component_type, stage_name, sequence } = updateData;
    
    const result = await pool.query(`
      UPDATE manufacturing.stages
      SET 
        component_type = COALESCE($1, component_type),
        stage_name = COALESCE($2, stage_name),
        sequence = COALESCE($3, sequence)
      WHERE stage_id = $4
      RETURNING *
    `, [component_type, stage_name, sequence, stageId]);
    
    return result.rows[0];
  }

  static async deleteStage(stageId) {
    const result = await pool.query(`
      DELETE FROM manufacturing.stages
      WHERE stage_id = $1
      RETURNING *
    `, [stageId]);
    
    return result.rows[0];
  }

  static async getStagesByComponentType(componentType) {
    const result = await pool.query(`
      SELECT * FROM manufacturing.stages
      WHERE component_type = $1
      ORDER BY sequence ASC
    `, [componentType]);
    
    console.log('Stages by component type:', result.rows);
    return result.rows;
  }

  // Get all stages for a specific product
  static async getStagesByProductId(productId) {
    const result = await pool.query(`
      SELECT * FROM manufacturing.product_stages
      WHERE product_id = $1
      ORDER BY sequence ASC
    `, [productId]);
    return result.rows;
  }

  // Create stages for a product (replace all existing stages)
  static async createProductStages(productId, stages) {
    // Delete existing stages
    await pool.query(`DELETE FROM manufacturing.product_stages WHERE product_id = $1`, [productId]);
    // Insert new stages
    for (let i = 0; i < stages.length; i++) {
      await pool.query(`
        INSERT INTO manufacturing.product_stages (product_id, stage_name, sequence)
        VALUES ($1, $2, $3)
      `, [productId, stages[i], i + 1]);
    }
    return true;
  }

  // Delete all stages for a product
  static async deleteProductStages(productId) {
    await pool.query(`DELETE FROM manufacturing.product_stages WHERE product_id = $1`, [productId]);
    return true;
  }
}

export default ManufacturingStage; 