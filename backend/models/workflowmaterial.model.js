import db from '../db/db.js'

class WorkflowMaterialConsumption {
  constructor(data) {
    this.id = data.id;
    this.workflow_id = data.workflow_id;
    this.material_id = data.material_id;
    this.material_name = data.material_name;
    this.quantity_consumed = data.quantity_consumed;
    this.unit = data.unit;
    this.created_at = data.created_at;
  }

  // Find consumption records by workflow ID
  static async findByWorkflowId(workflowId) {
    try {
      const query = `
        SELECT 
          wmc.*,
          rm.name as raw_material_name,
          rm.unit_cost
        FROM workflow_material_consumption wmc
        LEFT JOIN raw_materials rm ON wmc.material_id = rm.id
        WHERE wmc.workflow_id = $1
        ORDER BY wmc.created_at DESC
      `;
      
      const result = await db.query(query, [workflowId]);
      return result.rows.map(row => new WorkflowMaterialConsumption(row));
    } catch (error) {
      throw error;
    }
  }

  // Find consumption record by ID
  static async findById(id) {
    try {
      const query = `
        SELECT 
          wmc.*,
          rm.name as raw_material_name,
          rm.unit_cost
        FROM workflow_material_consumption wmc
        LEFT JOIN raw_materials rm ON wmc.material_id = rm.id
        WHERE wmc.id = $1
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new WorkflowMaterialConsumption(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Create new consumption record
  static async create(consumptionData) {
    try {
      const query = `
        INSERT INTO workflow_material_consumption (
          workflow_id, material_id, material_name, quantity_consumed, unit
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [
        consumptionData.workflow_id,
        consumptionData.material_id,
        consumptionData.material_name,
        consumptionData.quantity_consumed,
        consumptionData.unit
      ];

      const result = await db.query(query, values);
      
      // Update raw material stock
      if (consumptionData.material_id) {
        await this.updateMaterialStock(consumptionData.material_id, consumptionData.quantity_consumed);
      }

      return new WorkflowMaterialConsumption(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Update material stock after consumption
  static async updateMaterialStock(materialId, quantityConsumed) {
    try {
      const query = `
        UPDATE raw_materials 
        SET stock_quantity = stock_quantity - $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING stock_quantity
      `;
      
      const result = await db.query(query, [quantityConsumed, materialId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete consumption record
  static async delete(id) {
    try {
      // First get the consumption details to reverse stock update
      const consumption = await this.findById(id);
      
      if (consumption && consumption.material_id) {
        // Reverse the stock deduction
        await this.updateMaterialStock(consumption.material_id, -consumption.quantity_consumed);
      }

      const query = 'DELETE FROM workflow_material_consumption WHERE id = $1';
      const result = await db.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get material consumption by batch
  static async findByBatchId(batchId) {
    try {
      const query = `
        SELECT 
          wmc.*,
          rm.name as raw_material_name,
          rm.unit_cost,
          bw.component_name,
          bw.component_type
        FROM workflow_material_consumption wmc
        JOIN batch_workflows bw ON wmc.workflow_id = bw.id
        LEFT JOIN raw_materials rm ON wmc.material_id = rm.id
        WHERE bw.batch_id = $1
        ORDER BY wmc.created_at DESC
      `;
      
      const result = await db.query(query, [batchId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get material consumption summary
  static async getConsumptionSummary(timeframe = '30 days') {
    try {
      const query = `
        SELECT 
          wmc.material_id,
          wmc.material_name,
          SUM(wmc.quantity_consumed) as total_consumed,
          wmc.unit,
          AVG(rm.unit_cost) as avg_unit_cost,
          SUM(wmc.quantity_consumed * rm.unit_cost) as total_cost,
          COUNT(DISTINCT wmc.workflow_id) as workflow_count
        FROM workflow_material_consumption wmc
        LEFT JOIN raw_materials rm ON wmc.material_id = rm.id
        WHERE wmc.created_at >= NOW() - INTERVAL '${timeframe}'
        GROUP BY wmc.material_id, wmc.material_name, wmc.unit
        ORDER BY total_consumed DESC
      `;
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

export default WorkflowMaterialConsumption;
