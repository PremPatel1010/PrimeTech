import axiosInstance from '../utils/axios';

export interface RawMaterial {
  material_id: number;
  material_code: string;
  material_name: string;
  moc: string | null;
  unit_weight: number | null;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRawMaterialDTO {
  material_code: string;
  material_name: string;
  moc?: string;
  unit_weight?: number;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  unit_price: number;
}

export interface UpdateRawMaterialDTO extends Partial<CreateRawMaterialDTO> {}

export const rawMaterialService = {
  async getAllRawMaterials(): Promise<RawMaterial[]> {
    const response = await axiosInstance.get('/raw-materials');
    console.log(response.data);
    return response.data;
  },

  async getRawMaterial(id: number): Promise<RawMaterial> {
    const response = await axiosInstance.get(`/raw-materials/${id}`);
    return response.data;
  },

  async createRawMaterial(data: CreateRawMaterialDTO): Promise<RawMaterial> {
    const response = await axiosInstance.post('/raw-materials', data);
    return response.data;
  },

  async updateRawMaterial(id: number, data: UpdateRawMaterialDTO): Promise<RawMaterial> {
    const response = await axiosInstance.put(`/raw-materials/${id}`, data);
    return response.data;
  },

  async deleteRawMaterial(id: number): Promise<void> {
    await axiosInstance.delete(`/raw-materials/${id}`);
  }
}; 