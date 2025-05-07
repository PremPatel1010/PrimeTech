
import { 
  RawMaterial, 
  FinishedProduct, 
  SalesOrder, 
  ManufacturingBatch,
  StockAlert,
  DailySales,
  ManufacturingProgress
} from '../types';

// Raw Materials
export const rawMaterials: RawMaterial[] = [
  { 
    id: '1', 
    name: 'Aluminum Sheet', 
    unit: 'sq m', 
    quantity: 240, 
    pricePerUnit: 15.50, 
    lastUpdated: '2025-05-01' 
  },
  { 
    id: '2', 
    name: 'Steel Rod', 
    unit: 'meter', 
    quantity: 500, 
    pricePerUnit: 8.75, 
    lastUpdated: '2025-05-01' 
  },
  { 
    id: '3', 
    name: 'Copper Wire', 
    unit: 'roll', 
    quantity: 42, 
    pricePerUnit: 65.20, 
    lastUpdated: '2025-04-28' 
  },
  { 
    id: '4', 
    name: 'Plastic Granules', 
    unit: 'kg', 
    quantity: 350, 
    pricePerUnit: 3.25, 
    lastUpdated: '2025-04-25' 
  },
  { 
    id: '5', 
    name: 'Electronic Components', 
    unit: 'set', 
    quantity: 75, 
    pricePerUnit: 120.00, 
    lastUpdated: '2025-05-02' 
  },
];

// Finished Products
export const finishedProducts: FinishedProduct[] = [
  { 
    id: '1', 
    name: 'Industrial Fan', 
    category: 'Appliance', 
    quantity: 58, 
    price: 249.99, 
    lastUpdated: '2025-05-02' 
  },
  { 
    id: '2', 
    name: 'Control Panel Box', 
    category: 'Electronic', 
    quantity: 32, 
    price: 399.50, 
    lastUpdated: '2025-05-01' 
  },
  { 
    id: '3', 
    name: 'Hydraulic Pump', 
    category: 'Mechanical', 
    quantity: 15, 
    price: 850.75, 
    lastUpdated: '2025-04-28' 
  },
  { 
    id: '4', 
    name: 'Air Compressor', 
    category: 'Appliance', 
    quantity: 23, 
    price: 625.20, 
    lastUpdated: '2025-04-30' 
  },
  { 
    id: '5', 
    name: 'Filter Assembly', 
    category: 'Component', 
    quantity: 112, 
    price: 89.95, 
    lastUpdated: '2025-05-02' 
  },
];

// Sales Orders
export const salesOrders: SalesOrder[] = [
  {
    id: '1',
    orderNumber: 'SO-2025-001',
    date: '2025-05-01',
    customerName: 'TechIndustries Inc.',
    products: [
      { productId: '1', productName: 'Industrial Fan', quantity: 10, price: 249.99 },
      { productId: '5', productName: 'Filter Assembly', quantity: 20, price: 89.95 }
    ],
    status: 'delivered',
    totalValue: 4299.90
  },
  {
    id: '2',
    orderNumber: 'SO-2025-002',
    date: '2025-05-02',
    customerName: 'MechWorks Ltd.',
    products: [
      { productId: '3', productName: 'Hydraulic Pump', quantity: 5, price: 850.75 }
    ],
    status: 'pending',
    totalValue: 4253.75
  },
  {
    id: '3',
    orderNumber: 'SO-2025-003',
    date: '2025-05-02',
    customerName: 'Global Factories',
    products: [
      { productId: '2', productName: 'Control Panel Box', quantity: 8, price: 399.50 },
      { productId: '4', productName: 'Air Compressor', quantity: 3, price: 625.20 }
    ],
    status: 'pending',
    totalValue: 5071.60
  },
];

// Manufacturing Batches
export const manufacturingBatches: ManufacturingBatch[] = [
  {
    id: '1',
    batchNumber: 'B-2025-001',
    productId: '1',
    productName: 'Industrial Fan',
    quantity: 25,
    currentStage: 'assembly',
    startDate: '2025-04-28',
    estimatedCompletionDate: '2025-05-07',
    stageCompletionDates: {
      cutting: '2025-04-30',
      assembly: null,
      testing: null,
      packaging: null,
      completed: null
    },
    progress: 40
  },
  {
    id: '2',
    batchNumber: 'B-2025-002',
    productId: '2',
    productName: 'Control Panel Box',
    quantity: 15,
    currentStage: 'testing',
    startDate: '2025-04-25',
    estimatedCompletionDate: '2025-05-04',
    stageCompletionDates: {
      cutting: '2025-04-26',
      assembly: '2025-04-29',
      testing: null,
      packaging: null,
      completed: null
    },
    progress: 65
  },
  {
    id: '3',
    batchNumber: 'B-2025-003',
    productId: '5',
    productName: 'Filter Assembly',
    quantity: 50,
    currentStage: 'packaging',
    startDate: '2025-04-27',
    estimatedCompletionDate: '2025-05-03',
    stageCompletionDates: {
      cutting: '2025-04-28',
      assembly: '2025-04-30',
      testing: '2025-05-02',
      packaging: null,
      completed: null
    },
    progress: 85
  },
];

// Stock Alerts
export const stockAlerts: StockAlert[] = [
  {
    id: '1',
    itemName: 'Hydraulic Pump',
    itemType: 'finished',
    currentQuantity: 15,
    minThreshold: 20,
    status: 'warning'
  },
  {
    id: '2',
    itemName: 'Copper Wire',
    itemType: 'raw',
    currentQuantity: 42,
    minThreshold: 50,
    status: 'warning'
  },
  {
    id: '3',
    itemName: 'Electronic Components',
    itemType: 'raw',
    currentQuantity: 75,
    minThreshold: 100,
    status: 'warning'
  }
];

// Daily Sales Data
export const dailySalesData: DailySales[] = [
  { date: '2025-04-24', sales: 5200 },
  { date: '2025-04-25', sales: 6100 },
  { date: '2025-04-26', sales: 4800 },
  { date: '2025-04-27', sales: 3900 },
  { date: '2025-04-28', sales: 7200 },
  { date: '2025-04-29', sales: 8100 },
  { date: '2025-04-30', sales: 7400 },
  { date: '2025-05-01', sales: 9200 },
  { date: '2025-05-02', sales: 8600 },
  { date: '2025-05-03', sales: 0 }
];

// Manufacturing Progress Data
export const manufacturingProgressData: ManufacturingProgress[] = [
  { stage: 'cutting', count: 8 },
  { stage: 'assembly', count: 12 },
  { stage: 'testing', count: 6 },
  { stage: 'packaging', count: 4 },
  { stage: 'completed', count: 25 }
];
