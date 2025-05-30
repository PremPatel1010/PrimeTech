import axiosInstance from '@/utils/axios';
import { PurchaseOrder, POItem } from './poStore';

// Remove the local declaration of PurchaseOrder interface
// export interface PurchaseMaterial {
//   materialId: string;
//   quantity: number;
//   unitPrice: number;
//   amount: number;
//   unit: string;
//   materialName: string;
//   batchNumber?: string;
// }

// // Purchase Order Types
// export interface PurchaseOrder {
//   id: string;
//   orderNumber: string;
//   date: string;
//   supplierName: string;
//   supplierId?: string;
//   materials: PurchaseMaterial[];
//   status: PurchaseOrderStatus;
//   totalValue: number;
//   invoiceFile?: string;
//   invoiceNumber?: string;
//   receiptDate?: string; // Date when materials were received
// }

const PURCHASE_ORDER_URL = '/purchase-orders';

export const purchaseOrderService = {
  getAll: async (): Promise<PurchaseOrder[]> => {
    const res = await axiosInstance.get(PURCHASE_ORDER_URL);
    // Ensure items are included in the mapping
    return res.data.map((order: any) => ({
      ...order,
      materials: order.materials || [], // Keep existing materials mapping
      items: order.items || [] // Explicitly include items
    }));
  },
  get: async (id: number): Promise<PurchaseOrder> => {
    const res = await axiosInstance.get(`${PURCHASE_ORDER_URL}/${id}`);
     // Ensure items are included in the mapping
    return {
      ...res.data,
      materials: res.data.materials || [], // Keep existing materials mapping
      items: res.data.items || [] // Explicitly include items
    };
  },
  create: async (order: Omit<PurchaseOrder, 'id' | 'items' | 'grns'>, items: Omit<POItem, 'id' | 'materialName' | 'unit'>[]): Promise<PurchaseOrder> => {
    // The backend expects the main PO data and items separately for creation
    const res = await axiosInstance.post(PURCHASE_ORDER_URL, { ...order, items });
    return res.data;
  },
  update: async (id: number, order: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    const res = await axiosInstance.put(`${PURCHASE_ORDER_URL}/${id}`, order);
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${PURCHASE_ORDER_URL}/${id}`);
  }
};