import db from '../db/db.js'

class ManufacturingBatch {
  constructor(data) {
    this.id = data.id;
    this.batch_number = data.batch_number;
    this.product_id = data.product_id;
    this.quantity = data.quantity;
    this.status = data.status || 'planning';
    this.priority = data.priority || 'medium';
    this.created_date = data.created_date;
    this.target_completion_date = data.target_completion_date;
    this.actual_completion_date = data.actual_completion_date;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Get all batches with optional filters
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT 
          mb.*,
          p.name as product_name,
          p.product_code,
          COUNT(bw.id) as workflow_count,
          COUNT(CASE WHEN bw.status = 'completed' THEN 1 END) as completed_workflows
        FROM product.manufacturing_batches mb
        LEFT JOIN product.products p ON mb.product_id = p.id
        LEFT JOIN product.batch_workflows bw ON mb.id = bw.batch_id
      `;
      
      const conditions = [];
      const values = [];
      let paramCount = 0;

      if (filters.status) {
        paramCount++;
        conditions.push(`mb.status = $${paramCount}`);
        values.push(filters.status);
      }

      if (filters.priority) {
        paramCount++;
        conditions.push(`mb.priority = $${paramCount}`);
        values.push(filters.priority);
      }

      if (filters.product_id) {
        paramCount++;
        conditions.push(`mb.product_id = $${paramCount}`);
        values.push(filters.product_id);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += `
        GROUP BY mb.id, p.name, p.product_code
        ORDER BY mb.created_date DESC
      `;

      const result = await db.query(query, values);
      return result.rows.map(row => new ManufacturingBatch(row));
    } catch (error) {
      throw error;
    }
  }

  // Find batch by ID
  static async findById(id) {
    try {
      const query = `
        SELECT 
          mb.*,
          p.name as product_name,
          p.product_code
        FROM product.manufacturing_batches mb
        LEFT JOIN product.products p ON mb.product_id = p.id
        WHERE mb.id = $1
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const batch = new ManufacturingBatch(result.rows[0]);
      
      // Get associated workflows
      const workflowQuery = `
        SELECT * FROM product.batch_workflows 
        WHERE batch_id = $1 
        ORDER BY created_at ASC
      `;
      const workflowResult = await db.query(workflowQuery, [id]);
      batch.workflows = workflowResult.rows;

      return batch;
    } catch (error) {
      throw error;
    }
  }

  // Create new batch
  static async create(batchData) {
    try {
      
      const query = `
        INSERT INTO product.manufacturing_batches (
          batch_number, product_id, quantity, status, priority,
          created_date, target_completion_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        batchData.batchNumber,
        batchData.productId,
        batchData.quantity,
        batchData.status || 'planning',
        batchData.priority || 'medium',
        batchData.createdDate || new Date(),
        batchData.targetCompletionDate
      ];

      const result = await db.query(query, values);
      return new ManufacturingBatch(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Update batch
  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 0;

      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined && key !== 'id') {
          paramCount++;
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      paramCount++;
      values.push(id);

      const query = `
        UPDATE product.manufacturing_batches 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new ManufacturingBatch(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Update batch status
  static async updateStatus(id, status) {
    try {
      const updateData = { status };
      
      if (status === 'completed') {
        updateData.actual_completion_date = new Date();
      }

      return await this.update(id, updateData);
    } catch (error) {
      throw error;
    }
  }

  // Delete batch
  static async delete(id) {
    try {
      const query = 'DELETE FROM product.manufacturing_batches WHERE id = $1';
      const result = await db.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw error;
    }
  }

  // Get production capacity analytics
  static async getProductionCapacity() {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as batch_count,
          SUM(quantity) as total_quantity,
          AVG(quantity) as avg_quantity
        FROM product.manufacturing_batches
        WHERE created_date >= NOW() - INTERVAL '30 days'
        GROUP BY status
        ORDER BY 
          CASE status 
            WHEN 'planning' THEN 1
            WHEN 'in_progress' THEN 2
            WHEN 'completed' THEN 3
            WHEN 'cancelled' THEN 4
          END
      `;

      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get batch statistics
  static async getBatchStatistics(timeframe = '30 days') {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_batches,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_batches,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_batches,
          COUNT(CASE WHEN status = 'planning' THEN 1 END) as planning_batches,
          AVG(CASE WHEN actual_completion_date IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (actual_completion_date - created_date))/86400 
          END) as avg_completion_days
        FROM product.manufacturing_batches
        WHERE created_date >= NOW() - INTERVAL '${timeframe}'
      `;

      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

export default ManufacturingBatch;