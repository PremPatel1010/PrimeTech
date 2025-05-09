import axios from "axios";
import axiosInstance from "@/utils/axios";


export interface Supplier {
  supplier_id: number;
  supplier_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  gst_number: string;
  created_at: string;
}

export const supplierService = {
  getAllSuppliers: async (): Promise<Supplier[]> => {
    const response = await axiosInstance.get("/suppliers");
    return response.data;
  },

  getSupplier: async (supplierId: number): Promise<Supplier> => {
    const response = await axiosInstance.get(`/suppliers/${supplierId}`);
    return response.data;
  },

  createSupplier: async (supplier: Omit<Supplier, 'supplier_id' | 'created_at'>): Promise<Supplier> => {
    const response = await axiosInstance.post("/suppliers", supplier);
    return response.data;
  },

  updateSupplier: async (supplierId: number, supplier: Partial<Supplier>): Promise<Supplier> => {
    const response = await axiosInstance.put(`/suppliers/${supplierId}`, supplier);
    return response.data;
  },

  deleteSupplier: async (supplierId: number): Promise<void> => {
    await axiosInstance.delete(`/suppliers/${supplierId}`);
  }
}; 