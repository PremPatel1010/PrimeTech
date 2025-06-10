import { toast } from 'sonner';
import axiosInstance from '../utils/axios.ts';

// Types for Manufacturing
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
  subComponents?: SubComponent[];
  manufacturingSteps?: ManufacturingStep[];
}

export interface SubComponent {
  id: string;
  productId: string;
  name: string;
  description?: string;
  estimatedTime: number;
  createdAt: string;
  updatedAt: string;
  materials?: ComponentMaterial[];
  manufacturingSteps?: ManufacturingStep[];
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

export interface ManufacturingBatch {
  id: string;
  batchNumber: string;
  productId: string;
  quantity: number;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  createdDate: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  workflows?: BatchWorkflow[];
}

export interface BatchWorkflow {
  id: string;
  batchId: string;
  componentId?: string;
  componentName: string;
  componentType: 'sub-component' | 'final-assembly';
  quantity: number;
  assignedTeam?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  startDate?: string;
  endDate?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  parentBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowMaterialConsumption {
  id: string;
  workflowId: string;
  materialId: string;
  materialName: string;
  quantityConsumed: number;
  unit: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
  count?: number;
}

export class ManufacturingService {
  // Products
  static async getAllProducts(): Promise<Product[]> {
    try {
      const response = await axiosInstance.get('/products');
      console.log(response.data);
      const result: ApiResponse<Product[]> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
      return [];
    }
  }

  static async createProduct(productData: Partial<Product>): Promise<Product | null> {
    try {
      const response = await axiosInstance.post('/products', productData);
      const result: ApiResponse<Product> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Product created successfully');
      return result.data || null;
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
      return null;
    }
  }

  static async updateProduct(id: string, productData: Partial<Product>): Promise<Product | null> {
    try {
      const response = await axiosInstance.put(`/products/${id}`, productData);
      const result: ApiResponse<Product> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Product updated successfully');
      return result.data || null;
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
      return null;
    }
  }

  static async deleteProduct(id: string): Promise<boolean> {
    try {
      const response = await axiosInstance.delete(`/products/${id}`);
      const result: ApiResponse = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Product deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
      return false;
    }
  }

  // Sub-components
  static async addSubComponent(productId: string, subComponentData: Partial<SubComponent>): Promise<SubComponent | null> {
    try {
      const response = await axiosInstance.post(`/products/${productId}/sub-components`, subComponentData);
      const result: ApiResponse<SubComponent> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Sub-component added successfully');
      return result.data || null;
    } catch (error) {
      console.error('Error adding sub-component:', error);
      toast.error('Failed to add sub-component');
      return null;
    }
  }

  static async addMaterialToSubComponent(subComponentId: string, materialData: Partial<ComponentMaterial>): Promise<ComponentMaterial | null> {
    try {
      const response = await axiosInstance.post(`/sub-components/${subComponentId}/materials`, materialData);
      const result: ApiResponse<ComponentMaterial> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Material added successfully');
      return result.data || null;
    } catch (error) {
      console.error('Error adding material:', error);
      toast.error('Failed to add material');
      return null;
    }
  }

  // Raw Materials
  static async getAllRawMaterials(): Promise<RawMaterial[]> {
    try {
      const response = await axiosInstance.get('/raw-materials');
      
      const result: ApiResponse<RawMaterial[]> = response.data;
      console.log(result);
      return result || [];
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      toast.error('Failed to fetch raw materials');
      return [];
    }
  }

  static async getLowStockMaterials(): Promise<RawMaterial[]> {
    try {
      const response = await axiosInstance.get('/raw-materials?low_stock=true');
      
      const result: ApiResponse<RawMaterial[]> = response.data;
      
      return result.data || [];
    } catch (error) {
      console.error('Error fetching low stock materials:', error);
      toast.error('Failed to fetch low stock materials');
      return [];
    }
    
  }

  static async createRawMaterial(materialData: Partial<RawMaterial>): Promise<RawMaterial | null> {
    try {
      const response = await axiosInstance.post('/raw-materials', materialData);
      const result: ApiResponse<RawMaterial> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Raw material created successfully');
      return result.data || null;
    } catch (error) {
      console.error('Error creating raw material:', error);
      toast.error('Failed to create raw material');
      return null;
    }
  }

  static async updateMaterialStock(materialId: string, newStock: number): Promise<boolean> {
    try {
      const response = await axiosInstance.patch(`/raw-materials/${materialId}/stock`, { newStock });
      const result: ApiResponse = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Material stock updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating material stock:', error);
      toast.error('Failed to update material stock');
      return false;
    }
  }

  // Batches
  static async getAllBatches(): Promise<ManufacturingBatch[]> {
    try {
      const response = await axiosInstance.get('/manufacturing/batches');
      const result: ApiResponse<ManufacturingBatch[]> = response.data;
      return result.data || [];
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to fetch manufacturing batches');
      return [];
    }
  }

