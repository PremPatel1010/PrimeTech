import pool from '../db/db.js';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';

// Create a new GRN with material-wise tracking
const createGRN = async (req, res) => {
  const client = await pool.connect();
  try {
    const { 
      purchase_order_id, 
      grn_date, 
      matched_with_po, 
      remarks,
      materials // Array of { material_id, received_quantity, defective_quantity, remarks }
    } = req.body;

    await client.query('BEGIN');

    // Get the purchase order details
    const poResult = await client.query(
      'SELECT * FROM purchase.purchase_orders WHERE purchase_order_id = $1',
      [purchase_order_id]
    );

    if (poResult.rows.length === 0) {
      throw new Error('Purchase order not found');
    }

    const po = poResult.rows[0];

    // Create the GRN
    const grnResult = await client.query(
      `INSERT INTO purchase.grns (
        purchase_order_id,
        grn_date,
        matched_with_po,
        remarks,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [
        purchase_order_id,
        grn_date,
        matched_with_po,
        remarks || '',
        req.user?.user_id || null
      ]
    );

    const grn = grnResult.rows[0];

    // Insert GRN materials
    for (const material of materials) {
      await client.query(
        `INSERT INTO purchase.grn_materials (
          grn_id,
          material_id,
          received_quantity,
          defective_quantity,
          remarks
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          grn.grn_id,
          material.material_id,
          material.received_quantity,
          material.defective_quantity || 0,
          material.remarks || ''
        ]
      );
    }

    // Get material summary
    const summaryResult = await client.query(
      `SELECT * FROM purchase.material_summary 
       WHERE purchase_order_id = $1`,
      [purchase_order_id]
    );

    await client.query('COMMIT');

    res.json({
      grn,
      materials,
      summary: summaryResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating GRN:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Get GRNs by purchase order ID with material details
const getGRNsByPO = async (req, res) => {
  try {
    const { purchase_order_id } = req.params;

    const result = await pool.query(
      `SELECT 
        g.*,
        u.username as created_by_name,
        json_agg(
          json_build_object(
            'material_id', gm.material_id,
            'material_name', m.name,
            'received_quantity', gm.received_quantity,
            'defective_quantity', gm.defective_quantity,
            'remarks', gm.remarks
          )
        ) as materials
       FROM purchase.grns g
       LEFT JOIN auth.users u ON g.created_by = u.user_id
       LEFT JOIN purchase.grn_materials gm ON g.grn_id = gm.grn_id
       LEFT JOIN inventory.materials m ON gm.material_id = m.material_id
       WHERE g.purchase_order_id = $1
       GROUP BY g.grn_id, u.username
       ORDER BY g.created_at DESC`,
      [purchase_order_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get material summary for a PO
const getMaterialSummary = async (req, res) => {
  try {
    const { purchase_order_id } = req.params;

    const result = await pool.query(
      `SELECT 
        ms.*,
        m.name as material_name,
        m.code as material_code
       FROM purchase.material_summary ms
       JOIN inventory.materials m ON ms.material_id = m.material_id
       WHERE ms.purchase_order_id = $1`,
      [purchase_order_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching material summary:', error);
    res.status(500).json({ error: error.message });
  }
};

// Verify a GRN
const verifyGRN = async (req, res) => {
  const client = await pool.connect();
  try {
    const { purchase_order_id, grn_id } = req.params;

    await client.query('BEGIN');

    // Update GRN status
    const result = await client.query(
      `UPDATE purchase.grns 
       SET verified = true,
           verified_at = NOW(),
           verified_by = $1
       WHERE grn_id = $2 AND purchase_order_id = $3
       RETURNING *`,
      [req.user?.user_id || null, grn_id, purchase_order_id]
    );

    if (result.rows.length === 0) {
      throw new Error('GRN not found');
    }

    // Create QC reports for each material
    const materialsResult = await client.query(
      `SELECT * FROM purchase.grn_materials WHERE grn_id = $1`,
      [grn_id]
    );

    for (const material of materialsResult.rows) {
      await client.query(
        `INSERT INTO purchase.qc_reports (
          grn_id,
          material_id,
          inspected_quantity,
          accepted_quantity,
          defective_quantity,
          status,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [
          grn_id,
          material.material_id,
          material.received_quantity,
          material.received_quantity - material.defective_quantity,
          material.defective_quantity,
          req.user?.user_id || null
        ]
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error verifying GRN:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Generate and download GRN PDF
const downloadGRNPDF = async (req, res) => {
  try {
    const { purchase_order_id, grn_id } = req.params;

    // Get GRN details with PO, supplier, and material info
    const result = await pool.query(
      `SELECT 
        g.*,
        po.order_number,
        po.order_date,
        s.supplier_name,
        s.address as supplier_address,
        s.phone as supplier_phone,
        u.username as created_by_name,
        json_agg(
          json_build_object(
            'material_name', m.name,
            'material_code', m.code,
            'received_quantity', gm.received_quantity,
            'defective_quantity', gm.defective_quantity,
            'remarks', gm.remarks
          )
        ) as materials
       FROM purchase.grns g
       JOIN purchase.purchase_orders po ON g.purchase_order_id = po.purchase_order_id
       JOIN purchase.suppliers s ON po.supplier_id = s.supplier_id
       LEFT JOIN auth.users u ON g.created_by = u.user_id
       LEFT JOIN purchase.grn_materials gm ON g.grn_id = gm.grn_id
       LEFT JOIN inventory.materials m ON gm.material_id = m.material_id
       WHERE g.grn_id = $1 AND g.purchase_order_id = $2
       GROUP BY g.grn_id, po.order_number, po.order_date, s.supplier_name, s.address, s.phone, u.username`,
      [grn_id, purchase_order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    const grn = result.rows[0];

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=GRN-${grn.grn_number}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Goods Receipt Note', { align: 'center' });
    doc.moveDown();

    // GRN Details
    doc.fontSize(12);
    doc.text(`GRN Number: ${grn.grn_number}`);
    doc.text(`Date: ${format(new Date(grn.grn_date), 'dd/MM/yyyy')}`);
    doc.text(`PO Number: ${grn.order_number}`);
    doc.text(`PO Date: ${format(new Date(grn.order_date), 'dd/MM/yyyy')}`);
    doc.moveDown();

    // Supplier Details
    doc.text('Supplier Details:');
    doc.text(`Name: ${grn.supplier_name}`);
    doc.text(`Address: ${grn.supplier_address}`);
    doc.text(`Phone: ${grn.supplier_phone}`);
    doc.moveDown();

    // Materials Table
    doc.text('Received Materials:');
    doc.moveDown();

    // Table header
    const tableTop = doc.y;
    doc.text('Material', 50, tableTop);
    doc.text('Code', 200, tableTop);
    doc.text('Received', 300, tableTop);
    doc.text('Defective', 400, tableTop);
    doc.moveDown();

    // Table rows
    let y = doc.y;
    grn.materials.forEach(material => {
      doc.text(material.material_name, 50, y);
      doc.text(material.material_code, 200, y);
      doc.text(material.received_quantity.toString(), 300, y);
      doc.text(material.defective_quantity.toString(), 400, y);
      y += 20;
    });

    doc.moveDown();

    // Remarks
    if (grn.remarks) {
      doc.text('Remarks:');
      doc.text(grn.remarks);
      doc.moveDown();
    }

    // Footer
    doc.fontSize(10);
    doc.text(`Created by: ${grn.created_by_name || 'System'}`);
    doc.text(`Created at: ${format(new Date(grn.created_at), 'dd/MM/yyyy HH:mm')}`);
    if (grn.verified) {
      doc.text(`Verified at: ${format(new Date(grn.verified_at), 'dd/MM/yyyy HH:mm')}`);
    }

    doc.end();
  } catch (error) {
    console.error('Error generating GRN PDF:', error);
    res.status(500).json({ error: error.message });
  }
};

export {
  createGRN,
  getGRNsByPO,
  getMaterialSummary,
  verifyGRN,
  downloadGRNPDF
}; 