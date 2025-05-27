import axiosInstance from '../utils/axios';
import { Material, POItem, GRN, PurchaseOrder, GRNMaterial } from './poStore';

const API_BASE_URL = '/purchase-orders';

// Helper function to transform backend data to frontend format
const transformPurchaseOrder = (data: any): PurchaseOrder => ({
    id: data.po_id ? data.po_id.toString() : '',
    poNumber: data.po_number ?? '',
    date: data.date ?? '',
    supplier: data.supplier_name ?? '',
    status: data.status ?? '',
    gstPercent: data.gst_percent !== undefined ? parseFloat(data.gst_percent) : 0,
    discountPercent: data.discount_percent !== undefined ? parseFloat(data.discount_percent) : 0,
    subtotal: data.subtotal !== undefined ? parseFloat(data.subtotal) : 0,
    totalAmount: data.total_amount !== undefined ? parseFloat(data.total_amount) : 0,
    items: (data.items ?? []).map((item: any) => ({
        id: item.id !== undefined && item.id !== null ? item.id.toString() : '',
        materialId: item.materialId !== undefined && item.materialId !== null ? item.materialId.toString() : '',
        materialName: item.materialName ?? '',
        quantity: item.quantity !== undefined ? parseFloat(item.quantity) : 0,
        unitPrice: item.unitPrice !== undefined ? parseFloat(item.unitPrice) : 0,
        unit: item.unit ?? '',
        amount: item.amount !== undefined ? parseFloat(item.amount) : 0
    })),
    grns: (data.grns ?? []).map((grn: any) => ({
        id: grn.grn_id !== undefined && grn.grn_id !== null ? grn.grn_id.toString() : '',
        poId: grn.po_id !== undefined && grn.po_id !== null ? grn.po_id.toString() : '',
        grnNumber: grn.grn_number ?? '',
        date: grn.date ?? '',
        status: grn.status ?? '',
        remarks: grn.remarks ?? '',
        grnType: grn.grn_type ?? '',
        replacementFor: grn.replacement_for !== undefined && grn.replacement_for !== null ? grn.replacement_for.toString() : undefined,
        materials: (grn.materials ?? []).map((material: any) => ({
            id: material.grn_material_id !== undefined && material.grn_material_id !== null ? material.grn_material_id.toString() : '',
            materialId: material.material_id !== undefined && material.material_id !== null ? material.material_id.toString() : '',
            materialName: material.material_name ?? '',
            orderedQty: material.ordered_qty !== undefined ? parseFloat(material.ordered_qty) : 0,
            receivedQty: material.received_qty !== undefined ? parseFloat(material.received_qty) : 0,
            unit: material.unit ?? '',
            qcStatus: material.qc_status ?? '',
            acceptedQty: material.accepted_qty !== undefined && material.accepted_qty !== null ? parseFloat(material.accepted_qty) : undefined,
            defectiveQty: material.defective_qty !== undefined && material.defective_qty !== null ? parseFloat(material.defective_qty) : undefined,
            qcRemarks: material.qc_remarks ?? ''
        }))
    }))
});

export const poApi = {
    // Purchase Order APIs
    async createPurchaseOrder(poData: Omit<PurchaseOrder, 'id' | 'items' | 'grns'>, items: Omit<POItem, 'id' | 'materialName' | 'unit'>[]) {
        const response = await axiosInstance.post(API_BASE_URL, {
            ...poData,
            items: items.map(item => ({
                materialId: parseInt(item.materialId),
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.amount
            }))
        });
        return transformPurchaseOrder(response.data);
    },

    async getPurchaseOrders(filters?: { status?: string; supplierId?: string; startDate?: string; endDate?: string }) {
        const response = await axiosInstance.get(API_BASE_URL, { params: filters });
        if (!Array.isArray(response.data)) {
            console.error('Expected array of purchase orders, got:', response.data);
            return [];
        }
        return response.data.map(transformPurchaseOrder);
    },

    async getPurchaseOrder(id: string) {
        const response = await axiosInstance.get(`${API_BASE_URL}/${id}`);
        return transformPurchaseOrder(response.data);
    },

    async updatePOStatus(id: string, status: PurchaseOrder['status']) {
        const response = await axiosInstance.patch(`${API_BASE_URL}/${id}/status`, { status });
        return transformPurchaseOrder(response.data);
    },

    // GRN APIs
    async createGRN(poId: string, grnData: Omit<GRN, 'id' | 'materials'>, materials: Omit<GRNMaterial, 'id' | 'materialName' | 'unit'>[]) {
        const response = await axiosInstance.post(`${API_BASE_URL}/${poId}/grns`, {
            ...grnData,
            materials: materials.map(material => ({
                materialId: parseInt(material.materialId),
                orderedQty: material.orderedQty,
                receivedQty: material.receivedQty
            }))
        });
        return response.data;
    },

    async createReplacementGRN(poId: string, grnData: {
        grnNumber: string;
        date: string;
        remarks?: string;
        materialId: string;
        receivedQty: number;
        replacementFor?: string;
    }) {
        const response = await axiosInstance.post(`${API_BASE_URL}/${poId}/replacement-grns`, {
            ...grnData,
            materialId: parseInt(grnData.materialId)
        });
        return response.data;
    },

    async getGRN(id: string) {
        const response = await axiosInstance.get(`${API_BASE_URL}/grns/${id}`);
        return response.data;
    },

    async updateGRNMaterialQC(poId: string, grnId: string, materialId: string, qcData: { acceptedQty: number; defectiveQty: number; qcRemarks?: string }) {
        const response = await axiosInstance.patch(
            `${API_BASE_URL}/${poId}/grns/${grnId}/materials/${materialId}/qc`,
            qcData
        );
        return response.data;
    },

    // Material and Supplier APIs
    async getMaterials() {
        const response = await axiosInstance.get(`${API_BASE_URL}/materials`);
        if (!Array.isArray(response.data)) {
            console.error('Expected array of materials, got:', response.data);
            return [];
        }
        return response.data.map((material: any): Material => ({
            id: material.material_id.toString(),
            name: material.material_name,
            unit: material.unit
        }));
    },

    async getSuppliers() {
        const response = await axiosInstance.get(`${API_BASE_URL}/suppliers`);
        return response.data.map((supplier: any) => ({
            id: supplier.supplier_id?.toString() ?? supplier.id?.toString() ?? supplier,
            name: supplier.supplier_name ?? supplier.name ?? supplier
        }));
    },

    // Pending Quantities
    async getPendingQuantities(poId: string) {
        const response = await axiosInstance.get(`${API_BASE_URL}/${poId}/pending-quantities`);
        console.log("pending quantities", response.data);
        return response.data;
    }
}; 