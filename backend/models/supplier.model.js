import pool from '../db/db.js';

class Supplier {
  static async getAllSuppliers() {
    const result = await pool.query('SELECT * FROM purchase.suppliers ORDER BY created_at DESC');
    return result.rows;
  }

  static async getSupplierById(supplierId) {
    const result = await pool.query('SELECT * FROM purchase.suppliers WHERE supplier_id = $1', [supplierId]);
    return result.rows[0];
  }

  static async createSupplier(supplierData) {
    const {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      gst_number
    } = supplierData;

    const result = await pool.query(
      `INSERT INTO purchase.suppliers 
       (supplier_name, contact_person, phone, email, address, gst_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [supplier_name, contact_person, phone, email, address, gst_number]
    );

    return result.rows[0];
  }

  static async updateSupplier(supplierId, updateData) {
    const {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      gst_number
    } = updateData;

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (supplier_name !== undefined) {
      updateFields.push(`supplier_name = $${paramCount}`);
      values.push(supplier_name);
      paramCount++;
    }
    if (contact_person !== undefined) {
      updateFields.push(`contact_person = $${paramCount}`);
      values.push(contact_person);
      paramCount++;
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramCount}`);
      values.push(address);
      paramCount++;
    }
    if (gst_number !== undefined) {
      updateFields.push(`gst_number = $${paramCount}`);
      values.push(gst_number);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return this.getSupplierById(supplierId);
    }

    values.push(supplierId);
    const updateQuery = `
      UPDATE purchase.suppliers 
      SET ${updateFields.join(', ')}
      WHERE supplier_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    return result.rows[0];
  }

  static async deleteSupplier(supplierId) {
    const result = await pool.query(
      'DELETE FROM purchase.suppliers WHERE supplier_id = $1 RETURNING *',
      [supplierId]
    );
    return result.rows[0];
  }
}

export default Supplier; 