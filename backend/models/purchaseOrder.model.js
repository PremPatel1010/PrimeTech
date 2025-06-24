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

            // Get the GRN details to check if it's a replacement
            const grnResult = await client.query(
                `SELECT grn_type, replacement_for, po_id 
                 FROM purchase.grns 
                 WHERE grn_id = $1`,
                [grnId]
            );
            const grn = grnResult.rows[0];

            if (!grn) {
                throw new Error('GRN not found');
            }

            // Update GRN material with QC details
            await client.query(
                `UPDATE purchase.grn_materials 
                SET qc_status = 'completed',
                    accepted_qty = $1,
                    defective_qty = $2,
                    qc_remarks = $3
                WHERE grn_id = $4 AND material_id = $5
                RETURNING *`,
                [
                    qcData.acceptedQty,
                    qcData.defectiveQty,
                    qcData.qcRemarks,
                    grnId,
                    materialId
                ]
            );

            // If this is a replacement GRN and QC is completed, update the original GRN's defective quantity
            if (grn.grn_type === 'replacement' && grn.replacement_for) {
                // Get the original GRN material's defective quantity
                const originalGrnMaterialResult = await client.query(
                    `SELECT defective_qty 
                     FROM purchase.grn_materials 
                     WHERE grn_id = $1 AND material_id = $2`,
                    [grn.replacement_for, materialId]
                );

                if (originalGrnMaterialResult.rows.length > 0) {
                    const originalDefectiveQty = parseFloat(originalGrnMaterialResult.rows[0].defective_qty);
                    const replacementAcceptedQty = parseFloat(qcData.acceptedQty);

                    // Update the original GRN's defective quantity by subtracting the accepted replacement quantity
                    await client.query(
                        `UPDATE purchase.grn_materials
                         SET defective_qty = GREATEST(0, defective_qty - $1)
                         WHERE grn_id = $2 AND material_id = $3`,
                        [replacementAcceptedQty, grn.replacement_for, materialId]
                    );

                    // Add accepted quantity from replacement GRN to raw material inventory
                     if (replacementAcceptedQty > 0) {
                        await client.query(
                            `UPDATE inventory.raw_materials
                             SET current_stock = current_stock + $1
                             WHERE material_id = $2`,
                            [replacementAcceptedQty, materialId]
                        );
                     }

                }
            } else if (qcData.qcStatus === 'completed') { // Ensure this only happens if QC is actually completed for initial GRNs
                // For non-replacement (initial) GRNs, add accepted quantity to inventory if QC is completed
                 if (parseFloat(qcData.acceptedQty) > 0) {
                    await client.query(
                        `UPDATE inventory.raw_materials
                         SET current_stock = current_stock + $1
                         WHERE material_id = $2`,
                        [parseFloat(qcData.acceptedQty), materialId]
                    );
                 }
            }

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

                // Check if all GRNs for this PO are completed and update PO status
                const poAllGrnsCompleted = await client.query(
                    `SELECT COUNT(*) 
                     FROM purchase.grns 
                     WHERE po_id = $1 AND status != 'qc_completed'`,
                    [poId]
                );

                if (poAllGrnsCompleted.rows[0].count === '0') {
                    // Also check if there are any pending quantities left (defective that need replacement)
                    const pendingQuantities = await this.getPendingQuantities(poId);
                    const hasPendingDefective = Object.values(pendingQuantities).some((item) => item.status === 'needs_replacement' && item.defectiveQty > 0);
                    if (Object.keys(pendingQuantities).length === 0 || !hasPendingDefective) {
                        await client.query(
                            `UPDATE purchase.purchase_orders 
                             SET status = 'completed'
                             WHERE po_id = $1`,
                            [poId]
                        );
                    }
                }
            }

            await client.query('COMMIT');
            // Fetch the updated GRN material
            const updatedGrnMaterialResult = await client.query(
                 `SELECT gm.*, m.material_name, m.unit
                  FROM purchase.grn_materials gm
                  JOIN inventory.raw_materials m ON gm.material_id = m.material_id
                  WHERE gm.grn_id = $1 AND gm.material_id = $2`,
                  [grnId, materialId]
            );

            return updatedGrnMaterialResult.rows[0];

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error updating GRN material QC:', err);
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
            `WITH material_grn_summary AS (
                SELECT 
                    poi.material_id,
                    m.material_name,
                    poi.quantity AS ordered_qty,
                    m.unit,
                    poi.unit_price,
                    COALESCE(SUM(gm.received_qty), 0) AS total_received_qty,
                    COALESCE(SUM(CASE WHEN g.grn_type = 'initial' THEN gm.accepted_qty ELSE 0 END), 0) AS initial_accepted_qty,
                    COALESCE(SUM(CASE WHEN g.grn_type = 'initial' THEN gm.defective_qty ELSE 0 END), 0) AS initial_defective_qty,
                    COALESCE(SUM(CASE WHEN g.grn_type = 'replacement' THEN gm.accepted_qty ELSE 0 END), 0) AS replacement_accepted_qty
                FROM purchase.po_items poi
                JOIN inventory.raw_materials m ON m.material_id = poi.material_id
                LEFT JOIN purchase.grns g ON g.po_id = poi.po_id
                LEFT JOIN purchase.grn_materials gm ON gm.grn_id = g.grn_id AND gm.material_id = poi.material_id
                WHERE poi.po_id = $1
                GROUP BY poi.material_id, m.material_name, poi.quantity, m.unit, poi.unit_price
            ),
            calculated_fields AS (
                SELECT
                    *,
                    LEAST(initial_defective_qty, replacement_accepted_qty) AS recovered_defective_qty
                FROM material_grn_summary
            ),
            final_result AS (
                SELECT
                    material_id,
                    material_name,
                    ordered_qty,
                    total_received_qty,
                    initial_accepted_qty,
                    replacement_accepted_qty,
                    initial_defective_qty,
                    recovered_defective_qty,
                    initial_accepted_qty + replacement_accepted_qty + recovered_defective_qty AS total_accepted_qty,
                    GREATEST(0, initial_defective_qty - replacement_accepted_qty) AS remaining_defective_qty,
                    GREATEST(0, ordered_qty - (initial_accepted_qty + replacement_accepted_qty + recovered_defective_qty)) AS pending_qty,
                    unit,
                    unit_price,
                    CASE
                        WHEN GREATEST(0, initial_defective_qty - replacement_accepted_qty) > 0 THEN 'needs_replacement'
                        WHEN GREATEST(0, ordered_qty - (initial_accepted_qty + replacement_accepted_qty + recovered_defective_qty)) > 0 THEN 'needs_completion'
                        ELSE 'completed'
                    END AS status
                FROM calculated_fields
            )
            SELECT *
            FROM final_result
            WHERE pending_qty > 0 OR remaining_defective_qty > 0;`,
            [poId]
        );
    
        return result.rows.reduce((acc, row) => {
            acc[row.material_id] = {
                materialId: row.material_id,
                materialName: row.material_name,
                orderedQty: Number(row.ordered_qty),
                receivedQty: Number(row.total_received_qty),
                acceptedQty: Number(row.total_accepted_qty),
                defectiveQty: Number(row.remaining_defective_qty),
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

            // After creating the replacement GRN, check for remaining defective quantities
            const updatedPendingQuantities = await this.getPendingQuantities(poId);
            console.log(updatedPendingQuantities)
            const stillHasDefective = Object.values(updatedPendingQuantities).some(
                material => material.status === 'needs_replacement' && material.defectiveQty > 0
            );
            console.log(stillHasDefective)

            if (stillHasDefective) {
                await client.query(
                    `UPDATE purchase.purchase_orders 
                    SET status = 'returned_to_vendor'
                    WHERE po_id = $1`,
                    [poId]
                );
            } else {
                // If no more defective, set to grn_verified (or keep as is if another process will update)
                await client.query(
                    `UPDATE purchase.purchase_orders 
                    SET status = 'grn_verified'
                    WHERE po_id = $1 AND status = 'returned_to_vendor'`,
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
        
        // For each purchase order, fetch its items
        const purchaseOrdersWithItems = await Promise.all(result.rows.map(async (po) => {
            const itemsResult = await pool.query(
                `SELECT poi.item_id, poi.material_id, poi.quantity, poi.unit_price, poi.amount, m.material_name, m.unit
                FROM purchase.po_items poi
                JOIN inventory.raw_materials m ON poi.material_id = m.material_id
                WHERE poi.po_id = $1`,
                [po.po_id]
            );
            const items = itemsResult.rows.map(item => ({
                id: item.item_id ? item.item_id.toString() : '',
                materialId: item.material_id ? item.material_id.toString() : '',
                materialName: item.material_name ?? '',
                quantity: Number(item.quantity),
                unitPrice: Number(item.unit_price),
                unit: item.unit ?? '',
                amount: Number(item.amount)
            }));
            return { ...po, items };
        }));

        return purchaseOrdersWithItems;
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