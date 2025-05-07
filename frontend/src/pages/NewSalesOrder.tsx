
import React, { useState } from 'react';
import { useFactory } from '../context/FactoryContext';
import { formatCurrency, formatDate } from '../utils/calculations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  SalesOrder, 
  OrderProduct, 
  OrderStatus, 
  PartialFulfillment,
  FinishedProduct,
  ManufacturingBatch,
  BillOfMaterialItem,
  RawMaterialsNeeded
} from '../types';
import { Plus, FileText, X, AlertCircle, Check, Loader } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

const NewSalesOrder: React.FC = () => {
  const { 
    salesOrders, 
    finishedProducts, 
    addSalesOrder, 
    rawMaterials, 
    createManufacturingBatch
  } = useFactory();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<SalesOrder>>({
    orderNumber: `SO-${new Date().getFullYear()}-${String(salesOrders.length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    products: [],
    status: 'pending',
    totalValue: 0,
    isTracked: true // Ensure all new orders are tracked
  });
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productQuantity, setProductQuantity] = useState<number>(1);

  // Handle adding a product to the order
  const handleAddProduct = () => {
    if (selectedProduct && productQuantity > 0) {
      const product = finishedProducts.find(p => p.id === selectedProduct);
      if (product) {
        const orderProduct: OrderProduct = {
          productId: product.id,
          productName: product.name,
          quantity: productQuantity,
          price: product.price
        };
        
        const updatedProducts = [...(newOrder.products || []), orderProduct];
        const totalValue = updatedProducts.reduce((total, p) => total + (p.quantity * p.price), 0);
        
        setNewOrder({
          ...newOrder,
          products: updatedProducts,
          totalValue
        });
        
        setSelectedProduct('');
        setProductQuantity(1);
      }
    }
  };

  // Handle removing a product from the order
  const handleRemoveProduct = (index: number) => {
    const updatedProducts = [...(newOrder.products || [])];
    updatedProducts.splice(index, 1);
    
    const totalValue = updatedProducts.reduce((total, p) => total + (p.quantity * p.price), 0);
    
    setNewOrder({
      ...newOrder,
      products: updatedProducts,
      totalValue
    });
  };

  // Check product availability in stock
  const getProductAvailabilityStatus = (productId: string, quantity: number) => {
    const product = finishedProducts.find(p => p.id === productId);
    
    if (!product) return { status: 'unavailable', message: 'Product not found' };
    
    if (product.quantity >= quantity) {
      return { 
        status: 'available', 
        message: `${product.quantity} units available`,
        availableQuantity: product.quantity 
      };
    } else if (product.quantity > 0) {
      return { 
        status: 'partial', 
        message: `Only ${product.quantity} of ${quantity} units in stock`,
        availableQuantity: product.quantity
      };
    } else {
      return { 
        status: 'unavailable', 
        message: 'Not in stock - will be manufactured',
        availableQuantity: 0  
      };
    }
  };
  
  // Check raw material availability for manufacturing
  const checkRawMaterialAvailability = (product: FinishedProduct, quantity: number) => {
    if (!product.billOfMaterials || product.billOfMaterials.length === 0) {
      return { hasMaterials: true, missingMaterials: [] };
    }
    
    const missingMaterials: RawMaterialsNeeded[] = [];
    let hasSufficientMaterials = true;
    
    product.billOfMaterials.forEach(material => {
      const rawMaterial = rawMaterials.find(rm => rm.id === material.materialId);
      if (!rawMaterial || rawMaterial.quantity < material.quantityRequired * quantity) {
        hasSufficientMaterials = false;
        missingMaterials.push({
          materialId: material.materialId,
          materialName: material.materialName,
          quantityNeeded: material.quantityRequired * quantity,
          quantityAvailable: rawMaterial ? rawMaterial.quantity : 0,
          unit: material.unitOfMeasure,
          isSufficient: false
        });
      }
    });
    
    return { hasMaterials: hasSufficientMaterials, missingMaterials };
  };

  // Process order - handle stock deduction, partial fulfillment, and manufacturing batch creation
  const processOrder = (order: SalesOrder): { 
    status: OrderStatus, 
    partialFulfillment?: PartialFulfillment[],
    manufacturingBatchIds?: string[] 
  } => {
    const partialFulfillment: PartialFulfillment[] = [];
    const manufacturingBatchIds: string[] = [];
    let orderStatus: OrderStatus = 'confirmed'; // Default status if all products are in stock
    
    let hasMissingMaterials = false;
    
    // Process each ordered product
    for (const product of order.products) {
      const availability = getProductAvailabilityStatus(product.productId, product.quantity);
      const finishedProduct = finishedProducts.find(fp => fp.id === product.productId);
      
      if (!finishedProduct) continue;
      
      let inStockQuantity = 0;
      let manufacturingQuantity = 0;
      
      if (availability.status === 'available') {
        // Fully in stock
        inStockQuantity = product.quantity;
      } else if (availability.status === 'partial') {
        // Partially in stock
        inStockQuantity = availability.availableQuantity;
        manufacturingQuantity = product.quantity - availability.availableQuantity;
        orderStatus = 'partially_in_stock';
      } else {
        // Not in stock at all
        manufacturingQuantity = product.quantity;
        if (orderStatus !== 'partially_in_stock') { // Don't overwrite partially_in_stock status
          orderStatus = 'in_production';
        }
      }
      
      // Create partial fulfillment record
      partialFulfillment.push({
        productId: product.productId,
        productName: product.productName,
        totalQuantity: product.quantity,
        inStockQuantity,
        manufacturingQuantity,
        manufacturingBatchIds: []
      });
      
      // Create manufacturing batch for remaining quantity if needed
      if (manufacturingQuantity > 0) {
        // Check raw materials for this product
        const materialAvailability = checkRawMaterialAvailability(finishedProduct, manufacturingQuantity);
        
        // Create manufacturing batch
        const newBatchId = createManufacturingBatch({
          productId: product.productId,
          productName: product.productName,
          quantity: manufacturingQuantity,
          linkedSalesOrderId: order.id,
          status: materialAvailability.hasMaterials ? 'in_progress' : 'awaiting_materials',
          rawMaterialsNeeded: materialAvailability.missingMaterials.length > 0 ? materialAvailability.missingMaterials : undefined
        });
        
        // Update partial fulfillment with batch ID
        const lastIndex = partialFulfillment.length - 1;
        if (partialFulfillment[lastIndex].manufacturingBatchIds) {
          partialFulfillment[lastIndex].manufacturingBatchIds?.push(newBatchId);
        } else {
          partialFulfillment[lastIndex].manufacturingBatchIds = [newBatchId];
        }
        
        manufacturingBatchIds.push(newBatchId);
        
        // Update order status if materials are missing
        if (!materialAvailability.hasMaterials && !hasMissingMaterials) {
          hasMissingMaterials = true;
          orderStatus = 'awaiting_materials';
        }
      }
    }
    
    return {
      status: orderStatus,
      partialFulfillment,
      manufacturingBatchIds: manufacturingBatchIds.length > 0 ? manufacturingBatchIds : undefined
    };
  };
  
  // Create and submit the order
  const handleCreateOrder = async () => {
    if (
      newOrder.orderNumber && 
      newOrder.customerName && 
      newOrder.products && 
      newOrder.products.length > 0 && 
      typeof newOrder.totalValue === 'number'
    ) {
      setIsProcessing(true);
      
      try {
        // Create initial order
        const completeOrder: SalesOrder = {
          id: `order-${Date.now()}`, // Temporary ID, will be replaced by addSalesOrder
          orderNumber: newOrder.orderNumber,
          date: newOrder.date || new Date().toISOString().split('T')[0],
          customerName: newOrder.customerName,
          products: newOrder.products,
          status: 'pending',
          totalValue: newOrder.totalValue,
          isTracked: true
        };
        
        // Process order to handle inventory and manufacturing
        const processingResult = processOrder(completeOrder);
        
        // Update order with processing results
        completeOrder.status = processingResult.status;
        completeOrder.partialFulfillment = processingResult.partialFulfillment;
        
        // Add order to system
        addSalesOrder(completeOrder);
        
        toast({
          title: "Order Created Successfully",
          description: `Order ${completeOrder.orderNumber} has been created with status: ${completeOrder.status}.`,
        });
        
        setIsDialogOpen(false);
        resetNewOrder();
      } catch (error) {
        console.error("Error creating order:", error);
        toast({
          title: "Error Creating Order",
          description: "There was an error processing your order. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };
  
  const resetNewOrder = () => {
    setNewOrder({
      orderNumber: `SO-${new Date().getFullYear()}-${String(salesOrders.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      products: [],
      status: 'pending',
      totalValue: 0,
      isTracked: true
    });
    setSelectedProduct('');
    setProductQuantity(1);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-factory-gray-900">Create New Sales Order</h1>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-factory-primary hover:bg-factory-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium mb-4">Sales Order Process</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 border rounded-md p-4 bg-blue-50">
            <h3 className="font-medium text-blue-800">Full Stock Available</h3>
            <div className="mt-2 text-sm space-y-2">
              <p>✓ Deduct full quantity from inventory</p>
              <p>✓ Mark status as "In Stock"</p>
              <p>✓ Ready for delivery</p>
            </div>
          </div>
          
          <div className="flex-1 border rounded-md p-4 bg-amber-50">
            <h3 className="font-medium text-amber-800">Partial Stock Available</h3>
            <div className="mt-2 text-sm space-y-2">
              <p>✓ Deduct available quantity from inventory</p>
              <p>✓ Create manufacturing batch for remaining</p>
              <p>✓ Mark as "Partially In Stock"</p>
            </div>
          </div>
          
          <div className="flex-1 border rounded-md p-4 bg-red-50">
            <h3 className="font-medium text-red-800">No Stock Available</h3>
            <div className="mt-2 text-sm space-y-2">
              <p>✓ Create manufacturing batch for full quantity</p>
              <p>✓ Check raw material availability</p>
              <p>✓ Mark as "In Manufacturing" or "Need Materials"</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-factory-primary hover:bg-factory-primary/90"
          >
            Start New Sales Order
          </Button>
        </div>
      </div>
      
      {/* Create Order Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!isProcessing) setIsDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Sales Order</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input 
                  id="orderNumber" 
                  value={newOrder.orderNumber} 
                  onChange={(e) => setNewOrder({...newOrder, orderNumber: e.target.value})}
                  placeholder="SO-2023-001"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orderDate">Order Date</Label>
                <Input 
                  id="orderDate" 
                  type="date" 
                  value={newOrder.date} 
                  onChange={(e) => setNewOrder({...newOrder, date: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input 
                id="customerName" 
                value={newOrder.customerName} 
                onChange={(e) => setNewOrder({...newOrder, customerName: e.target.value})}
                placeholder="Customer name"
              />
            </div>
            
            <div className="border-t pt-4 pb-2">
              <h4 className="font-medium mb-2">Add Products</h4>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-3 md:col-span-1 space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Select 
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishedProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    min="1"
                    value={productQuantity} 
                    onChange={(e) => setProductQuantity(parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddProduct}
                    className="bg-factory-primary hover:bg-factory-primary/90 w-full"
                  >
                    Add Product
                  </Button>
                </div>
              </div>
              
              {/* Product availability indicator */}
              {selectedProduct && productQuantity > 0 && (
                <div className="mb-4">
                  {(() => {
                    const availability = getProductAvailabilityStatus(selectedProduct, productQuantity);
                    return (
                      <div className={`text-sm p-2 rounded ${
                        availability.status === 'available' ? 'bg-green-50 text-green-700' : 
                        availability.status === 'partial' ? 'bg-amber-50 text-amber-700' : 
                        'bg-red-50 text-red-700'
                      }`}>
                        {availability.status === 'available' ? (
                          <div className="flex items-center gap-1">
                            <Check className="h-4 w-4" />
                            <span>{availability.message}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            <span>{availability.message}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            
            {/* Product list */}
            {(newOrder.products || []).length > 0 && (
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-2">Order Products</h4>
                <div className="max-h-[200px] overflow-y-auto">
                  {newOrder.products?.map((product, idx) => {
                    const availability = getProductAvailabilityStatus(product.productId, product.quantity);
                    
                    return (
                      <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <div className="flex gap-2 items-center">
                            <p className="text-sm text-factory-gray-500">
                              {product.quantity} x {formatCurrency(product.price)}
                            </p>
                            
                            {/* Product availability badge */}
                            <Badge variant="outline" className={
                              availability.status === 'available' ? 'bg-green-50 text-green-700' : 
                              availability.status === 'partial' ? 'bg-amber-50 text-amber-700 text-xs' : 
                              'bg-red-50 text-red-700 text-xs'
                            }>
                              {availability.status === 'available' ? 'In Stock' : 
                              availability.status === 'partial' ? `${availability.availableQuantity}/${product.quantity} In Stock` : 
                              'Manufacturing Needed'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <p className="font-medium mr-4">
                            {formatCurrency(product.quantity * product.price)}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleRemoveProduct(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-between">
                  <p className="font-medium">Total</p>
                  <p className="font-bold">{formatCurrency(newOrder.totalValue || 0)}</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                if (!isProcessing) {
                  setIsDialogOpen(false);
                  resetNewOrder();
                }
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrder}
              className="bg-factory-primary hover:bg-factory-primary/90"
              disabled={!(newOrder.customerName && newOrder.products && newOrder.products.length > 0) || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Create Order'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewSalesOrder;
