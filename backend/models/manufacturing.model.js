import pool from "../db/db.js";
import Product from './products.model.js';
import RawMaterial from './rawMaterial.model.js';
import FinishedProduct from './finishedProduct.model.js';

class ManufacturingBatch {
  static async findAll() {
    try {
      const query = `
        SELECT 
          mb.batch_id,
          mb.sales_order_id,
          mb.product_id,
          mb.batch_number,
          mb.quantity,
          mb.status,
          mb.notes,
          mb.created_at,
          mb.updated_at,
          mb.created_by,
          mb.updated_by,
          p.name as product_name,
          p.product_code,
          COALESCE(
            (
              SELECT json_agg(
                jsonb_build_object(
                  'workflow_id', bw.workflow_id,
                  'step_id', bw.step_id,
                  'status', bw.status,
                  'started_at', bw.started_at,
                  'completed_at', bw.completed_at,
                  'step_name', ms.name,
                  'step_description', ms.description,
                  'sequence', ms.sequence_number
                ) ORDER BY ms.sequence_number ASC
              )
              FROM manufacturing.batch_workflows bw
              JOIN product.manufacturing_steps ms ON bw.step_id = ms.id
              WHERE bw.batch_id = mb.batch_id
            ),
            '[]'::json
          ) as workflows,
          COALESCE(
            (
              SELECT json_agg(
                jsonb_build_object(
                  'id', bsc.id,
                  'sub_component_id', bsc.sub_component_id,
                  'status', bsc.status,
                  'started_at', bsc.started_at,
                  'completed_at', bsc.completed_at,
                  'name', sc.name,
                  'description', sc.description,
                  'estimated_time', sc.estimated_time,
                  'manufacturing_steps', COALESCE(
                    (
                      SELECT json_agg(
                        jsonb_build_object(
                          'id', ms.id,
                          'name', ms.name,
                          'description', ms.description,
                          'sequence', ms.sequence_number,
                          'status', (
                            SELECT status 
                            FROM manufacturing.batch_workflows 
                            WHERE batch_id = mb.batch_id AND step_id = ms.id
                          )
                        ) ORDER BY ms.sequence_number ASC
                      )
                      FROM product.manufacturing_steps ms
                      WHERE ms.sub_component_id = sc.id
                    ),
                    '[]'::json
                  ),
                  'bill_of_materials', COALESCE(
                    (
                      SELECT json_agg(
                        jsonb_build_object(
                          'material_id', pcm.material_id,
                          'name', irm.material_name,
                          'quantity', pcm.quantity_required,
                          'unit', pcm.unit
                        )
                      )
                      FROM product.component_materials pcm
                      JOIN inventory.raw_materials irm ON pcm.material_id = irm.material_id
                      WHERE pcm.sub_component_id = sc.id
                    ),
                    '[]'::json
                  )
                )
              )
              FROM manufacturing.batch_sub_components bsc
              JOIN product.sub_components sc ON bsc.sub_component_id = sc.id
              WHERE bsc.batch_id = mb.batch_id
            ),
            '[]'::json
          ) as sub_components
        FROM 
          manufacturing.manufacturing_batches mb
        JOIN 
          product.products p ON mb.product_id = p.id
        ORDER BY 
          mb.created_at DESC;
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error in ManufacturingBatch.findAll:', error);
      throw error;
    }
  }

  static async findById(batchId) {
    try {
      const query = `
        SELECT 
          mb.batch_id,
          mb.sales_order_id,
          mb.product_id,
          mb.batch_number,
          mb.quantity,
          mb.status,
          mb.notes,
          mb.created_at,
          mb.updated_at,
          mb.created_by,
          mb.updated_by,
          p.name as product_name,
          p.product_code,
          COALESCE(
            (
              SELECT json_agg(
                jsonb_build_object(
                  'workflow_id', bw.workflow_id,
                  'step_id', bw.step_id,
                  'status', bw.status,
                  'started_at', bw.started_at,
                  'completed_at', bw.completed_at,
                  'step_name', ms.name,
                  'step_description', ms.description,
                  'sequence', ms.sequence_number
                ) ORDER BY ms.sequence_number ASC
              )
              FROM manufacturing.batch_workflows bw
              JOIN product.manufacturing_steps ms ON bw.step_id = ms.id
              WHERE bw.batch_id = mb.batch_id
            ),
            '[]'::json
          ) as workflows,
          COALESCE(
            (
              SELECT json_agg(
                jsonb_build_object(
                  'id', bsc.id,
                  'sub_component_id', bsc.sub_component_id,
                  'status', bsc.status,
                  'started_at', bsc.started_at,
                  'completed_at', bsc.completed_at,
                  'name', sc.name,
                  'description', sc.description,
                  'estimated_time', sc.estimated_time,
                  'manufacturing_steps', COALESCE(
                    (
                      SELECT json_agg(
                        jsonb_build_object(
                          'id', ms.id,
                          'name', ms.name,
                          'description', ms.description,
                          'sequence', ms.sequence_number,
                          'status', (
                            SELECT status 
                            FROM manufacturing.batch_workflows 
                            WHERE batch_id = mb.batch_id AND step_id = ms.id
                          )
                        ) ORDER BY ms.sequence_number ASC
                      )
                      FROM product.manufacturing_steps ms
                      WHERE ms.sub_component_id = sc.id
                    ),
                    '[]'::json
                  ),
                  'bill_of_materials', COALESCE(
                    (
                      SELECT json_agg(
                        jsonb_build_object(
                          'material_id', pcm.material_id,
                          'name', irm.material_name,
                          'quantity', pcm.quantity_required,
                          'unit', pcm.unit
                        )
                      )
                      FROM product.component_materials pcm
                      JOIN inventory.raw_materials irm ON pcm.material_id = irm.material_id
                      WHERE pcm.sub_component_id = sc.id
                    ),
                    '[]'::json
                  )
                )
              )
              FROM manufacturing.batch_sub_components bsc
              JOIN product.sub_components sc ON bsc.sub_component_id = sc.id
              WHERE bsc.batch_id = mb.batch_id
            ),
            '[]'::json
          ) as sub_components
        FROM 
          manufacturing.manufacturing_batches mb
        JOIN 
          product.products p ON mb.product_id = p.id
        WHERE 
          mb.batch_id = $1;
      `;
      
      const result = await pool.query(query, [batchId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in ManufacturingBatch.findById:', error);
      throw error;
    }
  }

  static async create(batchData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Generate batch number
      const batchNumber = `SP-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;

      // Insert batch
      const batchQuery = `
        INSERT INTO manufacturing.manufacturing_batches 
        (product_id, sales_order_id, batch_number, quantity, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING batch_id;
      `;

      const batchResult = await client.query(batchQuery, [
        batchData.product_id,
        batchData.sales_order_id,
        batchNumber,
        batchData.quantity,
        batchData.notes || 'Automatically created from sales order',
        batchData.created_by , // Default to admin user ID for now
      ]);

      const batchId = batchResult.rows[0].batch_id;

      // Get product manufacturing steps
      const stepsQuery = `
        SELECT id, sequence_number
        FROM product.manufacturing_steps
        WHERE product_id = $1 AND step_type = 'product'
        ORDER BY sequence_number;
      `;

      const stepsResult = await client.query(stepsQuery, [batchData.product_id]);

      // Create workflow entries for each step
      for (const step of stepsResult.rows) {
        await client.query(`
          INSERT INTO manufacturing.batch_workflows 
          (batch_id, step_id, status, created_by)
          VALUES ($1, $2, 'pending', $3);
        `, [batchId, step.id, batchData.created_by]);
      }

      // Get sub-components
      const subComponentsQuery = `
        SELECT id
        FROM product.sub_components
        WHERE product_id = $1;
      `;

      const subComponentsResult = await client.query(subComponentsQuery, [batchData.product_id]);

      // Create batch sub-components entries
      for (const subComponent of subComponentsResult.rows) {
        await client.query(`
          INSERT INTO manufacturing.batch_sub_components 
          (batch_id, sub_component_id, status, created_by)
          VALUES ($1, $2, 'pending', $3);
        `, [batchId, subComponent.id, batchData.created_by]);
      }

      await client.query('COMMIT');
      return await this.findById(batchId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in ManufacturingBatch.create:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(batchId, batchData, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const now = new Date();
      const updateQuery = `
        UPDATE manufacturing.manufacturing_batches
        SET 
          product_id = $1,
          sales_order_id = $2,
          quantity = $3,
          notes = $4,
          updated_at = $5,
          updated_by = $6
        WHERE batch_id = $7
        RETURNING *;
      `;

      const result = await client.query(updateQuery, [
        batchData.product_id,
        batchData.sales_order_id,
        batchData.quantity,
        batchData.notes,
        now,
        userId,
        batchId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Manufacturing batch not found');
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in ManufacturingBatch.update:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(batchId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete associated workflow steps
      await client.query(`
        DELETE FROM manufacturing.batch_workflows
        WHERE batch_id = $1;
      `, [batchId]);

      // Delete associated sub-components
      await client.query(`
        DELETE FROM manufacturing.batch_sub_components
        WHERE batch_id = $1;
      `, [batchId]);

      // Delete the batch itself
      const result = await pool.query(`
        DELETE FROM manufacturing.manufacturing_batches
        WHERE batch_id = $1
        RETURNING *;
      `, [batchId]);

      if (result.rows.length === 0) {
        throw new Error('Manufacturing batch not found');
      }

      await client.query('COMMIT');
      return { message: 'Batch deleted successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in ManufacturingBatch.delete:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateWorkflowStatus(batchId, stepId, status, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const now = new Date();
      const updateQuery = `
        UPDATE manufacturing.batch_workflows
        SET 
          status = $1::VARCHAR,
          started_at = CASE 
            WHEN $1 = 'in_progress' AND started_at IS NULL THEN $2
            ELSE started_at
          END,
          completed_at = CASE 
            WHEN $1 = 'completed' THEN $2
            ELSE completed_at
          END,
          updated_by = $3
        WHERE batch_id = $4 AND step_id = $5
        RETURNING *;
      `;

      const result = await client.query(updateQuery, [
        status,
        now,
        userId,
        batchId,
        stepId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Workflow step not found');
      }

      // Update batch status if needed
      if (status === 'completed') {
        const allStepsQuery = `
          SELECT status
          FROM manufacturing.batch_workflows
          WHERE batch_id = $1;
        `;

        const allStepsResult = await client.query(allStepsQuery, [batchId]);
        const allCompleted = allStepsResult.rows.every(step => step.status === 'completed');

        if (allCompleted) {
          // Get batch details including quantity
          const batchQuery = `
            SELECT mb.quantity, mb.product_id
            FROM manufacturing.manufacturing_batches mb
            WHERE mb.batch_id = $1;
          `;
          const batchResult = await client.query(batchQuery, [batchId]);
          const batch = batchResult.rows[0];

          // Get product details to access BOM
          const productDetails = await Product.findById(batch.product_id);
          if (!productDetails) {
            throw new Error(`Product with ID ${batch.product_id} not found`);
          }

          const allProductMaterials = {}; // Use an object to sum quantities for the same material

          // Add direct product materials
          if (productDetails.materials) {
            for (const mat of productDetails.materials) {
              const materialId = mat.materialId;
              if (allProductMaterials[materialId]) {
                allProductMaterials[materialId].quantity_required += mat.quantityRequired;
              } else {
                allProductMaterials[materialId] = { material_id: materialId, quantity_required: mat.quantityRequired };
              }
            }
          }

          // Add sub-component materials
          if (productDetails.subComponents) {
            for (const subComp of productDetails.subComponents) {
              if (subComp.materials) {
                for (const mat of subComp.materials) {
                  const materialId = mat.materialId;
                  if (allProductMaterials[materialId]) {
                    allProductMaterials[materialId].quantity_required += mat.quantityRequired;
                  } else {
                    allProductMaterials[materialId] = { material_id: materialId, quantity_required: mat.quantityRequired };
                  }
                }
              }
            }
          }
          
          // Deduct materials from inventory
          for (const materialId in allProductMaterials) {
            const bomItem = allProductMaterials[materialId];
            const quantityToDeduct = bomItem.quantity_required * batch.quantity;
            
            // Update raw material inventory
            const updateInventoryQuery = `
              UPDATE inventory.raw_materials
              SET 
                current_stock = current_stock - $1,
                updated_at = $2
              WHERE material_id = $3
              RETURNING current_stock;
            `;
            
            const inventoryResult = await client.query(updateInventoryQuery, [
              quantityToDeduct,
              now,
              bomItem.material_id
            ]);

            // Check if we have enough stock
            if (inventoryResult.rows[0].current_stock < 0) {
              throw new Error(`Insufficient raw material stock for material ID ${bomItem.material_id}`);
            }
          }

          // Update batch status to completed
          await client.query(`
            UPDATE manufacturing.manufacturing_batches
            SET status = 'completed', updated_by = $1, updated_at = $2
            WHERE batch_id = $3;
          `, [userId, now, batchId]);

          // Add to finished products inventory
          const existingFinishedProducts = await FinishedProduct.getProductInventory(batch.product_id);
          
          if (existingFinishedProducts && existingFinishedProducts.length > 0) {
            // If product exists, update its quantity
            await FinishedProduct.updateQuantity(existingFinishedProducts[0].finished_product_id, batch.quantity);
          } else {
            // If product does not exist, create a new entry
            await FinishedProduct.createFinishedProduct({
              product_id: batch.product_id,
              quantity_available: batch.quantity,
              // Add other necessary fields with default or derived values if required by your schema
              // For example: storage_location: 'Default Warehouse', status: 'available', unit_price: 0
            });
          }
        }
      }

      await client.query('COMMIT');
      return await this.findById(batchId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in ManufacturingBatch.updateWorkflowStatus:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateSubComponentStatus(batchId, subComponentId, status, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const now = new Date();
      const updateQuery = `
        UPDATE manufacturing.batch_sub_components
        SET 
          status = $1::VARCHAR,
          started_at = CASE 
            WHEN $1 = 'in_progress' AND started_at IS NULL THEN $2
            ELSE started_at
          END,
          completed_at = CASE 
            WHEN $1 = 'completed' THEN $2
            ELSE completed_at
          END,
          updated_by = $3
        WHERE batch_id = $4 AND sub_component_id = $5
        RETURNING *;
      `;

      const result = await client.query(updateQuery, [
        status,
        now,
        userId,
        batchId,
        subComponentId
      ]);

      if (result.rows.length === 0) {
        throw new Error('Sub-component not found');
      }

      // If completing a sub-component, update its manufacturing steps
      if (status === 'completed') {
        await client.query(`
          UPDATE manufacturing.batch_workflows bw
          SET 
            status = 'completed'::VARCHAR,
            completed_at = $1,
            updated_by = $2
          FROM product.manufacturing_steps ms
          WHERE 
            bw.batch_id = $3 
            AND ms.sub_component_id = $4
            AND bw.step_id = ms.id;
        `, [now, userId, batchId, subComponentId]);
      }

      await client.query('COMMIT');
      return await this.findById(batchId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in ManufacturingBatch.updateSubComponentStatus:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default ManufacturingBatch;