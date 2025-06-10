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
   
    addRawMaterial,
    updateRawMaterial,
   
    addFinishedProduct,
    updateFinishedProduct,
    setFinishedProducts,
    deleteFinishedProduct,
    
    addSalesOrder,
    updateSalesOrderStatus,
   
    setManufacturingBatches,
   
    addPurchaseOrder,
    updatePurchaseOrderStatus,
    checkProductAvailability,
    getActiveBatches,
    getCompletedBatches,

    setBackendProducts,
 
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
