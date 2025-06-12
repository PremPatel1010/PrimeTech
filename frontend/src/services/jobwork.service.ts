import { create } from 'zustand';
import axiosInstance from '@/utils/axios';

export interface Vendor {
  vendor_id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
}

export interface JobworkOrder {
  order_id: number;
  jobwork_number: string;
  vendor_id: number;
  vendor_name: string;
  order_date: string;
  due_date: string;
  component: string;
  item_sent: string;
  expected_return_item: string;
  quantity_sent: number;
  quantity_received: number;
  quantity_loss: number;
  purpose: string;
  notes?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  receipts: JobworkReceipt[];
  created_at: string;
}

export interface JobworkReceipt {
  receipt_id: number;
  order_id: number;
  receipt_date: string;
  final_item_name: string;
  quantity_received: number;
  quantity_loss: number;
  remarks?: string;
  document_url?: string;
}

interface JobworkStore {
  vendors: Vendor[];
  jobworkOrders: JobworkOrder[];
  loading: boolean;
  error: string | null;
  
  // Vendor management
  fetchVendors: () => Promise<void>;
  addVendor: (vendor: Omit<Vendor, 'vendor_id'>) => Promise<void>;
  updateVendor: (vendorId: number, updates: Partial<Vendor>) => Promise<void>;
  deleteVendor: (vendorId: number) => Promise<void>;
  
  // Jobwork order management
  fetchOrders: () => Promise<void>;
  createJobworkOrder: (order: Omit<JobworkOrder, 'order_id' | 'jobwork_number' | 'receipts' | 'created_at'>) => Promise<void>;
  updateJobworkOrder: (orderId: number, updates: Partial<JobworkOrder>) => Promise<void>;
  updateOrderStatus: (orderId: number, status: JobworkOrder['status']) => Promise<void>;
  cancelJobworkOrder: (orderId: number) => Promise<void>;
  deleteJobworkOrder: (orderId: number) => Promise<void>;
  fetchOrderById: (orderId: number) => Promise<JobworkOrder | null>;
  
  // Receipt management
  addReceipt: (receipt: Omit<JobworkReceipt, 'receipt_id'>) => Promise<void>;
  fetchOrderByJobworkNumber: (jobworkNumber: string) => Promise<JobworkOrder | null>;
  
  // Utility functions
  getOrdersByStatus: (status: JobworkOrder['status']) => JobworkOrder[];
  getOrdersByVendor: (vendorId: number) => JobworkOrder[];
  getOverdueOrders: () => Promise<JobworkOrder[]>;
}

export const useJobworkStore = create<JobworkStore>((set, get) => ({
  vendors: [],
  jobworkOrders: [],
  loading: false,
  error: null,

  fetchVendors: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.get('/jobwork/vendors');
      set({ vendors: response.data, loading: false });
    } catch (error) {
      set({ error: 'Error fetching vendors', loading: false });
      throw error;
    }
  },

  addVendor: async (vendor) => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.post(`/jobwork/vendors`, vendor);
      set(state => ({
        vendors: [...state.vendors, response.data],
        loading: false
      }));
    } catch (error) {
      set({ error: 'Error creating vendor', loading: false });
      throw error;
    }
  },

  updateVendor: async (vendorId, updates) => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.put(`/jobwork/vendors/${vendorId}`, updates);
      set(state => ({
        vendors: state.vendors.map(v => 
          v.vendor_id === vendorId ? response.data : v
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Error updating vendor', loading: false });
      throw error;
    }
  },

  deleteVendor: async (vendorId) => {
    try {
      set({ loading: true, error: null });
      await axiosInstance.delete(`/jobwork/vendors/${vendorId}`);
      set(state => ({
        vendors: state.vendors.filter(v => v.vendor_id !== vendorId),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Error deleting vendor', loading: false });
      throw error;
    }
  },

  fetchOrders: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.get(`/jobwork/orders`);
      set({ jobworkOrders: response.data, loading: false });
    } catch (error) {
      set({ error: 'Error fetching orders', loading: false });
      throw error;
    }
  },

  createJobworkOrder: async (order) => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.post(`/jobwork/orders`, order);
      set(state => ({
        jobworkOrders: [...state.jobworkOrders, response.data],
        loading: false
      }));
    } catch (error) {
      set({ error: 'Error creating order', loading: false });
      throw error;
    }
  },

  updateJobworkOrder: async (orderId, updates) => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.put(`/jobwork/orders/${orderId}`, updates);
      set(state => ({
        jobworkOrders: state.jobworkOrders.map(order => 
          order.order_id === orderId ? response.data : order
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Error updating order', loading: false });
      throw error;
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.patch(`/jobwork/orders/${orderId}/status`, { status });
      set(state => ({
        jobworkOrders: state.jobworkOrders.map(order => 
          order.order_id === orderId ? response.data : order
        ),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Error updating order status', loading: false });
      throw error;
    }
  },

  cancelJobworkOrder: async (orderId) => {
    try {
      await get().updateOrderStatus(orderId, 'cancelled');
    } catch (error) {
      set({ error: 'Error cancelling order', loading: false });
      throw error;
    }
  },

  deleteJobworkOrder: async (orderId) => {
    try {
      set({ loading: true, error: null });
      await axiosInstance.delete(`/jobwork/orders/${orderId}`);
      set(state => ({
        jobworkOrders: state.jobworkOrders.filter(order => order.order_id !== orderId),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Error deleting order', loading: false });
      throw error;
    }
  },

  addReceipt: async (receipt) => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.post(`/jobwork/receipts`, receipt);
      set(state => ({
        jobworkOrders: state.jobworkOrders.map(order => {
          if (order.order_id === receipt.order_id) {
            return {
              ...order,
              receipts: [...order.receipts, response.data],
              quantity_received: (order.quantity_received || 0) + receipt.quantity_received,
              quantity_loss: (order.quantity_loss || 0) + receipt.quantity_loss,
              status: 'completed'
            };
          }
          return order;
        }),
        loading: false
      }));
    } catch (error) {
      set({ error: 'Error creating receipt', loading: false });
      throw error;
    }
  },

  fetchOrderByJobworkNumber: async (jobworkNumber) => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.get(`/jobwork/orders/by-number/${jobworkNumber}`);
      set({ loading: false });
      return response.data;
    } catch (err: any) {
      set({ error: err.message || `Failed to fetch order ${jobworkNumber}`, loading: false });
      return null;
    }
  },

  fetchOrderById: async (orderId) => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.get(`/jobwork/orders/${orderId}`);
      set({ loading: false });
      return response.data;
    } catch (err: any) {
      set({ error: err.message || `Failed to fetch order ${orderId}`, loading: false });
      return null;
    }
  },

  getOrdersByStatus: (status) => {
    return get().jobworkOrders.filter(order => order.status === status);
  },

  getOrdersByVendor: (vendorId) => {
    return get().jobworkOrders.filter(order => order.vendor_id === vendorId);
  },

  getOverdueOrders: async () => {
    try {
      set({ loading: true, error: null });
      const response = await axiosInstance.get(`/jobwork/orders/overdue`);
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({ error: 'Error fetching overdue orders', loading: false });
      throw error;
    }
  }
}));