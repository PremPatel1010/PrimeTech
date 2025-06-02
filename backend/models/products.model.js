import pool from "../db/db.js";

class Product {
  static async findAll() {
    try {
      const query = `
       SELECT
  p.*,
  COALESCE(
    (
      SELECT
        json_agg(
          jsonb_build_object(
            'id', sc.id,
            'name', sc.name,
            'description', sc.description,
            'estimatedTime', sc.estimated_time
            -- Removed 'materials' and 'manufacturingSteps' as they are not in product.sub_components table
          ) ORDER BY sc.id ASC -- Ensure consistent order for the aggregated array
        )
      FROM
        product.sub_components sc
      WHERE
        sc.product_id = p.id -- <<< CRITICAL FIX: Correlate sub_components to the current product
    ),
    '[]'::json -- Default to an empty JSON array if no sub_components are found
  ) AS sub_components,
  COALESCE(
    (
      SELECT
        json_agg(
          jsonb_build_object(
            'sequence', ms.sequence_number,
            'id', ms.id,
            'name', ms.name,
            'description', ms.description,
            'estimatedTime', ms.estimated_time
          ) ORDER BY ms.sequence_number ASC -- Ensure consistent order
        )
      FROM
        product.manufacturing_steps ms
      WHERE
        ms.product_id = p.id -- Correlate manufacturing_steps to the current product
        AND ms.step_type = 'product'
    ),
    '[]'::json -- Default to an empty JSON array if no manufacturing_steps are found
  ) AS manufacturing_steps
FROM
  product.products p
GROUP BY
  p.id -- This is valid in PostgreSQL if p.id is the primary key, as p.* columns are functionally dependent.
ORDER BY
  p.created_at DESC;


      `;

      const result = await pool.query(query);
      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        productCode: row.product_code,
        description: row.description,
        ratingRange: row.rating_range,
        dischargeRange: row.discharge_range,
        headRange: row.head_range,
        category: row.category,
        version: row.version,
        finalAssemblyTime: row.final_assembly_time,
        subComponents: row.sub_components,
        manufacturingSteps: row.manufacturing_steps,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const products = await this.findAll();
      return products.find((p) => p.id === id);
    } catch (error) {
      throw error;
    }
  }

  static async create(productData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const productQuery = `
        INSERT INTO product.products (name, product_code, description, rating_range, discharge_range, head_range, category, version, final_assembly_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const productResult = await client.query(productQuery, [
        productData.name,
        productData.productCode,
        productData.description,
        productData.ratingRange,
        productData.dischargeRange,
        productData.headRange,
        productData.category,
        productData.version,
        productData.finalAssemblyTime,
      ]);

      const product = productResult.rows[0];

      // Insert manufacturing steps if provided
      if (
        productData.manufacturingSteps &&
        productData.manufacturingSteps.length > 0
      ) {
        for (const step of productData.manufacturingSteps) {
          await client.query(
            `INSERT INTO product.manufacturing_steps (product_id, name, description, estimated_time, sequence_number, step_type)
             VALUES ($1, $2, $3, $4, $5, 'product')`,
            [
              product.id,
              step.name,
              step.description,
              step.estimatedTime,
              step.sequence,
            ]
          );
        }
      }

      await client.query("COMMIT");
      return await this.findById(product.id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, productData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const updateQuery = `
        UPDATE product.products 
        SET name = $1, product_code = $2, description = $3, rating_range = $4, 
            discharge_range = $5, head_range = $6, category = $7, version = $8, 
            final_assembly_time = $9, updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        productData.name,
        productData.productCode,
        productData.description,
        productData.ratingRange,
        productData.dischargeRange,
        productData.headRange,
        productData.category,
        productData.version,
        productData.finalAssemblyTime,
        id,
      ]);

      if (result.rows.length === 0) {
        throw new Error("Product not found");
      }

      await client.query("COMMIT");
      return await this.findById(id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    try {
      const query = "DELETE FROM product.products WHERE id = $1 RETURNING *";
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        throw new Error("Product not found");
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async addSubComponent(productId, subComponentData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const subComponentQuery = `
        INSERT INTO product.sub_components (product_id, name, description, estimated_time)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await client.query(subComponentQuery, [
        productId,
        subComponentData.name,
        subComponentData.description,
        subComponentData.estimatedTime,
      ]);

      const subComponent = result.rows[0];

      // Insert manufacturing steps for sub-component if provided
      if (
        subComponentData.manufacturingSteps &&
        subComponentData.manufacturingSteps.length > 0
      ) {
        for (const step of subComponentData.manufacturingSteps) {
          await client.query(
            `INSERT INTO product.manufacturing_steps (product_id, sub_component_id, name, description, estimated_time, sequence_number, step_type)
             VALUES ($1, $2, $3, $4, $5, $6, 'sub_component')`,
            [
              productId,
              subComponent.id,
              step.name,
              step.description,
              step.estimatedTime,
              step.sequence,
            ]
          );
        }
      }

      await client.query("COMMIT");
      return await this.findById(productId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async addMaterialToSubComponent(
    productId,
    subComponentId,
    materialData
  ) {
    const client = await pool.connect();

    try {
      const query = `
        INSERT INTO product.component_materials (sub_component_id, material_id, quantity_required, unit)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      await client.query(query, [
        subComponentId,
        materialData.materialId,
        materialData.quantityRequired,
        materialData.unit,
      ]);

      await client.query("COMMIT");
      return await this.findById(productId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Product;
