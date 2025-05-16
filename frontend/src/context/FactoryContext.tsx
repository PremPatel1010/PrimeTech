import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AppNotification } from '../types';
import { 
  RawMaterial, 
  FinishedProduct, 
  SalesOrder, 
  ManufacturingBatch, 
  OrderStatus,
  PurchaseOrder,
  PurchaseOrderStatus,
  PartialFulfillment,
  OrderProduct,
  Supplier
} from '../types';
import { toast } from '@/hooks/use-toast';
import { createSalesOrder, fetchSalesOrders } from '../services/salesOrderService';
import { fetchBatches, createBatch, updateBatchStage as apiUpdateBatchStage } from '../services/manufacturingService';
import { productService, ManufacturingStage as BackendStage } from '../services/productService';
import { rawMaterialService } from '../services/rawMaterial.service';
import { useAuth } from '../contexts/AuthContext';
import { finishedProductService, FinishedProductAPI } from '../services/finishedProduct.service';
import { notificationService } from '../services/notification.service';



// Some initial suppliers


// Define the context type
interface FactoryContextType {
  // Raw Materials
  rawMaterials: RawMaterial[];
  addRawMaterial: (material: Omit<RawMaterial, 'id' | 'lastUpdated'>) => void;
  updateRawMaterial: (id: string, updates: Partial<RawMaterial>) => void;
  
  // Finished Products
  finishedProducts: FinishedProduct[];
  addFinishedProduct: (product: Omit<FinishedProduct, 'id' | 'lastUpdated'> & { productId: number }) => void;
  updateFinishedProduct: (id: string, updates: Partial<FinishedProduct>) => void;
  setFinishedProducts: React.Dispatch<React.SetStateAction<FinishedProduct[]>>;
  deleteFinishedProduct: (productId: string) => void;

  // Sales Orders
  salesOrders: SalesOrder[];
  addSalesOrder: (order: Omit<SalesOrder, 'id'>) => void;
  updateSalesOrderStatus: (id: string, status: OrderStatus) => void;
  
  // Manufacturing Batches
  manufacturingBatches: ManufacturingBatch[];
  setManufacturingBatches: React.Dispatch<React.SetStateAction<ManufacturingBatch[]>>;
  addManufacturingBatch: (batch: Omit<ManufacturingBatch, 'id'>) => void;
  updateManufacturingStage: (id: string, stage: string) => void;

  // Purchase Orders
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (order: Omit<PurchaseOrder, 'id'>) => void;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrderStatus) => void;

  // Suppliers
  

  // New methods for partial fulfillment
  checkProductAvailability: (product: OrderProduct) => { available: number, toManufacture: number };

  // Helper to filter batches
  getActiveBatches: (batches: ManufacturingBatch[]) => ManufacturingBatch[];
  getCompletedBatches: (batches: ManufacturingBatch[]) => ManufacturingBatch[];

  // Backend products
  backendProducts: any[];
  setBackendProducts: React.Dispatch<React.SetStateAction<any[]>>;

  // Notifications
  notifications: AppNotification[];
  markNotificationAsRead: (id: number) => void;
  deleteNotification: (id: number) => void;

  // Add quantity to finished product using PATCH route
  addQuantityToFinishedProduct: (id: string, addQuantity: number) => void;
}

// Create context with default values
const FactoryContext = createContext<FactoryContextType | undefined>(undefined);