  static async createBatch(batchData: Partial<ManufacturingBatch>): Promise<ManufacturingBatch | null> {
    try {
      const response = await axiosInstance.post('/manufacturing/batches', batchData);
      const result: ApiResponse<ManufacturingBatch> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Manufacturing batch created successfully');
      return result.data || null;
    } catch (error) {
      console.error('Error creating batch:', error);
      toast.error('Failed to create manufacturing batch');
      return null;
    }
  }

  static async updateBatchStatus(batchId: string, status: ManufacturingBatch['status']): Promise<boolean> {
    try {
      const response = await axiosInstance.patch(`/manufacturing/batches/${batchId}/status`, { status });
      const result: ApiResponse = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Batch status updated');
      return true;
    } catch (error) {
      console.error('Error updating batch status:', error);
      toast.error('Failed to update batch status');
      return false;
    }
  }

  // Workflows
  static async createWorkflow(batchId: string, workflowData: Partial<BatchWorkflow>): Promise<BatchWorkflow | null> {
    try {
      console.log(batchId, workflowData);
      const response = await axiosInstance.post(`/manufacturing/batches/${batchId}/workflows`, workflowData);
      const result: ApiResponse<BatchWorkflow> = response.data;
      console.log(result);

      toast.success('Workflow created');
      return result.data || null;
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast.error('Failed to create workflow');
      return null;
    }
  }

  static async updateWorkflowStatus(workflowId: string, status: BatchWorkflow['status']): Promise<boolean> {
    try {
      const response = await axiosInstance.patch(`/manufacturing/workflows/${workflowId}/status`, { status });
      const result: ApiResponse = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Workflow status updated');
      return true;
    } catch (error) {
      console.error('Error updating workflow status:', error);
      toast.error('Failed to update workflow status');
      return false;
    }
  }

  static async getManufacturingSteps(): Promise<ManufacturingStep[]> {
    try {
      const response = await axiosInstance.get('/manufacturing/steps');
      const result: ApiResponse<ManufacturingStep[]> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching manufacturing steps:', error);
      toast.error('Failed to fetch manufacturing steps');
      return [];
    }
  }

  static async getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]> {
    try {
      const response = await axiosInstance.get(`/manufacturing/workflows/${workflowId}/steps`);
      const result: ApiResponse<WorkflowStep[]> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching workflow steps:', error);
      toast.error('Failed to fetch workflow steps');
      return [];
    }
  }

  static async updateWorkflowStep(workflowId: string, stepCode: string, status: WorkflowStep['status']): Promise<WorkflowStep | null> {
    try {
      const response = await axiosInstance.put(`/manufacturing/workflows/${workflowId}/steps`, { stepCode, status });
      const result: ApiResponse<WorkflowStep> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      return result.data || null;
    } catch (error) {
      console.error('Error updating workflow step:', error);
      toast.error('Failed to update workflow step');
      return null;
    }
  }

  static async getBatchProgress(batchId: string): Promise<number> {
    try {
      const response = await axiosInstance.get(`/manufacturing/analytics/batch-progress/${batchId}`);
      const result: ApiResponse<{ progress: number }> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      return result.data?.progress || 0;
    } catch (error) {
      console.error('Error fetching batch progress:', error);
      // toast.error('Failed to fetch batch progress'); // Don't show a toast for every progress fetch error
      return 0;
    }
  }

  static async recordMaterialConsumption(workflowId: string, consumptionData: Partial<WorkflowMaterialConsumption>): Promise<WorkflowMaterialConsumption | null> {
    try {
      const response = await axiosInstance.post(`/manufacturing/workflows/${workflowId}/material-consumption`, consumptionData);
      const result: ApiResponse<WorkflowMaterialConsumption> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Material consumption recorded');
      return result.data || null;
    } catch (error) {
      console.error('Error recording material consumption:', error);
      toast.error('Failed to record material consumption');
      return null;
    }
  }

  static async getWorkflowMaterialConsumption(workflowId: string): Promise<WorkflowMaterialConsumption[]> {
    try {
      const response = await axiosInstance.get(`/manufacturing/workflows/${workflowId}/material-consumption`);
      const result: ApiResponse<WorkflowMaterialConsumption[]> = response.data;

      if (!result.success) {
        throw new Error(result.message);
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching workflow material consumption:', error);
      toast.error('Failed to fetch material consumption');
      return [];
    }
  }

  static async getProductionCapacity(): Promise<any[]> {
    try {
      const response = await axiosInstance.get('/manufacturing/analytics/production-capacity');
      const result: ApiResponse<any[]> = response.data;
      return result.data || [];
    } catch (error) {
      console.error('Error fetching production capacity:', error);
      toast.error('Failed to fetch production capacity');
      return [];
    }
  }

  static async getMaterialRequirements(productId: string, quantity: number = 1): Promise<any[]> {
    try {
      const response = await axiosInstance.get(`/manufacturing/analytics/material-requirements/${productId}`);
      const result: ApiResponse<any[]> = response.data;
      return result.data || [];
    } catch (error) {
      console.error('Error fetching material requirements:', error);
      toast.error('Failed to fetch material requirements');
      return [];
    }
  }

}