import axiosInstance from '@/utils/axios';
import { RawMaterial, FinishedProduct, SalesOrder, ManufacturingBatch, OrderStatus } from '@/types';

export const fetchInventoryValues = async () => {
  const res = await axiosInstance.get('/kpi/inventory-values');
  return res.data.data;
};

export const fetchManufacturingEfficiency = async () => {
  const res = await axiosInstance.get('/kpi/manufacturing-efficiency');
  return res.data.data;
};

export const fetchOrderStatusDistribution = async () => {
  const res = await axiosInstance.get('/kpi/order-status-distribution');
  return Array.isArray(res.data.data) ? res.data.data : [];
};

export const fetchSalesTrend = async (periodType: string, startDate: string, endDate: string) => {
  const res = await axiosInstance.get('/kpi/sales-trend', {
    params: { periodType, startDate, endDate }
  });
  return Array.isArray(res.data.data) ? res.data.data.map((d: any) => ({
    date: d.period_start,
    sales: Number(d.total_revenue)
  })) : [];
};

export const fetchRawMaterials = async (): Promise<RawMaterial[]> => {
  const res = await axiosInstance.get('/raw-materials');
  return Array.isArray(res.data.data) ? res.data.data : [];
};

export const fetchFinishedProducts = async (): Promise<FinishedProduct[]> => {
  const res = await axiosInstance.get('/finished-products');
  return Array.isArray(res.data.data) ? res.data.data : [];
};

export const fetchSalesOrders = async (): Promise<SalesOrder[]> => {
  const res = await axiosInstance.get('/sales-orders');
  return Array.isArray(res.data.data) ? res.data.data : [];
};

export const fetchManufacturingBatches = async (): Promise<ManufacturingBatch[]> => {
  const res = await axiosInstance.get('/manufacturing/batches');
  return Array.isArray(res.data.data) ? res.data.data : [];
}; 