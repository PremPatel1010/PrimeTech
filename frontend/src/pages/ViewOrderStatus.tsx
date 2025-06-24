import React, { useState, useEffect, useRef } from 'react';
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
import { SalesOrder, OrderStatus, PartialFulfillment, OrderProduct } from '../types';
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
import { fetchSalesOrders, updateSalesOrder, fetchNextOrderNumber, deleteSalesOrder, checkOrderAvailability, createSalesOrder } from '../services/salesOrderService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {  Product, ProductService } from '../services/Product.service';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import axiosInstance from '@/utils/axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { finishedProductService, FinishedProductAPI } from '../services/finishedProduct.service';
import { manufacturingApi, ManufacturingBatch } from '../services/manufacturingApi';
import { InventoryManagementModal } from '@/components/inventory/InventoryManagementModal';

const ViewOrderStatus: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isPartialDetailsOpen, setIsPartialDetailsOpen] = useState(false);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newOrder, setNewOrder] = useState<Omit<SalesOrder, 'id'>>({
    orderNumber: `SO-${new Date().getFullYear()}-001`,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    discount: 0,
    gst: 18,
    products: [],
    status: 'pending',
    totalValue: 0
  });
  // Remove selectedProduct, it will be derived from name and ranges
  // const [selectedProduct, setSelectedProduct] = useState<string>(''); 
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [selectedRatingRange, setSelectedRatingRange] = useState<string>('');
  const [selectedDischargeRange, setSelectedDischargeRange] = useState<string>('');
  const [selectedHeadRange, setSelectedHeadRange] = useState<string>('');
  const [productQuantity, setProductQuantity] = useState<number>(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);
  const [editSelectedProductName, setEditSelectedProductName] = useState<string>('');
  const [editSelectedRatingRange, setEditSelectedRatingRange] = useState<string>('');
  const [editSelectedDischargeRange, setEditSelectedDischargeRange] = useState<string>('');
  const [editSelectedHeadRange, setEditSelectedHeadRange] = useState<string>('');
  const [editProductQuantity, setEditProductQuantity] = useState<number>(1);
  const [isUpdating, setIsUpdating] = useState(false);
  const [orderTab, setOrderTab] = useState<'active' | 'history'>('active');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<SalesOrder | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [activeHistoryPage, setActiveHistoryPage] = useState(1);
  const ORDERS_PER_PAGE = 5;
  const [partialDialogOpen, setPartialDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const [pendingSuggestedQty, setPendingSuggestedQty] = useState<number | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [availabilityInfo, setAvailabilityInfo] = useState<any[]>([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [currentInventoryProduct, setCurrentInventoryProduct] = useState<{
    productId: string;
    productName: string;
    requestedQuantity: number;
    availableInStock: number;
    maxManufacturableQuantity: number;
  } | null>(null);
  
  // Fetch finished products
  const { data: finishedProducts = [], isLoading: isLoadingFinishedProducts } = useQuery<FinishedProductAPI[]>({
    queryKey: ['finishedProducts'],
    queryFn: finishedProductService.getAll,
  });

  // Fetch manufacturing batches
  const { data: manufacturingBatches = [], isLoading: isLoadingManufacturingBatches } = useQuery<ManufacturingBatch[]>({
    queryKey: ['manufacturingBatches'],
    queryFn: manufacturingApi.getAllBatches,
  });

  // Replace the useEffect for fetching sales orders with a React Query hook
  const { data: ordersData = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: fetchSalesOrders,
    refetchInterval: 5000, // Poll every 5 seconds
    refetchIntervalInBackground: true, // Continue polling even when tab is not active
    staleTime: 0, // Consider data stale immediately
  });

  // Update the orders state when data changes
  useEffect(() => {
    if (ordersData) {
      const mapped = ordersData.map((order: any) => ({
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
    }
  }, [ordersData]);
  
  useEffect(() => {
    ProductService.getAllProducts().then(response => setProducts(response.data));
    console.log(products);
  }, []);
  
  // Separate active and completed orders
  const activeOrders = orders?.filter(order => 
    order.status !== 'completed' && 
    order.status !== 'delivered' && 
    order.status !== 'cancelled'
  ) || [];
  
  const historyOrders = orders?.filter(order => 
    order.status === 'completed' || 
    order.status === 'delivered' || 
    order.status === 'cancelled'
  ) || [];
  
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
    return order.products.every(orderProduct => {
      const product = finishedProducts.find(p => String(p.product_id) === String(orderProduct.productId));
      return product && product.quantity_available >= orderProduct.quantity;
    });
  };

  // Update the handleStatusChange mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string, newStatus: OrderStatus }) => 
      updateSalesOrder(orderId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setIsUpdateDialogOpen(false);
      setSelectedOrder(null);
      toast({
        title: 'Success',
        description: 'Order status updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update order status',
        variant: 'destructive',
      });
    }
  });

  // Update the handleStatusChange function
  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return;
    updateStatusMutation.mutate({ orderId: selectedOrder.id, newStatus });
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
  
  const handleAddProduct = async () => {
    if (selectedProductName && productQuantity > 0 && selectedRatingRange && selectedDischargeRange && selectedHeadRange) {
      const product = products.find(
        p => p.name === selectedProductName &&
             p.ratingRange === selectedRatingRange &&
             p.dischargeRange === selectedDischargeRange &&
             p.headRange === selectedHeadRange
      );

      if (product) {
        // Check availability first
        const orderData = {
          items: [{
            product_id: product.id,
            quantity: productQuantity,
            unit_price: product.price || 0
          }]
        };

        const availabilityResult = await checkOrderAvailability(orderData);
        console.log(availabilityResult)
        const productAvailability = availabilityResult.availability_results?.[0] || availabilityResult;

        // Show inventory management modal if product needs manufacturing
        if (productAvailability.available_in_stock < productQuantity) {
          setCurrentInventoryProduct({
            productId: product.id,
            productName: product.name,
            requestedQuantity: productQuantity,
            availableInStock: productAvailability.available_in_stock,
            maxManufacturableQuantity: productAvailability.max_manufacturable_quantity || 0
          });
          setIsInventoryModalOpen(true);
          return;
        }

        // If all available in stock, add directly
        addProductToOrder({
          productId: product.id,
          productName: product.name,
          productCategory: product.category,
          quantity: productQuantity,
          price: product.price || 0,
          ratingRange: product.ratingRange,
          dischargeRange: product.dischargeRange,
          headRange: product.headRange,
        });
        setSelectedProductName('');
        setSelectedRatingRange('');
        setSelectedDischargeRange('');
        setSelectedHeadRange('');
        setProductQuantity(1);
      } else {
        toast({
          title: "Cannot Add Product",
          description: "Please select a complete product variation.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Missing Information",
        description: "Please select a product and enter a quantity.",
        variant: "destructive"
      });
    }
  };

  const handleInventoryConfirm = async (stockDeduction: number, manufacturingQuantity: number) => {
    if (!currentInventoryProduct) return;

    const product = products.find(p => p.id === currentInventoryProduct.productId);
    if (!product) return;

    // Add product with specified quantities
    addProductToOrder({
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      quantity: stockDeduction + manufacturingQuantity,
      price: product.price || 0,
      ratingRange: product.ratingRange,
      dischargeRange: product.dischargeRange,
      headRange: product.headRange,
      stockDeduction,
      manufacturingQuantity
    });

    // Reset form and close modal
    setSelectedProductName('');
    setSelectedRatingRange('');
    setSelectedDischargeRange('');
    setSelectedHeadRange('');
    setProductQuantity(1);
    setCurrentInventoryProduct(null);
    setIsInventoryModalOpen(false);
  };

  const addProductToOrder = (orderProduct: any) => {
    if (!orderProduct.quantity || orderProduct.quantity <= 0) {
      // Allow adding if the intent is to manufacture (i.e., quantity requested > 0)
      if (productQuantity > 0) {
        orderProduct.quantity = productQuantity;
      } else {
        toast({
          title: "Cannot Add Product",
          description: "Quantity must be greater than 0.",
          variant: "destructive"
        });
        setPendingProduct(null);
        setPendingSuggestedQty(null);
        setPartialDialogOpen(false);
        return;
      }
    }
    const updatedProducts = [...(newOrder.products || []), orderProduct];
    const totalValue = updatedProducts.reduce((total, p) => total + (p.quantity * (p.price || 0)), 0);
    setNewOrder({
      ...newOrder,
      products: updatedProducts,
      totalValue
    });
    toast({
      title: "Product Added",
      description: `${orderProduct.productName} ${orderProduct.ratingRange ? `(${orderProduct.ratingRange} HP)` : ''} added to order.`
    });
    setTimeout(() => addButtonRef.current?.focus(), 100);
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
    const nextOrderNumber = await fetchNextOrderNumber();
    setNewOrder((prev) => ({ ...prev, orderNumber: nextOrderNumber }));
    // Reset selected product fields when opening the dialog
    setSelectedProductName('');
    setSelectedRatingRange('');
    setSelectedDischargeRange('');
    setSelectedHeadRange('');
    setProductQuantity(1);
  };

  // Update the handleCreateOrder mutation
  const createOrderMutation = useMutation({
    
    mutationFn: (orderData: Omit<SalesOrder, 'id'>) => createSalesOrder(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setIsDialogOpen(false);
      resetNewOrder();
      toast({
        title: "Success",
        description: "Sales order created successfully"
      });
    },
    onError: (error: any) => {
      console.error("Error creating sales order:", error);
      toast({
        title: "Error",
        description: "Failed to create sales order",
        variant: "destructive"
      });
    }
  });

  // Update the handleCreateOrder function
  const handleCreateOrder = async () => {
    if (
      newOrder.orderNumber &&
      newOrder.customerName &&
      newOrder.products &&
      newOrder.products.length > 0
    ) {
      // Validate that all products have valid prices
      const invalidProducts = newOrder.products.filter(p => !p.price || p.price <= 0);
      if (invalidProducts.length > 0) {
        toast({
          title: "Invalid Product Prices",
          description: "All products must have a valid price greater than 0.",
          variant: "destructive"
        });
        return;
      }

      setIsProcessing(true);
      try {
        // --- FIX: Ensure stockDeduction/manufacturingQuantity are always set ---
        const fixedProducts = newOrder.products.map((p) => {
          let stockDeduction = typeof p.stockDeduction === 'number' ? p.stockDeduction : 0;
          let manufacturingQuantity = typeof p.manufacturingQuantity === 'number' ? p.manufacturingQuantity : 0;
          // If both are zero, try to auto-assign based on available stock
          if (stockDeduction + manufacturingQuantity !== p.quantity) {
            // Find available stock for this product
            const finishedProduct = finishedProducts.find(fp => String(fp.product_id) === String(p.productId));
            const availableInStock = finishedProduct ? finishedProduct.quantity_available : 0;
            stockDeduction = Math.min(p.quantity, availableInStock);
            manufacturingQuantity = Math.max(0, p.quantity - stockDeduction);
          }
          return {
            ...p,
            stockDeduction,
            manufacturingQuantity
          };
        });
        // --- END FIX ---

        const orderData = {
          order_number: newOrder.orderNumber,
          order_date: newOrder.date,
          customer_name: newOrder.customerName,
          discount: newOrder.discount || 0,
          gst: newOrder.gst || 18,
          total_amount: newOrder.totalValue,
          status: newOrder.status || 'pending',
          items: fixedProducts.map(p => ({
            product_id: p.productId,
            product_category: p.productCategory,
            quantity: p.quantity,
            unit_price: Number(p.price),
            rating_range: p.ratingRange,
            discharge_range: p.dischargeRange,
            head_range: p.headRange,
            stock_deduction: p.stockDeduction,
            manufacturing_quantity: p.manufacturingQuantity
          }))
        };
        console.log('Sending order data:', orderData);

        const availabilityResult = await checkOrderAvailability(orderData);
        
        if (!availabilityResult.overall_status?.can_fulfill_partially) {
          toast({
            title: "Warning",
            description: "Order can only be partially fulfilled due to insufficient stock and materials.",
            variant: "default"
          });
        }

        if (!availabilityResult.overall_status?.can_fulfill_completely) {
          toast({
            title: "Order Partially Fulfilled",
            description: "This order can only be partially fulfilled due to raw material constraints. The available quantity will be manufactured, and the order will continue.",
            variant: "default"
          });
        }

        // Calculate total value, discount, and GST before creating order
        const calculatedTotalValue = fixedProducts.reduce((total, p) => total + (p.quantity * Number(p.price)), 0);
        const finalTotalValue = calculatedTotalValue * (1 - (newOrder.discount || 0) / 100) * (1 + (newOrder.gst || 0) / 100);

        // Create the order with the same data structure as orderData
        createOrderMutation.mutate({
          orderNumber: orderData.order_number,
          date: orderData.order_date,
          customerName: orderData.customer_name,
          discount: orderData.discount,
          gst: orderData.gst,
          status: orderData.status,
          totalValue: finalTotalValue,
          products: fixedProducts.map(p => ({
            productId: p.productId,
            productName: p.productName,
            productCategory: p.productCategory,
            quantity: p.quantity,
            price: Number(p.price),
            ratingRange: p.ratingRange,
            dischargeRange: p.dischargeRange,
            headRange: p.headRange,
            stockDeduction: p.stockDeduction,
            manufacturingQuantity: p.manufacturingQuantity
          }))
        });
       
      } catch (error) {
        console.error("Error checking availability:", error);
        toast({
          title: "Error",
          description: "Failed to check order availability",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      toast({
        title: "Missing Information",
        description: "Please fill in all required order details and add at least one product.",
        variant: "destructive"
      });
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
    setSelectedProductName('');
    setSelectedRatingRange('');
    setSelectedDischargeRange('');
    setSelectedHeadRange('');
    setProductQuantity(1);
  };

  const handleEditClick = (order: SalesOrder) => {
    setEditOrder(order);
    setIsEditDialogOpen(true);
    // Populate edit dialog dropdowns
    if (order.products.length > 0) {
      const firstProduct = order.products[0];
      setEditSelectedProductName(firstProduct.productName);
      setEditSelectedRatingRange(firstProduct.ratingRange || '');
      setEditSelectedDischargeRange(firstProduct.dischargeRange || '');
      setEditSelectedHeadRange(firstProduct.headRange || '');
      setEditProductQuantity(firstProduct.quantity);
    }
  };

  const handleEditOrderChange = (field: keyof SalesOrder, value: any) => {
    if (!editOrder) return;
    setEditOrder({ ...editOrder, [field]: value });
  };

  const handleEditProductChange = (idx: number, field: keyof OrderProduct, value: any) => {
    if (!editOrder) return;
    const updatedProducts = [...editOrder.products];
    updatedProducts[idx] = { ...updatedProducts[idx], [field]: value };
    // Recalculate total value when product details change
    const totalValue = updatedProducts.reduce((total, p) => total + (p.quantity * (p.price || 0)), 0);
    const finalTotalValue = totalValue * (1 - (editOrder.discount || 0) / 100) * (1 + (editOrder.gst || 0) / 100);
    setEditOrder({ ...editOrder, products: updatedProducts, totalValue: finalTotalValue });
  };

  const handleEditAddProduct = (newProduct: OrderProduct) => {
    if (!editOrder) return;
    setEditOrder({
      ...editOrder,
      products: [
        ...editOrder.products,
        newProduct
      ]
    });
  };

  const handleEditRemoveProduct = (idx: number) => {
    if (!editOrder) return;
    const updatedProducts = [...editOrder.products];
    updatedProducts.splice(idx, 1);
    // Recalculate total value when product is removed
    const totalValue = updatedProducts.reduce((total, p) => total + (p.quantity * (p.price || 0)), 0);
    const finalTotalValue = totalValue * (1 - (editOrder.discount || 0) / 100) * (1 + (editOrder.gst || 0) / 100);
    setEditOrder({ ...editOrder, products: updatedProducts, totalValue: finalTotalValue });
  };

  // Memoized lists for cascading dropdowns for Edit Sales Order
  const editUniqueProductNames = React.useMemo(() => {
    const names = new Set<string>();
    products.forEach(p => names.add(p.name));
    return Array.from(names);
  }, [products]);

  const editFilteredRatingRanges = React.useMemo(() => {
    if (!editSelectedProductName) return [];
    const ranges = new Set<string>();
    products.filter(p => p.name === editSelectedProductName && p.ratingRange)
      .forEach(p => p.ratingRange && ranges.add(p.ratingRange));
    return Array.from(ranges);
  }, [products, editSelectedProductName]);

  const editFilteredDischargeRanges = React.useMemo(() => {
    if (!editSelectedProductName || !editSelectedRatingRange) return [];
    const ranges = new Set<string>();
    products.filter(p => p.name === editSelectedProductName && p.ratingRange === editSelectedRatingRange && p.dischargeRange)
      .forEach(p => p.dischargeRange && ranges.add(p.dischargeRange));
    return Array.from(ranges);
  }, [products, editSelectedProductName, editSelectedRatingRange]);

  const editFilteredHeadRanges = React.useMemo(() => {
    if (!editSelectedProductName || !editSelectedRatingRange || !editSelectedDischargeRange) return [];
    const ranges = new Set<string>();
    products.filter(p => 
      p.name === editSelectedProductName && 
      p.ratingRange === editSelectedRatingRange && 
      p.dischargeRange === editSelectedDischargeRange &&
      p.headRange
    ).forEach(p => p.headRange && ranges.add(p.headRange));
    return Array.from(ranges);
  }, [products, editSelectedProductName, editSelectedRatingRange, editSelectedDischargeRange]);

  // Update the handleEditSave mutation
  const editOrderMutation = useMutation({
    mutationFn: ({ orderId, orderData }: { orderId: string, orderData: Partial<SalesOrder> }) => 
      updateSalesOrder(orderId, orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setIsEditDialogOpen(false);
      setEditOrder(null);
      toast({
        title: "Success",
        description: "Sales order updated successfully"
      });
    },
    onError: (error: any) => {
      console.error("Error updating sales order:", error);
      toast({
        title: "Error",
        description: "Failed to update sales order",
        variant: "destructive"
      });
    }
  });

  const handleEditSave = async () => {
    if (editOrder) {
      setIsUpdating(true);
      try {
        const orderData = {
          items: editOrder.products.map(p => ({
            product_id: p.productId,
            quantity: p.quantity,
            unit_price: p.price,
            rating_range: p.ratingRange,
            discharge_range: p.dischargeRange,
            head_range: p.headRange,
          })),
          status: editOrder.status,
          totalValue: editOrder.totalValue,
          partialFulfillment: editOrder.partialFulfillment,
        };

        const availabilityResult = await checkOrderAvailability(orderData);

        if (!availabilityResult.overall_status.can_fulfill_partially) {
          toast({
            title: "Warning",
            description: "Order can only be partially fulfilled due to insufficient stock and materials.",
            variant: "default"
          });
        }

        if (!availabilityResult.overall_status.can_fulfill_completely) {
          toast({
            title: "Order Partially Fulfilled",
            description: "This order can only be partially fulfilled due to raw material constraints. The available quantity will be manufactured, and the order will continue.",
            variant: "default"
          });
        }

        const calculatedTotalValue = editOrder.products.reduce((total, p) => total + (p.quantity * (p.price || 0)), 0);
        const finalTotalValue = calculatedTotalValue * (1 - (editOrder.discount || 0) / 100) * (1 + (editOrder.gst || 0) / 100);

        editOrderMutation.mutate({
          orderId: editOrder.id,
          orderData: {
            ...editOrder,
            totalValue: finalTotalValue,
            products: editOrder.products.map(p => ({
              productId: p.productId,
              productName: p.productName,
              productCategory: p.productCategory,
              quantity: p.quantity,
              price: p.price,
              ratingRange: p.ratingRange,
              dischargeRange: p.dischargeRange,
              headRange: p.headRange,
            })),
          }
        });
      } catch (error) {
        console.error("Error updating sales order:", error);
        toast({
          title: "Error",
          description: "Failed to update sales order",
          variant: "destructive"
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleCardStatusChange = async (order: SalesOrder, newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      await updateSalesOrder(order.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      toast({
        title: "Success",
        description: "Order status updated successfully"
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (order: SalesOrder) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  };

  // Update the handleDeleteConfirm mutation
  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: string) => deleteSalesOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setIsDeleteDialogOpen(false);
      setOrderToDelete(null);
      toast({
        title: "Success",
        description: "Sales order deleted successfully"
      });
    },
    onError: (error: any) => {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete sales order",
        variant: "destructive"
      });
    }
  });

  // Update the handleDeleteConfirm function
  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      deleteOrderMutation.mutate(orderToDelete.id);
    } else {
      toast({
        title: "Error",
        description: "No order selected for deletion",
        variant: "destructive"
      });
    }
  };
  
  const ProductAvailabilityInfo = ({ productId, quantity }) => {
    console.log(finishedProducts);
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
  
  // Watch for changes in newOrder.products and update availability info
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!newOrder.products || newOrder.products.length === 0) {
        setAvailabilityInfo([]);
        return;
      }
      try {
        const orderData = {
          items: newOrder.products.map(p => ({
            product_id: p.productId,
            quantity: p.quantity,
            unit_price: p.price || 0
          }))
        };
        const result = await checkOrderAvailability(orderData);
        setAvailabilityInfo(result.availability_results || result);
      } catch (error) {
        console.error("Error fetching availability info:", error);
        setAvailabilityInfo([]);
      }
    };
    fetchAvailability();
  }, [newOrder.products, finishedProducts]);
  
  // Memoized lists for cascading dropdowns for Create New Sales Order
  const uniqueProductNames = React.useMemo(() => {
    const names = new Set<string>();
    products.forEach(p => names.add(p.name));
    return Array.from(names);
  }, [products]);

  const filteredRatingRanges = React.useMemo(() => {
    if (!selectedProductName) return [];
    const ranges = new Set<string>();
    products.filter(p => p.name === selectedProductName && p.ratingRange)
      .forEach(p => p.ratingRange && ranges.add(p.ratingRange));
    return Array.from(ranges);
  }, [products, selectedProductName]);

  const filteredDischargeRanges = React.useMemo(() => {
    if (!selectedProductName || !selectedRatingRange) return [];
    const ranges = new Set<string>();
    products.filter(p => p.name === selectedProductName && p.ratingRange === selectedRatingRange && p.dischargeRange)
      .forEach(p => p.dischargeRange && ranges.add(p.dischargeRange));
    return Array.from(ranges);
  }, [products, selectedProductName, selectedRatingRange]);

  const filteredHeadRanges = React.useMemo(() => {
    if (!selectedProductName || !selectedRatingRange || !selectedDischargeRange) return [];
    const ranges = new Set<string>();
    products.filter(p => 
      p.name === selectedProductName && 
      p.ratingRange === selectedRatingRange && 
      p.dischargeRange === selectedDischargeRange &&
      p.headRange
    ).forEach(p => p.headRange && ranges.add(p.headRange));
    return Array.from(ranges);
  }, [products, selectedProductName, selectedRatingRange, selectedDischargeRange]);

  // Add loading state to the UI
  if (isLoadingOrders) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-factory-primary mx-auto"></div>
          <p className="mt-4 text-factory-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 order-status-main-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="order-status-header-row w-full justify-between">
          <h1 className="text-2xl font-bold text-factory-gray-900">Sales Orders</h1>
          <Button 
            onClick={handleOpenCreateOrderDialog}
            className="bg-factory-primary hover:bg-factory-primary/90"
          >
            Add New Order
          </Button>
        </div>
      </div>
      <div className="order-status-search-filter-row">
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
      <div className="order-status-tab-bar flex flex-row gap-2 sm:gap-4 mb-6">
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
      {orderTab === 'active' && (
        <div className="bg-white rounded-lg p-2 border">
          <Accordion type="single" collapsible>
            {paginatedActiveOrders.length > 0 ? (
              paginatedActiveOrders.map(order => (
                <AccordionItem key={order.id} value={String(order.id)} className="mb-3 rounded-lg shadow-sm border border-factory-gray-100 hover:shadow-lg transition-shadow bg-white">
                  <AccordionTrigger>
                    <div className="order-status-accordion-trigger group">
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
                      <div className="order-status-order-details-grid">
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
                        <div className="order-status-table-scroll">
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
          {totalPages > 1 && (
            <div className="order-status-pagination">
              <button
                className={`px-3 py-1 rounded border ${activePage === 1 ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
                onClick={() => activePage > 1 && setActivePage(activePage - 1)}
                disabled={activePage === 1}
                aria-label="Previous Page"
              >
                &#60;
              </button>
              <span className="px-2 py-1 text-sm text-gray-700">{activePage} <span className="mx-1">of</span> {totalPages}</span>
              <button
                className={`px-3 py-1 rounded border ${activePage === totalPages ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
                onClick={() => activePage < totalPages && setActivePage(activePage + 1)}
                disabled={activePage === totalPages}
                aria-label="Next Page"
              >
                &#62;
              </button>
            </div>
          )}
        </div>
      )}
      {orderTab === 'history' && (
        <div className="bg-white rounded-lg p-2 border">
          <Accordion type="single" collapsible>
            {paginatedHistoryOrders.length > 0 ? (
              paginatedHistoryOrders.map(order => (
                <AccordionItem key={order.id} value={String(order.id)} className="mb-3 rounded-lg shadow-sm border border-factory-gray-100 hover:shadow-lg transition-shadow bg-white">
                  <AccordionTrigger>
                    <div className="order-status-accordion-trigger group">
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
                      <div className="order-status-order-details-grid">
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
                        <div className="order-status-table-scroll">
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
                <p className="mt-4 text-factory-gray-500">No history orders found.</p>
              </div>
            )}
          </Accordion>
          {totalHistoryPages > 1 && (
            <div className="order-status-pagination">
              <button
                className={`px-3 py-1 rounded border ${activeHistoryPage === 1 ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
                onClick={() => activeHistoryPage > 1 && setActiveHistoryPage(activeHistoryPage - 1)}
                disabled={activeHistoryPage === 1}
                aria-label="Previous Page"
              >
                &#60;
              </button>
              <span className="px-2 py-1 text-sm text-gray-700">{activeHistoryPage} <span className="mx-1">of</span> {totalHistoryPages}</span>
              <button
                className={`px-3 py-1 rounded border ${activeHistoryPage === totalHistoryPages ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
                onClick={() => activeHistoryPage < totalHistoryPages && setActiveHistoryPage(activeHistoryPage + 1)}
                disabled={activeHistoryPage === totalHistoryPages}
                aria-label="Next Page"
              >
                &#62;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create New Sales Order Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        // Do NOT resetNewOrder here; only reset after successful order creation or explicit cancel
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Sales Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="orderNumber" className="text-right">Order Number</Label>
              <Input id="orderNumber" value={newOrder.orderNumber} readOnly className="col-span-3 bg-gray-100" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="orderDate" className="text-right">Order Date</Label>
              <Input id="orderDate" type="date" value={newOrder.date} onChange={(e) => setNewOrder({ ...newOrder, date: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customerName" className="text-right">Customer Name</Label>
              <Input id="customerName" value={newOrder.customerName} onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input id="discount" type="number" value={newOrder.discount} onChange={(e) => setNewOrder({ ...newOrder, discount: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gst">GST (%)</Label>
              <Input id="gst" type="number" value={newOrder.gst} onChange={(e) => setNewOrder({ ...newOrder, gst: Number(e.target.value) })} />
            </div>

            <h4 className="font-semibold mt-4">Add Products</h4>
            <div className="flex flex-col gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="productName">Product Name</Label>
                <Select
                  value={selectedProductName}
                  onValueChange={(value) => {
                    setSelectedProductName(value);
                    setSelectedRatingRange('');
                    setSelectedDischargeRange('');
                    setSelectedHeadRange('');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select product name" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueProductNames.map(name => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProductName && ( 
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="ratingRange">HP Rating</Label>
                  <Select
                    value={selectedRatingRange}
                    onValueChange={(value) => {
                      setSelectedRatingRange(value);
                      setSelectedDischargeRange('');
                      setSelectedHeadRange('');
                    }}
                    disabled={!selectedProductName || filteredRatingRanges.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select HP rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRatingRanges.map(range => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedProductName && selectedRatingRange && (
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="dischargeRange">Discharge Range</Label>
                  <Select
                    value={selectedDischargeRange}
                    onValueChange={(value) => {
                      setSelectedDischargeRange(value);
                      setSelectedHeadRange('');
                    }}
                    disabled={!selectedRatingRange || filteredDischargeRanges.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select discharge range" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDischargeRanges.map(range => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedProductName && selectedRatingRange && selectedDischargeRange && (
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="headRange">Head Range</Label>
                  <Select
                    value={selectedHeadRange}
                    onValueChange={setSelectedHeadRange}
                    disabled={!selectedDischargeRange || filteredHeadRanges.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select head range" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredHeadRanges.map(range => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(Number(e.target.value))}
                  min={1}
                />
              </div>
              <Button
                onClick={handleAddProduct}
                disabled={!selectedProductName || !selectedRatingRange || !selectedDischargeRange || !selectedHeadRange || productQuantity <= 0 || isProcessing}
                className="bg-factory-primary hover:bg-factory-primary/90"
              >
                Add Product
              </Button>
            </div>
            {newOrder.products && newOrder.products.length > 0 && (
              <div className="w-full mt-4">
                <h4 className="font-semibold mb-2">Products in this order:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>HP Rating</TableHead>
                      <TableHead>Discharge Range</TableHead>
                      <TableHead>Head Range</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newOrder.products.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell>{product.productName}</TableCell>
                        <TableCell>{product.ratingRange || 'N/A'}</TableCell>
                        <TableCell>{product.dischargeRange || 'N/A'}</TableCell>
                        <TableCell>{product.headRange || 'N/A'}</TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="destructive" size="sm" onClick={() => handleRemoveProduct(index)}>
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-right font-bold text-lg mt-4">
                  Total Value: {formatCurrency(newOrder.totalValue)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetNewOrder(); setIsDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleCreateOrder} disabled={newOrder.products.length === 0 || isProcessing} className="bg-factory-primary hover:bg-factory-primary/90">
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Sales Order</DialogTitle>
          </DialogHeader>
          {editOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editOrderNumber" className="text-right">Order Number</Label>
                <Input id="editOrderNumber" value={editOrder.orderNumber} onChange={(e) => handleEditOrderChange('orderNumber', e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDate" className="text-right">Order Date</Label>
                <Input id="editDate" type="date" value={editOrder.date} onChange={(e) => handleEditOrderChange('date', e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editCustomerName" className="text-right">Customer Name</Label>
                <Input id="editCustomerName" value={editOrder.customerName} onChange={(e) => handleEditOrderChange('customerName', e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDiscount" className="text-right">Discount (%)</Label>
                <Input id="editDiscount" type="number" value={editOrder.discount} onChange={(e) => handleEditOrderChange('discount', Number(e.target.value))} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editGst" className="text-right">GST (%)</Label>
                <Input id="editGst" type="number" value={editOrder.gst} onChange={(e) => handleEditOrderChange('gst', Number(e.target.value))} className="col-span-3" />
              </div>

              <h4 className="font-semibold mt-4">Products</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>HP Rating</TableHead>
                    <TableHead>Discharge Range</TableHead>
                    <TableHead>Head Range</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editOrder.products.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>{product.productName}</TableCell>
                      <TableCell>{product.ratingRange || 'N/A'}</TableCell>
                      <TableCell>{product.dischargeRange || 'N/A'}</TableCell>
                      <TableCell>{product.headRange || 'N/A'}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={product.quantity}
                          onChange={(e) => handleEditProductChange(index, 'quantity', Number(e.target.value))}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={product.price}
                          onChange={(e) => handleEditProductChange(index, 'price', Number(e.target.value))}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" onClick={() => handleEditRemoveProduct(index)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col gap-2">
                        <Select
                          value={editSelectedProductName}
                          onValueChange={(value) => {
                            setEditSelectedProductName(value);
                            setEditSelectedRatingRange('');
                            setEditSelectedDischargeRange('');
                            setEditSelectedHeadRange('');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product name" />
                          </SelectTrigger>
                          <SelectContent>
                            {editUniqueProductNames.map(name => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {editSelectedProductName && (
                          <Select
                            value={editSelectedRatingRange}
                            onValueChange={(value) => {
                              setEditSelectedRatingRange(value);
                              setEditSelectedDischargeRange('');
                              setEditSelectedHeadRange('');
                            }}
                            disabled={!editSelectedProductName || editFilteredRatingRanges.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select HP rating" />
                            </SelectTrigger>
                            <SelectContent>
                              {editFilteredRatingRanges.map(range => (
                                <SelectItem key={range} value={range}>
                                  {range}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {editSelectedProductName && editSelectedRatingRange && (
                          <Select
                            value={editSelectedDischargeRange}
                            onValueChange={(value) => {
                              setEditSelectedDischargeRange(value);
                              setEditSelectedHeadRange('');
                            }}
                            disabled={!editSelectedRatingRange || editFilteredDischargeRanges.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select discharge range" />
                            </SelectTrigger>
                            <SelectContent>
                              {editFilteredDischargeRanges.map(range => (
                                <SelectItem key={range} value={range}>
                                  {range}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {editSelectedProductName && editSelectedRatingRange && editSelectedDischargeRange && (
                          <Select
                            value={editSelectedHeadRange}
                            onValueChange={setEditSelectedHeadRange}
                            disabled={!editSelectedDischargeRange || editFilteredHeadRanges.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select head range" />
                            </SelectTrigger>
                            <SelectContent>
                              {editFilteredHeadRanges.map(range => (
                                <SelectItem key={range} value={range}>
                                  {range}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        <Input
                          type="number"
                          value={editProductQuantity}
                          onChange={(e) => setEditProductQuantity(Number(e.target.value))}
                          min={1}
                          placeholder="Quantity"
                        />
                        <Button
                          onClick={() => {
                            const selectedProd = products.find(
                              p => p.name === editSelectedProductName &&
                                   p.ratingRange === editSelectedRatingRange &&
                                   p.dischargeRange === editSelectedDischargeRange &&
                                   p.headRange === editSelectedHeadRange
                            );
                            if (selectedProd) {
                              handleEditAddProduct({
                                productId: selectedProd.id,
                                productName: selectedProd.name,
                                productCategory: selectedProd.category,
                                quantity: editProductQuantity,
                                price: selectedProd.price || 0,
                                ratingRange: selectedProd.ratingRange,
                                dischargeRange: selectedProd.dischargeRange,
                                headRange: selectedProd.headRange,
                              });
                              setEditSelectedProductName('');
                              setEditSelectedRatingRange('');
                              setEditSelectedDischargeRange('');
                              setEditSelectedHeadRange('');
                              setEditProductQuantity(1);
                            } else {
                              toast({
                                title: "Cannot Add Product",
                                description: "Please select a complete product variation for editing.",
                                variant: "destructive"
                              });
                            }
                          }}
                          disabled={!editSelectedProductName || !editSelectedRatingRange || !editSelectedDischargeRange || !editSelectedHeadRange || editProductQuantity <= 0}
                          className="bg-factory-primary hover:bg-factory-primary/90"
                        >
                          Add Product
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="text-right font-bold text-lg mt-4">
                Total Value: {formatCurrency(editOrder.totalValue)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={isUpdating} className="bg-factory-primary hover:bg-factory-primary/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Inventory Management Modal */}
      {currentInventoryProduct && (
        <InventoryManagementModal
          isOpen={isInventoryModalOpen}
          onClose={() => {
            setIsInventoryModalOpen(false);
            setCurrentInventoryProduct(null);
          }}
          productId={currentInventoryProduct.productId}
          productName={currentInventoryProduct.productName}
          requestedQuantity={currentInventoryProduct.requestedQuantity}
          availableInStock={currentInventoryProduct.availableInStock}
          maxManufacturableQuantity={currentInventoryProduct.maxManufacturableQuantity}
          onConfirm={handleInventoryConfirm}
        />
      )}

      {/* Delete Order Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete sales order <b>{orderToDelete?.orderNumber}</b>? This action cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isProcessing}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewOrderStatus;
