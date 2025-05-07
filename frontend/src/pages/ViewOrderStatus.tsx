
import React, { useState } from 'react';
import { useFactory } from '../context/FactoryContext';
import { formatCurrency, formatDate } from '../utils/calculations';
import { Check, Hammer, Truck, AlertCircle, History } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SalesOrder, OrderStatus, FinishedProduct, PartialFulfillment } from '../types';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const ViewOrderStatus: React.FC = () => {
  const { salesOrders, finishedProducts, updateSalesOrderStatus, manufacturingBatches, checkProductAvailability } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isPartialDetailsOpen, setIsPartialDetailsOpen] = useState(false);
  
  // Separate active and completed orders
  const activeOrders = salesOrders.filter(order => 
    order.status !== 'completed' && 
    order.status !== 'delivered' && 
    order.status !== 'cancelled'
  );
  
  const historyOrders = salesOrders.filter(order => 
    order.status === 'completed' || 
    order.status === 'delivered' || 
    order.status === 'cancelled'
  );
  
  const filteredActiveOrders = activeOrders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });
  
  const filteredHistoryOrders = historyOrders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });
  
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'in_production':
        return <Hammer className="h-5 w-5 text-amber-500" />;
      case 'pending':
        return <div className="h-5 w-5 rounded-full bg-yellow-400" />;
      case 'partially_in_stock':
        return <div className="h-5 w-5 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-blue-400 border-2 border-amber-400" />
        </div>;
      case 'awaiting_materials':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'delivered':
        return <Truck className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <Check className="h-5 w-5 text-green-700" />;
      case 'cancelled':
        return <div className="h-5 w-5 rounded-full bg-red-500" />;
      default:
        return null;
    }
  };
  
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
  
  const getStatusProgress = (status: OrderStatus) => {
    const statuses: OrderStatus[] = ['pending', 'awaiting_materials', 'in_production', 'partially_in_stock', 'confirmed', 'completed', 'delivered'];
    const index = statuses.indexOf(status);
    if (index === -1) return 0;
    return Math.round((index / (statuses.length - 1)) * 100);
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

  const handleUpdateStatus = (order: SalesOrder) => {
    setSelectedOrder(order);
    setIsUpdateDialogOpen(true);
  };

  const showPartialDetails = (order: SalesOrder) => {
    setSelectedOrder(order);
    setIsPartialDetailsOpen(true);
  };

  const checkProductAvailabilityForOrder = (order: SalesOrder): boolean => {
    // Check if all products in the order are available in stock
    return order.products.every(orderProduct => {
      const product = finishedProducts.find(p => p.id === orderProduct.productId);
      return product && product.quantity >= orderProduct.quantity;
    });
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!selectedOrder) return;

    // If trying to mark as confirmed (in stock), check product availability
    if (newStatus === 'confirmed' && !checkProductAvailabilityForOrder(selectedOrder)) {
      // If products not available, automatically set to manufacturing instead
      updateSalesOrderStatus(selectedOrder.id, 'in_production');
      toast({
        title: "Status set to Manufacturing",
        description: "Products are not in stock. Order has been sent to manufacturing."
      });
    } else {
      // Otherwise update to the selected status
      updateSalesOrderStatus(selectedOrder.id, newStatus);
      toast({
        title: "Status Updated",
        description: `Order status changed to ${getStatusLabel(newStatus)}.`
      });
    }
    
    setIsUpdateDialogOpen(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-factory-gray-900">Order Status</h1>
        <div className="flex items-center space-x-2">
          <div className="w-64">
            <Input
              placeholder="Search by order number or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline">Filter by Status</Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="mx-auto w-full max-w-sm">
                <DrawerHeader>
                  <DrawerTitle>Filter Orders by Status</DrawerTitle>
                  <DrawerDescription>
                    Select a status to filter the orders list.
                  </DrawerDescription>
                </DrawerHeader>
                
                <div className="p-4">
                  <RadioGroup 
                    value={selectedStatus} 
                    onValueChange={(value) => setSelectedStatus(value as OrderStatus | 'all')}
                    className="gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all">All Orders</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pending" id="pending" />
                      <Label htmlFor="pending" className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-yellow-400"></div>
                        Pending
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="confirmed" id="confirmed" />
                      <Label htmlFor="confirmed" className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        In Stock
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="in_production" id="in_production" />
                      <Label htmlFor="in_production" className="flex items-center gap-2">
                        <Hammer className="h-4 w-4 text-amber-500" />
                        In Manufacturing
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="partially_in_stock" id="partially_in_stock" />
                      <Label htmlFor="partially_in_stock" className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-blue-400 border-2 border-amber-400"></div>
                        Partially In Stock
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="awaiting_materials" id="awaiting_materials" />
                      <Label htmlFor="awaiting_materials" className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Awaiting Materials
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button>Apply Filter</Button>
                  </DrawerClose>
                </DrawerFooter>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
      
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active Orders</TabsTrigger>
          <TabsTrigger value="history">Order History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-4">
          <div className="bg-white rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActiveOrders.length > 0 ? (
                  filteredActiveOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{formatDate(order.date)}</TableCell>
                      <TableCell>{formatCurrency(order.totalValue)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span>{getStatusLabel(order.status)}</span>
                        </div>
                        
                        {order.status === 'partially_in_stock' && (
                          <div className="mt-1">
                            <div className="flex justify-between text-xs text-blue-700 mb-1">
                              <span>In stock: {getPartialFulfillmentProgress(order)}%</span>
                            </div>
                            <Progress value={getPartialFulfillmentProgress(order)} className="h-1.5" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-factory-primary h-2.5 rounded-full" 
                            style={{ width: `${getStatusProgress(order.status)}%` }}
                          ></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {order.status === 'partially_in_stock' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => showPartialDetails(order)}
                            className="mr-2"
                          >
                            Details
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus(order)}
                        >
                          Update Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                      No active orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <div className="bg-white rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Final Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistoryOrders.length > 0 ? (
                  filteredHistoryOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{formatDate(order.date)}</TableCell>
                      <TableCell>{formatCurrency(order.totalValue)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span>{getStatusLabel(order.status)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                      No order history found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Select a new status for order {selectedOrder?.orderNumber}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select onValueChange={(value) => handleStatusChange(value as OrderStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">In Stock</SelectItem>
                <SelectItem value="in_production">In Manufacturing</SelectItem>
                <SelectItem value="delivered">Dispatched</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {selectedOrder && (
              <div className="mt-4">
                <div className="text-sm text-muted-foreground">
                  {checkProductAvailabilityForOrder(selectedOrder) 
                    ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check className="h-4 w-4" />
                        <span>All products in stock</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600">
                        <Hammer className="h-4 w-4" />
                        <span>Products not available - will be sent to manufacturing</span>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Partial Fulfillment Detail Dialog */}
      <Dialog open={isPartialDetailsOpen} onOpenChange={setIsPartialDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Order Partial Fulfillment Details</DialogTitle>
            <DialogDescription>
              Order {selectedOrder?.orderNumber} - {selectedOrder?.customerName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedOrder && selectedOrder.partialFulfillment && (
              <div className="space-y-4">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Fulfillment:</span>
                  <span>{getPartialFulfillmentProgress(selectedOrder)}%</span>
                </div>
                <Progress value={getPartialFulfillmentProgress(selectedOrder)} className="h-2 mb-4" />
                
                <div className="border rounded-md divide-y">
                  <div className="bg-gray-50 px-4 py-2 grid grid-cols-4 text-sm font-medium">
                    <div>Product</div>
                    <div className="text-center">Total</div>
                    <div className="text-center">In Stock</div>
                    <div className="text-center">Manufacturing</div>
                  </div>
                  
                  {selectedOrder.partialFulfillment.map((item, idx) => (
                    <div key={idx} className="px-4 py-3 grid grid-cols-4 text-sm items-center">
                      <div>{item.productName}</div>
                      <div className="text-center">{item.totalQuantity}</div>
                      <div className="text-center font-medium text-green-700">{item.inStockQuantity}</div>
                      <div className="text-center font-medium text-amber-700">{item.manufacturingQuantity}</div>
                    </div>
                  ))}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Manufacturing Batches</h4>
                  {selectedOrder.partialFulfillment.some(item => 
                    item.manufacturingBatchIds && item.manufacturingBatchIds.length > 0
                  ) ? (
                    <div className="border rounded-md divide-y">
                      {manufacturingBatches
                        .filter(batch => batch.linkedSalesOrderId === selectedOrder.id)
                        .map(batch => (
                          <div key={batch.id} className="p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{batch.productName}</p>
                                <p className="text-xs text-gray-500">Batch: {batch.batchNumber}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm">Quantity: {batch.quantity}</p>
                                <p className="text-xs text-gray-500">
                                  Stage: {batch.currentStage.charAt(0).toUpperCase() + batch.currentStage.slice(1)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-amber-500 h-1.5 rounded-full" 
                                  style={{ width: `${batch.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No manufacturing batches linked to this order.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setIsPartialDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewOrderStatus;
