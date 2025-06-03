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
                    'estimatedTime', sc.estimated_time,
                    'materials', COALESCE(
                      (
                        SELECT 
                          json_agg(
                            jsonb_build_object(
                              'materialId', cm.material_id,
                              'materialName', rm.material_name,
                              'quantityRequired', cm.quantity_required,
                              'unit', rm.unit
                            ) ORDER BY cm.material_id ASC
                          )
                        FROM 
                          product.component_materials cm
                        LEFT JOIN 
                          inventory.raw_materials rm ON cm.material_id = rm.material_id
                        WHERE 
                          cm.sub_component_id = sc.id
                      ),
                      '[]'::json
                    ),
                    'manufacturingSteps', COALESCE(
                      (
                        SELECT 
                          json_agg(
                            jsonb_build_object(
                              'id', ms.id,
                              'name', ms.name,
                              'description', ms.description,
                              'estimatedTime', ms.estimated_time,
                              'sequence', ms.sequence_number
                            ) ORDER BY ms.sequence_number ASC
                          )
                        FROM 
                          product.manufacturing_steps ms
                        WHERE 
                          ms.sub_component_id = sc.id
                          AND ms.step_type = 'sub_component'
                      ),
                      '[]'::json
                    )
                  ) ORDER BY sc.id ASC
                )
              FROM
                product.sub_components sc
              WHERE
                sc.product_id = p.id
            ),
            '[]'::json
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
                  ) ORDER BY ms.sequence_number ASC
                )
              FROM
                product.manufacturing_steps ms
              WHERE
                ms.product_id = p.id
                AND ms.step_type = 'product'
            ),
            '[]'::json
          ) AS manufacturing_steps
        FROM
          product.products p
        GROUP BY
          p.id
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

  static async updateSubComponent(productId, subComponentId, subComponentData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const updateQuery = `
        UPDATE product.sub_components
        SET name = $1, description = $2, estimated_time = $3
        WHERE product_id = $4 AND id = $5
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        subComponentData.name,
        subComponentData.description,
        subComponentData.estimatedTime,
        productId,
        subComponentId,
      ]);

      if (result.rows.length === 0) {
        throw new Error("Sub-component not found");
      }

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }


  static async deleteSubComponent(productId, subComponentId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const deleteQuery = `
        DELETE FROM product.sub_components
        WHERE product_id = $1 AND id = $2
        RETURNING *
      `;

      const result = await client.query(deleteQuery, [productId, subComponentId]);

      if (result.rows.length === 0) {
        throw new Error("Sub-component not found");
      }

      await client.query("COMMIT");
      return result.rows[0];
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

  static async updateMaterial(productId, subComponentId, materialId, materialData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const updateQuery = `
        UPDATE product.component_materials
        SET quantity_required = $1, unit = $2
        WHERE sub_component_id = $3 AND material_id = $4
      `;

      await client.query(updateQuery, [
        materialData.quantityRequired,
        materialData.unit,
        subComponentId,
        materialId,
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

  static async deleteMaterial(productId, subComponentId, materialId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const deleteQuery = `
        DELETE FROM product.component_materials
        WHERE sub_component_id = $1 AND material_id = $2
      `;

      await client.query(deleteQuery, [subComponentId, materialId]);

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
