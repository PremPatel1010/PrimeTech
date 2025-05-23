import pool from '../db/db.js';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';

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

    // Insert GRN materials (use correct table name based on your schema)
    for (const material of materials) {
      await client.query(
        `INSERT INTO purchase.grn_items (
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

    // Recalculate and upsert material summary for this PO (use grn_items for aggregation)
    const poMaterials = await client.query(
      `SELECT material_id, quantity as ordered_quantity FROM purchase.purchase_order_items WHERE purchase_order_id = $1`,
      [purchase_order_id]
    );
    for (const poMat of poMaterials.rows) {
      const { material_id, ordered_quantity } = poMat;
      // Sum received and defective from all GRNs for this PO/material
      const grnAgg = await client.query(
        `SELECT 
            COALESCE(SUM(received_quantity),0) as total_received, 
            COALESCE(SUM(defective_quantity),0) as total_defective
         FROM purchase.grn_items gi
         JOIN purchase.grns g ON gi.grn_id = g.grn_id
         WHERE g.purchase_order_id = $1 AND gi.material_id = $2`,
        [purchase_order_id, material_id]
      );
      const total_received = Number(grnAgg.rows[0].total_received);
      const total_defective = Number(grnAgg.rows[0].total_defective);
      const pending_quantity = Number(ordered_quantity) - total_received;
      await client.query(
        `INSERT INTO purchase.material_summary (purchase_order_id, material_id, ordered_quantity, total_received, total_defective, pending_quantity)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (purchase_order_id, material_id) DO UPDATE SET
           ordered_quantity = EXCLUDED.ordered_quantity,
           total_received = EXCLUDED.total_received,
           total_defective = EXCLUDED.total_defective,
           pending_quantity = EXCLUDED.pending_quantity` ,
        [purchase_order_id, material_id, ordered_quantity, total_received, total_defective, pending_quantity]
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
       LEFT JOIN purchase.grn_items gm ON g.grn_id = gm.grn_id
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
      `SELECT * FROM purchase.grn_items WHERE grn_id = $1`,
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
       LEFT JOIN purchase.grn_items gm ON g.grn_id = gm.grn_id
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

// Professional GRN PDF generator
const generateGRNPDF = async (req, res) => {
  const { id } = req.params;
  const isDownload = req.query.download === '1';
  try {
    // 1. Fetch GRN, PO, Supplier, Company, Items, Materials
    const grnRes = await pool.query('SELECT * FROM purchase.grns WHERE grn_id = $1', [id]);
    if (!grnRes.rows.length) return res.status(404).send('GRN not found');
    const grn = grnRes.rows[0];

    const poRes = await pool.query('SELECT * FROM purchase.purchase_order WHERE purchase_order_id = $1', [grn.purchase_order_id]);
    const po = poRes.rows[0] || {};
    const supplierRes = await pool.query('SELECT * FROM purchase.suppliers WHERE supplier_id = $1', [po.supplier_id]);
    const supplier = supplierRes.rows[0] || {};
    const companyRes = await pool.query('SELECT * FROM public.company_settings LIMIT 1');
    const company = companyRes.rows[0] || {};
    const grnItemsRes = await pool.query('SELECT * FROM purchase.grn_items WHERE grn_id = $1', [id]);
    const grnItems = grnItemsRes.rows;
    // Get PO items and material details
    const poItemsRes = await pool.query('SELECT * FROM purchase.purchase_order_items WHERE purchase_order_id = $1', [grn.purchase_order_id]);
    const poItems = poItemsRes.rows;
    const materialIds = grnItems.map(i => i.material_id);
    const materialsRes = await pool.query('SELECT * FROM inventory.raw_materials WHERE material_id = ANY($1)', [materialIds]);
    const materials = materialsRes.rows;
    // Map material_id to material
    const materialMap = {};
    for (const m of materials) materialMap[m.material_id] = m;
    // Map material_id to PO item
    const poItemMap = {};
    for (const p of poItems) poItemMap[p.material_id] = p;

    // 2. Prepare PDF
    const doc = new PDFDocument({ size: 'A4', margin: 32 });
    res.setHeader('Content-Type', 'application/pdf');
    const fileName = `GRN-${grn.grn_id}-${grn.grn_date.toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${fileName}"`);
    doc.pipe(res);

    // Header: Company Info
    if (company.logo_url) {
      try {
        doc.image(company.logo_url, 32, 24, { width: 100 });
      } catch {}
    }
    doc.fontSize(18).font('Helvetica-Bold').text(company.company_name || 'Primetech Industries', 150, 28, { align: 'left' });
    doc.fontSize(10).font('Helvetica').text(company.company_address || '', 150, 48, { align: 'left' });
    doc.text(`GST: ${company.gst_number || ''}`, 150, 62, { align: 'left' });
    doc.moveDown();
    doc.moveTo(32, 80).lineTo(563, 80).strokeColor('#bbb').stroke();
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#222').text('Goods Receipt Note (GRN)', { align: 'center', underline: false });
    doc.moveDown(0.5);
    doc.fillColor('#000');

    // GRN/PO/Supplier Info
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(`GRN No: `, 32, 100, { continued: true }).font('Helvetica').text(grn.grn_id || '', { continued: true });
    doc.font('Helvetica-Bold').text(`   GRN Date: `, { continued: true }).font('Helvetica').text(grn.grn_date ? new Date(grn.grn_date).toLocaleDateString() : '', { continued: true });
    doc.font('Helvetica-Bold').text(`   PO No: `, { continued: true }).font('Helvetica').text(po.order_number || '', { continued: true });
    doc.font('Helvetica-Bold').text(`   PO Date: `, { continued: true }).font('Helvetica').text(po.order_date ? new Date(po.order_date).toLocaleDateString() : '');
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text(`Supplier: `, { continued: true }).font('Helvetica').text(supplier.supplier_name || '', { continued: true });
    doc.font('Helvetica-Bold').text(`   Address: `, { continued: true }).font('Helvetica').text(supplier.address || '');
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text(`Created By: `, { continued: true }).font('Helvetica').text(grn.created_by || '', { continued: true });
    doc.font('Helvetica-Bold').text(`   Status: `, { continued: true }).font('Helvetica').text(grn.status || '');
    doc.moveDown(1);

    // Table Header
    let y = doc.y;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.rect(32, y, 531, 22).fillAndStroke('#f5f5f5', '#bbb');
    doc.fill('#222');
    doc.text('SL No.', 36, y + 7, { width: 30, align: 'center' });
    doc.text('Item Code', 70, y + 7, { width: 60, align: 'center' });
    doc.text('Description', 135, y + 7, { width: 120, align: 'center' });
    doc.text('UOM', 260, y + 7, { width: 30, align: 'center' });
    doc.text('Ordered', 295, y + 7, { width: 45, align: 'right' });
    doc.text('Received', 345, y + 7, { width: 45, align: 'right' });
    doc.text('Accepted', 395, y + 7, { width: 45, align: 'right' });
    doc.text('Rejected', 445, y + 7, { width: 45, align: 'right' });
    doc.text('Rate', 495, y + 7, { width: 35, align: 'right' });
    doc.text('Total', 535, y + 7, { width: 35, align: 'right' });
    y += 22;
    doc.font('Helvetica').fontSize(9);
    let totalOrdered = 0, totalReceived = 0, totalAccepted = 0, totalRejected = 0, grandTotal = 0;
    grnItems.forEach((item, idx) => {
      const mat = materialMap[item.material_id] || {};
      const poItem = poItemMap[item.material_id] || {};
      const ordered = Number(poItem.quantity) || 0;
      const received = Number(item.received_quantity) || 0;
      const accepted = received - (Number(item.defective_quantity) || 0);
      const rejected = Number(item.defective_quantity) || 0;
      const rate = Number(poItem.unit_price) || 0;
      const total = accepted * rate;
      totalOrdered += ordered;
      totalReceived += received;
      totalAccepted += accepted;
      totalRejected += rejected;
      grandTotal += total;
      doc.rect(32, y, 531, 20).strokeColor('#eee').stroke();
      doc.fill('#000');
      doc.text(idx + 1, 36, y + 6, { width: 30, align: 'center' });
      doc.text(mat.material_code || '', 70, y + 6, { width: 60, align: 'center' });
      doc.text(`${mat.material_name || ''}${mat.moc ? ' / ' + mat.moc : ''}`, 135, y + 6, { width: 120, align: 'left' });
      doc.text(mat.unit || '', 260, y + 6, { width: 30, align: 'center' });
      doc.text(ordered.toFixed(2), 295, y + 6, { width: 45, align: 'right' });
      doc.text(received.toFixed(2), 345, y + 6, { width: 45, align: 'right' });
      doc.text(accepted.toFixed(2), 395, y + 6, { width: 45, align: 'right' });
      doc.text(rejected.toFixed(2), 445, y + 6, { width: 45, align: 'right' });
      doc.text(rate.toFixed(2), 495, y + 6, { width: 35, align: 'right' });
      doc.text(total.toFixed(2), 535, y + 6, { width: 35, align: 'right' });
      y += 20;
    });
    // Summary row
    doc.font('Helvetica-Bold');
    doc.rect(32, y, 531, 20).fillAndStroke('#e0e0e0', '#bbb');
    doc.fill('#222');
    doc.text('Total', 36, y + 6, { width: 220, align: 'center' });
    doc.text(totalOrdered.toFixed(2), 295, y + 6, { width: 45, align: 'right' });
    doc.text(totalReceived.toFixed(2), 345, y + 6, { width: 45, align: 'right' });
    doc.text(totalAccepted.toFixed(2), 395, y + 6, { width: 45, align: 'right' });
    doc.text(totalRejected.toFixed(2), 445, y + 6, { width: 45, align: 'right' });
    doc.text('', 495, y + 6, { width: 35, align: 'right' });
    doc.text(grandTotal.toFixed(2), 535, y + 6, { width: 35, align: 'right' });
    y += 30;

    // Remarks
    if (grn.remarks) {
      doc.font('Helvetica').fontSize(10).fillColor('#444').text('Remarks:', 32, y);
      doc.font('Helvetica').fontSize(10).fillColor('#000').text(grn.remarks, 90, y);
      y += 20;
    }

    // Footer: signatures
    doc.font('Helvetica').fontSize(10).fillColor('#000');
    doc.text('Prepared By', 60, y + 20, { align: 'center' });
    doc.text('Store Manager', 160, y + 20, { align: 'center' });
    doc.text('QC In-Charge', 300, y + 20, { align: 'center' });
    doc.text('H.O.D.', 420, y + 20, { align: 'center' });
    doc.text('Account', 520, y + 20, { align: 'center' });
    doc.end();
  } catch (err) {
    console.error('Error generating GRN PDF:', err);
    // Always return a valid PDF, even on error
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    doc.text('Failed to generate GRN PDF. Please contact support.');
    doc.end();
  }
};

// Edit GRN in QC stage
const editGRNForQC = async (req, res) => {
  const client = await pool.connect();
  try {
    const { purchase_order_id, grn_id } = req.params;
    const { material_id, defective_quantity, remarks } = req.body;

    console.log(`editGRNForQC: Received PO ID: ${purchase_order_id}, GRN ID: ${grn_id}, Material ID: ${material_id}, Defective Quantity: ${defective_quantity}, Remarks: ${remarks}`);

    // Fetch the current GRN item to get received_quantity
    console.log('editGRNForQC: Fetching GRN item...');
    const grnItemResult = await client.query(
      `SELECT received_quantity FROM purchase.grn_items WHERE grn_id = $1 AND material_id = $2`,
      [grn_id, material_id]
    );
    console.log('editGRNForQC: GRN item fetched.', grnItemResult.rows);

    if (grnItemResult.rows.length === 0) {
      throw new Error('GRN item not found');
    } else {
      console.log('editGRNForQC: GRN item found.');
    }

    const receivedQuantity = Number(grnItemResult.rows[0].received_quantity);
    const newDefectiveQuantity = Number(defective_quantity);

    // Validate defective quantity
    console.log(`editGRNForQC: Validating defective quantity. Received: ${receivedQuantity}, New Defective: ${newDefectiveQuantity}`);
    if (newDefectiveQuantity < 0) {
      throw new Error('Defective quantity cannot be negative');
    }
    if (newDefectiveQuantity > receivedQuantity) {
      throw new Error(`Defective quantity (${newDefectiveQuantity}) cannot exceed received quantity (${receivedQuantity})`);
    }
    console.log('editGRNForQC: Defective quantity validated.');

    await client.query('BEGIN');
    console.log('editGRNForQC: Transaction started.');

    // Update grn_items for this material
    console.log('editGRNForQC: Updating grn_items...');
    const result = await client.query(
      `UPDATE purchase.grn_items SET defective_quantity = $1, remarks = $2 WHERE grn_id = $3 AND material_id = $4 RETURNING *`,
      [newDefectiveQuantity, remarks, grn_id, material_id]
    );
    console.log('editGRNForQC: grn_items updated.', result.rows);

    if (result.rows.length === 0) throw new Error('GRN item not found after update');

    // Recalculate accepted_quantity
    const grnItem = result.rows[0];
    const accepted_quantity = Number(grnItem.received_quantity) - Number(defective_quantity);
    console.log(`editGRNForQC: Recalculated accepted quantity: ${accepted_quantity}`);

    // Check if QC report exists
    console.log('editGRNForQC: Checking for existing qc_report...');
    const existingReport = await client.query(
      `SELECT 1 FROM purchase.qc_reports WHERE grn_id = $1 AND material_id = $2`,
      [grn_id, material_id]
    );

    if (existingReport.rows.length > 0) {
      // Update existing QC report
      console.log('editGRNForQC: Updating existing qc_report...');
      await client.query(
        `UPDATE purchase.qc_reports SET inspected_quantity = $1, defective_quantity = $2, accepted_quantity = $3, remarks = $4 WHERE grn_id = $5 AND material_id = $6`,
        [Number(grnItem.received_quantity), Number(defective_quantity), accepted_quantity, remarks, grn_id, material_id]
      );
      console.log('editGRNForQC: qc_report updated.');
    } else {
      // Insert new QC report
      console.log('editGRNForQC: Inserting new qc_report...');
      await client.query(
        `INSERT INTO purchase.qc_reports (grn_id, material_id, inspected_quantity, defective_quantity, accepted_quantity, remarks)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [grn_id, material_id, Number(grnItem.received_quantity), Number(defective_quantity), accepted_quantity, remarks]
      );
      console.log('editGRNForQC: qc_report inserted.');
    }



    await client.query('COMMIT');
    console.log('editGRNForQC: Transaction committed.');

    // Call PO status update
    console.log('editGRNForQC: Calling purchaseOrder.model.updateStatus...');
    await import('../models/purchaseOrder.model.js').then(m => m.default.updateStatus(purchase_order_id));
    console.log('editGRNForQC: purchaseOrder.model.updateStatus called.');

    res.json({ success: true });
    console.log('editGRNForQC: Response sent.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in editGRNForQC:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
    console.log('editGRNForQC: Client released.');
  }
};

// Create a return entry for defective items
const createReturnEntry = async (req, res) => {
  const client = await pool.connect();
  try {
    const { purchase_order_id, grn_id } = req.params;
    const { material_id, quantity, remarks } = req.body;
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO purchase.return_entries (grn_id, material_id, quantity, remarks) VALUES ($1, $2, $3, $4) RETURNING *`,
      [grn_id, material_id, quantity, remarks]
    );
    await client.query('COMMIT');
    // Call PO status update
    await import('../models/purchaseOrder.model.js').then(m => m.default.updateStatus(purchase_order_id));
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Send accepted quantity to store (inventory update)
const sendToStore = async (req, res) => {
  const client = await pool.connect();
  try {
    const { purchase_order_id, grn_id } = req.params;
    const { material_id, quantity } = req.body;
    await client.query('BEGIN');
    // Update inventory
    await client.query(
      `UPDATE inventory.raw_materials SET current_stock = current_stock + $1 WHERE material_id = $2`,
      [quantity, material_id]
    );
    await client.query('COMMIT');
    // Call PO status update
    await import('../models/purchaseOrder.model.js').then(m => m.default.updateStatus(purchase_order_id));
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

// Get return history for a GRN
const getReturnHistoryForGRN = async (req, res) => {
  try {
    const { grn_id } = req.params;
    if (!grn_id) return res.status(400).json({ error: 'Missing grn_id' });
    const result = await pool.query(
      `SELECT r.return_id, r.grn_id, r.material_id, r.quantity_returned, r.remarks, r.date, r.status, m.material_name, m.material_code
       FROM purchase.returns r
       LEFT JOIN inventory.raw_materials m ON r.material_id = m.material_id
       WHERE r.grn_id = $1
       ORDER BY r.date DESC`,
      [grn_id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error('Error getting return history for GRN:', error);
  }
};

// Call PurchaseOrder.updateStatus after each event
const callPurchaseOrderUpdateStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { grn_id } = req.params;

    await client.query('BEGIN');

    // Fetch GRN details
    const grnRes = await client.query(
      `SELECT 
        g.*,
        po.order_number,
        po.order_date,
        s.supplier_name,
        s.address as supplier_address,
        s.phone as supplier_phone
       FROM purchase.grns g
       JOIN purchase.purchase_orders po ON g.purchase_order_id = po.purchase_order_id
       JOIN purchase.suppliers s ON po.supplier_id = s.supplier_id
       WHERE g.grn_id = $1`,
      [grn_id]
    );

    if (grnRes.rows.length === 0) {
      throw new Error('GRN not found');
    }

    const grn = grnRes.rows[0];

    // Update Purchase Order status
    const poRes = await client.query(
      `UPDATE purchase.purchase_orders 
       SET status = $1
       WHERE purchase_order_id = $2
       RETURNING *`,
      [grn.status, grn.purchase_order_id]
    );

    if (poRes.rows.length === 0) {
      throw new Error('Purchase order not found');
    }

    await client.query('COMMIT');

    res.json({
      grn,
      po: poRes.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error calling PurchaseOrder.updateStatus:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

export {
  createGRN,
  getGRNsByPO,
  getMaterialSummary,
  verifyGRN,
  downloadGRNPDF,
  generateGRNPDF,
  editGRNForQC,
  createReturnEntry,
  sendToStore,
  getReturnHistoryForGRN,
  callPurchaseOrderUpdateStatus,
};