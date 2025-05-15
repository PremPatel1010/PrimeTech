import pool from '../db/db.js';

class CompanySettings {
  static async getSettings() {
    const result = await pool.query('SELECT * FROM company_settings LIMIT 1');
    return result.rows[0];
  }

  static async updateSettings(settings) {
    const { company_name, company_address, company_email, phone_number } = settings;
    const result = await pool.query(
      `UPDATE company_settings SET company_name = $1, company_address = $2, company_email = $3, phone_number = $4 RETURNING *`,
      [company_name, company_address, company_email, phone_number]
    );
    return result.rows[0];
  }
}

export default CompanySettings; 