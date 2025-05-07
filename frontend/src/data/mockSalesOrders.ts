
import { SalesOrder } from '../types';

export const salesOrdersMock: SalesOrder[] = [
  {
    id: 'so-1',
    orderNumber: 'SO-2025-001',
    date: '2025-04-10',
    customerName: 'Green Energy Solutions',
    products: [
      { productId: 'fp-1', productName: 'Solar Water Pump 1HP', quantity: 2, price: 499.99 },
      { productId: 'fp-2', productName: 'Solar Pump Controller Basic', quantity: 2, price: 299.50 }
    ],
    status: 'delivered',
    totalValue: 1598.98
  },
  {
    id: 'so-2',
    orderNumber: 'SO-2025-002',
    date: '2025-04-15',
    customerName: 'AgriTech Farms',
    products: [
      { productId: 'fp-1', productName: 'Solar Water Pump 1HP', quantity: 5, price: 499.99 },
      { productId: 'fp-3', productName: 'Solar Pump Controller Pro', quantity: 5, price: 599.99 }
    ],
    status: 'confirmed',
    totalValue: 5499.90
  },
  {
    id: 'so-3',
    orderNumber: 'SO-2025-003',
    date: '2025-04-28',
    customerName: 'EcoSmart Solutions',
    products: [
      { productId: 'fp-2', productName: 'Solar Pump Controller Basic', quantity: 10, price: 299.50 }
    ],
    status: 'pending',
    totalValue: 2995.00
  },
  {
    id: 'so-4',
    orderNumber: 'SO-2025-004',
    date: '2025-05-01',
    customerName: 'Desert Irrigation Co.',
    products: [
      { productId: 'fp-1', productName: 'Solar Water Pump 1HP', quantity: 8, price: 499.99 },
      { productId: 'fp-3', productName: 'Solar Pump Controller Pro', quantity: 8, price: 599.99 }
    ],
    status: 'in_production',
    totalValue: 8799.84
  }
];
