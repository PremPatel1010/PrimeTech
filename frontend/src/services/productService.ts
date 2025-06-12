import axiosInstance from '../utils/axios';


export interface Product {
  id: number;
  name: string;
  product_code: string;
  discharge_range?: string;
  head_range?: string;
  rating_range?: string;
  price: number;
  cost_price?: number;
  status?: string;
  created_at?: string;
  bom_items?: BOMItem[];
  manufacturing_steps?: string[];
  category?: string;
}

export interface BOMItem {
  material_id: number;
  quantity_required: number;
  material_name?: string;
  unit?: string;
}

export interface BOMRequest {
  bomItems: BOMItem[];
}

export interface ManufacturingStage {
  stage_id: number;
  component_type: string;
  stage_name: string;
  sequence: number;
}

export interface ProductApiResponse {
  success: boolean;
  message: string;
  data: Product[];
}

const PRODUCT_URL = '/products';
const STAGE_URL = '/manufacturing-stages';

export const productService = {
  getAllProducts: async (): Promise<ProductApiResponse> => {
    const res = await axiosInstance.get(PRODUCT_URL);
    return res.data;
  },
  getProduct: async (productId: number): Promise<Product> => {
    const res = await axiosInstance.get(`${PRODUCT_URL}/${productId}`);
    return res.data;
  },
  createProduct: async (product: Omit<Product, 'product_id' | 'created_at'>): Promise<Product> => {
    const res = await axiosInstance.post(PRODUCT_URL, product);
    return res.data;
  },
  updateProduct: async (productId: number, product: Partial<Product>): Promise<Product> => {
    const res = await axiosInstance.put(`${PRODUCT_URL}/${productId}`, product);
    return res.data;
  },
  deleteProduct: async (productId: number): Promise<void> => {
    await axiosInstance.delete(`${PRODUCT_URL}/${productId}`);
  },
  getProductBOM: async (productId: number): Promise<BOMItem[]> => {
    const res = await axiosInstance.get(`${PRODUCT_URL}/${productId}/bom`);
    return res.data;
  },
  addProductBOM: async (productId: number, data: BOMRequest): Promise<BOMItem[]> => {
    const res = await axiosInstance.post(`${PRODUCT_URL}/${productId}/bom`, data);
    console.log(res.data);
    return res.data;
  },
  getManufacturingStages: async (): Promise<ManufacturingStage[]> => {
    const res = await axiosInstance.get(STAGE_URL);
    return res.data;
  },
  getStagesByComponentType: async (componentType: string): Promise<ManufacturingStage[]> => {
    const res = await axiosInstance.get(`${STAGE_URL}/component-type/${componentType}`);
    return res.data;
  },
  // Product-specific manufacturing stages
  getProductStages: async (productId: number): Promise<ManufacturingStage[]> => {
    const res = await axiosInstance.get(`/manufacturing-stages/product/${productId}`);
    return res.data;
  },
  setProductStages: async (productId: number, stages: string[]): Promise<void> => {
    await axiosInstance.post(`/manufacturing-stages/product/${productId}`, { stages });
  },
  deleteProductStages: async (productId: number): Promise<void> => {
    await axiosInstance.delete(`/manufacturing-stages/product/${productId}`);
  }
}; 