// Provider component
export const FactoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState } = useAuth();
  const isAuthenticated = !!authState.token;

  // Initialize state with mock data and ensure all orders are properly tracked
  
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>();
  const [manufacturingBatches, setManufacturingBatches] = useState<ManufacturingBatch[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>();
  const [backendStages, setBackendStages] = useState<BackendStage[]>([]);
  const [backendProducts, setBackendProducts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notificationsRef = useRef<AppNotification[]>([]);
  notificationsRef.current = notifications;
  
  useEffect(() => {
    if (!isAuthenticated) return;

    // Request browser notification permission
    if (window.Notification && window.Notification.permission !== 'granted') {
      window.Notification.requestPermission();
    }

    // Initial fetch
    notificationService.getAll()
      .then(data => setNotifications(data.notifications || []))
      .catch(() => setNotifications([]));

    const pollInterval = setInterval(async () => {
      try {
        const data = await notificationService.getAll();
        if (data.notifications) {
          // Find new notifications not already in state
          const newOnes = data.notifications.filter(
            n => !notificationsRef.current.some(existing => existing.id === n.id)
          );
          if (newOnes.length > 0) {
            setNotifications(prev => [...newOnes, ...prev]);
            newOnes.forEach(n => {
              toast({ title: 'New Notification', description: n.message });
              if (window.Notification && window.Notification.permission === 'granted') {
                new window.Notification('New Notification', { body: n.message });
              }
            });
          }
        }
      } catch {}
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [isAuthenticated]);
  
  useEffect(() => {
    // Only fetch data if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    // Fetch manufacturing batches
    fetchBatches()
      .then(batches => setManufacturingBatches(batches.map(b => {
        // Parse and normalize stageCompletionDates
        let stageCompletionDates = b.stage_completion_dates;
        if (typeof stageCompletionDates === 'string') {
          try {
            stageCompletionDates = JSON.parse(stageCompletionDates);
          } catch {
            stageCompletionDates = {};
          }
        }
        // Ensure all required stage keys are present
        const defaultStages = ['cutting', 'assembly', 'testing', 'packaging', 'completed'];
        const safeStageCompletionDates = defaultStages.reduce((acc, key) => {
          acc[key] = stageCompletionDates && key in stageCompletionDates ? stageCompletionDates[key] : null;
          return acc;
        }, {} as Record<string, string | null>);
        // Parse and normalize dates
        const parseDate = (d: any) => {
          if (!d) return '';
          const dateObj = typeof d === 'string' ? new Date(d) : d;
          return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().split('T')[0];
        };
        // Lookup product name if not present
        let productName = b.product_name || b.productName || '';
        if (!productName && finishedProducts && b.product_id) {
          const found = finishedProducts.find(p => p.id === String(b.product_id));
          if (found) productName = found.name;
        }
        return {
          id: String(b.tracking_id || b.id || ''),
          tracking_id: b.tracking_id,
          batchNumber: b.batch_number || b.batchNumber || b.tracking_id || b.id || '',
          productId: String(b.product_id || b.productId || ''),
          productName,
          quantity: b.quantity_in_process ?? b.quantity ?? 1,
          currentStage: b.current_stage || b.currentStage || 'cutting',
          startDate: parseDate(b.start_date || b.startDate),
          estimatedCompletionDate: parseDate(b.estimated_completion_date || b.estimatedCompletionDate),
          stageCompletionDates: safeStageCompletionDates,
          progress: b.progress ?? 0,
          status: b.status || 'in_progress',
          linkedSalesOrderId: b.linked_sales_order_id ? String(b.linked_sales_order_id) : (b.linkedSalesOrderId ? String(b.linkedSalesOrderId) : undefined),
          custom_stage_name: b.custom_stage_name || undefined,
          rawMaterialsUsed: b.rawMaterialsUsed || [],
          rawMaterialsNeeded: b.rawMaterialsNeeded || [],
          notes: b.notes || '',
        };
      })))
      .catch(() => toast({ title: 'Error', description: 'Failed to load manufacturing batches', variant: 'destructive' }));
    // Fetch products
    productService.getAllProducts()
      .then(products => setBackendProducts(products))
      .catch(() => toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' }));
    // Fetch raw materials
    rawMaterialService.getAllRawMaterials()
      .then(materials => setRawMaterials(materials.map(m => ({
        id: String(m.material_id),
        name: m.material_name,
        unit: m.unit,
        quantity: m.current_stock,
        pricePerUnit: m.unit_price,
        lastUpdated: m.updated_at,
        minThreshold: m.minimum_stock
      }))))
      .catch(() => toast({ title: 'Error', description: 'Failed to load raw materials', variant: 'destructive' }));
    // Fetch stages from backend on mount
    productService.getManufacturingStages()
      .then(stages => setBackendStages(stages))
      .catch(() => setBackendStages([]));
    // Fetch finished products from backend
    finishedProductService.getAll()
      .then(products => setFinishedProducts(products.map(fp => {
        // Use unit_price from backend, fallback to price or backendProducts if needed
        let price = Number(fp.unit_price ?? fp.price ?? 0);
        if (!price && backendProducts && backendProducts.length > 0) {
          const prod = backendProducts.find((p: any) => String(p.product_id) === String(fp.product_id));
          if (prod && prod.price) price = Number(prod.price);
        }
        return {
          id: String(fp.product_id),
          name: fp.product_name || '',
          category: fp.category || '',
          quantity: Number(fp.quantity_available),
          price,
          lastUpdated: fp.added_on || new Date().toISOString(),
          billOfMaterials: [],
          manufacturingSteps: []
        };
      })))
      .catch(() => toast({ title: 'Error', description: 'Failed to load finished products', variant: 'destructive' }));
    // Fetch sales orders from backend
    fetchSalesOrders()
      .then(data => {
        const mapped = data.map((order: any) => ({
          id: order.sales_order_id || order.id,
          orderNumber: order.order_number,
          date: order.order_date,
          customerName: order.customer_name,
          products: (order.order_items || order.products || []).map((p: any) => ({
            ...p,
            price: p.price || p.unit_price || 0,
            quantity: typeof p.quantity === 'number' ? p.quantity : 0
          })),
          status: order.status,
          totalValue: order.total_amount,
          discount: order.discount,
          gst: order.gst,
          partialFulfillment: order.partialFulfillment || [],
        }));
        setSalesOrders(mapped);
      })
      .catch(() => setSalesOrders([]));

    // WebSocket for real-time notifications
    
  }, [isAuthenticated]);
  
  // Listen for inventory refresh events (after sales order completion)
  useEffect(() => {
    const refreshHandler = (e: any) => {
      if (e && e.detail) {
        setFinishedProducts(e.detail.map(fp => ({
          id: String(fp.product_id),
          name: fp.product_name || '',
          category: fp.category || '',
          quantity: Number(fp.quantity_available),
          price: Number(fp.unit_price ?? fp.price ?? 0),
          lastUpdated: fp.added_on || new Date().toISOString(),
          billOfMaterials: [],
          manufacturingSteps: []
        })));
      }
    };
    window.addEventListener('refreshFinishedProducts', refreshHandler);
    return () => window.removeEventListener('refreshFinishedProducts', refreshHandler);
  }, []);
  
  // Supplier functions
 
  
  
  // Raw Materials functions
  const addRawMaterial = (material: Omit<RawMaterial, 'id' | 'lastUpdated'>) => {
    const newMaterial: RawMaterial = {
      ...material,
      id: uuidv4(),
      lastUpdated: new Date().toISOString()
    };
    
    setRawMaterials([...rawMaterials, newMaterial]);
    toast({
      title: "Raw Material Added",
      description: `${material.name} has been added to inventory.`
    });
  };
  
  const updateRawMaterial = (id: string, updates: Partial<RawMaterial>) => {
    setRawMaterials(
      rawMaterials.map(material => 
        material.id === id 
          ? { 
              ...material, 
              ...updates, 
              lastUpdated: new Date().toISOString() 
            } 
          : material
      )
    );
    toast({
      title: "Raw Material Updated",
      description: "The raw material has been updated successfully."
    });
  };
  
  // Finished Products functions
  const addFinishedProduct = async (product: Omit<FinishedProduct, 'id' | 'lastUpdated'> & { productId: number }) => {
    try {
      const created = await finishedProductService.create({
        product_id: product.productId,
        quantity_available: product.quantity,
        status: 'available',
        unit_price: product.price || 0,
        // Add more fields as needed
      });
      setFinishedProducts(prev => [...prev, {
        id: String(created.finished_product_id),
        name: created.product_name || '',
        category: created.category || '',
        quantity: created.quantity_available,
        price: created.unit_price || 0,
        lastUpdated: created.added_on || new Date().toISOString(),
        billOfMaterials: [],
        manufacturingSteps: []
      }]);
      toast({ title: 'Product Added', description: `${product.name} has been added to products.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to add finished product', variant: 'destructive' });
    }
  };
  
  const updateFinishedProduct = async (id: string, updates: Partial<FinishedProduct>) => {
    try {
      // Find the correct finished_product_id for this product
      const allProducts = await finishedProductService.getAll();
      const fpApi = allProducts.find(p => String(p.product_id) === id || String(p.finished_product_id) === id);
      if (!fpApi) return;
      let updated;
      if (Object.keys(updates).length === 1 && updates.quantity !== undefined) {
        // Only updating quantity, use PATCH route
        updated = await finishedProductService.dispatch(Number(fpApi.finished_product_id), updates.quantity);
      } else {
        updated = await finishedProductService.update(Number(fpApi.finished_product_id), {
          quantity_available: updates.quantity ?? fpApi.quantity_available,
          unit_price: updates.price ?? fpApi.unit_price,
          // Add more fields as needed
        });
      }
      setFinishedProducts(
        finishedProducts.map(product =>
          product.id === id
            ? {
                ...product,
                ...updates,
                quantity: updated.quantity_available,
                price: updated.unit_price || 0,
                lastUpdated: updated.added_on || new Date().toISOString()
              }
            : product
        )
      );
      toast({ title: 'Product Updated', description: 'The product has been updated successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update finished product', variant: 'destructive' });
    }
  };

  const deleteFinishedProduct = async (productId: string) => {
    try {
      await finishedProductService.delete(Number(productId));
      setFinishedProducts(prev => prev.filter(p => p.id !== productId));
      toast({ title: 'Product Deleted', description: 'The product has been deleted.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete finished product', variant: 'destructive' });
    }
  };

  

  // Helper function to check product availability
  const checkProductAvailability = (orderProduct: OrderProduct) => {
    const product = finishedProducts.find(p => p.id === orderProduct.productId);
    if (!product) {
      return { available: 0, toManufacture: orderProduct.quantity };
    }
    // Check how many products are available in stock
    const availableQuantity = product.quantity;
    const quantityToManufacture = Math.max(0, orderProduct.quantity - availableQuantity);
    return {
      available: Math.min(availableQuantity, orderProduct.quantity),
      toManufacture: quantityToManufacture
    };
  };

  // Helper function to check if raw materials are available for manufacturing
  const checkRawMaterialsAvailability = (product: FinishedProduct, quantity: number): boolean => {
    if (!product.billOfMaterials || product.billOfMaterials.length === 0) {
      return true; // No materials needed
    }

    return product.billOfMaterials.every(item => {
      const material = rawMaterials.find(m => m.id === item.materialId);
      if (!material) return false;
      
      const requiredQuantity = item.quantityRequired * quantity;
      return material.quantity >= requiredQuantity;
    });
  };
  
  // Helper function to deduct raw materials used in manufacturing
  const deductRawMaterialsForManufacturing = (product: FinishedProduct, quantity: number) => {
    if (!product.billOfMaterials || product.billOfMaterials.length === 0) {
      return; // No materials to deduct
    }
    
    const updatedMaterials = [...rawMaterials];
    
    product.billOfMaterials.forEach(item => {
      const materialIndex = updatedMaterials.findIndex(m => m.id === item.materialId);
      if (materialIndex !== -1) {
        const requiredQuantity = item.quantityRequired * quantity;
        updatedMaterials[materialIndex] = {
          ...updatedMaterials[materialIndex],
          quantity: Math.max(0, updatedMaterials[materialIndex].quantity - requiredQuantity),
          lastUpdated: new Date().toISOString()
        };
      }
    });
    
    setRawMaterials(updatedMaterials);
  };
  
  // Sales Orders functions
  const addSalesOrder = async (order: Omit<SalesOrder, 'id'>) => {
    try {
      await createSalesOrder(order as SalesOrder);
      const updatedOrders = await fetchSalesOrders();
      setSalesOrders(updatedOrders);
      toast({
        title: "Sales Order Created",
        description: `Order ${order.orderNumber} has been created successfully.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create sales order.",
        variant: "destructive"
      });
    }
  };
  
  // Helper to create manufacturing batches for an order
  const createManufacturingBatches = (order: SalesOrder) => {
    if (!order.partialFulfillment) return;
    const updatedOrder = { ...order, isTracked: true };
    const batchIds: string[] = [];
    for (const fulfillment of order.partialFulfillment) {
      // Double-check available stock before creating a batch
      const product = finishedProducts.find(p => p.id === fulfillment.productId);
      const availableStock = product ? product.quantity : 0;
      if (fulfillment.manufacturingQuantity > 0 && availableStock < fulfillment.totalQuantity) {
        if (product) {
          // Check if raw materials are available
          const materialsAvailable = checkRawMaterialsAvailability(product, fulfillment.manufacturingQuantity);
          if (materialsAvailable) {
            // Deduct raw materials for manufacturing
            deductRawMaterialsForManufacturing(product, fulfillment.manufacturingQuantity);
            // Create a manufacturing batch
            const startDate = new Date();
            const estimatedCompletionDate = new Date();
            estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7); // 7 days for manufacturing
            const batchId = uuidv4();
            const newBatch: ManufacturingBatch = {
              id: batchId,
              batchNumber: `B-${Date.now().toString().slice(-6)}`,
              productId: product.id,
              productName: product.name,
              quantity: fulfillment.manufacturingQuantity,
              currentStage: 'cutting',
              startDate: startDate.toISOString(),
              estimatedCompletionDate: estimatedCompletionDate.toISOString(),
              stageCompletionDates: {
                cutting: null,
                assembly: null,
                testing: null,
                packaging: null,
                completed: null
              },
              progress: 20,
              linkedSalesOrderId: order.id,
              status: 'in_progress',
              custom_stage_name: undefined,
            };
            batchIds.push(batchId);
            setManufacturingBatches(prev => [...prev, newBatch]);
            toast({
              title: "Manufacturing Batch Created",
              description: `Manufacturing started for ${fulfillment.manufacturingQuantity} units of ${product.name}.`
            });
          }
        }
      }
    }
    // Update the order with batch IDs
    if (batchIds.length > 0) {
      updatedOrder.partialFulfillment = updatedOrder.partialFulfillment.map(item => {
        if (item.manufacturingQuantity > 0) {
          return { ...item, manufacturingBatchIds: batchIds };
        }
        return item;
      });
      setSalesOrders(salesOrders.map(o => o.id === order.id ? updatedOrder : o));
    }
  };
  
  const updateSalesOrderStatus = (id: string, status: OrderStatus) => {
    setSalesOrders(
      salesOrders.map(order => {
        if (order.id === id) {
          const updatedOrder = { ...order, status };
          
          // If status changed to confirmed, update product inventory
          if (status === 'confirmed' && order.status !== 'confirmed') {
            // Check if products are in stock
            const canConfirm = order.products.every(orderProduct => {
              const product = finishedProducts.find(p => p.id === orderProduct.productId);
              return product && product.quantity >= orderProduct.quantity;
            });
            
            if (canConfirm) {
              const updatedProducts = [...finishedProducts];
              
              order.products.forEach(orderProduct => {
                const productIndex = updatedProducts.findIndex(p => p.id === orderProduct.productId);
                if (productIndex !== -1) {
                  updatedProducts[productIndex] = {
                    ...updatedProducts[productIndex],
                    quantity: Math.max(0, updatedProducts[productIndex].quantity - orderProduct.quantity),
                    lastUpdated: new Date().toISOString()
                  };
                }
              });
              
              setFinishedProducts(updatedProducts);
            } else {
              // Process partial fulfillment
              const partialFulfillment: PartialFulfillment[] = [];
              let anyManufacturingNeeded = false;
              let anyMaterialShortage = false;
              
              // Analyze each product in the order
              for (const orderProduct of order.products) {
                const { available, toManufacture } = checkProductAvailability(orderProduct);
                if (toManufacture > 0) {
                  anyManufacturingNeeded = true;
                  const product = finishedProducts.find(p => p.id === orderProduct.productId);
                  if (product) {
                    const materialsAvailable = checkRawMaterialsAvailability(product, toManufacture);
                    if (!materialsAvailable) {
                      anyMaterialShortage = true;
                    }
                    partialFulfillment.push({
                      productId: orderProduct.productId,
                      productName: orderProduct.productName,
                      totalQuantity: orderProduct.quantity,
                      inStockQuantity: available,
                      manufacturingQuantity: toManufacture,
                      manufacturingBatchIds: []
                    });
                  }
                } else {
                  // This product is fully available, no batch needed
                  partialFulfillment.push({
                    productId: orderProduct.productId,
                    productName: orderProduct.productName,
                    totalQuantity: orderProduct.quantity,
                    inStockQuantity: orderProduct.quantity,
                    manufacturingQuantity: 0
                  });
                }
              }
              
              // Determine the updated status based on the analysis
              if (anyMaterialShortage) {
                updatedOrder.status = 'awaiting_materials';
              } else if (anyManufacturingNeeded) {
                updatedOrder.status = 'partially_in_stock';
                updatedOrder.partialFulfillment = partialFulfillment;
                
                // Create manufacturing batches for products that need manufacturing
                const updatedProducts = [...finishedProducts];
                
                // Deduct the available products from inventory
                for (const fulfillment of partialFulfillment) {
                  if (fulfillment.inStockQuantity > 0) {
                    const productIndex = updatedProducts.findIndex(p => p.id === fulfillment.productId);
                    if (productIndex !== -1) {
                      updatedProducts[productIndex] = {
                        ...updatedProducts[productIndex],
                        quantity: Math.max(0, updatedProducts[productIndex].quantity - fulfillment.inStockQuantity),
                        lastUpdated: new Date().toISOString()
                      };
                    }
                  }
                }
                
                setFinishedProducts(updatedProducts);
                
                // Create manufacturing batches
                createManufacturingBatches(updatedOrder);
              } else {
                updatedOrder.status = 'confirmed';
              }
            }
          }
          
          // If switching to 'in_production', check for raw materials
          if (status === 'in_production' && order.status !== 'in_production') {
            order.products.forEach(orderProduct => {
              const product = finishedProducts.find(p => p.id === orderProduct.productId);
              if (product) {
                // Check if raw materials are available for manufacturing
                const materialsAvailable = checkRawMaterialsAvailability(product, orderProduct.quantity);
                
                if (!materialsAvailable) {
                  toast({
                    title: "Raw Materials Shortage",
                    description: `Insufficient raw materials for manufacturing ${product.name}.`,
                    variant: "destructive"
                  });
                  updatedOrder.status = 'awaiting_materials';
                } else {
                  // Deduct raw materials required for manufacturing
                  deductRawMaterialsForManufacturing(product, orderProduct.quantity);
                  
                  // Create a new manufacturing batch
                  const startDate = new Date();
                  const estimatedCompletionDate = new Date();
                  estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7); // 7 days for manufacturing
                  
                  const newBatch: ManufacturingBatch = {
                    id: uuidv4(),
                    batchNumber: `B-${Date.now().toString().slice(-6)}`,
                    productId: product.id,
                    productName: product.name,
                    quantity: orderProduct.quantity,
                    currentStage: 'cutting',
                    startDate: startDate.toISOString(),
                    estimatedCompletionDate: estimatedCompletionDate.toISOString(),
                    stageCompletionDates: {
                      cutting: null,
                      assembly: null,
                      testing: null,
                      packaging: null,
                      completed: null
                    },
                    progress: 20,
                    linkedSalesOrderId: order.id,
                    status: 'in_progress',
                    custom_stage_name: undefined,
                  };
                  
                  setManufacturingBatches(prev => [...prev, newBatch]);
                  
                  toast({
                    title: "Manufacturing Batch Created",
                    description: `Manufacturing started for ${product.name}.`
                  });
                }
              }
            });
          }
          
          return updatedOrder;
        }
        return order;
      })
    );
    
    toast({
      title: "Order Status Updated",
      description: `The order status has been updated to ${status}.`
    });
  };
  
  // Manufacturing Batches functions
  const addManufacturingBatch = async (batch: Omit<ManufacturingBatch, 'id'>) => {
    try {
      // Always fetch product's custom stages
      let productStages = [];
      if (batch.productId) {
        try {
          productStages = await productService.getProductStages(Number(batch.productId));
        } catch {}
      }
      // Build stageCompletionDates with all custom stages (in correct order)
      let stageCompletionDates: Record<string, string | null> = {};
      if (productStages.length > 0) {
        productStages.forEach((stage: any) => {
          stageCompletionDates[stage.stage_name] = null;
        });
        // Always add 'Completed' as last stage if not present
        if (!productStages.some((s: any) => s.stage_name.toLowerCase() === 'completed')) {
          stageCompletionDates['Completed'] = null;
        }
      } else {
        // Fallback to default
        ['Cutting', 'Assembly', 'Testing', 'Packaging', 'Completed'].forEach(s => {
          stageCompletionDates[s] = null;
        });
      }
      // Use first custom stage as initial, or fallback
      const initialStage = productStages.length > 0 ? productStages[0] : backendStages[0];
      // Prepare backend batch object
      const backendBatch = {
        batch_number: batch.batchNumber,
        product_id: batch.productId,
        product_name: batch.productName,
        quantity_in_process: batch.quantity,
        start_date: batch.startDate ? new Date(batch.startDate).toISOString() : new Date().toISOString(),
        estimated_completion_date: batch.estimatedCompletionDate ? new Date(batch.estimatedCompletionDate).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        stage_completion_dates: stageCompletionDates,
        progress: batch.progress ?? 0,
        current_stage_id: initialStage?.stage_id,
        status: batch.status || 'in_progress',
        linked_sales_order_id: batch.linkedSalesOrderId || null,
        custom_stage_name: batch.custom_stage_name || undefined,
      };
      await createBatch(backendBatch);
      // Immediately fetch all batches and update state for real-time UI
      const batches = await fetchBatches();
      setManufacturingBatches(batches.map(b => {
        // Parse and normalize stageCompletionDates
        let stageCompletionDates = b.stage_completion_dates;
        if (typeof stageCompletionDates === 'string') {
          try {
            stageCompletionDates = JSON.parse(stageCompletionDates);
          } catch {
            stageCompletionDates = {};
          }
        }
        // Use the order from the stored stageCompletionDates
        let safeStageCompletionDates = stageCompletionDates;
        // Parse and normalize dates
        const parseDate = (d: any) => {
          if (!d) return '';
          const dateObj = typeof d === 'string' ? new Date(d) : d;
          return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().split('T')[0];
        };
        let productName = b.product_name || b.productName || '';
        if (!productName && finishedProducts && b.product_id) {
          const found = finishedProducts.find(p => p.id === String(b.product_id));
          if (found) productName = found.name;
        }
        return {
          id: String(b.tracking_id || b.id || ''),
          tracking_id: b.tracking_id,
          batchNumber: b.batch_number || b.batchNumber || b.tracking_id || b.id || '',
          productId: String(b.product_id || b.productId || ''),
          productName,
          quantity: b.quantity_in_process ?? b.quantity ?? 1,
          currentStage: b.current_stage || b.currentStage || (initialStage?.stage_name || 'cutting'),
          startDate: parseDate(b.start_date || b.startDate),
          estimatedCompletionDate: parseDate(b.estimated_completion_date || b.estimatedCompletionDate),
          stageCompletionDates: safeStageCompletionDates,
          progress: b.progress ?? 0,
          status: b.status || 'in_progress',
          linkedSalesOrderId: b.linked_sales_order_id ? String(b.linked_sales_order_id) : (b.linkedSalesOrderId ? String(b.linkedSalesOrderId) : undefined),
          custom_stage_name: b.custom_stage_name || undefined,
          rawMaterialsUsed: b.rawMaterialsUsed || [],
          rawMaterialsNeeded: b.rawMaterialsNeeded || [],
          notes: b.notes || '',
        };
      }));
      // For each batch, fetch and cache its product stages for immediate UI display
      const uniqueProductIds = Array.from(new Set(batches.map(b => String(b.product_id || b.productId || ''))));
      for (const pid of uniqueProductIds) {
        if (pid && !isNaN(Number(pid))) {
          try {
            await productService.getProductStages(Number(pid));
          } catch {}
        }
      }
      toast({ title: 'Manufacturing Batch Created', description: `Batch ${batch.batchNumber} has been created successfully.` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create manufacturing batch', variant: 'destructive' });
    }
  };
  
  const getStagesForBatch = (batch: ManufacturingBatch) => {
    // Try to get the product from backendProducts
    const product = backendProducts.find((p: any) => String(p.product_id) === String(batch.productId));
    if (product && Array.isArray(product.manufacturing_steps) && product.manufacturing_steps.length > 0) {
      // Return as array of objects for UI compatibility
      const steps = product.manufacturing_steps.map((step: string, idx: number) => ({
        stage_id: idx + 1,
        component_type: 'custom',
        stage_name: step,
        sequence: idx + 1
      }));
      // Always add 'Completed' as the last stage
      steps.push({
        stage_id: steps.length + 1,
        component_type: 'custom',
        stage_name: 'Completed',
        sequence: steps.length + 1
      });
      return steps;
    }
    // Fallback to backend stages
    const type = 'combined'; // Or use your getComponentType logic if needed
    let stages = backendStages.filter(s => s.component_type === type);
    if (stages.length > 0 && !stages.some(s => s.stage_name.toLowerCase() === 'completed')) {
      stages = [...stages, { stage_id: 9999, component_type: type, stage_name: 'Completed', sequence: stages.length + 1 }];
    }
    return stages.length > 0 ? stages : backendStages;
  };
  
  const updateManufacturingStage = async (id: string, stage: string) => {
    try {
      const batch = manufacturingBatches.find(b => b.id === id);
      if (!batch) throw new Error('Batch not found');
      // Use getStagesForBatch to get the correct stage object
      const stages = getStagesForBatch(batch);
      const stageObj = stages.find(s => s.stage_name.toLowerCase() === stage.toLowerCase());
      let update: any = {};
      if (stageObj && stageObj.stage_id && typeof stageObj.stage_id === 'number' && stageObj.stage_name.toLowerCase() !== 'completed') {
        // Backend stage: send stage_id
        update.current_stage_id = stageObj.stage_id;
        update.custom_stage_name = null;
      } else {
        // Custom product-defined stage: send as custom_stage_name
        update.current_stage_id = null;
        update.custom_stage_name = stage;
      }
      // Calculate progress based on stage index
      const stageIndex = stages.findIndex(s => s.stage_name.toLowerCase() === stage.toLowerCase());
      const totalStages = stages.length - 1;
      update.progress = stage.toLowerCase() === 'completed' ? 100 : Math.round((stageIndex / totalStages) * 100);
      const now = new Date().toISOString();
      update.stage_completion_dates = { ...batch.stageCompletionDates, [stage]: now };
      update.status = stage.toLowerCase() === 'completed' ? 'completed' : 'in_progress';
      const updated = await apiUpdateBatchStage(batch.id, update);
      // Map backend batch to frontend ManufacturingBatch type
      let stageCompletionDates = updated.stage_completion_dates;
      if (typeof stageCompletionDates === 'string') {
        try {
          stageCompletionDates = JSON.parse(stageCompletionDates);
        } catch {
          stageCompletionDates = {};
        }
      }
      const defaultStages = ['cutting', 'assembly', 'testing', 'packaging', 'completed'];
      const safeStageCompletionDates = defaultStages.reduce((acc, key) => {
        acc[key] = stageCompletionDates && key in stageCompletionDates ? stageCompletionDates[key] : null;
        return acc;
      }, {} as Record<string, string | null>);
      const parseDate = (d: any) => {
        if (!d) return '';
        const dateObj = typeof d === 'string' ? new Date(d) : d;
        return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString().split('T')[0];
      };
      let productName = updated.product_name || updated.productName || '';
      if (!productName && finishedProducts && updated.product_id) {
        const found = finishedProducts.find(p => p.id === String(updated.product_id));
        if (found) productName = found.name;
      }
      const mappedBatch = {
        id: String(updated.tracking_id || updated.id || ''),
        batchNumber: updated.batch_number || updated.batchNumber || updated.tracking_id || updated.id || '',
        productId: String(updated.product_id || updated.productId || ''),
        productName,
        quantity: updated.quantity_in_process ?? updated.quantity ?? 1,
        currentStage: updated.current_stage || updated.currentStage || (updated.status === 'completed' ? 'completed' : stage),
        startDate: parseDate(updated.start_date || updated.startDate),
        estimatedCompletionDate: parseDate(updated.estimated_completion_date || updated.estimatedCompletionDate),
        stageCompletionDates: safeStageCompletionDates,
        progress: updated.progress ?? 0,
        status: updated.status || (stage === 'completed' ? 'completed' : 'in_progress'),
        linkedSalesOrderId: updated.linked_sales_order_id ? String(updated.linked_sales_order_id) : (updated.linkedSalesOrderId ? String(updated.linkedSalesOrderId) : undefined),
        custom_stage_name: updated.custom_stage_name || undefined,
        rawMaterialsUsed: updated.rawMaterialsUsed || [],
        rawMaterialsNeeded: updated.rawMaterialsNeeded || [],
        notes: updated.notes || '',
      };
      setManufacturingBatches(prev => prev.map(b => (b.id === batch.id ? mappedBatch : b)));

      // --- NEW LOGIC: Deduct raw materials when batch enters manufacturing (not completed) ---
      if (stage !== 'completed') {
        // Only deduct if not already deducted for this batch
        if (!batch.rawMaterialsUsed || batch.rawMaterialsUsed.length === 0) {
          const backendProduct = backendProducts.find(p => String(p.product_id) === batch.productId);
          if (backendProduct && backendProduct.bom_items) {
            const updatedMaterials = [...rawMaterials];
            const usedMaterials: any[] = [];
            for (const item of backendProduct.bom_items) {
              const materialIndex = updatedMaterials.findIndex(m => m.id === String(item.material_id));
              if (materialIndex !== -1) {
                const requiredQuantity = item.quantity_required * batch.quantity;
                updatedMaterials[materialIndex] = {
                  ...updatedMaterials[materialIndex],
                  quantity: Math.max(0, updatedMaterials[materialIndex].quantity - requiredQuantity),
                  lastUpdated: new Date().toISOString()
                };
                usedMaterials.push({
                  materialId: String(item.material_id),
                  materialName: item.material_name || '',
                  quantityUsed: requiredQuantity,
                  unit: updatedMaterials[materialIndex].unit
                });
                // Persist to backend
                rawMaterialService.updateRawMaterial(parseInt(updatedMaterials[materialIndex].id), { current_stock: updatedMaterials[materialIndex].quantity });
              }
            }
            setRawMaterials(updatedMaterials);
            // Save used materials in batch for tracking
            setManufacturingBatches(prev => prev.map(b =>
              (b.id === batch.id)
                ? { ...b, rawMaterialsUsed: usedMaterials }
                : b
            ));
          }
        }
      }

      // --- NEW LOGIC: Add finished products to inventory when batch is completed ---
      if (stage === 'completed') {
        // Add or update finished product in backend
        const backendProduct = backendProducts.find(p => String(p.product_id) === batch.productId);
        if (backendProduct) {
          // Try to find if finished product already exists in backend
          const existing = finishedProducts.find(p => p.id === batch.productId);
          if (existing) {
            // Use PATCH route to add quantity to inventory
            await addQuantityToFinishedProduct(existing.id, batch.quantity);
          } else {
            // Create new finished product in backend
            await finishedProductService.create({
              product_id: backendProduct.product_id,
              quantity_available: batch.quantity,
              status: 'available',
              unit_price: backendProduct.price || 0,
              category: backendProduct.category || '',
            });
          }
          // Refetch finished products from backend
          const products = await finishedProductService.getAll();
          setFinishedProducts(products.map(fp => {
            // Use unit_price from backend, fallback to backendProducts if needed
            let price = Number(fp.unit_price ?? fp.price ?? 0);
            if (!price && backendProducts && backendProducts.length > 0) {
              const prod = backendProducts.find((p: any) => String(p.product_id) === String(fp.product_id));
              if (prod && prod.price) price = Number(prod.price);
            }
            return {
              id: String(fp.product_id),
              name: fp.product_name || '',
              category: fp.category || '',
              quantity: Number(fp.quantity_available),
              price,
              lastUpdated: fp.added_on || new Date().toISOString(),
              billOfMaterials: [],
              manufacturingSteps: []
            };
          }));
        }
      }

      toast({ title: 'Manufacturing Stage Updated', description: `Stage has been updated to ${stage}.` });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update manufacturing stage', variant: 'destructive' });
    }
  };

  // Purchase Orders functions
  const addPurchaseOrder = (order: Omit<PurchaseOrder, 'id'>) => {
    const newOrder: PurchaseOrder = {
      ...order,
      id: uuidv4()
    };
    
    setPurchaseOrders([...purchaseOrders, newOrder]);
    
    toast({
      title: "Purchase Order Created",
      description: `Order ${order.orderNumber} has been created successfully.`
    });
  };
  
  const updatePurchaseOrderStatus = (id: string, status: PurchaseOrderStatus) => {
    setPurchaseOrders(
      purchaseOrders.map(order => {
        if (order.id === id) {
          const updatedOrder = { ...order, status };
          
          // If status changed to arrived, update raw material inventory
          if (status === 'arrived' && order.status !== 'arrived') {
            const updatedMaterials = [...rawMaterials];
            
            order.materials.forEach(purchaseMaterial => {
              const materialIndex = updatedMaterials.findIndex(m => m.id === purchaseMaterial.materialId);
              
              if (materialIndex !== -1) {
                // Update existing material
                updatedMaterials[materialIndex] = {
                  ...updatedMaterials[materialIndex],
                  quantity: updatedMaterials[materialIndex].quantity + purchaseMaterial.quantity,
                  lastUpdated: new Date().toISOString()
                };
              } else {
                // Add as new material
                const newMaterial: RawMaterial = {
                  id: uuidv4(),
                  name: purchaseMaterial.materialName,
                  unit: purchaseMaterial.unit,
                  quantity: purchaseMaterial.quantity,
                  pricePerUnit: purchaseMaterial.pricePerUnit,
                  lastUpdated: new Date().toISOString(),
                };
                
                updatedMaterials.push(newMaterial);
              }
            });
            
            setRawMaterials(updatedMaterials);
          }
          
          return updatedOrder;
        }
        return order;
      })
    );
    
    toast({
      title: "Purchase Order Status Updated",
      description: `The order status has been updated to ${status}.`
    });
  };

  // Helper to filter batches
  const getActiveBatches = (batches: ManufacturingBatch[]) => batches.filter(batch => batch.status !== 'completed' && batch.currentStage !== 'completed');
  const getCompletedBatches = (batches: ManufacturingBatch[]) => batches.filter(batch => batch.status === 'completed' || batch.currentStage === 'completed');

  // Notification methods
  const markNotificationAsRead = async (id: number) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const deleteNotification = async (id: number) => {
    await notificationService.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Add quantity to finished product using PATCH route
  const addQuantityToFinishedProduct = async (id: string, addQuantity: number) => {
    try {
      // Find the correct finished_product_id for this product
      const allProducts = await finishedProductService.getAll();
      const fpApi = allProducts.find(p => String(p.product_id) === id || String(p.finished_product_id) === id);
      if (!fpApi) return;
      const updated = await finishedProductService.dispatch(Number(fpApi.finished_product_id), addQuantity);
      setFinishedProducts(
        finishedProducts.map(product =>
          product.id === id
            ? {
                ...product,
                quantity: updated.quantity_available,
                lastUpdated: updated.added_on || new Date().toISOString()
              }
            : product
        )
      );
      toast({ title: 'Inventory Updated', description: `Added ${addQuantity} units to inventory.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to add quantity to finished product', variant: 'destructive' });
    }
  };

  const value: FactoryContextType = {
    rawMaterials,
    addRawMaterial,
    updateRawMaterial,
    finishedProducts,
    addFinishedProduct,
    updateFinishedProduct,
    setFinishedProducts,
    deleteFinishedProduct,
    salesOrders,
    addSalesOrder,
    updateSalesOrderStatus,
    manufacturingBatches,
    setManufacturingBatches,
    addManufacturingBatch,
    updateManufacturingStage,
    purchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrderStatus,
    checkProductAvailability,
    getActiveBatches,
    getCompletedBatches,
    backendProducts,
    setBackendProducts,
    notifications,
    markNotificationAsRead,
    deleteNotification,
    addQuantityToFinishedProduct,
  };
  
  return (
    <FactoryContext.Provider value={value}>
      {children}
    </FactoryContext.Provider>
  );
};

// Custom hook for using the context
export const useFactory = (): FactoryContextType => {
  const context = useContext(FactoryContext);
  
  if (context === undefined) {
    throw new Error('useFactory must be used within a FactoryProvider');
  }
  
  return context;
};
