// Raw Material Types
export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  lastUpdated: string;
  minThreshold?: number;
}

// Supplier Types
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  materials: string[]; // IDs of materials this supplier provides
  notes?: string;
  companyName?: string;
  taxId?: string; // GST/Tax ID
}

// Finished Product Types
export interface FinishedProduct {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  lastUpdated: string;
  minThreshold?: number;
  billOfMaterials?: BillOfMaterialItem[];
  manufacturingSteps?: ManufacturingStep[];
}

export interface BillOfMaterialItem {
  materialId: string;
  materialName: string;
  quantityRequired: number;
  unitOfMeasure: string;
}

// Sales Order Types
export interface SalesOrder {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  products: OrderProduct[];
  status: OrderStatus;
  totalValue: number;
  discount?: number;
  gst?: number;
  manufacturingRequestId?: string;
  deliveryDate?: string;
  partialFulfillment?: PartialFulfillment[];
  isTracked?: boolean;
}

export interface PartialFulfillment {
  productId: string;
  productName: string;
  totalQuantity: number;
  inStockQuantity: number;
  manufacturingQuantity: number;
  manufacturingBatchIds?: string[];
}

export type OrderStatus = 'confirmed' | 'pending' | 'in_production' | 'partially_in_stock' | 'delivered' | 'completed' | 'cancelled' | 'awaiting_materials';

export interface OrderProduct {
  productId: string;
  productName: string;
  productCategory?: string;
  quantity: number;
  price: number;
}

// Purchase Order Types
export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  date: string;
  supplierName: string;
  supplierId?: string;
  materials: PurchaseMaterial[];
  status: PurchaseOrderStatus;
  totalValue: number;
  invoiceFile?: string;
  invoiceNumber?: string;
  receiptDate?: string; // Date when materials were received
}

export type PurchaseOrderStatus = 'ordered' | 'arrived' | 'cancelled';

export interface PurchaseMaterial {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
}

// Manufacturing Types
export type ProductionStage = 'cutting' | 'assembly' | 'testing' | 'packaging' | 'completed' | string;
export type ManufacturingStatus = 'in_progress' | 'awaiting_materials' | 'completed' | 'cancelled' | string;

export interface ManufacturingStep {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  departmentName?: string;
  order: number;
}

export interface ManufacturingBatch {
  id: string;
  batchNumber: string;
  productId: string;
  productName: string;
  quantity: number;
  currentStage: ProductionStage;
  startDate: string;
  estimatedCompletionDate: string;
  stageCompletionDates: Record<ProductionStage, string | null>;
  progress: number; // 0-100
  status: ManufacturingStatus; // Added status field to track material availability
  linkedSalesOrderId?: string;
  rawMaterialsUsed?: RawMaterialUsage[];
  rawMaterialsNeeded?: RawMaterialsNeeded[]; // Added field to track needed materials
  notes?: string;
}

export interface RawMaterialUsage {
  materialId: string;
  materialName: string;
  quantityUsed: number;
  unit: string;
}

export interface RawMaterialsNeeded {
  materialId: string; 
  materialName: string;
  quantityNeeded: number;
  quantityAvailable: number;
  unit: string;
  isSufficient: boolean;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'department_manager';
  departmentId?: string;
  departmentName?: string;
  lastLogin?: string;
}

// Dashboard Types
export interface StockAlert {
  id: string;
  itemName: string;
  itemType: 'raw' | 'finished';
  currentQuantity: number;
  minThreshold: number;
  status: 'warning' | 'critical';
}

export interface DailySales {
  date: string;
  sales: number;
}

export interface ManufacturingProgress {
  stage: ProductionStage;
  count: number;
}

export interface Notification {
  id: string;
  type: 'low_stock' | 'pending_order' | 'manufacturing_update' | 'raw_material_shortage';
  message: string;
  date: string;
  read: boolean;
  relatedId?: string;
  priority: 'low' | 'medium' | 'high';
}
