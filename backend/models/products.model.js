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
          ) AS manufacturing_steps,
          COALESCE(
            (
              SELECT 
                json_agg(
                  jsonb_build_object(
                    'materialId', pm.material_id,
                    'materialName', rm.material_name,
                    'quantityRequired', pm.quantity_required,
                    'unit', rm.unit
                  ) ORDER BY pm.material_id ASC
                )
              FROM 
                product.product_materials pm
              LEFT JOIN 
                inventory.raw_materials rm ON pm.material_id = rm.material_id
              WHERE 
                pm.product_id = p.id
            ),
            '[]'::json
          ) AS materials
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
        materials: row.materials,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        price: parseFloat(row.price),
      }));
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const products = await this.findAll();
      return products.find((p) => p.id === parseInt(id));
    } catch (error) {
      throw error;
    }
  }

  static async create(productData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const productQuery = `
        INSERT INTO product.products (name, product_code, description, rating_range, discharge_range, head_range, category, version, final_assembly_time, price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        productData.price || 0,
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

      // Insert direct product materials if provided
      if (productData.materials && productData.materials.length > 0) {
        for (const material of productData.materials) {
          await client.query(
            `INSERT INTO product.product_materials (product_id, material_id, quantity_required, unit)
             VALUES ($1, $2, $3, $4)`,
            [
              product.id,
              parseInt(material.materialId),
              material.quantityRequired,
              material.unit,
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

      let updateFields = [];
      let values = [];
      let paramCount = 1;

      if (productData.name !== undefined) {
        updateFields.push(`name = $${paramCount}`);
        values.push(productData.name);
        paramCount++;
      }
      if (productData.productCode !== undefined) {
        updateFields.push(`product_code = $${paramCount}`);
        values.push(productData.productCode);
        paramCount++;
      }
      if (productData.description !== undefined) {
        updateFields.push(`description = $${paramCount}`);
        values.push(productData.description);
        paramCount++;
      }
      if (productData.ratingRange !== undefined) {
        updateFields.push(`rating_range = $${paramCount}`);
        values.push(productData.ratingRange);
        paramCount++;
      }
      if (productData.dischargeRange !== undefined) {
        updateFields.push(`discharge_range = $${paramCount}`);
        values.push(productData.dischargeRange);
        paramCount++;
      }
      if (productData.headRange !== undefined) {
        updateFields.push(`head_range = $${paramCount}`);
        values.push(productData.head_range);
        paramCount++;
      }
      if (productData.category !== undefined) {
        updateFields.push(`category = $${paramCount}`);
        values.push(productData.category);
        paramCount++;
      }
      if (productData.version !== undefined) {
        updateFields.push(`version = $${paramCount}`);
        values.push(productData.version);
        paramCount++;
      }
      if (productData.finalAssemblyTime !== undefined) {
        updateFields.push(`final_assembly_time = $${paramCount}`);
        values.push(productData.finalAssemblyTime);
        paramCount++;
      }
      if (productData.price !== undefined) {
        updateFields.push(`price = $${paramCount}`);
        values.push(productData.price);
        paramCount++;
      }

      if (updateFields.length === 0) {
        throw new Error("No fields to update");
      }

      values.push(id);

      const updateQuery = `
        UPDATE product.products
        SET ${updateFields.join(", ")}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);

      if (result.rows.length === 0) {
        throw new Error(`Product with ID ${id} not found`);
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
        parseInt(subComponentId),
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

      const result = await client.query(deleteQuery, [productId, parseInt(subComponentId)]);

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
        parseInt(subComponentId),
        parseInt(materialData.materialId),
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
        parseInt(subComponentId),
        parseInt(materialId),
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

      await client.query(deleteQuery, [parseInt(subComponentId), parseInt(materialId)]);

      await client.query("COMMIT");
      return await this.findById(productId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async addManufacturingStep(productId, stepData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const query = `
        INSERT INTO product.manufacturing_steps (product_id, name, description, estimated_time, sequence_number, step_type)
        VALUES ($1, $2, $3, $4, $5, 'product')
        RETURNING *
      `;

      await client.query(query, [
        productId,
        stepData.name,
        stepData.description,
        stepData.estimatedTime,
        stepData.sequence
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

  static async updateManufacturingStep(productId, stepId, stepData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const query = `
        UPDATE product.manufacturing_steps
        SET name = $1, description = $2, estimated_time = $3, sequence_number = $4
        WHERE product_id = $5 AND id = $6 AND step_type = 'product'
        RETURNING *
      `;

      const result = await client.query(query, [
        stepData.name,
        stepData.description,
        stepData.estimatedTime,
        stepData.sequence,
        productId,
        parseInt(stepId)
      ]);

      if (result.rows.length === 0) {
        throw new Error("Manufacturing step not found");
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

  static async deleteManufacturingStep(productId, stepId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const query = `
        DELETE FROM product.manufacturing_steps
        WHERE product_id = $1 AND id = $2 AND step_type = 'product'
        RETURNING *
      `;

      const result = await pool.query(query, [productId, parseInt(stepId)]);

      if (result.rows.length === 0) {
        throw new Error("Manufacturing step not found");
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

  static async addSubComponentManufacturingStep(productId, subComponentId, stepData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const query = `
        INSERT INTO product.manufacturing_steps (product_id, sub_component_id, name, description, estimated_time, sequence_number, step_type)
        VALUES ($1, $2, $3, $4, $5, $6, 'sub_component')
        RETURNING *
      `;

      await client.query(query, [
        productId,
        parseInt(subComponentId),
        stepData.name,
        stepData.description,
        stepData.estimatedTime,
        stepData.sequence
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

  static async updateSubComponentManufacturingStep(productId, subComponentId, stepId, stepData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const query = `
        UPDATE product.manufacturing_steps
        SET name = $1, description = $2, estimated_time = $3, sequence_number = $4
        WHERE product_id = $5 AND sub_component_id = $6 AND id = $7 AND step_type = 'sub_component'
        RETURNING *
      `;

      const result = await client.query(query, [
        stepData.name,
        stepData.description,
        stepData.estimatedTime,
        stepData.sequence,
        productId,
        parseInt(subComponentId),
        parseInt(stepId)
      ]);

      if (result.rows.length === 0) {
        throw new Error("Manufacturing step not found");
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

  static async deleteSubComponentManufacturingStep(productId, subComponentId, stepId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const query = `
        DELETE FROM product.manufacturing_steps
        WHERE product_id = $1 AND sub_component_id = $2 AND id = $3 AND step_type = 'sub_component'
        RETURNING *
      `;

      const result = await pool.query(query, [productId, parseInt(subComponentId), parseInt(stepId)]);

      if (result.rows.length === 0) {
        throw new Error("Manufacturing step not found");
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

  static async addMaterialToProduct(productId, materialData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const query = `
        INSERT INTO product.product_materials (product_id, material_id, quantity_required, unit)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      await client.query(query, [
        productId,
        parseInt(materialData.materialId),
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

  static async updateProductMaterial(productId, materialId, materialData) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const updateQuery = `
        UPDATE product.product_materials
        SET quantity_required = $1, unit = $2
        WHERE product_id = $3 AND material_id = $4
      `;

      await client.query(updateQuery, [
        materialData.quantityRequired,
        materialData.unit,
        productId,
        parseInt(materialId),
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

  static async deleteProductMaterial(productId, materialId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const deleteQuery = `
        DELETE FROM product.product_materials
        WHERE product_id = $1 AND material_id = $2
      `;

      await client.query(deleteQuery, [productId, parseInt(materialId)]);

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
