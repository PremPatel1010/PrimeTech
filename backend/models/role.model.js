import pool from '../db/db.js';

class Role {
  static async findAll() {
    const query = `
      SELECT role_id, name, description, is_system_role, created_at, updated_at
      FROM auth.roles
      ORDER BY name
    `;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async findById(roleId) {
    const query = `
      SELECT role_id, name, description, is_system_role, created_at, updated_at
      FROM auth.roles
      WHERE role_id = $1
    `;
    try {
      const result = await pool.query(query, [roleId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByName(name) {
    const query = `
      SELECT role_id, name, description, is_system_role, created_at, updated_at
      FROM auth.roles
      WHERE name = $1
    `;
    try {
      const result = await pool.query(query, [name]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async create({ name, description, is_system_role = false }) {
    const query = `
      INSERT INTO auth.roles (name, description, is_system_role)
      VALUES ($1, $2, $3)
      RETURNING role_id, name, description, is_system_role, created_at, updated_at
    `;
    try {
      const result = await pool.query(query, [name, description, is_system_role]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async update(roleId, { name, description }) {
    const query = `
      UPDATE auth.roles
      SET name = $1,
          description = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE role_id = $3 AND is_system_role = false
      RETURNING role_id, name, description, is_system_role, created_at, updated_at
    `;
    try {
      const result = await pool.query(query, [name, description, roleId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async delete(roleId) {
    const query = `
      DELETE FROM auth.roles
      WHERE role_id = $1 AND is_system_role = false
      RETURNING role_id
    `;
    try {
      const result = await pool.query(query, [roleId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getRolePermissions(roleId) {
    const query = `
      SELECT p.permission_id, p.name, p.description, p.module, p.route_path
      FROM auth.role_permissions rp
      JOIN auth.permissions p ON p.permission_id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.module, p.name
    `;
    try {
      const result = await pool.query(query, [roleId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async updateRolePermissions(roleId, permissionIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing permissions
      await client.query(
        'DELETE FROM auth.role_permissions WHERE role_id = $1',
        [roleId]
      );

      // Insert new permissions
      if (permissionIds && permissionIds.length > 0) {
        const values = permissionIds.map(pid => `(${roleId}, ${pid})`).join(',');
        await client.query(`
          INSERT INTO auth.role_permissions (role_id, permission_id)
          VALUES ${values}
        `);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllPermissions() {
    const query = `
      SELECT permission_id, name, description, module, route_path
      FROM auth.permissions
      ORDER BY module, name
    `;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

export default Role; 