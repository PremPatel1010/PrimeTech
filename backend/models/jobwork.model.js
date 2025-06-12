import pool from '../db/db.js';
import SubComponent from './subComponent.model.js';

class JobworkVendor {
  static async getAllVendors() {
    const result = await pool.query(`
      SELECT * FROM jobwork.jobwork_vendors
      ORDER BY name ASC
    `);
    return result.rows;
  }

  static async getVendorById(vendorId) {
    const result = await pool.query(`
      SELECT * FROM jobwork.jobwork_vendors
      WHERE vendor_id = $1
    `, [vendorId]);
    return result.rows[0];
  }

  static async createVendor(vendorData) {
    const { name, contactPerson, phone, email, address, createdBy } = vendorData;
    const result = await pool.query(`
      INSERT INTO jobwork.jobwork_vendors 
      (name, contact_person, phone, email, address, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, contactPerson, phone, email, address, createdBy]);
    return result.rows[0];
  }

  static async updateVendor(vendorId, vendorData) {
    const { name, contactPerson, phone, email, address, updatedBy } = vendorData;
    const result = await pool.query(`
      UPDATE jobwork.jobwork_vendors
      SET name = $1, contact_person = $2, phone = $3, email = $4, address = $5, updated_by = $6
      WHERE vendor_id = $7
      RETURNING *
    `, [name, contactPerson, phone, email, address, updatedBy, vendorId]);
    return result.rows[0];
  }

  static async deleteVendor(vendorId) {
    await pool.query(`
      DELETE FROM jobwork.jobwork_vendors
      WHERE vendor_id = $1
    `, [vendorId]);
  }
}

class JobworkOrder {
  static async getAllOrders() {
    const result = await pool.query(`
      SELECT jo.*, 
        jv.name as vendor_name,
        (SELECT json_agg(json_build_object(
          'receipt_id', jr.receipt_id,
          'receipt_date', jr.receipt_date,
          'final_item_name', jr.final_item_name,
          'quantity_received', jr.quantity_received,
          'quantity_loss', jr.quantity_loss,
          'remarks', jr.remarks,
          'document_url', jr.document_url
        ))
        FROM jobwork.jobwork_receipts jr
        WHERE jr.order_id = jo.order_id) as receipts
      FROM jobwork.jobwork_orders jo
      LEFT JOIN jobwork.jobwork_vendors jv ON jo.vendor_id = jv.vendor_id
      ORDER BY jo.created_at DESC
    `);
    return result.rows;
  }

  static async getOrderById(orderId) {
    const result = await pool.query(`
      SELECT jo.*, 
        jv.name as vendor_name,
        (SELECT json_agg(json_build_object(
          'receipt_id', jr.receipt_id,
          'receipt_date', jr.receipt_date,
          'final_item_name', jr.final_item_name,
          'quantity_received', jr.quantity_received,
          'quantity_loss', jr.quantity_loss,
          'remarks', jr.remarks,
          'document_url', jr.document_url
        ))
        FROM jobwork.jobwork_receipts jr
        WHERE jr.order_id = jo.order_id) as receipts
      FROM jobwork.jobwork_orders jo
      LEFT JOIN jobwork.jobwork_vendors jv ON jo.vendor_id = jv.vendor_id
      WHERE jo.order_id = $1
    `, [orderId]);
    return result.rows[0];
  }

  static async getNextOrderNumber() {
    const result = await pool.query(`
      SELECT COUNT(*) as count FROM jobwork.jobwork_orders
      WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);
    const count = parseInt(result.rows[0].count) + 1;
    return `JW-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;
  }

  static async createOrder(orderData) {
    const {
      vendor_id,
      order_date,
      due_date,
      component,
      item_sent,
      expected_return_item,
      quantity_sent,
      purpose,
      notes,
      created_by
    } = orderData;

    const jobworkNumber = await this.getNextOrderNumber();

    const result = await pool.query(`
      INSERT INTO jobwork.jobwork_orders
      (jobwork_number, vendor_id, order_date, due_date, component, item_sent,
       expected_return_item, quantity_sent, purpose, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [jobworkNumber, vendor_id, order_date, due_date, component, item_sent,
        expected_return_item, quantity_sent, purpose, notes, created_by]);
    return result.rows[0];
  }

  static async updateOrder(orderId, orderData) {
    const {
      vendor_id,
      order_date,
      due_date,
      component,
      item_sent,
      expected_return_item,
      quantity_sent,
      purpose,
      notes,
      quantity_received,
      quantity_loss,
      status,
      updated_by
    } = orderData;

    // Pass empty strings directly for optional fields; assume DB can handle them
    const final_item_sent = item_sent;
    const final_expected_return_item = expected_return_item;
    const final_purpose = purpose;

    const result = await pool.query(`
      UPDATE jobwork.jobwork_orders
      SET vendor_id = $1, order_date = $2, due_date = $3, component = $4, item_sent = $5,
          quantity_sent = $6, notes = $7, expected_return_item = $8, purpose = $9,
          quantity_received = $10, quantity_loss = $11, status = $12, updated_by = $13
      WHERE order_id = $14
      RETURNING *
    `, [vendor_id, order_date, due_date, component, final_item_sent,
        quantity_sent, notes, final_expected_return_item, final_purpose,
        quantity_received, quantity_loss, status, updated_by, orderId]);
    return result.rows[0];
  }

  static async updateStatus(orderId, status, updatedBy) {
    const result = await pool.query(`
      UPDATE jobwork.jobwork_orders
      SET status = $1, updated_by = $2
      WHERE order_id = $3
      RETURNING *
    `, [status, updatedBy, orderId]);
    return result.rows[0];
  }

