import React, { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
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

// Import mock data
import { rawMaterialsMock } from '../data/mockRawMaterials';
import { finishedProductsMock } from '../data/mockFinishedProducts';
import { salesOrdersMock } from '../data/mockSalesOrders';
import { manufacturingBatchesMock } from '../data/mockManufacturingBatches';
import { purchaseOrdersMock } from '../data/mockPurchaseOrders';

// Some initial suppliers
const suppliersMock: Supplier[] = [
  {
    id: "sup-001",
    name: "Prime Materials Inc.",
    contactPerson: "John Smith",
    email: "john@primematerials.com",
    phone: "555-123-4567",
    address: "123 Supply St, Industry Park, CA 90210",
    materials: ["mat-001", "mat-002"],
    notes: "Reliable supplier for metal components."
  },
  {
    id: "sup-002",
    name: "Global Electronics",
    contactPerson: "Sara Johnson",
    email: "sara@globalelectronics.com",
    phone: "555-987-6543",
    address: "456 Circuit Ave, Tech City, NY 10001",
    materials: ["mat-003", "mat-004"],
    notes: "Specializes in electronic components."
  }
];

// Define the context type
interface FactoryContextType {
  // Raw Materials
  rawMaterials: RawMaterial[];
  addRawMaterial: (material: Omit<RawMaterial, 'id' | 'lastUpdated'>) => void;
  updateRawMaterial: (id: string, updates: Partial<RawMaterial>) => void;
  
  // Finished Products
  finishedProducts: FinishedProduct[];
  addFinishedProduct: (product: Omit<FinishedProduct, 'id' | 'lastUpdated'>) => void;
  updateFinishedProduct: (id: string, updates: Partial<FinishedProduct>) => void;
  
  // Sales Orders
  salesOrders: SalesOrder[];
  addSalesOrder: (order: Omit<SalesOrder, 'id'>) => void;
  updateSalesOrderStatus: (id: string, status: OrderStatus) => void;
  
  // Manufacturing Batches
  manufacturingBatches: ManufacturingBatch[];
  addManufacturingBatch: (batch: Omit<ManufacturingBatch, 'id'>) => void;
  updateManufacturingStage: (id: string, stage: string) => void;

  // Purchase Orders
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (order: Omit<PurchaseOrder, 'id'>) => void;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrderStatus) => void;

  // Suppliers
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // New methods for partial fulfillment
  checkProductAvailability: (product: OrderProduct) => { available: number, toManufacture: number };
}

// Create context with default values
const FactoryContext = createContext<FactoryContextType | undefined>(undefined);

