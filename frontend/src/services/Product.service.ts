
import axiosInstance from '@/utils/axios';
import { toast } from 'sonner';

// Types
export interface Product {
  id: string;
  name: string;
  productCode: string;
  description?: string;
  ratingRange?: string;
  dischargeRange?: string;
  headRange?: string;
  category?: string;
  version?: string;
  finalAssemblyTime: number;
  createdAt: string;
  updatedAt: string;
  subComponents: SubComponent[];
  manufacturingSteps: ManufacturingStep[];
}

export interface SubComponent {
  id: string;
  productId: string;
  name: string;
  description?: string;
  estimatedTime: number;
  createdAt: string;
  updatedAt: string;
  materials: ComponentMaterial[];
  manufacturingSteps: ManufacturingStep[];
}

export interface ComponentMaterial {
  id: string;
  subComponentId: string;
  materialId: string;
  materialName: string;
  quantityRequired: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterial {
  id: string;
  name: string;
  description?: string;
  unit: string;
  stockQuantity: number;
  minStockLevel: number;
  unitCost: number;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManufacturingStep {
  id: string;
  productId?: string;
  subComponentId?: string;
  name: string;
  description?: string;
  estimatedTime: number;
  sequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface BOMItem {
  materialId: string;
  materialName: string;
  quantityRequired: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  availableStock: number;
  isAvailable: boolean;
}

export interface ProductionCost {
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  costPerUnit: number;
}

export interface MaterialAvailability {
  materialId: string;
  materialName: string;
  required: number;
  available: number;
  shortfall: number;
  isAvailable: boolean;
}

export interface ProductionTimeEstimate {
  subComponentTime: number;
  finalAssemblyTime: number;
  totalTime: number;
  timePerUnit: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}


// Product Service
export class ProductService {
  // Products CRUD
  static async getAllProducts(): Promise<ApiResponse<Product[]>> {
    const response = await axiosInstance.get('/products');
    return response.data;
  }

  static async getProductById(id: string): Promise<ApiResponse<Product>> {
    const response = await axiosInstance.get(`/products/${id}`);
    return response.data;
  }

  static async createProduct(productData: Partial<Product>): Promise<ApiResponse<Product>> {
    const response = await axiosInstance.post('/products', productData);
    toast.success('Product created successfully');
    return response.data;
  }

  static async updateProduct(id: string, productData: Partial<Product>): Promise<ApiResponse<Product>> {
    const response = await axiosInstance.put(`/products/${id}`, productData);
    toast.success('Product updated successfully');
    return response.data;
  }

  static async deleteProduct(id: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete(`/products/${id}`);
    toast.success('Product deleted successfully');
    return response.data;
  }

  // Sub-components
  static async addSubComponent(productId: string, subComponentData: Partial<SubComponent>): Promise<ApiResponse<SubComponent>> {
    const response = await axiosInstance.post(`/products/${productId}/sub-components`, subComponentData);
    toast.success('Sub-component added successfully');
    return response.data;
  }

  static async addMaterialToSubComponent(
    productId: string, 
    subComponentId: string, 
    materialData: Partial<ComponentMaterial>
  ): Promise<ApiResponse<ComponentMaterial>> {
    const response = await axiosInstance.post(
      `/products/${productId}/sub-components/${subComponentId}/materials`, 
      materialData
    );
    toast.success('Material added successfully');
    return response.data;
  }

  // BOM and Analysis
  static async getProductBOM(productId: string, quantity: number = 1): Promise<ApiResponse<BOMItem[]>> {
    const response = await axiosInstance.get(`/products/${productId}/bom?quantity=${quantity}`);
    return response.data;
  }

  static async getProductionCost(productId: string, quantity: number = 1): Promise<ApiResponse<ProductionCost>> {
    const response = await axiosInstance.get(`/products/${productId}/production-cost?quantity=${quantity}`);
    return response.data;
  }

  static async checkMaterialAvailability(productId: string, quantity: number = 1): Promise<ApiResponse<MaterialAvailability[]>> {
    const response = await axiosInstance.get(`/products/${productId}/material-availability?quantity=${quantity}`);
    return response.data;
  }

  static async getProductionTime(productId: string, quantity: number = 1): Promise<ApiResponse<ProductionTimeEstimate>> {
    const response = await axiosInstance.get(`/products/${productId}/production-time?quantity=${quantity}`);
    return response.data;
  }

  // Raw Materials
  static async getAllRawMaterials(): Promise<ApiResponse<RawMaterial[]>> {
    const response = await axiosInstance.get('/raw-materials');
    return response.data;
  }

  static async getLowStockMaterials(): Promise<ApiResponse<RawMaterial[]>> {
    const response = await axiosInstance.get('/raw-materials/low-stock');
    return response.data;
  }

  static async createRawMaterial(materialData: Partial<RawMaterial>): Promise<ApiResponse<RawMaterial>> {
    const response = await axiosInstance.post('/raw-materials', materialData);
    toast.success('Raw material created successfully');
    return response.data;
  }

  static async updateMaterialStock(materialId: string, newStock: number): Promise<ApiResponse<RawMaterial>> {
    const response = await axiosInstance.patch(`/raw-materials/${materialId}/stock`, { newStock });
    toast.success('Stock updated successfully');
    return response.data;
  }
}

export default ProductService;