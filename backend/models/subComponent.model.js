import  pool  from '../db/db.js';

class SubComponent {
  static async getAll() {
    const result = await pool.query(`
      SELECT * FROM inventory.sub_components
      ORDER BY component_name ASC
    `);
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(`
      SELECT * FROM inventory.sub_components
      WHERE sub_component_id = $1
    `, [id]);
    return result.rows[0];
  }

  static async getByCode(code) {
    const result = await pool.query(`
      SELECT * FROM inventory.sub_components
      WHERE component_code ILIKE $1
    `, [code]);
    return result.rows[0];
  }

  static async create(componentData) {
    const {
      component_code,
      component_name,
      description,
      category,
      unit,
      current_stock,
      minimum_stock,
      unit_price,
      created_by
    } = componentData;

    const result = await pool.query(`
      INSERT INTO inventory.sub_components
      (component_code, component_name, description, category, unit,
       current_stock, minimum_stock, unit_price, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [component_code, component_name, description, category, unit,
        current_stock, minimum_stock, unit_price, created_by]);
    return result.rows[0];
  }

  static async update(id, updates) {
    const {
      component_name,
      description,
      category,
      unit,
      minimum_stock,
      unit_price,
      updated_by
    } = updates;

    const result = await pool.query(`
      UPDATE inventory.sub_components
      SET component_name = COALESCE($1, component_name),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          unit = COALESCE($4, unit),
          minimum_stock = COALESCE($5, minimum_stock),
          unit_price = COALESCE($6, unit_price),
          updated_by = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE sub_component_id = $8
      RETURNING *
    `, [component_name, description, category, unit,
        minimum_stock, unit_price, updated_by, id]);
    return result.rows[0];
  }

  static async updateStock(id, quantity, transactionType, referenceType, referenceId, notes, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update stock
      const updateResult = await client.query(`
        UPDATE inventory.sub_components
        SET current_stock = current_stock + $1,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = $2
        WHERE sub_component_id = $3
        RETURNING *
      `, [quantity, userId, id]);

      if (updateResult.rows.length === 0) {
        throw new Error('Sub-component not found');
      }

      // Record transaction
      await client.query(`
        INSERT INTO inventory.sub_component_transactions
        (sub_component_id, transaction_type, quantity, reference_type,
         reference_id, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, transactionType, quantity, referenceType, referenceId, notes, userId]);

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const result = await pool.query(`
      DELETE FROM inventory.sub_components
      WHERE sub_component_id = $1
      RETURNING *
    `, [id]);
    return result.rows[0];
  }

  static async getTransactions(subComponentId) {
    const result = await pool.query(`
      SELECT * FROM inventory.sub_component_transactions
      WHERE sub_component_id = $1
      ORDER BY created_at DESC
    `, [subComponentId]);
    return result.rows;
  }

  static async getLowStockComponents() {
    const result = await pool.query(`
      SELECT * FROM inventory.sub_components
      WHERE current_stock <= minimum_stock
      ORDER BY (current_stock::float / NULLIF(minimum_stock, 0)) ASC
    `);
    return result.rows;
  }
}

export default SubComponent; 