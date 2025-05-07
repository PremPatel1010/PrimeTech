
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
import { SalesOrder, OrderProduct, OrderStatus, PartialFulfillment } from '../types';
import { Plus, FileText, X, AlertCircle, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const SalesOrders: React.FC = () => {
  const { salesOrders, finishedProducts, addSalesOrder, updateSalesOrderStatus, checkProductAvailability } = useFactory();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<SalesOrder>>({
    orderNumber: `SO-${new Date().getFullYear()}-${String(salesOrders.length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    products: [],
    status: 'pending',
    totalValue: 0
  });
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productQuantity, setProductQuantity] = useState<number>(1);
  
  // Filter for active orders only
  const activeOrders = salesOrders.filter(order => 
    order.status !== 'completed' && 
    order.status !== 'delivered' && 
    order.status !== 'cancelled'
  );
  
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
  
  const handleCreateOrder = () => {
    if (
      newOrder.orderNumber && 
      newOrder.customerName && 
      newOrder.products && 
      newOrder.products.length > 0 && 
      typeof newOrder.totalValue === 'number'
    ) {
      addSalesOrder(newOrder as Omit<SalesOrder, 'id'>);
      setIsDialogOpen(false);
      resetNewOrder();
    }
  };
  
  const resetNewOrder = () => {
    setNewOrder({
      orderNumber: `SO-${new Date().getFullYear()}-${String(salesOrders.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      products: [],
      status: 'pending',
      totalValue: 0
    });
    setSelectedProduct('');
    setProductQuantity(1);
  };
  
  const getStatusBadgeStyles = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'partially_in_stock':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'in_production':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      case 'awaiting_materials':
        return 'bg-red-50 text-red-700 hover:bg-red-100';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    }
  };

  // Get status icon component
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'in_production':
        return <div className="h-5 w-5 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-amber-500" />
        </div>;
      case 'pending':
        return <div className="h-5 w-5 rounded-full bg-yellow-400" />;
      case 'partially_in_stock':
        return <div className="h-5 w-5 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-blue-400 border-2 border-amber-400" />
        </div>;
      case 'awaiting_materials':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };
  
  // Get human-readable status label
  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return 'In Stock';
      case 'in_production':
        return 'In Manufacturing';
      case 'pending':
        return 'Pending';
      case 'partially_in_stock':
        return 'Partially In Stock';
      case 'awaiting_materials':
        return 'Awaiting Materials';
      case 'delivered':
        return 'Dispatched';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Calculate partial fulfillment percentage
  const getPartialFulfillmentProgress = (order: SalesOrder) => {
    if (!order.partialFulfillment || order.partialFulfillment.length === 0) {
      return 100; // No partial fulfillment data, assume complete
    }
    
    let totalQuantity = 0;
    let inStockQuantity = 0;
    
    order.partialFulfillment.forEach(item => {
      totalQuantity += item.totalQuantity;
      inStockQuantity += item.inStockQuantity;
    });
    
    return totalQuantity > 0 ? Math.round((inStockQuantity / totalQuantity) * 100) : 0;
  };

  // Check product availability as user selects products
  const getProductAvailabilityStatus = (productId: string, quantity: number) => {
    const product = finishedProducts.find(p => p.id === productId);
    
    if (!product) return { status: 'unavailable', message: 'Product not found' };
    
    if (product.quantity >= quantity) {
      return { 
        status: 'available', 
        message: `${product.quantity} units available` 
      };
    } else if (product.quantity > 0) {
      return { 
        status: 'partial', 
        message: `Only ${product.quantity} of ${quantity} units in stock` 
      };
    } else {
      return { 
        status: 'unavailable', 
        message: 'Not in stock - will be manufactured' 
      };
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-factory-gray-900">Sales Orders</h1>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-factory-primary hover:bg-factory-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Orders List - Only showing active orders */}
      <div className="space-y-4">
        {activeOrders.length > 0 ? (
          activeOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-factory-gray-50 py-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-factory-primary" />
                    <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <Badge 
                      variant="outline" 
                      className={getStatusBadgeStyles(order.status)}
                    >
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-factory-gray-500">Customer</p>
                    <p className="font-medium">{order.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-factory-gray-500">Order Date</p>
                    <p className="font-medium">{formatDate(order.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-factory-gray-500">Total Value</p>
                    <p className="font-medium">{formatCurrency(order.totalValue)}</p>
                  </div>
                </div>
                
                {/* Partial fulfillment indicator */}
                {order.status === 'partially_in_stock' && order.partialFulfillment && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-blue-800">Partial Fulfillment</p>
                      <p className="text-sm text-blue-800">{getPartialFulfillmentProgress(order)}% in stock</p>
                    </div>
                    <Progress 
                      value={getPartialFulfillmentProgress(order)} 
                      className="h-2" 
                    />
                    
                    <div className="mt-2 text-xs text-factory-gray-700">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="font-medium">Total:</span>{' '}
                          {order.partialFulfillment.reduce((sum, p) => sum + p.totalQuantity, 0)} units
                        </div>
                        <div>
                          <span className="font-medium">In Stock:</span>{' '}
                          {order.partialFulfillment.reduce((sum, p) => sum + p.inStockQuantity, 0)} units
                        </div>
                        <div>
                          <span className="font-medium">Manufacturing:</span>{' '}
                          {order.partialFulfillment.reduce((sum, p) => sum + p.manufacturingQuantity, 0)} units
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Awaiting materials alert */}
                {order.status === 'awaiting_materials' && (
                  <div className="mb-4 p-3 bg-red-50 rounded-md border border-red-100">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <p className="text-sm font-medium text-red-800">
                        Raw materials unavailable for manufacturing
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-red-600">
                      This order requires raw materials that are not in stock. Please create purchase orders for the necessary materials.
                    </p>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Products</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-factory-gray-500 border-b">
                        <th className="pb-2">Product</th>
                        <th className="pb-2">Quantity</th>
                        <th className="pb-2">Unit Price</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.products.map((product, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-2">{product.productName}</td>
                          <td className="py-2">{product.quantity}</td>
                          <td className="py-2">{formatCurrency(product.price)}</td>
                          <td className="py-2 text-right">{formatCurrency(product.quantity * product.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {order.status === 'pending' && (
                  <div className="mt-4 flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => updateSalesOrderStatus(order.id, 'cancelled')}
                    >
                      Cancel Order
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-factory-gray-500">No active sales orders yet. Create your first order!</p>
          </div>
        )}
      </div>
      
      {/* Create Order Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                              availability.status === 'partial' ? 'Partial' : 
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
                setIsDialogOpen(false);
                resetNewOrder();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrder}
              className="bg-factory-primary hover:bg-factory-primary/90"
              disabled={!(newOrder.customerName && newOrder.products && newOrder.products.length > 0)}
            >
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOrders;