// Provider component
export const FactoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state with mock data and ensure all orders are properly tracked
  const initialSalesOrders = salesOrdersMock.map(order => ({
    ...order,
    isTracked: true
  }));
  
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(rawMaterialsMock);
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>(finishedProductsMock);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(initialSalesOrders);
  const [manufacturingBatches, setManufacturingBatches] = useState<ManufacturingBatch[]>(manufacturingBatchesMock);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(purchaseOrdersMock);
  const [suppliers, setSuppliers] = useState<Supplier[]>(suppliersMock);
  
  // Supplier functions
  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = {
      ...supplier,
      id: `sup-${new Date().getTime().toString().slice(-4)}`
    };
    
    setSuppliers([...suppliers, newSupplier]);
    toast({
      title: "Supplier Added",
      description: `${supplier.name} has been added to suppliers.`
    });
  };
  
  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers(
      suppliers.map(supplier => 
        supplier.id === id 
          ? { ...supplier, ...updates } 
          : supplier
      )
    );
    toast({
      title: "Supplier Updated",
      description: "Supplier information has been updated successfully."
    });
  };
  
  const deleteSupplier = (id: string) => {
    setSuppliers(suppliers.filter(supplier => supplier.id !== id));
    toast({
      title: "Supplier Deleted",
      description: "Supplier has been removed."
    });
  };
  
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
  const addFinishedProduct = (product: Omit<FinishedProduct, 'id' | 'lastUpdated'>) => {
    const newProduct: FinishedProduct = {
      ...product,
      id: uuidv4(),
      lastUpdated: new Date().toISOString()
    };
    
    setFinishedProducts([...finishedProducts, newProduct]);
    toast({
      title: "Product Added",
      description: `${product.name} has been added to products.`
    });
  };
  
  const updateFinishedProduct = (id: string, updates: Partial<FinishedProduct>) => {
    setFinishedProducts(
      finishedProducts.map(product => 
        product.id === id 
          ? { 
              ...product, 
              ...updates, 
              lastUpdated: new Date().toISOString() 
            } 
          : product
      )
    );
    toast({
      title: "Product Updated",
      description: "The product has been updated successfully."
    });
  };

  // Helper function to check product availability
  const checkProductAvailability = (orderProduct: OrderProduct) => {
    const product = finishedProducts.find(p => p.id === orderProduct.productId);
    
    if (!product) {
      return { available: 0, toManufacture: orderProduct.quantity };
    }
    
    // Check how many products are available in stock
    const availableQuantity = Math.min(product.quantity, orderProduct.quantity);
    const quantityToManufacture = orderProduct.quantity - availableQuantity;
    
    return { 
      available: availableQuantity, 
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
      if (fulfillment.manufacturingQuantity > 0) {
        const product = finishedProducts.find(p => p.id === fulfillment.productId);
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
              linkedSalesOrderId: order.id
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
                
                // If we need to manufacture some or all of this product
                if (toManufacture > 0) {
                  anyManufacturingNeeded = true;
                  
                  const product = finishedProducts.find(p => p.id === orderProduct.productId);
                  if (product) {
                    // Check if raw materials are available for manufacturing
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
                  // This product is fully available
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
                    linkedSalesOrderId: order.id
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
  const addManufacturingBatch = (batch: Omit<ManufacturingBatch, 'id'>) => {
    const newBatch: ManufacturingBatch = {
      ...batch,
      id: uuidv4()
    };
    
    // Check if raw materials are available
    const product = finishedProducts.find(p => p.id === batch.productId);
    if (product) {
      const materialsAvailable = checkRawMaterialsAvailability(product, batch.quantity);
      
      if (!materialsAvailable) {
        toast({
          title: "Raw Materials Shortage",
          description: `Insufficient raw materials for manufacturing ${product.name}.`,
          variant: "destructive"
        });
        return;
      }
      
      // Deduct raw materials for manufacturing
      deductRawMaterialsForManufacturing(product, batch.quantity);
    }
    
    setManufacturingBatches([...manufacturingBatches, newBatch]);
    toast({
      title: "Manufacturing Batch Created",
      description: `Batch ${batch.batchNumber} has been created successfully.`
    });
  };
  
  const updateManufacturingStage = (id: string, stage: string) => {
    const now = new Date().toISOString();
    
    setManufacturingBatches(
      manufacturingBatches.map(batch => {
        if (batch.id === id) {
          // Calculate progress based on stages
          const stages = ['cutting', 'assembly', 'testing', 'packaging', 'completed'];
          const currentStageIndex = stages.indexOf(stage);
          const totalStages = stages.length - 1; // Exclude 'completed' for progress calc
          const progress = stage === 'completed' 
            ? 100 
            : Math.round((currentStageIndex / totalStages) * 100);
          
          // Update completion dates
          const updatedCompletionDates = { ...batch.stageCompletionDates };
          
          // Mark current stage as completed
          updatedCompletionDates[stage] = now;
          
          // If moving to completed, update inventory
          if (stage === 'completed' && batch.currentStage !== 'completed') {
            const productIndex = finishedProducts.findIndex(p => p.id === batch.productId);
            
            if (productIndex !== -1) {
              const updatedProducts = [...finishedProducts];
              updatedProducts[productIndex] = {
                ...updatedProducts[productIndex],
                quantity: updatedProducts[productIndex].quantity + batch.quantity,
                lastUpdated: now
              };
              
              setFinishedProducts(updatedProducts);
              
              // If linked to a sales order, update the order status
              if (batch.linkedSalesOrderId) {
                setSalesOrders(prevOrders => 
                  prevOrders.map(order => {
                    if (order.id === batch.linkedSalesOrderId) {
                      // Check if this was a partial fulfillment order
                      if (order.partialFulfillment && order.partialFulfillment.length > 0) {
                        // Find the product in the partial fulfillment
                        const updatedPartialFulfillment = order.partialFulfillment.map(item => {
                          if (item.productId === batch.productId) {
                            // Move the manufactured quantity to in-stock
                            return {
                              ...item,
                              inStockQuantity: item.inStockQuantity + batch.quantity,
                              manufacturingQuantity: Math.max(0, item.manufacturingQuantity - batch.quantity)
                            };
                          }
                          return item;
                        });
                        
                        // Check if all manufacturing is complete
                        const allManufacturingComplete = updatedPartialFulfillment.every(
                          item => item.manufacturingQuantity === 0
                        );
                        
                        // If all manufacturing is complete, set order to confirmed
                        return { 
                          ...order, 
                          partialFulfillment: updatedPartialFulfillment,
                          status: allManufacturingComplete ? 'confirmed' : 'partially_in_stock' 
                        };
                      }
                      
                      // Set the order status to confirmed (in stock) since manufacturing is complete
                      return { ...order, status: 'confirmed' };
                    }
                    return order;
                  })
                );
              }
            }
          }
          
          return {
            ...batch,
            currentStage: stage,
            progress,
            stageCompletionDates: updatedCompletionDates
          };
        }
        return batch;
      })
    );
    
    toast({
      title: "Manufacturing Stage Updated",
      description: `Stage has been updated to ${stage}.`
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
                  supplierId: order.supplierId,
                  supplierName: order.supplierName
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

  const value: FactoryContextType = {
    rawMaterials,
    addRawMaterial,
    updateRawMaterial,
    finishedProducts,
    addFinishedProduct,
    updateFinishedProduct,
    salesOrders,
    addSalesOrder,
    updateSalesOrderStatus,
    manufacturingBatches,
    addManufacturingBatch,
    updateManufacturingStage,
    purchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrderStatus,
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    checkProductAvailability
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
