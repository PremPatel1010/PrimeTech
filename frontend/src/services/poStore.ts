import { create } from 'zustand';
import { poApi } from './poApi';

export interface Material {
  id: string;
  name: string;
  unit: string;
}

export interface POItem {
  id: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  amount: number;
}

export interface GRN {
  id: string;
  poId: string;
  grnNumber: string;
  date: string;
  materials: GRNMaterial[];
  status: 'pending' | 'qc_completed';
  remarks?: string;
  grnType: 'initial' | 'replacement';
  replacementFor?: string; // GRN ID this is replacing
}

export interface GRNMaterial {
  id: string;
  materialId: string;
  materialName: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  qcStatus?: 'pending' | 'completed';
  acceptedQty?: number;
  defectiveQty?: number;
  qcRemarks?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  supplier: string;
  status: 'ordered' | 'arrived' | 'grn_verified' | 'qc_in_progress' | 'returned_to_vendor' | 'completed';
  gstPercent: number;
  discountPercent: number;
  subtotal: number;
  totalAmount: number;
  items: POItem[];
  grns: GRN[];
}

interface POStore {
  purchaseOrders: PurchaseOrder[];
  materials: Material[];
  suppliers: string[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchPurchaseOrders: (filters?: { status?: string; supplierId?: string; startDate?: string; endDate?: string }) => Promise<void>;
  fetchMaterials: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'items' | 'grns'>, items: Omit<POItem, 'id' | 'materialName' | 'unit'>[]) => Promise<void>;
  updatePOStatus: (poId: string, status: PurchaseOrder['status']) => Promise<void>;
  addGRN: (poId: string, grn: Omit<GRN, 'id' | 'materials'>, materials: Omit<GRNMaterial, 'id' | 'materialName' | 'unit'>[]) => Promise<void>;
  addReplacementGRN: (poId: string, grnData: any) => Promise<void>;
  updateGRNMaterialQC: (poId: string, grnId: string, materialId: string, qcData: { acceptedQty: number; defectiveQty: number; qcRemarks?: string }) => Promise<void>;
  getPendingQuantities: (poId: string) => Promise<Record<string, number>>;
  getPurchaseOrder: (poId: string) => Promise<PurchaseOrder>;
}

export const usePOStore = create<POStore>((set, get) => ({
  purchaseOrders: [],
  materials: [],
  suppliers: [],
  isLoading: false,
  error: null,

  fetchPurchaseOrders: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const orders = await poApi.getPurchaseOrders(filters);
      set({ purchaseOrders: orders, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch purchase orders', isLoading: false });
      console.error('Error fetching purchase orders:', error);
    }
  },

  fetchMaterials: async () => {
    set({ isLoading: true, error: null });
    try {
      const materials = await poApi.getMaterials();
      
      set({ materials, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch materials', isLoading: false });
      console.error('Error fetching materials:', error);
    }
  },

  fetchSuppliers: async () => {
    set({ isLoading: true, error: null });
    try {
      const suppliers = await poApi.getSuppliers();
      set({ suppliers, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch suppliers', isLoading: false });
      console.error('Error fetching suppliers:', error);
    }
  },

  addPurchaseOrder: async (po, items) => {
    set({ isLoading: true, error: null });
    try {
      const newPO = await poApi.createPurchaseOrder(po, items);
      set(state => ({
        purchaseOrders: [...state.purchaseOrders, newPO],
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'Failed to create purchase order', isLoading: false });
      console.error('Error creating purchase order:', error);
      throw error;
    }
  },

  updatePOStatus: async (poId, status) => {
    set({ isLoading: true, error: null });
    try {
      const updatedPO = await poApi.updatePOStatus(poId, status);
      set(state => ({
        purchaseOrders: state.purchaseOrders.map(po =>
          po.id === poId ? updatedPO : po
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'Failed to update PO status', isLoading: false });
      console.error('Error updating PO status:', error);
      throw error;
    }
  },

  addGRN: async (poId, grn, materials) => {
    set({ isLoading: true, error: null });
    try {
      const newGRN = await poApi.createGRN(poId, grn, materials);
      const updatedPO = await poApi.getPurchaseOrder(poId);
      set(state => ({
        purchaseOrders: state.purchaseOrders.map(po =>
          po.id === poId ? updatedPO : po
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'Failed to create GRN', isLoading: false });
      console.error('Error creating GRN:', error);
      throw error;
    }
  },

  addReplacementGRN: async (poId, grnData) => {
    set({ isLoading: true, error: null });
    try {
      await poApi.createReplacementGRN(poId, grnData);
      const updatedPO = await poApi.getPurchaseOrder(poId);
      set(state => ({
        purchaseOrders: state.purchaseOrders.map(po =>
          po.id === poId ? updatedPO : po
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'Failed to create replacement GRN', isLoading: false });
      console.error('Error creating replacement GRN:', error);
      throw error;
    }
  },

  updateGRNMaterialQC: async (poId, grnId, materialId, qcData) => {
    set({ isLoading: true, error: null });
    try {
      await poApi.updateGRNMaterialQC(poId, grnId, materialId, qcData);
      const updatedPO = await poApi.getPurchaseOrder(poId);
      set(state => ({
        purchaseOrders: state.purchaseOrders.map(po =>
          po.id === poId ? updatedPO : po
        ),
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'Failed to update QC status', isLoading: false });
      console.error('Error updating QC status:', error);
      throw error;
    }
  },

  getPendingQuantities: async (poId) => {
    try {
      return await poApi.getPendingQuantities(poId);
    } catch (error) {
      console.error('Error getting pending quantities:', error);
      throw error;
    }
  },


  getPurchaseOrder: async (poId) => {
    try {
      return await poApi.getPurchaseOrder(poId);
    } catch (error) {
      console.error('Error getting purchase order:', error);
      throw error;
    }
  }
}));
