import pool from '../db/db.js';

class PurchaseOrderModel {
    // Purchase Order Operations
    static async createPurchaseOrder(poData, items) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Insert purchase order
            const poResult = await client.query(
                `INSERT INTO purchase.purchase_orders 
                (po_number, date, supplier_id, status, gst_percent, discount_percent, subtotal, total_amount)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [
                    poData.poNumber,
                    poData.date,
                    poData.supplierId,
                    'ordered',
                    poData.gstPercent,
                    poData.discountPercent,
                    poData.subtotal,
                    poData.totalAmount
                ]
            );

            const po = poResult.rows[0];

            // Insert PO items
            for (const item of items) {
                await client.query(
                    `INSERT INTO purchase.po_items 
                    (po_id, material_id, quantity, unit_price, amount)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [
                        po.po_id,
                        item.materialId,
                        item.quantity,
                        item.unitPrice,
                        item.amount
                    ]
                );
            }

            await client.query('COMMIT');
            return await this.getPurchaseOrderById(po.po_id);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getPurchaseOrderById(id) {
        const poResult = await pool.query(
            `SELECT po.*, s.supplier_name
            FROM purchase.purchase_orders po
            JOIN purchase.suppliers s ON po.supplier_id = s.supplier_id
            WHERE po.po_id = $1`,
            [id]
        );

        if (poResult.rows.length === 0) {
            return null;
        }

        const po = poResult.rows[0];

        // Get PO items
        const itemsResult = await pool.query(
            `SELECT poi.item_id, poi.material_id, poi.quantity, poi.unit_price, poi.amount, m.material_name, m.unit
            FROM purchase.po_items poi
            JOIN inventory.raw_materials m ON poi.material_id = m.material_id
            WHERE poi.po_id = $1`,
            [id]
        );

        // Debug log to verify returned fields
        console.log('PO items from DB:', itemsResult.rows);

        // Map items to match frontend expectations
        const items = itemsResult.rows.map(item => ({
            id: item.item_id ? item.item_id.toString() : '',
            materialId: item.material_id ? item.material_id.toString() : '',
            materialName: item.material_name ?? '',
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            unit: item.unit ?? '',
            amount: Number(item.amount)
        }));

        // Get GRNs
        const grnsResult = await pool.query(
            `SELECT g.*, 
            (SELECT json_agg(gm.*) 
             FROM purchase.grn_materials gm 
             WHERE gm.grn_id = g.grn_id) as materials
            FROM purchase.grns g
            WHERE g.po_id = $1`,
            [id]
        );

        return {
            ...po,
            items,
            grns: grnsResult.rows.map(grn => ({
                ...grn,
                materials: grn.materials || []
            }))
        };
    }

    static async updatePOStatus(id, status) {
        const result = await pool.query(
            `UPDATE purchase.purchase_orders 
            SET status = $1
            WHERE po_id = $2
            RETURNING *`,
            [status, id]
        );
        return result.rows[0];
    }

    // GRN Operations
    static async createGRN(grnData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Insert GRN
            const grnResult = await client.query(
                `INSERT INTO purchase.grns 
                (po_id, grn_number, date, status, remarks, grn_type, replacement_for)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [
                    grnData.poId,
                    grnData.grnNumber,
                    grnData.date,
                    'pending',
                    grnData.remarks,
                    grnData.grnType,
                    grnData.replacementFor
                ]
            );

            const grn = grnResult.rows[0];

            // Insert GRN materials
            for (const material of grnData.materials) {
                await client.query(
                    `INSERT INTO purchase.grn_materials 
                    (grn_id, material_id, ordered_qty, received_qty, qc_status)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [
                        grn.grn_id,
                        material.materialId,
                        material.orderedQty,
                        material.receivedQty,
                        'pending'
                    ]
                );
            }

            // Update PO status to grn_verified
            await client.query(
                `UPDATE purchase.purchase_orders 
                SET status = 'grn_verified'
                WHERE po_id = $1`,
                [grnData.poId]
            );

            await client.query('COMMIT');
            return await this.getGRNById(grn.grn_id);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getGRNById(id) {
        const grnResult = await pool.query(
            `SELECT g.*, 
            (SELECT json_agg(
                json_build_object(
                    'id', gm.grn_material_id,
                    'materialId', gm.material_id,
                    'materialName', m.material_name,
                    'orderedQty', gm.ordered_qty,
                    'receivedQty', gm.received_qty,
                    'unit', m.unit,
                    'qcStatus', gm.qc_status,
                    'acceptedQty', gm.accepted_qty,
                    'defectiveQty', gm.defective_qty,
                    'qcRemarks', gm.qc_remarks
                )
            )
            FROM purchase.grn_materials gm
            JOIN inventory.raw_materials m ON gm.material_id = m.material_id
            WHERE gm.grn_id = g.grn_id) as materials
            FROM purchase.grns g
            WHERE g.grn_id = $1`,
            [id]
        );

        if (grnResult.rows.length === 0) {
            return null;
        }

        const grn = grnResult.rows[0];
        return {
            ...grn,
            materials: grn.materials || []
        };
    }

    // QC Operations
    static async updateGRNMaterialQC(poId, grnId, materialId, qcData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Update GRN material QC status
            await client.query(
                `UPDATE purchase.grn_materials 
                SET qc_status = 'completed',
                    accepted_qty = $1,
                    defective_qty = $2,
                    qc_remarks = $3
                WHERE grn_id = $4 AND material_id = $5`,
                [
                    qcData.acceptedQty,
                    qcData.defectiveQty,
                    qcData.qcRemarks,
                    grnId,
                    materialId
                ]
            );

            // Update GRN status if all materials are QC completed
            const pendingMaterials = await client.query(
                `SELECT COUNT(*) 
                FROM purchase.grn_materials 
                WHERE grn_id = $1 AND qc_status = 'pending'`,
                [grnId]
            );

            if (pendingMaterials.rows[0].count === '0') {
                await client.query(
                    `UPDATE purchase.grns 
                    SET status = 'qc_completed'
                    WHERE grn_id = $1`,
                    [grnId]
                );
            }

            // Check if all GRNs are QC completed and update PO status accordingly
            const po = await this.getPurchaseOrderById(poId);
            const allGRNsCompleted = po.grns.every(grn => grn.status === 'qc_completed');

            if (allGRNsCompleted) {
                const hasDefectiveItems = po.grns.some(grn => 
                    grn.materials.some(m => m.defectiveQty > 0)
                );

                const hasPendingQuantity = await this.hasPendingQuantities(poId);

                let newStatus = 'completed';
                if (hasPendingQuantity) {
                    newStatus = hasDefectiveItems ? 'returned_to_vendor' : 'qc_in_progress';
                }

                await client.query(
                    `UPDATE purchase.purchase_orders 
                    SET status = $1
                    WHERE po_id = $2`,
                    [newStatus, poId]
                );
            }

            await client.query('COMMIT');
            return await this.getGRNById(grnId);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // Helper Methods
    static async hasPendingQuantities(poId) {
        const result = await pool.query(
            `WITH material_totals AS (
                SELECT 
                    poi.material_id,
                    poi.quantity as ordered_qty,
                    COALESCE(SUM(gm.accepted_qty), 0) as accepted_qty
                FROM purchase.po_items poi
                LEFT JOIN purchase.grns g ON g.po_id = poi.po_id
                LEFT JOIN purchase.grn_materials gm ON gm.grn_id = g.grn_id AND gm.material_id = poi.material_id
                WHERE poi.po_id = $1
                GROUP BY poi.material_id, poi.quantity
            )
            SELECT EXISTS (
                SELECT 1 
                FROM material_totals 
                WHERE ordered_qty > accepted_qty
            ) as has_pending`,
            [poId]
        );

        return result.rows[0].has_pending;
    }

    static async getPendingQuantities(poId) {
        const result = await pool.query(
            `WITH material_totals AS (
                SELECT 
                    poi.material_id,
                    m.material_name,
                    poi.quantity as ordered_qty,
                    COALESCE(SUM(gm.accepted_qty), 0) as accepted_qty,
                    COALESCE(SUM(gm.defective_qty), 0) as defective_qty,
                    m.unit,
                    poi.unit_price
                FROM purchase.po_items poi
                JOIN inventory.raw_materials m ON m.material_id = poi.material_id
                LEFT JOIN purchase.grns g ON g.po_id = poi.po_id
                LEFT JOIN purchase.grn_materials gm ON gm.grn_id = g.grn_id AND gm.material_id = poi.material_id
                WHERE poi.po_id = $1
                GROUP BY poi.material_id, m.material_name, poi.quantity, m.unit, poi.unit_price
            )
            SELECT 
                material_id,
                material_name,
                ordered_qty,
                accepted_qty,
                defective_qty,
                ordered_qty - accepted_qty as pending_qty,
                unit,
                unit_price,
                CASE 
                    WHEN defective_qty > 0 THEN 'needs_replacement'
                    WHEN ordered_qty > accepted_qty THEN 'needs_completion'
                    ELSE 'completed'
                END as status
            FROM material_totals
            WHERE ordered_qty > accepted_qty OR defective_qty > 0`,
            [poId]
        );

        return result.rows.reduce((acc, row) => {
            acc[row.material_id] = {
                materialId: row.material_id,
                materialName: row.material_name,
                orderedQty: Number(row.ordered_qty),
                acceptedQty: Number(row.accepted_qty),
                defectiveQty: Number(row.defective_qty),
                pendingQty: Number(row.pending_qty),
                unit: row.unit,
                unitPrice: Number(row.unit_price),
                status: row.status
            };
            return acc;
        }, {});
    }

    static async createReplacementGRN(poId, grnData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get pending quantities to validate replacement
            const pendingQuantities = await this.getPendingQuantities(poId);
            const materialToReplace = pendingQuantities[grnData.materialId];

            if (!materialToReplace || materialToReplace.status !== 'needs_replacement') {
                throw new Error('Material does not need replacement or is not eligible for replacement');
            }

            if (grnData.receivedQty > materialToReplace.defectiveQty) {
                throw new Error('Replacement quantity cannot exceed defective quantity');
            }

            // Insert GRN with replacement type
            const grnResult = await client.query(
                `INSERT INTO purchase.grns 
                (po_id, grn_number, date, status, remarks, grn_type, replacement_for)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [
                    poId,
                    grnData.grnNumber,
                    grnData.date,
                    'pending',
                    grnData.remarks,
                    'replacement',
                    grnData.replacementFor
                ]
            );

            const grn = grnResult.rows[0];

            // Insert GRN material
            await client.query(
                `INSERT INTO purchase.grn_materials 
                (grn_id, material_id, ordered_qty, received_qty, qc_status)
                VALUES ($1, $2, $3, $4, $5)`,
                [
                    grn.grn_id,
                    grnData.materialId,
                    materialToReplace.defectiveQty,
                    grnData.receivedQty,
                    'pending'
                ]
            );

            // Update PO status if needed
            const po = await this.getPurchaseOrderById(poId);
            const hasPendingReplacements = Object.values(pendingQuantities).some(
                material => material.status === 'needs_replacement'
            );

            if (hasPendingReplacements) {
                await client.query(
                    `UPDATE purchase.purchase_orders 
                    SET status = 'returned_to_vendor'
                    WHERE po_id = $1`,
                    [poId]
                );
            }

            await client.query('COMMIT');
            return await this.getGRNById(grn.grn_id);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // List Operations
    static async listPurchaseOrders(filters = {}) {
        let query = `
            SELECT po.*, s.supplier_name
            FROM purchase.purchase_orders po
            JOIN purchase.suppliers s ON po.supplier_id = s.supplier_id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (filters.status) {
            query += ` AND po.status = $${paramCount}`;
            params.push(filters.status);
            paramCount++;
        }

        if (filters.supplierId) {
            query += ` AND po.supplier_id = $${paramCount}`;
            params.push(filters.supplierId);
            paramCount++;
        }

        if (filters.startDate) {
            query += ` AND po.date >= $${paramCount}`;
            params.push(filters.startDate);
            paramCount++;
        }

        if (filters.endDate) {
            query += ` AND po.date <= $${paramCount}`;
            params.push(filters.endDate);
            paramCount++;
        }

        query += ` ORDER BY po.date DESC`;

        const result = await pool.query(query, params);
        return result.rows;
    }

    // Material and Supplier Operations
    static async listMaterials() {
        const result = await pool.query('SELECT * FROM inventory.raw_materials ORDER BY material_name');
        console.log(result.rows);
        return result.rows;
    }

    static async listSuppliers() {
        const result = await pool.query('SELECT * FROM purchase.suppliers ORDER BY supplier_name');
        return result.rows;
    }
}

export default PurchaseOrderModel; 