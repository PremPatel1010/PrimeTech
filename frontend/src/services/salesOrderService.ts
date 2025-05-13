import axiosInstance from '@/utils/axios';
import { SalesOrder, OrderProduct } from '../types';
import axios from 'axios';

export const createSalesOrder = async (order: SalesOrder) => {
  const payload = {
    order_number: order.orderNumber,
    order_date: order.date,
    customer_name: order.customerName,
    discount: order.discount || 0,
    gst: order.gst || 18,
    total_amount: order.totalValue,
    items: order.products.map((p: OrderProduct) => ({
      product_category: p.productCategory || '',
      product_id: p.productId,
      quantity: p.quantity,
      unit_price: p.price
    }))
  };
  return axiosInstance.post('/sales-orders', payload);
};

export const fetchSalesOrders = async () => {
  const res = await axiosInstance.get('/sales-orders');
  return res.data;
};

export const updateSalesOrder = async (id: string, order: Partial<SalesOrder>) => {
  // Map camelCase to snake_case for only provided fields
  const fieldMap: Record<string, string> = {
    orderNumber: 'order_number',
    date: 'order_date',
    customerName: 'customer_name',
    discount: 'discount',
    gst: 'gst',
    totalValue: 'total_amount',
    products: 'items',
  };
  const payload: any = {};
  Object.entries(order).forEach(([key, value]) => {
    if (value !== undefined) {
      if (key === 'products') {
        const validProducts = Array.isArray(value)
          ? (value as OrderProduct[]).filter(
              (p: OrderProduct) =>
                (p as any).productCategory &&
                (p as any).productId &&
                p.quantity > 0 &&
                p.price > 0
            )
          : undefined;
        if (validProducts && validProducts.length > 0) {
          payload['items'] = validProducts.map((p: OrderProduct) => ({
            product_category: (p as any).productCategory || '',
            product_id: (p as any).productId,
            quantity: p.quantity,
            unit_price: p.price
          }));
        }
        // If not valid, do not add 'items' at all
      } else {
        payload[fieldMap[key] || key] = value;
      }
    }
  });
  return axiosInstance.put(`/sales-orders/${id}`, payload);
};

export const deleteSalesOrder = async (id: string) => {
  return axiosInstance.delete(`/sales-orders/${id}`);
};

export const fetchNextOrderNumber = async () => {
  const res = await axiosInstance.get('/sales-orders/next-order-number');
  return res.data.nextOrderNumber;
}; 