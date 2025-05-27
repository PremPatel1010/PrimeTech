import PurchaseOrderModel from '../models/purchaseOrder.model.js';

class PurchaseOrderController {
    // Purchase Order Controllers
    static async createPurchaseOrder(req, res) {
        try {
            const { poNumber, date, supplierId, gstPercent, discountPercent, subtotal, totalAmount, items } = req.body;

            // Validate required fields
            if (!poNumber || !date || !supplierId || !items || items.length === 0) {
                return res.status(400).json({
                    error: 'Missing required fields: poNumber, date, supplierId, and items are required'
                });
            }

            // Validate items
            for (const item of items) {
                if (!item.materialId || !item.quantity || !item.unitPrice) {
                    return res.status(400).json({
                        error: 'Each item must have materialId, quantity, and unitPrice'
                    });
                }
            }

            const po = await PurchaseOrderModel.createPurchaseOrder({
                poNumber,
                date,
                supplierId,
                gstPercent,
                discountPercent,
                subtotal,
                totalAmount
            }, items);

            res.status(201).json(po);
        } catch (error) {
            console.error('Error creating purchase order:', error);
            if (error.code === '23505') { // Unique violation
                res.status(400).json({ error: 'Purchase Order number already exists' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    static async getPurchaseOrder(req, res) {
        try {
            const { id } = req.params;
            const po = await PurchaseOrderModel.getPurchaseOrderById(id);

            if (!po) {
                return res.status(404).json({ error: 'Purchase Order not found' });
            }

            res.json(po);
        } catch (error) {
            console.error('Error fetching purchase order:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async listPurchaseOrders(req, res) {
        try {
            const filters = {
                status: req.query.status,
                supplierId: req.query.supplierId,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const pos = await PurchaseOrderModel.listPurchaseOrders(filters);
            res.json(pos);
        } catch (error) {
            console.error('Error listing purchase orders:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async updatePOStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({ error: 'Status is required' });
            }

            const validStatuses = ['ordered', 'arrived', 'grn_verified', 'qc_in_progress', 'returned_to_vendor', 'completed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            // Update the status
            const poRow = await PurchaseOrderModel.updatePOStatus(id, status);
            if (!poRow) {
                return res.status(404).json({ error: 'Purchase Order not found' });
            }

            // Fetch the full PO object (with items and GRNs)
            const po = await PurchaseOrderModel.getPurchaseOrderById(id);
            res.json(po);
        } catch (error) {
            console.error('Error updating PO status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // GRN Controllers
    static async createGRN(req, res) {
        try {
            const { poId, grnNumber, date, remarks, grnType, replacementFor, materials } = req.body;

            // Validate required fields
            if (!poId || !grnNumber || !date || !materials || materials.length === 0) {
                return res.status(400).json({
                    error: 'Missing required fields: poId, grnNumber, date, and materials are required'
                });
            }

            // Validate materials
            for (const material of materials) {
                if (!material.materialId || !material.orderedQty || !material.receivedQty) {
                    return res.status(400).json({
                        error: 'Each material must have materialId, orderedQty, and receivedQty'
                    });
                }
            }

            const grn = await PurchaseOrderModel.createGRN({
                poId,
                grnNumber,
                date,
                remarks,
                grnType,
                replacementFor,
                materials
            });

            res.status(201).json(grn);
        } catch (error) {
            console.error('Error creating GRN:', error);
            if (error.code === '23505') { // Unique violation
                res.status(400).json({ error: 'GRN number already exists' });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    static async getGRN(req, res) {
        try {
            const { id } = req.params;
            const grn = await PurchaseOrderModel.getGRNById(id);

            if (!grn) {
                return res.status(404).json({ error: 'GRN not found' });
            }

            res.json(grn);
        } catch (error) {
            console.error('Error fetching GRN:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // QC Controllers
    static async updateGRNMaterialQC(req, res) {
        try {
            const { poId, grnId, materialId } = req.params;
            const { acceptedQty, defectiveQty, qcRemarks } = req.body;

            // Change validation to check if they are undefined or null, allowing 0 as a valid value
            if (acceptedQty === undefined || acceptedQty === null || defectiveQty === undefined || defectiveQty === null) {
                return res.status(400).json({
                    error: 'acceptedQty and defectiveQty are required'
                });
            }

            const grn = await PurchaseOrderModel.updateGRNMaterialQC(
                poId,
                grnId,
                materialId,
                { acceptedQty, defectiveQty, qcRemarks }
            );

            if (!grn) {
                return res.status(404).json({ error: 'GRN not found' });
            }

            res.json(grn);
        } catch (error) {
            console.error('Error updating GRN material QC:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Material and Supplier Controllers
    static async listMaterials(req, res) {
        try {
            const materials = await PurchaseOrderModel.listMaterials();
            res.json(materials);
        } catch (error) {
            console.error('Error listing materials:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async listSuppliers(req, res) {
        try {
            const suppliers = await PurchaseOrderModel.listSuppliers();
            res.json(suppliers);
        } catch (error) {
            console.error('Error listing suppliers:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    // Pending Quantities
    static async getPendingQuantities(req, res) {
        try {
            const { poId } = req.params;
            const pendingQuantities = await PurchaseOrderModel.getPendingQuantities(poId);
            res.json(pendingQuantities);
        } catch (error) {
            console.error('Error getting pending quantities:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async createReplacementGRN(req, res) {
        try {
            const { poId } = req.params;
            const { grnNumber, date, remarks, materialId, receivedQty, replacementFor } = req.body;

            // Validate required fields
            if (!grnNumber || !date || !materialId || !receivedQty) {
                return res.status(400).json({
                    error: 'Missing required fields: grnNumber, date, materialId, and receivedQty are required'
                });
            }

            const grn = await PurchaseOrderModel.createReplacementGRN(poId, {
                grnNumber,
                date,
                remarks,
                materialId,
                receivedQty,
                replacementFor
            });

            res.status(201).json(grn);
        } catch (error) {
            console.error('Error creating replacement GRN:', error);
            if (error.code === '23505') { // Unique violation
                res.status(400).json({ error: 'GRN number already exists' });
            } else if (error.message.includes('does not need replacement')) {
                res.status(400).json({ error: error.message });
            } else if (error.message.includes('cannot exceed defective quantity')) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}

export default PurchaseOrderController; 