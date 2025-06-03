import db from '../db/db.js'

class BatchWorkflow {
  constructor(data) {
    this.id = data.id;
    this.batch_id = data.batch_id;
    this.component_id = data.component_id;
    this.component_name = data.component_name;
    this.component_type = data.component_type;
    this.quantity = data.quantity;
    this.assigned_team = data.assigned_team;
    this.status = data.status || 'not_started';
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.estimated_duration = data.estimated_duration;
    this.actual_duration = data.actual_duration;
    this.parent_batch_id = data.parent_batch_id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Find workflows by batch ID
  static async findByBatchId(batchId) {
    try {
      const query = `
        SELECT * FROM product.batch_workflows 
        WHERE batch_id = $1 
        ORDER BY created_at ASC
      `;
      
      const result = await db.query(query, [batchId]);
      return result.rows.map(row => new BatchWorkflow(row));
    } catch (error) {
      throw error;
    }
  }

  // Find workflow by ID
  static async findById(id) {
    try {
      const query = 'SELECT * FROM product.batch_workflows WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new BatchWorkflow(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Create new workflow
  static async create(workflowData) {
    try {
      const query = `
        INSERT INTO product.batch_workflows (
          batch_id, component_id, component_name, component_type,
          quantity, assigned_team, status, estimated_duration, parent_batch_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        workflowData.batch_id,
        workflowData.component_id,
        workflowData.component_name,
        workflowData.component_type,
        workflowData.quantity,
        workflowData.assigned_team,
        workflowData.status || 'not_started',
        workflowData.estimated_duration,
        workflowData.parent_batch_id
      ];

      const result = await db.query(query, values);
      return new BatchWorkflow(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Update workflow
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
        UPDATE product.batch_workflows 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      return new BatchWorkflow(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Update workflow status
  static async updateStatus(id, status) {
    try {
      const updateData = { status };
      
      if (status === 'in_progress') {
        updateData.start_date = new Date();
      } else if (status === 'completed') {
        updateData.end_date = new Date();
        
        // Calculate actual duration if start_date exists
        const workflow = await this.findById(id);
        if (workflow && workflow.start_date) {
          const startTime = new Date(workflow.start_date);
          const endTime = new Date();
          updateData.actual_duration = Math.round((endTime - startTime) / (1000 * 60)); // minutes
        }
      }

      return await this.update(id, updateData);
    } catch (error) {
      throw error;
    }
  }

  // Delete workflow
  static async delete(id) {
    try {
      const query = 'DELETE FROM product.batch_workflows WHERE id = $1';
      const result = await db.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw error;
    }
  }

  // Calculate batch progress
  static async calculateBatchProgress(batchId) {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM product.batch_workflows 
        WHERE batch_id = $1
        GROUP BY status
      `;
      
      const result = await db.query(query, [batchId]);
      
      let total = 0;
      let completed = 0;
      let inProgress = 0;
      let notStarted = 0;
      let onHold = 0;

      result.rows.forEach(row => {
        total += parseInt(row.count);
        switch (row.status) {
          case 'completed':
            completed += parseInt(row.count);
            break;
          case 'in_progress':
            inProgress += parseInt(row.count);
            break;
          case 'not_started':
            notStarted += parseInt(row.count);
            break;
          case 'on_hold':
            onHold += parseInt(row.count);
            break;
        }
      });

      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total,
        completed,
        inProgress,
        notStarted,
        onHold,
        percentage
      };
    } catch (error) {
      throw error;
    }
  }

  // Get workflow efficiency metrics
  static async getEfficiencyMetrics(timeframe = '30 days') {
    try {
      const query = `
        SELECT 
          AVG(actual_duration) as avg_actual_duration,
          AVG(estimated_duration) as avg_estimated_duration,
          COUNT(CASE WHEN actual_duration <= estimated_duration THEN 1 END) as on_time_count,
          COUNT(*) as total_completed,
          component_type
        FROM product.batch_workflows 
        WHERE status = 'completed' 
          AND actual_duration IS NOT NULL
          AND created_at >= NOW() - INTERVAL '${timeframe}'
        GROUP BY component_type
      `;

      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

export default BatchWorkflow;