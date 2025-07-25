import axiosInstance from '../utils/axios';

export interface FinishedProductAPI {
  finished_product_id: number;
  product_id: number;
  quantity_available: number;
  storage_location?: string;
  status?: string;
  added_on?: string;
  product_name?: string;
  product_code?: string;
  price?: number;
  category?: string;
  unit_price?: number;
  total_price?: number;
  rating_range?: string;
  discharge_range?: string;
  head_range?: string;
  minimum_stock?: number;
}

export const finishedProductService = {
  async getAll(): Promise<FinishedProductAPI[]> {
    const res = await axiosInstance.get('/finished-products');
    return res.data;
  },
  async create(data: Partial<FinishedProductAPI>): Promise<FinishedProductAPI> {
    const res = await axiosInstance.post('/finished-products', data);
    return res.data;
  },
  async update(id: number, data: Partial<FinishedProductAPI>): Promise<FinishedProductAPI> {
    const res = await axiosInstance.put(`/finished-products/${id}`, data);
    return res.data;
  },
  async delete(productId: number): Promise<void> {
    await axiosInstance.delete(`/finished-products/${productId}`);
  },
  async dispatch(id: number, quantity: number): Promise<FinishedProductAPI> {
    const res = await axiosInstance.patch(`/finished-products/${id}/quantity`, { quantityChange: quantity });
    return res.data;
  },
}; 