  static async getOrdersByStatus(status) {
    const result = await pool.query(`
      SELECT jo.*, jv.name as vendor_name
      FROM jobwork.jobwork_orders jo
      LEFT JOIN jobwork.jobwork_vendors jv ON jo.vendor_id = jv.vendor_id
      WHERE jo.status = $1
      ORDER BY jo.created_at DESC
    `, [status]);
    return result.rows;
  }

  static async getOrdersByVendor(vendorId) {
    const result = await pool.query(`
      SELECT jo.*, jv.name as vendor_name
      FROM jobwork.jobwork_orders jo
      LEFT JOIN jobwork.jobwork_vendors jv ON jo.vendor_id = jv.vendor_id
      WHERE jo.vendor_id = $1
      ORDER BY jo.created_at DESC
    `, [vendorId]);
    return result.rows;
  }

  static async getOrderByJobworkNumber(jobworkNumber) {
    const result = await pool.query(`
      SELECT jo.*, 
        jv.name as vendor_name,
        (SELECT json_agg(json_build_object(
          'receipt_id', jr.receipt_id,
          'receipt_date', jr.receipt_date,
          'final_item_name', jr.final_item_name,
          'quantity_received', jr.quantity_received,
          'quantity_loss', jr.quantity_loss,
          'remarks', jr.remarks,
          'document_url', jr.document_url
        ))
        FROM jobwork.jobwork_receipts jr
        WHERE jr.order_id = jo.order_id) as receipts
      FROM jobwork.jobwork_orders jo
      LEFT JOIN jobwork.jobwork_vendors jv ON jo.vendor_id = jv.vendor_id
      WHERE jo.jobwork_number ILIKE $1
    `, [jobworkNumber]);
    console.log(`Query result for ${jobworkNumber}:`, result.rows[0]);
    return result.rows[0];
  }

  static async getOverdueOrders() {
    const result = await pool.query(`
      SELECT jo.*, jv.name as vendor_name
      FROM jobwork.jobwork_orders jo
      LEFT JOIN jobwork.jobwork_vendors jv ON jo.vendor_id = jv.vendor_id
      WHERE jo.due_date < CURRENT_DATE 
        AND jo.status NOT IN ('completed', 'cancelled')
      ORDER BY jo.due_date ASC
    `);
    return result.rows;
  }

  static async deleteOrder(orderId) {
    await pool.query(`
      DELETE FROM jobwork.jobwork_orders
      WHERE order_id = $1
    `, [orderId]);
  }
}

class JobworkReceipt {
  static async createReceipt(receiptData) {
    const {
      orderId,
      receiptDate,
      finalItemName,
      quantityReceived,
      quantityLoss,
      remarks,
      documentUrl,
      createdBy
    } = receiptData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the jobwork order details
      const orderResult = await client.query(`
        SELECT * FROM jobwork.jobwork_orders
        WHERE order_id = $1
      `, [orderId]);

      if (orderResult.rows.length === 0) {
        throw new Error('Jobwork order not found');
      }

      const order = orderResult.rows[0];
      console.log(`Jobwork order details for receipt creation: ${JSON.stringify(order)}`);

      // Create receipt
      const receiptResult = await client.query(`
        INSERT INTO jobwork.jobwork_receipts 
        (order_id, receipt_date, final_item_name, quantity_received, 
         quantity_loss, remarks, document_url, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [orderId, receiptDate, finalItemName, quantityReceived, 
          quantityLoss, remarks, documentUrl, createdBy]);

      console.log(`Receipt created: ${JSON.stringify(receiptResult.rows[0])}`);

      // Update order quantities and status
      await client.query(`
        UPDATE jobwork.jobwork_orders
        SET quantity_received = quantity_received + $1,
            quantity_loss = quantity_loss + $2,
            status = 'completed',
            updated_by = $3
        WHERE order_id = $4
      `, [quantityReceived, quantityLoss, createdBy, orderId]);

      console.log(`Jobwork order status updated to completed for order ID: ${orderId}`);

      // Add completed items to inventory
      // First check if the component exists in inventory
      console.log(`Attempting to find sub-component with code: ${order.component}`);
      let subComponent = await SubComponent.getByCode(order.component);
      
      if (!subComponent) {
        console.log(`Sub-component with code ${order.component} not found. Creating a new one.`);
        // Create new sub-component if it doesn't exist
        subComponent = await SubComponent.create({
          component_code: order.component,
          component_name: order.expected_return_item,
          description: `Component created from jobwork order ${order.jobwork_number}`,
          category: 'jobwork',
          unit: 'pcs',
          current_stock: 0,
          minimum_stock: 0,
          unit_price: 0, // You might want to calculate this based on jobwork costs
          created_by: createdBy
        });
        console.log(`New sub-component created: ${JSON.stringify(subComponent)}`);
      } else {
        console.log(`Sub-component found: ${JSON.stringify(subComponent)}`);
      }

      // Add the received quantity to inventory
      console.log(`Attempting to update stock for sub-component ID ${subComponent.sub_component_id} by quantity: ${quantityReceived}`);
      const updatedSubComponent = await SubComponent.updateStock(
        subComponent.sub_component_id,
        quantityReceived,
        'in',
        'jobwork',
        orderId,
        `Added from jobwork order ${order.jobwork_number}`,
        createdBy
      );
      console.log(`Sub-component stock updated: ${JSON.stringify(updatedSubComponent)}`);

      await client.query('COMMIT');
      return receiptResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getReceiptsByOrder(orderId) {
    const result = await pool.query(`
      SELECT * FROM jobwork.jobwork_receipts
      WHERE order_id = $1
      ORDER BY receipt_date DESC
    `, [orderId]);
    return result.rows;
  }
}

export { JobworkVendor, JobworkOrder, JobworkReceipt }; 