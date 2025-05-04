import pool from '../db/db.js'; // or your DB connection setup

class Product {
  // Get all products
  static async getAllProducts() {
    try {
      const query = `
        SELECT p.*, 
               COALESCE(json_agg(
                 json_build_object(
                   'material_id', b.material_id,
                   'material_name', rm.material_name,
                   'quantity_required', b.quantity_required
                 )
               ) FILTER (WHERE b.material_id IS NOT NULL), '[]') as bom_items
        FROM products.product p
        LEFT JOIN products.bom b ON p.product_id = b.product_id
        LEFT JOIN inventory.raw_materials rm ON b.material_id = rm.material_id
        GROUP BY p.product_id
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error in Product.getAllProducts:', error);
      throw error;
    }
  }

  // Get a single product by its ID with BOM items
  static async getProductWithBOM(productId) {
    try {
      const query = `
        SELECT p.*, 
               COALESCE(json_agg(
                 json_build_object(
                   'material_id', b.material_id,
                   'material_name', rm.material_name,
                   'quantity_required', b.quantity_required
                 )
               ) FILTER (WHERE b.material_id IS NOT NULL), '[]') as bom_items
        FROM products.product p
        LEFT JOIN products.bom b ON p.product_id = b.product_id
        LEFT JOIN inventory.raw_materials rm ON b.material_id = rm.material_id
        WHERE p.product_id = $1
        GROUP BY p.product_id
      `;
      
      const result = await pool.query(query, [productId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in Product.getProductWithBOM:', error);
      throw error;
    }
  }

  // Create a new product
  static async createProduct({ product_name, product_code, discharge_range, head_range, rating_range, price }) {
    try {
      const query = `
        INSERT INTO products.product 
        (product_name, product_code, discharge_range, head_range, rating_range, price)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const values = [product_name, product_code, discharge_range, head_range, rating_range, price];
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in Product.createProduct:', error);
      throw error;
    }
  }

  // Get a single product by its ID
  static async getProductById(productId) {
    try {
      const query = `
        SELECT p.*, 
               COALESCE(json_agg(
                 json_build_object(
                   'material_id', b.material_id,
                   'material_name', rm.material_name,
                   'quantity_required', b.quantity_required
                 )
               ) FILTER (WHERE b.material_id IS NOT NULL), '[]') as bom_items
        FROM products.product p
        LEFT JOIN products.bom b ON p.product_id = b.product_id
        LEFT JOIN inventory.raw_materials rm ON b.material_id = rm.material_id
        WHERE p.product_id = $1
        GROUP BY p.product_id
      `;
      
      const result = await pool.query(query, [productId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in Product.getProductById:', error);
      throw error;
    }
  }

  // Add BOM items to a product
  static async addBOMItems(productId, bomItems) {
    try {
      // Start a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Delete existing BOM items for this product
        await client.query('DELETE FROM products.bom WHERE product_id = $1', [productId]);

        // Insert new BOM items
        const insertQuery = `
          INSERT INTO products.bom (product_id, material_id, quantity_required)
          VALUES ($1, $2, $3)
          RETURNING *
        `;

        const results = [];
        for (const item of bomItems) {
          const { material_id, quantity_required } = item;
          const result = await client.query(insertQuery, [productId, material_id, quantity_required]);
          results.push(result.rows[0]);
        }

        await client.query('COMMIT');
        return results;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error in Product.addBOMItems:', error);
      throw error;
    }
  }

  // Update a product's details
  static async updateProduct(productId, updateData) {
    try {
      // Build the SET clause dynamically based on provided fields
      const setClauses = [];
      const values = [];
      let paramCount = 1;

      // Check each possible field and add it to the update if provided
      if (updateData.product_name !== undefined) {
        setClauses.push(`product_name = $${paramCount}`);
        values.push(updateData.product_name);
        paramCount++;
      }
      if (updateData.product_code !== undefined) {
        setClauses.push(`product_code = $${paramCount}`);
        values.push(updateData.product_code);
        paramCount++;
      }
      if (updateData.discharge_range !== undefined) {
        setClauses.push(`discharge_range = $${paramCount}`);
        values.push(updateData.discharge_range);
        paramCount++;
      }
      if (updateData.head_range !== undefined) {
        setClauses.push(`head_range = $${paramCount}`);
        values.push(updateData.head_range);
        paramCount++;
      }
      if (updateData.rating_range !== undefined) {
        setClauses.push(`rating_range = $${paramCount}`);
        values.push(updateData.rating_range);
        paramCount++;
      }
      if (updateData.price !== undefined) {
        setClauses.push(`price = $${paramCount}`);
        values.push(updateData.price);
        paramCount++;
      }

      // If no fields to update, return early
      if (setClauses.length === 0) {
        return null;
      }

      // Add the product_id to the values array
      values.push(productId);

      const query = `
        UPDATE products.product
        SET ${setClauses.join(', ')}
        WHERE product_id = $${paramCount}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in Product.updateProduct:', error);
      throw error;
    }
  }

  // Delete a product by its ID
  static async deleteProduct(productId) {
    try {
      const query = 'DELETE FROM products.product WHERE product_id = $1 RETURNING *';
      const result = await pool.query(query, [productId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in Product.deleteProduct:', error);
      throw error;
    }
  }
}

export default Product;
