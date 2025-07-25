import { create } from 'zustand';
import { poApi } from './poApi';
import axios from 'axios';
import axiosInstance from '@/utils/axios';

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
  supplierId: number;
  status: 'ordered' | 'arrived' | 'grn_verified' | 'qc_in_progress' | 'returned_to_vendor' | 'completed';
  gstPercent: number;
  discountPercent: number;
  subtotal: number;
  totalAmount: number;
  items: POItem[];
  grns: GRN[];
}

export interface Supplier {
  id: number;
  name: string;
}

interface POStore {
  purchaseOrders: PurchaseOrder[];
  materials: Material[];
  suppliers: Supplier[];
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
  getPendingQuantities: (poId: string) => Promise<Record<string, any>>;
  getPurchaseOrder: (poId: string) => Promise<PurchaseOrder>;
  updatePurchaseOrder: (id: string, data: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  deletePurchaseOrder: (id: string) => Promise<void>;
  checkAndCompletePOAndAddInventory: (poId: string) => Promise<void>;
  addAcceptedMaterialsToInventory: (poId: string) => Promise<void>;
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
      // Ensure PO status is checked after GRN creation
      await get().checkAndCompletePOAndAddInventory(poId);
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
      // Ensure PO status is checked after replacement GRN creation
      await get().checkAndCompletePOAndAddInventory(poId);
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
      const pendingQuantities = await poApi.getPendingQuantities(poId);
      return pendingQuantities; // Ensure this returns the correct structure
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
  },

  updatePurchaseOrder: async (id: string, data: Partial<PurchaseOrder>) => {
    try {
      // Ensure supplierId is a number if it exists
      const formattedData = {
        ...data,
        supplierId: data.supplierId ? Number(data.supplierId) : undefined
      };

      const response = await axiosInstance.put(`/purchase-orders/${id}`, formattedData);
      const updatedPO = response.data;
      
      set((state) => ({
        purchaseOrders: state.purchaseOrders.map((po) =>
          po.id === id ? { ...po, ...updatedPO } : po
        ),
        isLoading: false,
      }));

      return updatedPO;

    } catch (error) {
      set({ error: 'Failed to update purchase order', isLoading: false });
      console.error('Error updating purchase order:', error);
      throw error;
    }
  },

  deletePurchaseOrder: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await poApi.deletePurchaseOrder(id);
      set((state) => ({
        purchaseOrders: state.purchaseOrders.filter((po) => po.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to delete purchase order', isLoading: false });
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  },

  checkAndCompletePOAndAddInventory: async (poId: string) => {
    set({ isLoading: true, error: null });
    try {
      const po = await get().getPurchaseOrder(poId);
      if (!po) {
        console.warn(`PO with ID ${poId} not found.`);
        set({ isLoading: false });
        return;
      }

      // 1. Check if all GRNs have completed QC for all their materials
      const allGRNsQCCompleted = po.grns.every(grn =>
        grn.materials.every(material => material.qcStatus === 'completed')
      );

      // 2. Check for pending replacements
      const pendingQuantities = await get().getPendingQuantities(poId);
      console.log(pendingQuantities)
      const hasPendingReplacements = Object.values(pendingQuantities).some((item: any) => item.status === "needs_replacement");
      console.log(hasPendingReplacements)

      if (allGRNsQCCompleted && !hasPendingReplacements) {
        // 3. Update PO status to 'completed'
        await get().updatePOStatus(poId, 'completed');
        console.log(`PO ${po.poNumber} status updated to completed.`);
        // 4. Add accepted quantities to raw material inventory
        await get().addAcceptedMaterialsToInventory(poId);
      } else if (hasPendingReplacements) {
        // If there are pending replacements, set status to 'returned_to_vendor'
        await get().updatePOStatus(poId, 'returned_to_vendor');
        console.log(`PO ${po.poNumber} status updated to returned_to_vendor due to pending replacements.`);
      } else {
        console.log(`PO ${po.poNumber} not yet complete: All GRNs QC completed: ${allGRNsQCCompleted}, Has pending replacements: ${hasPendingReplacements}`);
      }
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Failed to check and complete PO', isLoading: false });
      console.error('Error in checkAndCompletePOAndAddInventory:', error);
    }
  },

  addAcceptedMaterialsToInventory: async (poId: string) => {
    set({ isLoading: true, error: null });
    try {
      const po = await get().getPurchaseOrder(poId);
      if (!po) {
        console.warn(`PO with ID ${poId} not found for inventory update.`);
        set({ isLoading: false });
        return;
      }

      let totalMaterialsAdded = 0;
      po.grns.forEach(grn => {
        grn.materials.forEach(material => {
          if (material.qcStatus === 'completed' && material.acceptedQty && material.acceptedQty > 0) {
            // Simulate adding to inventory
            console.log(`Adding ${material.acceptedQty} ${material.unit} of ${material.materialName} (Material ID: ${material.materialId}) to raw material inventory for PO ${po.poNumber}`);
            // Here you would typically call an inventory API
            totalMaterialsAdded += material.acceptedQty;
          }
        });
      });
      console.log(`Total accepted materials simulated to be added to inventory for PO ${po.poNumber}: ${totalMaterialsAdded}`);
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Failed to add materials to inventory', isLoading: false });
      console.error('Error in addAcceptedMaterialsToInventory:', error);
    }
  },
}));
