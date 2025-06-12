import pool from '../db/db.js';

class FinishedProduct {
  static async getAllFinishedProducts() {
    const result = await pool.query(`
      SELECT 
        MIN(fp.finished_product_id) AS finished_product_id,
        p.id,
        p.name,
        p.product_code,
        p.discharge_range,
        p.head_range,
        p.rating_range,
        SUM(fp.quantity_available) AS quantity_available,
        MAX(fp.unit_price) AS unit_price,
        SUM(COALESCE(fp.total_price, fp.quantity_available * fp.unit_price)) AS total_price,
        MAX(fp.added_on) AS added_on
      FROM inventory.finished_products fp
      JOIN product.products p ON fp.product_id = p.id
      GROUP BY p.id, p.name, p.product_code, p.discharge_range, p.head_range, p.rating_range
      ORDER BY MAX(fp.added_on) DESC
    `);
    return result.rows;
  }

  static async getFinishedProductById(finishedProductId) {
    const result = await pool.query(`
      SELECT 
        fp.*,
        p.name,
        p.product_code,
        p.discharge_range,
        p.head_range,
        p.rating_range
      FROM inventory.finished_products fp
      JOIN product.products p ON fp.product_id = p.id
      WHERE fp.finished_product_id = $1
    `, [finishedProductId]);
    return result.rows[0];
  }

  static async createFinishedProduct(productData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify product exists
      const productCheck = await client.query(`
        SELECT id FROM product.products WHERE id = $1
      `, [productData.product_id]);

      if (productCheck.rows.length === 0) {
        throw new Error(`Product with ID ${productData.product_id} does not exist`);
      }

      // Create finished product entry
      const result = await client.query(`
        INSERT INTO inventory.finished_products 
        (product_id, quantity_available, storage_location, status, unit_price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        productData.product_id,
        productData.quantity_available,
        productData.storage_location,
        productData.status || 'available',
        productData.unit_price || 0
      ]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateFinishedProduct(finishedProductId, updateData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        quantity_available,
        storage_location,
        status,
        unit_price
      } = updateData;

      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (quantity_available !== undefined) {
        updateFields.push(`quantity_available = $${paramCount}`);
        values.push(quantity_available);
        paramCount++;
      }
      if (storage_location !== undefined) {
        updateFields.push(`storage_location = $${paramCount}`);
        values.push(storage_location);
        paramCount++;
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }
      if (unit_price !== undefined) {
        updateFields.push(`unit_price = $${paramCount}`);
        values.push(unit_price);
        paramCount++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(finishedProductId);
      const result = await client.query(`
        UPDATE inventory.finished_products 
        SET ${updateFields.join(', ')}
        WHERE finished_product_id = $${paramCount}
        RETURNING *
      `, values);

      await client.query('COMMIT');
      if (result.rows.length === 0) return null;
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteFinishedProduct(productId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Delete all finished_products rows for this product_id
      const result = await client.query(`
        DELETE FROM inventory.finished_products 
        WHERE product_id = $1
        RETURNING *
      `, [productId]);
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateQuantity(finishedProductId, quantityChange, client = null) {
    let queryClient = client; // Use the provided client if available
    let shouldReleaseClient = false; // Flag to indicate if we need to release the client

    try {
      if (!queryClient) {
        queryClient = await pool.connect(); // Get a client from the pool
        shouldReleaseClient = true; // Mark it for release
        await queryClient.query('BEGIN'); // Start transaction if it's a new client
      } else {
        // If an external client is provided, assume it's already part of a transaction
        // No need to call BEGIN/COMMIT/ROLLBACK here for the external client
      }

      const result = await queryClient.query(`
        UPDATE inventory.finished_products 
        SET quantity_available = quantity_available + $1
        WHERE finished_product_id = $2
        RETURNING *
      `, [quantityChange, finishedProductId]);

      if (result.rows.length === 0) return null;
      if (result.rows[0].quantity_available < 0) {
        throw new Error('Insufficient quantity available');
      }

      if (shouldReleaseClient) {
        await queryClient.query('COMMIT'); // Commit transaction if it's a new client
      }
      return result.rows[0];
    } catch (error) {
      if (shouldReleaseClient) {
        await queryClient.query('ROLLBACK'); // Rollback transaction if it's a new client
      }
      throw error;
    } finally {
      if (shouldReleaseClient) {
        queryClient.release(); // Release the client if we acquired it
      }
    }
  }

  static async getProductInventory(productId) {
    const result = await pool.query(`
      SELECT 
        fp.*,
        p.name,
        p.product_code
      FROM inventory.finished_products fp
      JOIN product.products p ON fp.product_id = p.id
      WHERE fp.product_id = $1
    `, [productId]);
    return result.rows;
  }
}

export default FinishedProduct; 