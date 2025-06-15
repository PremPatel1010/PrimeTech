import pool from '../db/db.js';
import ManufacturingProgress from './manufacturing.model.js';
import ManufacturingStage from './manufacturing.model.js';
import FinishedProduct from './finishedProduct.model.js';
import Product from './products.model.js';
import RawMaterial from './rawMaterial.model.js';
import ManufacturingBatch from './manufacturing.model.js';

class SalesOrder {
  static async getAllSalesOrders() {
    const result = await pool.query(`
      SELECT so.*, 
        (SELECT json_agg(json_build_object(
            'item_id', items.item_id,
            'product_category', items.product_category,
            'product_id', items.product_id,
            'quantity', items.quantity,
            'unit_price', items.unit_price,
            'fulfilled_from_inventory', items.fulfilled_from_inventory,
            'product_name', p.name
        ))
         FROM sales.sales_order_items items
         LEFT JOIN product.products p ON items.product_id = p.id  
         WHERE items.sales_order_id = so.sales_order_id) as order_items
      FROM sales.sales_order so
      ORDER BY so.created_at DESC
    `);
    return result.rows;
  }

  static async getSalesOrderById(salesOrderId, client = null) {
    try {
      const queryClient = client || pool;
      
      const result = await queryClient.query(`
        SELECT 
          so.*,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'product_category', soi.product_category,
                'product_id', soi.product_id,
                'quantity', soi.quantity,
                'unit_price', soi.unit_price,
                'fulfilled_from_inventory', soi.fulfilled_from_inventory,
                'product_name', p.name
              ))
              FROM sales.sales_order_items soi
              LEFT JOIN product.products p ON soi.product_id = p.id
              WHERE soi.sales_order_id = so.sales_order_id
            ),
            '[]'::json
          ) as order_items
        FROM sales.sales_order so
        WHERE so.sales_order_id = $1
      `, [salesOrderId]);

      console.log('getSalesOrderById result:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getSalesOrderById:', error);
      throw error;
    }
  }

