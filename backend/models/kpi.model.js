import pool from '../db/db.js';

class KPIModel {
  static async getInventoryValues() {
    const result = await pool.query(`
      WITH raw_materials AS (
        SELECT 
          SUM(current_stock * unit_price) as total_value
        FROM inventory.raw_materials
      ),
      finished_products AS (
        SELECT 
          SUM(quantity_available * unit_price) as total_value
        FROM inventory.finished_products
      )
      SELECT 
        COALESCE(rm.total_value, 0) as raw_material_value,
        COALESCE(fp.total_value, 0) as finished_product_value
      FROM raw_materials rm
      CROSS JOIN finished_products fp
    `);
    return result.rows[0];
  }

  static async getManufacturingEfficiency() {
    const result = await pool.query(`
      WITH batch_stats AS (
        SELECT 
          COUNT(*) as total_batches,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_batches,
          AVG(
            CASE 
              WHEN status = 'completed' 
              THEN EXTRACT(EPOCH FROM (stage_completion_dates->>'completed')::timestamp - start_date) / 86400
              ELSE NULL 
            END
          ) as avg_completion_days
        FROM manufacturing.product_manufacturing
        WHERE updated_at >= NOW() - INTERVAL '30 days'
      )
      SELECT 
        total_batches,
        completed_batches,
        ROUND((completed_batches::float / NULLIF(total_batches, 0) * 100)::numeric, 2) as efficiency_percentage,
        ROUND(COALESCE(avg_completion_days, 0)::numeric, 2) as avg_completion_days
      FROM batch_stats
    `);
    return result.rows[0];
  }

  static async getOrderStatusDistribution() {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM sales.sales_order
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY status
    `);
    return result.rows;
  }

  static async getSalesTrend(periodType, startDate, endDate) {
    const result = await pool.query(`
      SELECT 
        DATE_TRUNC($1, created_at) as period_start,
        SUM(total_amount) as total_revenue,
        COUNT(*) as order_count
      FROM sales.sales_order
      WHERE status = 'delivered'
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY DATE_TRUNC($1, created_at)
      ORDER BY period_start
    `, [periodType, startDate, endDate]);
    return result.rows;
  }
}

export default KPIModel; 