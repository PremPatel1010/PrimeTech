import { RawMaterial, FinishedProduct, ManufacturingBatch, SalesOrder, OrderStatus } from '../types';

// Calculate total value of raw materials
export const calculateRawMaterialValue = (materials: RawMaterial[] | undefined | null): number => {
  if (!Array.isArray(materials)) return 0;
  return materials.reduce((total, material) => {
    return total + (material.current_stock * material.unit_price);
  }, 0);
};

// Calculate total value of finished products
export const calculateFinishedProductValue = (products: FinishedProduct[] | undefined | null): number => {
  if (!Array.isArray(products)) return 0;
  return products.reduce((total, product) => {
    return total + (product.quantity * product.price);
  }, 0);
};

// Calculate manufacturing progress percentage
export const calculateManufacturingProgress = (batch: ManufacturingBatch): number => {
  return batch.progress;
};

// Calculate total sales value
export const calculateTotalSales = (orders: SalesOrder[] | undefined | null, status?: OrderStatus): number => {
  if (!Array.isArray(orders)) return 0;
  const filteredOrders = status
    ? orders.filter(order => order.status === status)
    : orders;
  return filteredOrders.reduce((total, order) => {
    return total + order.totalValue;
  }, 0);
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format date
export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
  };
  return new Date(dateString).toLocaleDateString('en-US', options);
};
