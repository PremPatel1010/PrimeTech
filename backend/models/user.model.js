import pool from '../db/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

class User {
  static async create({ username, email, password, role }) {
    const passwordString = String(password);
      
      const hashedPassword = await bcrypt.hash(passwordString, 10);
    const query = `
      INSERT INTO auth.users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, username, email, role, created_at
    `;
    const values = [username, email, hashedPassword, role];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = `
      SELECT user_id, username, email, password_hash, role
      FROM auth.users
      WHERE email = $1
    `;
    
    try {
      const result = await pool.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findById(userId) {
    const query = `
      SELECT user_id, username, email, role, created_at
      FROM auth.users
      WHERE user_id = $1
    `;
    
    try {
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }


  static generateToken(user) {
    return jwt.sign(
      { 
        userId: user.user_id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  static async findAll() {
    const query = `
      SELECT user_id, username, email, role, created_at
      FROM auth.users
      ORDER BY created_at DESC
    `;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async update(userId, { username, email, role, departmentName }) {
    const query = `
      UPDATE auth.users
      SET username = $1,
          email = $2,
          role = $3,
          department_name = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $5
      RETURNING user_id, username, email, role, department_name, created_at
    `;
    
    try {
      const result = await pool.query(query, [username, email, role, departmentName, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async delete(userId) {
    // First delete associated notifications
    const deleteNotificationsQuery = `
      DELETE FROM auth.notifications
      WHERE user_id = $1
    `;

    // Then delete the user
    const deleteUserQuery = `
      DELETE FROM auth.users
      WHERE user_id = $1
    `;
    
    try {
      // Start a transaction
      await pool.query('BEGIN');

      // Delete notifications first
      await pool.query(deleteNotificationsQuery, [userId]);
      
      // Then delete the user
      await pool.query(deleteUserQuery, [userId]);

      // Commit the transaction
      await pool.query('COMMIT');
      
      return true;
    } catch (error) {
      // Rollback in case of error
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    const query = `
      UPDATE auth.users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `;
    await pool.query(query, [hashedPassword, userId]);
  }
}

export default User; 