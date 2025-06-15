import axiosInstance from '@/utils/axios';
import { SalesOrder, OrderProduct } from '../types';
import axios from 'axios';

export const createSalesOrder = async (orderData: Omit<SalesOrder, 'id'>) => {
  try {
    // Transform the data to match backend expectations
    const transformedData = {
      order_number: orderData.orderNumber,
      order_date: orderData.date,
      customer_name: orderData.customerName,
      discount: orderData.discount || 0,
      gst: orderData.gst || 18,
      total_amount: orderData.totalValue,
      status: orderData.status || 'pending',
      items: orderData.products.map(p => ({
        product_id: p.productId,
        product_category: p.productCategory,
        quantity: p.quantity,
        unit_price: Number(p.price),
        rating_range: p.ratingRange,
        discharge_range: p.dischargeRange,
        head_range: p.headRange,
        stock_deduction: p.stockDeduction || 0,
        manufacturing_quantity: p.manufacturingQuantity || 0
      }))
    };

    console.log('Sending to backend:', transformedData);
    const response = await axiosInstance.post('/sales-orders', transformedData);
    return response.data;
  } catch (error) {
    console.error('Error in createSalesOrder:', error);
    throw error;
  }
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

export const checkOrderAvailability = async (orderData: any) => {
  try {
    const response = await axiosInstance.post('/sales-orders/check-availability', orderData);
    return response.data;
  } catch (error) {
    console.error('Error checking order availability:', error);
    throw error;
  }
}; 