import express from 'express';
import PurchaseOrderController from '../controllers/purchaseOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import pool from '../db/db.js';
import PurchaseOrderModel from '../models/purchaseOrder.model.js';

const router = express.Router();

// Material and Supplier Routes (specific routes first)
router.get('/materials', authenticate, PurchaseOrderController.listMaterials);
router.get('/suppliers', authenticate, PurchaseOrderController.listSuppliers);

// Purchase Order Routes
router.post('/', authenticate, PurchaseOrderController.createPurchaseOrder);
router.get('/', authenticate, PurchaseOrderController.listPurchaseOrders);

// GRN Routes
router.post('/:poId/grns', authenticate, PurchaseOrderController.createGRN);
router.post('/:poId/replacement-grns', authenticate, PurchaseOrderController.createReplacementGRN);
router.get('/grns/:id', authenticate, PurchaseOrderController.getGRN);

// QC Routes
router.patch(
    '/:poId/grns/:grnId/materials/:materialId/qc',
    authenticate,
    PurchaseOrderController.updateGRNMaterialQC
);

// Pending Quantities
router.get('/:poId/pending-quantities', authenticate, PurchaseOrderController.getPendingQuantities);

// Parameterized routes last
router.get('/:id', authenticate, PurchaseOrderController.getPurchaseOrder);
router.patch('/:id/status', authenticate, PurchaseOrderController.updatePOStatus);

// Update a purchase order
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        poNumber,
        date,
        supplierId,
        status,
        gstPercent,
        discountPercent,
        subtotal,
        totalAmount,
        items
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Dynamically build the UPDATE query for purchase order fields
        const updateFields = [];
        const params = [id]; // $1 is for id in the WHERE clause
        let paramIndex = 2; // Start parameter index from $2

        if (poNumber !== undefined) {
            updateFields.push(`po_number = $${paramIndex++}`);
            params.push(poNumber);
        }
        if (date !== undefined) {
            updateFields.push(`date = $${paramIndex++}`);
            params.push(date);
        }
        if (supplierId !== undefined) {
            updateFields.push(`supplier_id = $${paramIndex++}`);
            params.push(Number(supplierId));
        }
        if (status !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        if (gstPercent !== undefined) {
             // Use provided value or default to 0 if undefined but present in update
            updateFields.push(`gst_percent = $${paramIndex++}`);
            params.push(gstPercent !== undefined ? Number(gstPercent) : 0);
        }
        if (discountPercent !== undefined) {
            // Use provided value or default to 0 if undefined but present in update
            updateFields.push(`discount_percent = $${paramIndex++}`);
            params.push(discountPercent !== undefined ? Number(discountPercent) : 0);
        }
        if (subtotal !== undefined) {
            updateFields.push(`subtotal = $${paramIndex++}`);
            params.push(Number(subtotal));
        }
        if (totalAmount !== undefined) {
            updateFields.push(`total_amount = $${paramIndex++}`);
            params.push(Number(totalAmount));
        }

        // Add updated_at timestamp if any fields are being updated
        if (updateFields.length > 0) {
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        }

        // Execute the update query for purchase order fields if there are fields to update
        if (updateFields.length > 0) {
            const updatePOResult = await client.query(
                `UPDATE purchase.purchase_orders SET ${updateFields.join(', ')} WHERE po_id = $1 RETURNING *`,
                params
            );

            if (updatePOResult.rows.length === 0) {
                throw new Error('Purchase order not found');
            }
        }

        // Handle items update only if items array is provided
        if (items !== undefined) {
             // Delete existing items
            await client.query(
                'DELETE FROM purchase.po_items WHERE po_id = $1',
                [id]
            );

            // Insert new items
            for (const item of items) {
                // Basic validation for item data
                 if (item.materialId === undefined || item.quantity === undefined || item.unitPrice === undefined || item.amount === undefined) {
                    throw new Error('Invalid item data provided');
                }

                await client.query(
                    `INSERT INTO purchase.po_items 
                    (po_id, material_id, quantity, unit_price, amount)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [id, Number(item.materialId), Number(item.quantity), Number(item.unitPrice), Number(item.amount)]
                );
            }
        }

        // Get the complete updated purchase order with items (regardless of which fields were updated)
        const updatedPO = await PurchaseOrderModel.getPurchaseOrderById(id);

        await client.query('COMMIT');
        res.json(updatedPO);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating purchase order:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Delete a purchase order
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if there are any GRNs associated with this PO
        const grnCheck = await client.query(
            'SELECT COUNT(*) FROM purchase.grns WHERE po_id = $1',
            [id]
        );

        

        // Delete PO items first (due to foreign key constraint)
        await client.query(
            'DELETE FROM purchase.po_items WHERE po_id = $1',
            [id]
        );

        // Delete the purchase order
        const deleteResult = await client.query(
            'DELETE FROM purchase.purchase_orders WHERE po_id = $1 RETURNING *',
            [id]
        );

        if (deleteResult.rows.length === 0) {
            throw new Error('Purchase order not found');
        }

        await client.query('COMMIT');
        res.json({ message: 'Purchase order deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting purchase order:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

export default router; 