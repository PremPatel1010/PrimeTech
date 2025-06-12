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
  materials: ComponentMaterial[];
  price?: number;
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
  material_id: string;
  material_code: string;
  material_name: string;
  description?: string;
  unit: string;
  current_stock: string;
  minimum_stock: string;
  unit_price: string;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
  moc: string;
  unit_weight: string;
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
    console.log(response.data);
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

  static async updateSubComponent(
    productId: string,
    subComponentId: string,
    subComponentData: Partial<SubComponent>
  ): Promise<ApiResponse<SubComponent>> {
    const response = await axiosInstance.put(
      `/products/${productId}/sub-components/${subComponentId}`,
      subComponentData
    );
    toast.success('Sub-component updated successfully');
    return response.data;
  }

  static async deleteSubComponent(productId: string, subComponentId: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete(
      `/products/${productId}/sub-components/${subComponentId}`
    );
    toast.success('Sub-component deleted successfully');
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

  static async updateMaterial(
    productId: string,
    subComponentId: string,
    materialId: string,
    materialData: Partial<ComponentMaterial>
  ): Promise<ApiResponse<ComponentMaterial>> {
    const response = await axiosInstance.put(
      `/products/${productId}/sub-components/${subComponentId}/materials/${materialId}`,
      materialData
    );
    toast.success('Material updated successfully');
    return response.data;
  }

  static async deleteMaterial(productId: string, subComponentId: string, materialId: string): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete(
      `/products/${productId}/sub-components/${subComponentId}/materials/${materialId}`
    );
    toast.success('Material deleted successfully');
    return response.data;
  }
  
  // Product Materials
  static async addMaterialToProduct(
    productId: string,
    materialData: Partial<ComponentMaterial>
  ): Promise<ApiResponse<ComponentMaterial>> {
    const response = await axiosInstance.post(
      `/products/${productId}/materials`,
      materialData
    );
    toast.success('Material added to product successfully');
    return response.data;
  }

  static async updateProductMaterial(
    productId: string,
    materialId: string,
    materialData: Partial<ComponentMaterial>
  ): Promise<ApiResponse<ComponentMaterial>> {
    const response = await axiosInstance.put(
      `/products/${productId}/materials/${materialId}`,
      materialData
    );
    toast.success('Product material updated successfully');
    return response.data;
  }

  static async deleteProductMaterial(
    productId: string,
    materialId: string
  ): Promise<ApiResponse<void>> {
    const response = await axiosInstance.delete(
      `/products/${productId}/materials/${materialId}`
    );
    toast.success('Product material deleted successfully');
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

  // Manufacturing Steps
  static async addManufacturingStep(
    productId: string,
    stepData: Partial<ManufacturingStep>,
    subComponentId?: string
  ): Promise<ApiResponse<ManufacturingStep>> {
    const url = subComponentId 
      ? `/products/${productId}/sub-components/${subComponentId}/manufacturing-steps`
      : `/products/${productId}/manufacturing-steps`;
    const response = await axiosInstance.post(url, stepData);
    toast.success('Manufacturing step added successfully');
    return response.data;
  }

  static async updateManufacturingStep(
    productId: string,
    stepId: string,
    stepData: Partial<ManufacturingStep>,
    subComponentId?: string
  ): Promise<ApiResponse<ManufacturingStep>> {
    const url = subComponentId
      ? `/products/${productId}/sub-components/${subComponentId}/manufacturing-steps/${stepId}`
      : `/products/${productId}/manufacturing-steps/${stepId}`;
    const response = await axiosInstance.put(url, stepData);
    toast.success('Manufacturing step updated successfully');
    return response.data;
  }

  static async deleteManufacturingStep(
    productId: string,
    stepId: string,
    subComponentId?: string
  ): Promise<ApiResponse<void>> {
    const url = subComponentId
      ? `/products/${productId}/sub-components/${subComponentId}/manufacturing-steps/${stepId}`
      : `/products/${productId}/manufacturing-steps/${stepId}`;
    const response = await axiosInstance.delete(url);
    toast.success('Manufacturing step deleted successfully');
    return response.data;
  }
}

export default ProductService;