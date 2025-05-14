import React, { useState, useEffect } from 'react';
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
import { SalesOrder, OrderStatus, FinishedProduct, PartialFulfillment, OrderProduct } from '../types';
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
import { fetchSalesOrders, updateSalesOrder, fetchNextOrderNumber, deleteSalesOrder } from '../services/salesOrderService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { productService, Product } from '../services/productService';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

const ViewOrderStatus: React.FC = () => {
  const { finishedProducts, updateSalesOrderStatus, manufacturingBatches, checkProductAvailability, addSalesOrder } = useFactory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isPartialDetailsOpen, setIsPartialDetailsOpen] = useState(false);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<SalesOrder>>({
    orderNumber: `SO-${new Date().getFullYear()}-001`,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    discount: 0,
    gst: 18,
    products: [],
    status: 'pending',
    totalValue: 0
  });
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productQuantity, setProductQuantity] = useState<number>(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderTab, setOrderTab] = useState<'active' | 'history'>('active');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<SalesOrder | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [activeHistoryPage, setActiveHistoryPage] = useState(1);
  const ORDERS_PER_PAGE = 5;
  
  useEffect(() => {
    fetchSalesOrders().then((data) => {
      const mapped = data.map((order: any) => ({
        id: order.sales_order_id || order.id,
        orderNumber: order.order_number,
        date: order.order_date,
        customerName: order.customer_name,
        products: (order.order_items || order.products || []).map((p: any) => {
          return {
            ...p,
            price: p.price || p.unit_price || 0,
            quantity: typeof p.quantity === 'number' ? p.quantity : 0
          };
        }),
        status: order.status,
        totalValue: order.total_amount,
        discount: order.discount,
        gst: order.gst,
        partialFulfillment: order.partialFulfillment || [],
      }));
      setOrders(mapped);
    });
  }, []);
  
  useEffect(() => {
    productService.getAllProducts().then(setProducts);
  }, []);
  
  // Separate active and completed orders
  const activeOrders = orders.filter(order => 
    order.status !== 'completed' && 
    order.status !== 'delivered' && 
    order.status !== 'cancelled'
  );
  
  const historyOrders = orders.filter(order => 
    order.status === 'completed' || 
    order.status === 'delivered' || 
    order.status === 'cancelled'
  );
  
  const filteredActiveOrders = activeOrders.filter(order => {
    const matchesSearch = (order.orderNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });
  
  const filteredHistoryOrders = historyOrders.filter(order => {
    const matchesSearch = (order.orderNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });
  
  // Paginate filtered orders
  const paginatedActiveOrders = filteredActiveOrders.slice((activePage - 1) * ORDERS_PER_PAGE, activePage * ORDERS_PER_PAGE);
  const totalPages = Math.ceil(filteredActiveOrders.length / ORDERS_PER_PAGE);
  
  const paginatedHistoryOrders = filteredHistoryOrders.slice((activeHistoryPage - 1) * ORDERS_PER_PAGE, activeHistoryPage * ORDERS_PER_PAGE);
  const totalHistoryPages = Math.ceil(filteredHistoryOrders.length / ORDERS_PER_PAGE);
  
  // Reset page when filter/search/tab changes
  useEffect(() => {
    setActivePage(1);
  }, [searchTerm, selectedStatus, orderTab]);
  useEffect(() => {
    setActiveHistoryPage(1);
  }, [searchTerm, orderTab]);
  
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

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const updatedOrder = { ...selectedOrder, status: newStatus };
      await updateSalesOrder(selectedOrder.id, updatedOrder as SalesOrder);
      setIsUpdateDialogOpen(false);
      setSelectedOrder(null);
      fetchSalesOrders().then((data) => {
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
        setOrders(mapped);
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Add getStatusBadgeColor for sales order statuses
  const getStatusBadgeColor = (status: OrderStatus) => {
    switch(status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_production':
        return 'bg-blue-100 text-blue-800';
      case 'partially_in_stock':
        return 'bg-amber-100 text-amber-800';
      case 'awaiting_materials':
        return 'bg-red-100 text-red-800';
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-200 text-green-900';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleAddProduct = () => {
    if (selectedProduct && productQuantity > 0) {
      const product = products.find(p => String(p.product_id) === selectedProduct);
      if (product) {
        const orderProduct = {
          productId: String(product.product_id),
          productName: product.product_name,
          productCategory: product.product_code || '',
          quantity: productQuantity,
          price: product.price || 0
        };
        const updatedProducts = [...(newOrder.products || []), orderProduct];
        const totalValue = updatedProducts.reduce((total, p) => total + (p.quantity * (p.price || 0)), 0);
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
    const totalValue = updatedProducts.reduce((total, p) => total + (p.quantity * (p.price || 0)), 0);
    setNewOrder({
      ...newOrder,
      products: updatedProducts,
      totalValue
    });
  };

  const handleOpenCreateOrderDialog = async () => {
    setIsDialogOpen(true);
    // Only fetch if creating a new order
    if (!newOrder.id) {
      const nextOrderNumber = await fetchNextOrderNumber();
      setNewOrder((prev) => ({ ...prev, orderNumber: nextOrderNumber }));
    }
  };

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
        await addSalesOrder(newOrder as Omit<SalesOrder, 'id'>);
        setIsDialogOpen(false);
        resetNewOrder();
        // Refetch orders from backend
        fetchSalesOrders().then((data) => {
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
          setOrders(mapped);
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const resetNewOrder = () => {
    setNewOrder({
      orderNumber: `SO-${new Date().getFullYear()}-001`,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      discount: 0,
      gst: 18,
      products: [],
      status: 'pending',
      totalValue: 0
    });
    setSelectedProduct('');
    setProductQuantity(1);
  };

  const handleEditClick = (order: SalesOrder) => {
    setEditOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleEditOrderChange = (field: keyof SalesOrder, value: any) => {
    if (!editOrder) return;
    setEditOrder({ ...editOrder, [field]: value });
  };

  const handleEditProductChange = (idx: number, field: keyof OrderProduct, value: any) => {
    if (!editOrder) return;
    const updatedProducts = [...editOrder.products];
    updatedProducts[idx] = { ...updatedProducts[idx], [field]: value };
    setEditOrder({ ...editOrder, products: updatedProducts });
  };

  const handleEditAddProduct = () => {
    if (!editOrder) return;
    setEditOrder({
      ...editOrder,
      products: [
        ...editOrder.products,
        { productId: '', productName: '', quantity: 1, price: 0 }
      ]
    });
  };

  const handleEditRemoveProduct = (idx: number) => {
    if (!editOrder) return;
    const updatedProducts = [...editOrder.products];
    updatedProducts.splice(idx, 1);
    setEditOrder({ ...editOrder, products: updatedProducts });
  };

  const handleEditSave = async () => {
    if (!editOrder) return;
    setIsUpdating(true);
    try {
      // Map products to backend expected fields
      const mappedOrder = {
        ...editOrder,
        products: editOrder.products.map((p) => {
          const mapped: any = { ...p };
          mapped.product_id = (p as any).productId || '';
          mapped.product_category = (p as any).productCategory || '';
          mapped.unit_price = p.price || 0;
          mapped.quantity = p.quantity || 0;
          return mapped;
        })
      };
      await updateSalesOrder(editOrder.id, mappedOrder);
      setIsEditDialogOpen(false);
      setEditOrder(null);
      fetchSalesOrders().then((data) => {
        const mapped = data.map((order: any) => ({
          id: order.sales_order_id || order.id,
          orderNumber: order.order_number,
          date: order.order_date,
          customerName: order.customer_name,
          products: (order.order_items || order.products || []).map((p: any) => {
            return {
              ...p,
              price: p.price || p.unit_price || 0,
              quantity: typeof p.quantity === 'number' ? p.quantity : 0
            };
          }),
          status: order.status,
          totalValue: order.total_amount,
          discount: order.discount,
          gst: order.gst,
          partialFulfillment: order.partialFulfillment || [],
        }));
        setOrders(mapped);
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCardStatusChange = async (order: SalesOrder, newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      await updateSalesOrder(order.id, { status: newStatus });
      fetchSalesOrders().then((data) => {
        const mapped = data.map((order: any) => ({
          id: order.sales_order_id || order.id,
          orderNumber: order.order_number,
          date: order.order_date,
          customerName: order.customer_name,
          products: (order.order_items || order.products || []).map((p: any) => {
            return {
              ...p,
              price: p.price || p.unit_price || 0,
              quantity: typeof p.quantity === 'number' ? p.quantity : 0
            };
          }),
          status: order.status,
          totalValue: order.total_amount,
          discount: order.discount,
          gst: order.gst,
          partialFulfillment: order.partialFulfillment || [],
        }));
        setOrders(mapped);
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (order: SalesOrder) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      await deleteSalesOrder(orderToDelete.id);
      setIsDeleteDialogOpen(false);
      setOrderToDelete(null);
      fetchSalesOrders().then((data) => {
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
        setOrders(mapped);
      });
    }
  };
  
  const ProductAvailabilityInfo = ({ productId, quantity, finishedProducts }) => {
    const productInventory = finishedProducts.find(p => String(p.product_id) === String(productId));
    const available = productInventory ? productInventory.quantity_available : 0;
    const ready = Math.min(quantity, available);
    const toManufacture = Math.max(0, quantity - available);
    return (
      <div className="flex gap-2 items-center mt-1">
        {ready > 0 && (
          <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold border border-green-200">
            {ready} Ready
          </span>
        )}
        {toManufacture > 0 && (
          <span className="inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold border border-yellow-200">
            {toManufacture} Manufacturing
          </span>
        )}
        {(ready === 0 && toManufacture === 0) && (
          <span className="inline-block px-2 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold border border-gray-200">
            No stock info
          </span>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-factory-gray-900">Sales Orders</h1>
        <Button 
          onClick={handleOpenCreateOrderDialog}
          className="bg-factory-primary hover:bg-factory-primary/90"
        >
          Add New Order
        </Button>
      </div>
      {/* Search and Filter - move above tab bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-grow">
          <Input 
            placeholder="Search by order number or customer name..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select 
          value={selectedStatus} 
          onValueChange={(val) => setSelectedStatus(val as OrderStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Tab Bar for Active/History */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={orderTab === 'active' ? 'default' : 'outline'}
          className={orderTab === 'active' ? 'bg-factory-primary text-white' : ''}
          onClick={() => setOrderTab('active')}
        >
          Active Orders
        </Button>
        <Button
          variant={orderTab === 'history' ? 'default' : 'outline'}
          className={orderTab === 'history' ? 'bg-factory-primary text-white' : ''}
          onClick={() => setOrderTab('history')}
        >
          Order History
        </Button>
      </div>
      {/* Active Orders Accordion List */}
      {orderTab === 'active' && (
        <div className="bg-white rounded-lg p-2 border">
          <Accordion type="single" collapsible>
            {paginatedActiveOrders.length > 0 ? (
              paginatedActiveOrders.map(order => (
                <AccordionItem key={order.id} value={String(order.id)} className="mb-3 rounded-lg shadow-sm border border-factory-gray-100 hover:shadow-lg transition-shadow bg-white">
                  <AccordionTrigger>
                    <div className="flex w-full justify-between items-center px-4 py-3 group">
                      <div className="flex flex-col">
                        <span className="font-semibold text-lg text-factory-primary underline cursor-pointer group-hover:text-factory-primary-dark transition-colors">
                          {order.orderNumber || <span className='text-gray-400 italic'>No Order #</span>}
                        </span>
                        <span className="text-xs text-factory-primary font-mono tracking-wide">
                          {order.customerName || <span className='text-gray-400 italic'>No Customer</span>}
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm items-center">
                        <span><b>Date:</b> {order.date ? formatDate(order.date) : <span className='text-gray-400'>-</span>}</span>
                        <span><b>Status:</b> <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(order.status)}`}>{getStatusLabel(order.status)}</span></span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-6 bg-gray-50 rounded-b-lg border-t border-gray-200">
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
                          <p className="text-sm text-factory-gray-500">Status</p>
                          <p className="font-medium">{getStatusLabel(order.status)}</p>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Products</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(order.products || []).map((product, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{product.productName || (product as any)["product_name"] || product.productId}</TableCell>
                                  <TableCell>{product.quantity}</TableCell>
                                  <TableCell>{formatCurrency(product.price || 0)}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency((product.quantity || 0) * (product.price || 0))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <div className="pt-2 flex justify-end space-x-2">
                        <Select value={order.status} onValueChange={val => handleCardStatusChange(order, val as OrderStatus)}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(order)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteClick(order)} color="red">
                          Delete
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-lg border">
                <p className="mt-4 text-factory-gray-500">No active orders found.</p>
              </div>
            )}
          </Accordion>
        </div>
      )}
      {/* Order History List (Accordion-based) */}
      {orderTab === 'history' && (
        <div className="bg-white rounded-lg p-2 border">
          <Accordion type="single" collapsible>
            {paginatedHistoryOrders.length > 0 ? (
              paginatedHistoryOrders.map(order => (
                <AccordionItem key={order.id} value={String(order.id)} className="mb-3 rounded-lg shadow-sm border border-factory-gray-100 hover:shadow-lg transition-shadow bg-white">
                  <AccordionTrigger>
                    <div className="flex w-full justify-between items-center px-4 py-3 group">
                      <div className="flex flex-col">
                        <span className="font-semibold text-lg text-factory-primary underline cursor-pointer group-hover:text-factory-primary-dark transition-colors">
                          {order.orderNumber || <span className='text-gray-400 italic'>No Order #</span>}
                        </span>
                        <span className="text-xs text-factory-primary font-mono tracking-wide">
                          {order.customerName || <span className='text-gray-400 italic'>No Customer</span>}
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm items-center">
                        <span><b>Date:</b> {order.date ? formatDate(order.date) : <span className='text-gray-400'>-</span>}</span>
                        <span><b>Status:</b> <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(order.status)}`}>{getStatusLabel(order.status)}</span></span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-6 bg-gray-50 rounded-b-lg border-t border-gray-200">
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
                          <p className="text-sm text-factory-gray-500">Status</p>
                          <p className="font-medium">{getStatusLabel(order.status)}</p>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Products</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(order.products || []).map((product, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{product.productName || (product as any)["product_name"] || product.productId}</TableCell>
                                  <TableCell>{product.quantity}</TableCell>
                                  <TableCell>{formatCurrency(product.price || 0)}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency((product.quantity || 0) * (product.price || 0))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <div className="pt-2 flex justify-end space-x-2">
                        <Select value={order.status} onValueChange={val => handleCardStatusChange(order, val as OrderStatus)}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(order)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteClick(order)} color="red">
                          Delete
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-lg border">
                <p className="mt-4 text-factory-gray-500">No order history found.</p>
              </div>
            )}
            {/* Pagination for order history */}
            {totalHistoryPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                {Array.from({ length: totalHistoryPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`px-3 py-1 rounded border ${activeHistoryPage === i + 1 ? 'bg-factory-primary text-white' : 'bg-white text-factory-primary border-factory-primary'}`}
                    onClick={() => setActiveHistoryPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </Accordion>
        </div>
      )}
      {/* Add Sales Order Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!isProcessing) setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Sales Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                value={newOrder.discount}
                onChange={e => setNewOrder({ ...newOrder, discount: Number(e.target.value) })}
                className="mb-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst">GST (%)</Label>
              <Input
                id="gst"
                type="number"
                value={newOrder.gst}
                onChange={e => setNewOrder({ ...newOrder, gst: Number(e.target.value) })}
                className="mb-4"
              />
            </div>
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
                    {products.map((product) => (
                      <SelectItem key={product.product_id} value={String(product.product_id)}>{product.product_name}</SelectItem>
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
              {selectedProduct && productQuantity > 0 && (
                <ProductAvailabilityInfo
                  productId={selectedProduct}
                  quantity={productQuantity}
                  finishedProducts={finishedProducts}
                />
              )}
              <div className="flex items-end">
                <Button 
                  onClick={handleAddProduct}
                  className="bg-factory-primary hover:bg-factory-primary/90 w-full"
                >
                  Add Product
                </Button>
                    </div>
                    </div>
            {(newOrder.products || []).length > 0 && (
              <div className="border rounded-md p-4">
                <h4 className="font-medium mb-2">Order Products</h4>
                <div className="max-h-[200px] overflow-y-auto">
                  {newOrder.products?.map((product, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{product.productName}</p>
                        <div className="flex gap-2 items-center">
                          <p className="text-sm text-factory-gray-500">
                            {product.quantity} x {formatCurrency(product.price || 0)}
                          </p>
                    </div>
                    </div>
                      <p className="font-medium mr-4">
                        {formatCurrency((product.quantity || 0) * (product.price || 0))}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveProduct(idx)}
                      >
                        X
                      </Button>
                    </div>
                  ))}
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
              {isProcessing ? 'Processing...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            <Select onValueChange={(value) => handleStatusChange(value as OrderStatus)} value={selectedOrder?.status}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {isUpdating && <div className="mt-2 text-blue-600">Updating...</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Sales Order</DialogTitle>
          </DialogHeader>
          {editOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-order-number">Order Number</Label>
                  <Input id="edit-order-number" value={editOrder.orderNumber} onChange={e => handleEditOrderChange('orderNumber', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-order-date">Order Date</Label>
                  <Input id="edit-order-date" type="date" value={editOrder.date} onChange={e => handleEditOrderChange('date', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-customer-name">Customer Name</Label>
                <Input id="edit-customer-name" value={editOrder.customerName} onChange={e => handleEditOrderChange('customerName', e.target.value)} />
              </div>
              <h4 className="font-medium mb-2">Edit Products</h4>
              <div className="space-y-2">
                {editOrder.products.map((product, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <Select
                      value={product.productId}
                      onValueChange={val => handleEditProductChange(idx, 'productId', val)}
                    >
                      <SelectTrigger className="w-1/3">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((prod) => (
                          <SelectItem key={prod.product_id} value={String(prod.product_id)}>{prod.product_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-1/6"
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={e => handleEditProductChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                    />
                    <Input
                      className="w-1/6"
                      type="number"
                      min="0"
                      value={product.price}
                      onChange={e => handleEditProductChange(idx, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="Unit Price"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEditRemoveProduct(idx)}>
                      X
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleEditAddProduct}>
                  Add Product
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} className="bg-factory-primary hover:bg-factory-primary/90" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Order Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sales Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order {orderToDelete?.orderNumber}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewOrderStatus;
