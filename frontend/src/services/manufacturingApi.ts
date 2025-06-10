import axiosInstance from '@/utils/axios';



export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type SubComponentStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface InsufficientMaterial {
  name: string;
  required: number;
  available: number;
  unit: string;
}

export interface WorkflowStep {
  workflow_id: number;
  step_id: number;
  status: WorkflowStatus;
  started_at?: string;
  completed_at?: string;
  step_name: string;
  step_description: string;
  sequence: number;
}

export interface SubComponent {
  id: number;
  sub_component_id: number;
  status: SubComponentStatus;
  started_at?: string;
  completed_at?: string;
  name: string;
  description: string;
  estimated_time: number;
  manufacturing_steps: {
    id: number;
    name: string;
    description: string;
    sequence: number;
    status: WorkflowStatus;
  }[];
  bill_of_materials: {
    material_id: number;
    name: string;
    quantity: number;
    unit: string;
  }[];
}

export interface ManufacturingBatch {
  batch_id: number;
  order_id: number;
  product_name: string;
  product_code: string;
  quantity: number;
  status: WorkflowStatus;
  created_at: string;
  updated_at: string;
  workflows: WorkflowStep[];
  sub_components: SubComponent[];
}

export interface CreateBatchData {
  order_id: number;
  product_name: string;
  product_id: string;
  product_code: string;
  quantity: number;
  notes?: string;
}

export const manufacturingApi = {
  // Get all manufacturing batches
  getAllBatches: async (): Promise<ManufacturingBatch[]> => {
    const response = await axiosInstance.get(`/manufacturing/batches`);
    return response.data;
  },

  // Get a specific batch by ID
  getBatchById: async (batchId: number): Promise<ManufacturingBatch> => {
    const response = await axiosInstance.get(`/manufacturing/batches/${batchId}`);
    return response.data;
  },

  // Create a new manufacturing batch
  createBatch: async (data: CreateBatchData): Promise<ManufacturingBatch> => {
    const response = await axiosInstance.post(`/manufacturing/batches`, data);
    console.log(response);
    return response.data;
  },

  // Update workflow status for a batch step
  updateWorkflowStatus: async (
    batchId: number,
    stepId: number,
    status: WorkflowStatus
  ): Promise<ManufacturingBatch> => {
    const response = await axiosInstance.patch(
      `/manufacturing/batches/${batchId}/steps/${stepId}/status`,
      { status }
    );
    return response.data;
  },

  // Update sub-component status for a batch
  updateSubComponentStatus: async (
    batchId: number,
    subComponentId: number,
    status: SubComponentStatus
  ): Promise<ManufacturingBatch> => {
    const response = await axiosInstance.patch(
      `/manufacturing/batches/${batchId}/sub-components/${subComponentId}/status`,
      { status }
    );
    return response.data;
  },

  // Delete a manufacturing batch
  deleteBatch: async (batchId: number): Promise<void> => {
      await axiosInstance.delete(`/manufacturing/batches/${batchId}`);
  },

  // Check raw material availability for a batch
  checkRawMaterialAvailability: async (batchId: number): Promise<InsufficientMaterial[]> => {
    const response = await axiosInstance.get(`/manufacturing/batches/${batchId}/raw-material-availability`);
    return response.data;
  },
}; 