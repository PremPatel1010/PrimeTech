import pool from '../db/db.js';

class RevenueAnalysis {
  static async getRevenueAnalysis(periodType, startDate, endDate) {
    const result = await pool.query(`
      WITH period_data AS (
        SELECT 
          ra.*,
          json_agg(
            json_build_object(
              'product_id', rd.product_id,
              'product_name', p.product_name,
              'quantity_sold', rd.quantity_sold,
              'revenue', rd.revenue,
              'cost', rd.cost,
              'profit', rd.profit
            )
          ) as product_details
        FROM sales.revenue_analysis ra
        LEFT JOIN sales.revenue_details rd ON ra.analysis_id = rd.analysis_id
        LEFT JOIN products.product p ON rd.product_id = p.product_id
        WHERE ra.period_type = $1
        AND ra.start_date >= $2
        AND ra.end_date <= $3
        GROUP BY ra.analysis_id
      )
      SELECT 
        SUM(total_revenue) as total_revenue,
        SUM(total_cost) as total_cost,
        SUM(total_profit) as total_profit,
        SUM(total_orders) as total_orders,
        AVG(average_order_value) as average_order_value,
        json_agg(product_details) as product_breakdown
      FROM period_data
    `, [periodType, startDate, endDate]);
    return result.rows[0];
  }

  static async getDashboardMetrics() {
    const result = await pool.query(`
      WITH current_month AS (
        SELECT 
          SUM(total_revenue) as current_month_revenue,
          SUM(total_profit) as current_month_profit,
          SUM(total_orders) as current_month_orders
        FROM sales.revenue_analysis
        WHERE period_type = 'monthly'
        AND start_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND end_date <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'
      ),
      previous_month AS (
        SELECT 
          SUM(total_revenue) as previous_month_revenue,
          SUM(total_profit) as previous_month_profit,
          SUM(total_orders) as previous_month_orders
        FROM sales.revenue_analysis
        WHERE period_type = 'monthly'
        AND start_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        AND end_date <= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day'
      ),
      top_products AS (
        SELECT 
          p.product_name,
          SUM(rd.quantity_sold) as total_quantity,
          SUM(rd.revenue) as total_revenue,
          SUM(rd.profit) as total_profit
        FROM sales.revenue_details rd
        JOIN products.product p ON rd.product_id = p.product_id
        JOIN sales.revenue_analysis ra ON rd.analysis_id = ra.analysis_id
        WHERE ra.start_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 month')
        GROUP BY p.product_id, p.product_name
        ORDER BY total_revenue DESC
        LIMIT 5
      ),
      recent_orders AS (
        SELECT 
          so.order_number,
          so.customer_name,
          so.total_amount,
          so.created_at
        FROM sales.sales_order so
        WHERE so.status = 'completed'
        ORDER BY so.created_at DESC
        LIMIT 5
      )
      SELECT 
        cm.*,
        pm.*,
        json_agg(tp.*) as top_products,
        json_agg(ro.*) as recent_orders
      FROM current_month cm
      CROSS JOIN previous_month pm
      CROSS JOIN top_products tp
      CROSS JOIN recent_orders ro
      GROUP BY 
        cm.current_month_revenue,
        cm.current_month_profit,
        cm.current_month_orders,
        pm.previous_month_revenue,
        pm.previous_month_profit,
        pm.previous_month_orders
    `);
    return result.rows[0];
  }

  static async getProductPerformance(productId, startDate, endDate) {
    const result = await pool.query(`
      SELECT 
        p.product_name,
        p.product_code,
        SUM(rd.quantity_sold) as total_quantity,
        SUM(rd.revenue) as total_revenue,
        SUM(rd.cost) as total_cost,
        SUM(rd.profit) as total_profit,
        COUNT(DISTINCT ra.analysis_id) as number_of_orders
      FROM sales.revenue_details rd
      JOIN sales.revenue_analysis ra ON rd.analysis_id = ra.analysis_id
      JOIN products.product p ON rd.product_id = p.product_id
      WHERE rd.product_id = $1
      AND ra.start_date >= $2
      AND ra.end_date <= $3
      GROUP BY p.product_id, p.product_name, p.product_code
    `, [productId, startDate, endDate]);
    return result.rows[0];
  }

  static async getTrendAnalysis(periodType, startDate, endDate) {
    const result = await pool.query(`
      SELECT 
        start_date,
        end_date,
        total_revenue,
        total_profit,
        total_orders,
        average_order_value
      FROM sales.revenue_analysis
      WHERE period_type = $1
      AND start_date >= $2
      AND end_date <= $3
      ORDER BY start_date ASC
    `, [periodType, startDate, endDate]);
    return result.rows;
  }
}

export default RevenueAnalysis; 