  static async createSalesOrder(orderData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      console.log(orderData)

      // Create sales order
      const orderResult = await client.query(`
        INSERT INTO sales.sales_order (order_number, order_date, customer_name, discount, gst, total_amount, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING sales_order_id
      `, [
        orderData.order_number,
        orderData.order_date,
        orderData.customer_name,
        orderData.discount || 0,
        orderData.gst || 18,
        orderData.total_amount,
        orderData.status || 'pending',
        orderData.created_by || 1  // Default to user ID 1 if not provided
      ]);

      const salesOrderId = orderResult.rows[0].sales_order_id;

      // Commit the sales order first
      await client.query('COMMIT');

      // Start a new transaction for items and manufacturing
      await client.query('BEGIN');

      // Create order items and handle inventory/manufacturing
      for (const item of orderData.items) {
        // Verify product exists before proceeding
        const productCheck = await client.query(`
          SELECT id FROM product.products WHERE id = $1
        `, [item.product_id]);

        if (productCheck.rows.length === 0) {
          throw new Error(`Product with ID ${item.product_id} does not exist`);
        }

        // Get stock deduction and manufacturing quantities from the item
        const stockDeduction = Number(item.stock_deduction) || 0;
        const manufacturingQuantity = Number(item.manufacturing_quantity) || 0;
        const totalQuantity = Number(item.quantity) || 0;

        console.log('Quantity validation:', {
          stockDeduction,
          manufacturingQuantity,
          totalQuantity,
          sum: stockDeduction + manufacturingQuantity
        });

        // Validate quantities
        if (Math.abs((stockDeduction + manufacturingQuantity) - totalQuantity) > 0.001) {
          throw new Error(`Total quantity (${stockDeduction + manufacturingQuantity}) does not match requested quantity (${totalQuantity})`);
        }

        // Check finished product inventory if stock deduction is needed
        if (stockDeduction > 0) {
          const inventoryRows = await FinishedProduct.getProductInventory(item.product_id);
          let availableQty = 0;
          if (inventoryRows && inventoryRows.length > 0) {
            availableQty = inventoryRows.reduce((sum, row) => sum + Number(row.quantity_available), 0);
          }

          if (availableQty < stockDeduction) {
            throw new Error(`Insufficient stock for product ID ${item.product_id}. Required: ${stockDeduction}, Available: ${availableQty}`);
          }

          // Deduct from inventory
          let qtyToDeduct = stockDeduction;
          for (const inv of inventoryRows) {
            if (qtyToDeduct <= 0) break;
            const deductQty = Math.min(inv.quantity_available, qtyToDeduct);
            if (deductQty > 0) {
              await FinishedProduct.updateQuantity(inv.finished_product_id, -deductQty, client);
              qtyToDeduct -= deductQty;
            }
          }

          // Create order item for stock deduction
          await client.query(`
            INSERT INTO sales.sales_order_items 
            (sales_order_id, product_category, product_id, quantity, unit_price, fulfilled_from_inventory, stock_deduction, manufacturing_quantity)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING item_id
          `, [
            salesOrderId, 
            item.product_category, 
            item.product_id, 
            stockDeduction, 
            item.unit_price, 
            true,
            stockDeduction,
            0
          ]);
        }

        // Handle manufacturing if needed
        if (manufacturingQuantity > 0) {
          // Create order item for manufacturing
          const orderItemResult = await client.query(`
            INSERT INTO sales.sales_order_items 
            (sales_order_id, product_category, product_id, quantity, unit_price, fulfilled_from_inventory, stock_deduction, manufacturing_quantity)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING item_id
          `, [
            salesOrderId, 
            item.product_category, 
            item.product_id, 
            manufacturingQuantity, 
            item.unit_price, 
            false,
            0,
            manufacturingQuantity
          ]);

          // Create manufacturing batch
          await ManufacturingBatch.create({
            product_id: item.product_id,
            sales_order_id: salesOrderId,
            quantity: manufacturingQuantity,
            notes: `Auto-created for Sales Order ${orderData.order_number || salesOrderId} - Product ${item.product_id}`,
            created_by: orderData.createdBy,
          });
        }
      }

      await client.query('COMMIT');
      return orderResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateSalesOrder(salesOrderId, updateData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        order_number,
        order_date,
        customer_name,
        discount,
        gst,
        total_amount,
        status,
        items
      } = updateData;

      // Update sales order
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (order_number !== undefined) {
        updateFields.push(`order_number = $${paramCount}`);
        values.push(order_number);
        paramCount++;
      }
      if (order_date !== undefined) {
        updateFields.push(`order_date = $${paramCount}`);
        values.push(order_date);
        paramCount++;
      }
      if (customer_name !== undefined) {
        updateFields.push(`customer_name = $${paramCount}`);
        values.push(customer_name);
        paramCount++;
      }
      if (discount !== undefined) {
        updateFields.push(`discount = $${paramCount}`);
        values.push(discount);
        paramCount++;
      }
      if (gst !== undefined) {
        updateFields.push(`gst = $${paramCount}`);
        values.push(gst);
        paramCount++;
      }
      if (total_amount !== undefined) {
        updateFields.push(`total_amount = $${paramCount}`);
        values.push(total_amount);
        paramCount++;
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (updateFields.length > 0) {
        values.push(salesOrderId);
        const updateQuery = `
          UPDATE sales.sales_order 
          SET ${updateFields.join(', ')}
          WHERE sales_order_id = $${paramCount}
          RETURNING *
        `;
        await client.query(updateQuery, values);
      }

      // Update items if provided
      if (items) {
        // Delete existing items
        await client.query(
          'DELETE FROM sales.sales_order_items WHERE sales_order_id = $1',
          [salesOrderId]
        );

        // Insert new items
        for (const item of items) {
          await client.query(
            `INSERT INTO sales.sales_order_items 
             (sales_order_id, product_category, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4, $5)`,
            [salesOrderId, item.product_category, item.product_id, item.quantity, item.unit_price]
          );
        }
      }

      // Get the complete updated order
      const completeOrder = await this.getSalesOrderById(salesOrderId);

      if (!completeOrder) {
        throw new Error('Sales order not found');
      }

      await client.query('COMMIT');
      return completeOrder;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteSalesOrder(salesOrderId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        'DELETE FROM sales.sales_order WHERE sales_order_id = $1 RETURNING *',
        [salesOrderId]
      );

      if (result.rows.length === 0) {
        throw new Error('Sales order not found');
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateStatus(id, status) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the current sales order
      const currentOrder = await this.getSalesOrderById(id, client);
      if (!currentOrder) {
        throw new Error('Sales order not found');
      }

      // If status is being changed to completed, handle inventory deduction
      if (status === 'completed' && currentOrder.status !== 'completed') {
        // Get all order items for this order that were not fulfilled from inventory
        const orderItems = await client.query(`
          SELECT 
            soi.product_id,
            soi.quantity,
            soi.fulfilled_from_inventory
          FROM sales.sales_order_items soi
          WHERE soi.sales_order_id = $1
          AND soi.fulfilled_from_inventory = false
        `, [id]);

        // Deduct inventory for each item that was manufactured
        for (const item of orderItems.rows) {
          // Find all inventory rows for this product
          const inventoryRows = await FinishedProduct.getProductInventory(item.product_id);
          let qtyToDeduct = item.quantity;
          for (const inv of inventoryRows) {
            if (qtyToDeduct <= 0) break;
            const deductQty = Math.min(inv.quantity_available, qtyToDeduct);
            if (deductQty > 0) {
              await FinishedProduct.updateQuantity(inv.finished_product_id, -deductQty, client);
              qtyToDeduct -= deductQty;
            }
          }
          if (qtyToDeduct > 0) {
            throw new Error(`Insufficient stock to fulfill order for product ID ${item.product_id}`);
          }
        }
      }

      // Update the sales order status
      const result = await client.query(`
        UPDATE sales.sales_order 
        SET status = $1
        WHERE sales_order_id = $2
        RETURNING *
      `, [status, id]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getNextOrderNumber() {
    const year = new Date().getFullYear();
    const prefix = `SO-${year}-`;
    const result = await pool.query(
      `SELECT order_number FROM sales.sales_order WHERE order_number LIKE $1 ORDER BY order_number DESC LIMIT 1`,
      [`${prefix}%`]
    );
    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastOrderNumber = result.rows[0].order_number;
      const match = lastOrderNumber.match(/SO-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }

  static async checkProductStockAndRawMaterial(productId, quantity) {
    // Get finished product stock
    const finishedProducts = await FinishedProduct.getProductInventory(productId);
    const finishedStock = finishedProducts && finishedProducts.length > 0 ? finishedProducts.reduce((sum, row) => sum + Number(row.quantity_available), 0) : 0;
    
    // Get all materials required for the product (direct and from sub-components)
    const productDetails = await Product.findById(productId);
    if (!productDetails) {
      throw new Error(`Product with ID ${productId} not found`);
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

    let maxPossibleWithCurrentRawMaterial = Infinity;

    // If there are no materials required, it can be manufactured without raw materials (or not at all depending on business logic)
    if (Object.keys(allProductMaterials).length === 0) {
        maxPossibleWithCurrentRawMaterial = Infinity; // Assuming unlimited if no materials defined for manufacturing
    } else {
        for (const materialId in allProductMaterials) {
            const bomItem = allProductMaterials[materialId];
            const material = await RawMaterial.getRawMaterialById(bomItem.material_id);

            if (!material || bomItem.quantity_required <= 0) {
                maxPossibleWithCurrentRawMaterial = 0; // Cannot manufacture if material not found or quantity required is zero/negative
                break;
            }

            const possible = Math.floor(Number(material.current_stock) / Number(bomItem.quantity_required));
            maxPossibleWithCurrentRawMaterial = Math.min(maxPossibleWithCurrentRawMaterial, possible);
        }
    }

    const readyQuantity = Math.min(quantity, finishedStock);
    const toBeManufactured = Math.max(0, quantity - finishedStock);

    // If maxPossibleWithCurrentRawMaterial is Infinity, it means no materials are required, so it's only limited by order quantity.
    // If it's 0, it means no items can be manufactured due to raw material shortage.
    // Otherwise, it's the calculated limit.
    const actualMaxManufacturable = maxPossibleWithCurrentRawMaterial === Infinity ? toBeManufactured : maxPossibleWithCurrentRawMaterial;

    return {
      readyQuantity,
      toBeManufactured,
      maxPossibleWithCurrentRawMaterial: actualMaxManufacturable
    };
  }

  static async checkOrderAvailability(orderData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const availabilityResults = [];
      for (const item of orderData.items) {
        // Check finished product inventory
        const inventoryRows = await FinishedProduct.getProductInventory(item.product_id);
        let availableQty = 0;
        if (inventoryRows && inventoryRows.length > 0) {
          availableQty = inventoryRows.reduce((sum, row) => sum + Number(row.quantity_available), 0);
        }
        const requestedQty = item.quantity;
        const toBeManufactured = Math.max(0, requestedQty - availableQty);

        // Get BOM for the product (including direct materials and sub-component materials)
        const productDetails = await Product.findById(item.product_id);
        if (!productDetails) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        const allProductMaterials = [];

        // Add direct product materials
        if (productDetails.materials) {
          for (const mat of productDetails.materials) {
            allProductMaterials.push({
              material_id: mat.materialId,
              quantity_required: mat.quantityRequired,
            });
          }
        }

        // Add sub-component materials
        if (productDetails.subComponents) {
          for (const subComp of productDetails.subComponents) {
            if (subComp.materials) {
              for (const mat of subComp.materials) {
                allProductMaterials.push({
                  material_id: mat.materialId,
                  quantity_required: mat.quantityRequired,
                });
              }
            }
          }
        }

        const materialsNeeded = [];
        let maxManufacturableQty = Infinity;

        for (const bomItem of allProductMaterials) {
          const material = await RawMaterial.getRawMaterialById(bomItem.material_id);
          if (!material || !bomItem.quantity_required || bomItem.quantity_required <= 0) {
            maxManufacturableQty = 0;
            break;
          }

          const requiredQty = bomItem.quantity_required * toBeManufactured;
          const availableQtyMaterial = Number(material.current_stock);
          const missingQty = Math.max(0, requiredQty - availableQtyMaterial);

          materialsNeeded.push({
            material_id: bomItem.material_id,
            material_name: material.material_name,
            required_quantity: requiredQty,
            available_quantity: availableQtyMaterial,
            missing_quantity: missingQty,
            unit: material.unit,
          });

          // Calculate maximum possible quantity based on this material
          const maxQty = Math.floor(availableQtyMaterial / bomItem.quantity_required);
          maxManufacturableQty = Math.min(maxManufacturableQty, maxQty);
        }

        // If there are no materials required for manufacturing this product, assume it can be manufactured up to the requested quantity
        if (allProductMaterials.length === 0) {
          maxManufacturableQty = toBeManufactured; // Or some other logic if products without BOM are not manufacturable
        }

        // If nothing needs to be manufactured, canManufacture should be true
        let canManufacture = true;
        if (toBeManufactured > 0) {
          canManufacture = maxManufacturableQty >= toBeManufactured;
        }

        availabilityResults.push({
          product_id: item.product_id,
          requested_quantity: requestedQty,
          available_in_stock: availableQty,
          to_be_manufactured: toBeManufactured,
          can_manufacture: canManufacture,
          max_manufacturable_quantity: maxManufacturableQty,
          materials_needed: materialsNeeded,
        });
      }
      await client.query('COMMIT');
      return availabilityResults;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default SalesOrder; 