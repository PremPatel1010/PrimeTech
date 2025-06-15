// Raw Material Types
export interface RawMaterial {
  material_id: number;
  material_code: string;
  material_name: string;
  moc?: string | null;
  unit_weight?: number | null;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
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
  ratingRange?: string;
  dischargeRange?: string;
  headRange?: string;
  stockDeduction?: number;
  manufacturingQuantity?: number;
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
  currentStage: string;
  startDate: string;
  estimatedCompletionDate: string;
  stageCompletionDates: Record<string, string | null>;
  progress: number;
  status?: string;
  linkedSalesOrderId?: string;
  custom_stage_name?: string;
  rawMaterialsUsed?: any[];
  workflows?: BatchWorkflow[];
}

export interface BatchWorkflow {
  id: string;
  batch_id: string;
  component_id?: number | null;
  component_name: string;
  component_type: 'sub-component' | 'final-assembly';
  quantity: number;
  assigned_team?: string | null;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled' | 'not_started' | 'on_hold';
  started_at?: string | null;
  completed_at?: string | null;
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
  role_id?: number;
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

export interface AppNotification {
  id: number;
  title: string;
  type: string;
  message: string;
  date: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high';
}
