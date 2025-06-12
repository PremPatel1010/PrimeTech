import axiosInstance from '../utils/axios';

export interface SubComponent {
  sub_component_id: number;
  component_code: string;
  component_name: string;
  description?: string;
  category?: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface CreateSubComponentDTO {
  component_code: string;
  component_name: string;
  description?: string;
  category?: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_price: number;
}

export const subComponentService = {
  getAllSubComponents: async (): Promise<SubComponent[]> => {
    const response = await axiosInstance.get('/sub-components');
    return response.data.data;
  },

  getSubComponentById: async (id: number): Promise<SubComponent> => {
    const response = await axiosInstance.get(`/sub-components/${id}`);
    return response.data.data;
  },

  createSubComponent: async (data: CreateSubComponentDTO): Promise<SubComponent> => {
    const response = await axiosInstance.post('/sub-components', data);
    return response.data.data;
  },

  updateSubComponent: async (id: number, data: Partial<CreateSubComponentDTO>): Promise<SubComponent> => {
    const response = await axiosInstance.put(`/sub-components/${id}`, data);
    return response.data.data;
  },

  deleteSubComponent: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/sub-components/${id}`);
  },

  getLowStockComponents: async (): Promise<SubComponent[]> => {
    const response = await axiosInstance.get('/sub-components/low-stock');
    return response.data.data;
  },
}; 