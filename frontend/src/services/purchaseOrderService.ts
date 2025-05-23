import axiosInstance from '../utils/axios';

export interface PurchaseMaterial {
  material_id: number;
  material_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export interface PurchaseOrder {
  purchase_order_id: number;
  order_number: string;
  order_date: string;
  supplier_id: number;
  status: string;
  discount?: number;
  gst?: number;
  total_amount?: number;
  materials: PurchaseMaterial[];
  grns?: (any & { materials?: PurchaseMaterial[] })[];
}

const PURCHASE_ORDER_URL = '/purchase-orders';

export const purchaseOrderService = {
  getAll: async (): Promise<PurchaseOrder[]> => {
    const res = await axiosInstance.get(PURCHASE_ORDER_URL);
    return res.data.map((order: any) => ({
      ...order,
      materials: order.materials || order.materials || []
    }));
  },
  get: async (id: number): Promise<PurchaseOrder> => {
    const res = await axiosInstance.get(`${PURCHASE_ORDER_URL}/${id}`);
    return {
      ...res.data,
      materials: res.data.materials || res.data.materials || []
    };
  },
  create: async (order: Omit<PurchaseOrder, 'purchase_order_id'>): Promise<PurchaseOrder> => {
    const res = await axiosInstance.post(PURCHASE_ORDER_URL, order);
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