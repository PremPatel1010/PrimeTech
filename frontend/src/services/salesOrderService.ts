
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
    status: order.status,
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

export const updateSalesOrder = async (id: string, order: SalesOrder) => {
  const payload = {
    order_number: order.orderNumber,
    order_date: order.date,
    customer_name: order.customerName,
    discount: order.discount || 0,
    gst: order.gst || 18,
    total_amount: order.totalValue,
    status: order.status,
    items: order.products.map((p: OrderProduct) => ({
      product_category: p.productCategory || '',
      product_id: p.productId,
      quantity: p.quantity,
      unit_price: p.price
    }))
  };
  return axiosInstance.put(`/sales-orders/${id}`, payload);
};

export const deleteSalesOrder = async (id: string) => {
  return axiosInstance.delete(`/sales-orders/${id}`);
}; 