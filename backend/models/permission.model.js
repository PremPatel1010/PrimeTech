import pool from '../db/db.js';

class Permission {
  static async findAll() {
    const query = `
      SELECT permission_id, name, description, module, route_path, created_at
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

  static async findById(permissionId) {
    const query = `
      SELECT permission_id, name, description, module, route_path, created_at
      FROM auth.permissions
      WHERE permission_id = $1
    `;
    try {
      const result = await pool.query(query, [permissionId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByRoute(routePath) {
    const query = `
      SELECT permission_id, name, description, module, route_path, created_at
      FROM auth.permissions
      WHERE route_path = $1
    `;
    try {
      const result = await pool.query(query, [routePath]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getUserPermissions(userId) {
    const query = `
      SELECT DISTINCT p.permission_id, p.name, p.description, p.module, p.route_path,
             COALESCE(up.is_allowed, true) as is_allowed
      FROM auth.user_roles ur
      JOIN auth.role_permissions rp ON rp.role_id = ur.role_id
      JOIN auth.permissions p ON p.permission_id = rp.permission_id
      LEFT JOIN auth.user_permissions up ON up.user_id = ur.user_id 
        AND up.permission_id = p.permission_id
      WHERE ur.user_id = $1
      ORDER BY p.module, p.name
    `;
    try {
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async updateUserPermissions(userId, permissions) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing user permissions
      await client.query(
        'DELETE FROM auth.user_permissions WHERE user_id = $1',
        [userId]
      );

      // Insert new user permissions
      if (permissions && permissions.length > 0) {
        const values = permissions
          .map(p => `(${userId}, ${p.permission_id}, ${p.is_allowed}, ${userId})`)
          .join(',');
        
        await client.query(`
          INSERT INTO auth.user_permissions 
            (user_id, permission_id, is_allowed, created_by)
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

  static async checkPermission(userId, routePath) {
    const query = `
      SELECT auth.has_permission($1, $2) as has_permission
    `;
    try {
      const result = await pool.query(query, [userId, routePath]);
      return result.rows[0].has_permission;
    } catch (error) {
      throw error;
    }
  }
}

export default Permission; 