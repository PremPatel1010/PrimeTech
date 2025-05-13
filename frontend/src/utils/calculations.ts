import { RawMaterial, FinishedProduct, ManufacturingBatch, SalesOrder, OrderStatus } from '../types';

// Calculate total value of raw materials
export const calculateRawMaterialValue = (materials: RawMaterial[]): number => {
  return materials.reduce((total, material) => {
    return total + (material.quantity * material.pricePerUnit);
  }, 0);
};

// Calculate total value of finished products
export const calculateFinishedProductValue = (products: FinishedProduct[]): number => {
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
  return orders
    .filter(order => status ? order.status === status : true)
    .reduce((total, order) => {
      return total + order.totalValue;
    }, 0);
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
