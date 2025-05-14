import React, { useState, useEffect } from 'react';
import { useFactory } from '../context/FactoryContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '../utils/calculations';
import { purchaseOrderService, PurchaseOrder, PurchaseMaterial } from '../services/purchaseOrderService';
import { Plus, FileText, Upload, Search, Download, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { supplierService } from '../services/supplierService';
import { rawMaterialService } from '../services/rawMaterial.service';
import { toast } from '@/hooks/use-toast';
import axiosInstance from '@/utils/axios';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

const PurchaseOrders: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newOrder, setNewOrder] = useState<Omit<PurchaseOrder, 'purchase_order_id'>>({
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    supplier_id: 0,
    status: 'ordered',
    discount: 0,
    gst: 18,
    total_amount: 0,
    materials: []
  });
  const [newMaterial, setNewMaterial] = useState<PurchaseMaterial>({
    material_id: 0,
    quantity: 1,
    unit: 'pcs',
    unit_price: 0
  });
  const [editOrder, setEditOrder] = useState<PurchaseOrder | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [activePage, setActivePage] = useState(1);
  const ORDERS_PER_PAGE = 5;
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    loadPurchaseOrders();
    loadSuppliers();
    loadRawMaterials();
  }, []);

  const loadPurchaseOrders = async () => {
    const data = await purchaseOrderService.getAll();
    setPurchaseOrders(data);
  };

  const loadSuppliers = async () => {
    const data = await supplierService.getAllSuppliers();
    setSuppliers(data);
  };

  const loadRawMaterials = async () => {
    const data = await rawMaterialService.getAllRawMaterials();
    
    setRawMaterials(data);
  };

  const handleSupplierChange = (supplierId: string) => {
    setNewOrder({
      ...newOrder,
      supplier_id: Number(supplierId)
    });
  };

  const handleMaterialSelect = (materialId: string) => {
    const id = parseInt(materialId, 10);
    const material = rawMaterials.find(m => Number(m.material_id) === id);
    if (material) {
      setNewMaterial({
        material_id: id,
        material_name: material.material_name,
        quantity: 1,
        unit: material.unit,
        unit_price: material.unit_price || 0
      });
    }
  };

  const filteredOrders = purchaseOrders.filter(order => {
    const matchesSearchTerm = order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearchTerm && matchesStatus;
  });

  const paginatedOrders = filteredOrders.slice((activePage - 1) * ORDERS_PER_PAGE, activePage * ORDERS_PER_PAGE);
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  const handleAddMaterial = () => {
    if (newMaterial.material_id && newMaterial.quantity && newMaterial.unit_price) {
      const material: PurchaseMaterial = {
        material_id: newMaterial.material_id,
        material_name: newMaterial.material_name,
        quantity: newMaterial.quantity,
        unit: newMaterial.unit,
        unit_price: newMaterial.unit_price
      };
      const updatedMaterials = [...(newOrder.materials || []), material];
      setNewOrder({
        ...newOrder,
        materials: updatedMaterials
      });
      setNewMaterial({
        material_id: 0,
        material_name: '',
        quantity: 1,
        unit: 'pcs',
        unit_price: 0
      });
    }
  };

  const handleRemoveMaterial = (index: number) => {
    const updatedMaterials = [...(newOrder.materials || [])];
    updatedMaterials.splice(index, 1);
    setNewOrder({
      ...newOrder,
      materials: updatedMaterials
    });
  };

  const handleCreateOrder = async () => {
    console.log('handleCreateOrder called');
    const subtotal = (newOrder.materials || []).reduce((sum, m) => sum + (m.quantity * m.unit_price), 0);
    const discountAmount = subtotal * (Number(newOrder.discount) / 100);
    const gstAmount = (subtotal - discountAmount) * (Number(newOrder.gst) / 100);
    const calculatedFinal = subtotal - discountAmount + gstAmount;
    const finalPrice = newOrder.total_amount && newOrder.total_amount !== calculatedFinal ? newOrder.total_amount : calculatedFinal;
    console.log('Debug values:', {
      order_date: newOrder.order_date,
      supplier_id: newOrder.supplier_id,
      materials: newOrder.materials,
      finalPrice,
      order_number: newOrder.order_number
    });
    if (
      newOrder.order_date &&
      newOrder.supplier_id &&
      newOrder.materials &&
      newOrder.materials.length > 0 &&
      finalPrice > 0 &&
      newOrder.order_number
    ) {
      const postBody = { ...newOrder, total_amount: finalPrice, materials: newOrder.materials };
      console.log('Sending POST body:', postBody);
      await purchaseOrderService.create(postBody);
      setIsDialogOpen(false);
      resetNewOrder();
      loadPurchaseOrders();
    }
  };

  const resetNewOrder = () => {
    setNewOrder({
      order_number: '',
      order_date: new Date().toISOString().split('T')[0],
      supplier_id: 0,
      status: 'ordered',
      discount: 0,
      gst: 18,
      total_amount: 0,
      materials: []
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'arrived':
        return 'bg-green-100 text-green-800';
      case 'ordered':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEditClick = (order: PurchaseOrder) => {
    setEditOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (editOrder) {
      await purchaseOrderService.update(editOrder.purchase_order_id, editOrder);
      setIsEditDialogOpen(false);
      setEditOrder(null);
      loadPurchaseOrders();
      toast({ title: 'Purchase order updated successfully' });
    }
  };

  const handleDeleteClick = (orderId: number) => {
    setDeleteOrderId(orderId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteOrderId !== null) {
      await purchaseOrderService.delete(deleteOrderId);
      setDeleteOrderId(null);
      loadPurchaseOrders();
      toast({ title: 'Purchase order deleted successfully' });
    }
  };

  const handleStatusChange = async (order: PurchaseOrder, newStatus: string) => {
    await purchaseOrderService.update(order.purchase_order_id, { status: newStatus });
    loadPurchaseOrders();
    toast({ title: 'Status updated' });
  };

  const handleOpenDialog = async () => {
    try {
      const res = await axiosInstance.get('/purchase-orders/next-order-number');
      console.log('Next order number:', res.data);
      setNewOrder((prev) => ({ ...prev, order_number: res.data.nextOrderNumber }));
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching next order number:', error);
    }
  };

  const subtotal = (newOrder.materials || []).reduce((sum, m) => sum + (m.quantity * m.unit_price), 0);
  const discountAmount = subtotal * (Number(newOrder.discount) / 100);
  const gstAmount = (subtotal - discountAmount) * (Number(newOrder.gst) / 100);
  const calculatedFinal = subtotal - discountAmount + gstAmount;
  const finalPrice = newOrder.total_amount && newOrder.total_amount !== calculatedFinal ? newOrder.total_amount : calculatedFinal;

  // Helper to get supplier name by id
  const getSupplierName = (id: number) => {
    const supplier = suppliers.find(s => s.supplier_id === id);
    return supplier ? supplier.supplier_name : `Supplier: ${id}`;
  };

  // Helper to get total for a purchase order
  const getOrderTotal = (order: PurchaseOrder) => {
    if (!order.materials || !Array.isArray(order.materials)) return 0;
    return order.materials.reduce((sum, m) => sum + (Number(m.quantity) * Number(m.unit_price)), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-factory-gray-900">Purchase Orders</h1>
        <Button 
          onClick={handleOpenDialog}
          className="bg-factory-primary hover:bg-factory-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Purchase Order
        </Button>
      </div>
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by order number..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select 
          value={statusFilter} 
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="arrived">Arrived</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Purchase Orders List */}
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-2 border">
          <Accordion type="single" collapsible>
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map(order => (
                <AccordionItem key={order.purchase_order_id} value={String(order.purchase_order_id)} className="mb-4 bg-white rounded-xl shadow-sm border border-factory-gray-100 hover:shadow-lg transition-shadow">
                  <AccordionTrigger>
                    <div className="flex flex-col sm:flex-row w-full items-stretch px-4 py-4 group gap-2 sm:gap-0">
                      {/* Left: Order number and supplier */}
                      <div className="flex flex-col flex-1 min-w-0 sm:pr-10 justify-center">
                        <span className="font-bold text-lg text-factory-primary underline cursor-pointer group-hover:text-factory-primary-dark transition-colors truncate">
                          {order.order_number || <span className='text-gray-400 italic'>No Order #</span>}
                        </span>
                        <span className="text-xs text-gray-500 font-mono tracking-wide truncate mt-1">
                          {getSupplierName(order.supplier_id)}
                        </span>
                      </div>
                      {/* Divider for desktop */}
                      <div className="hidden sm:block w-px bg-gray-200 mx-6"></div>
                      {/* Right: Date, Status, Total */}
                      <div className="flex flex-row flex-wrap sm:flex-nowrap gap-x-8 gap-y-2 items-center justify-start w-full sm:w-auto mt-2 sm:mt-0 text-left">
                        <span className="text-sm text-gray-700"><b>Date:</b> {order.order_date ? formatDate(order.order_date) : <span className='text-gray-400'>-</span>}</span>
                        <span className="text-sm"><b>Status:</b> <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(order.status)}`}>{order.status}</span></span>
                        <span className="text-lg font-bold text-factory-primary ml-0 sm:ml-2">{formatCurrency(getOrderTotal(order))}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardContent className="p-2 sm:p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-factory-gray-500">Supplier ID</p>
                          <p className="font-medium">{order.supplier_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-factory-gray-500">Order Date</p>
                          <p className="font-medium">{formatDate(order.order_date)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-factory-gray-500">Status</p>
                          <p className="font-medium">{order.status}</p>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Materials</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Material</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(order.materials || []).map((material, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">
                                    {material.material_id}
                                    {material.material_name ? ` - ${material.material_name}` : ''}
                                  </TableCell>
                                  <TableCell>{material.quantity}</TableCell>
                                  <TableCell>{material.unit}</TableCell>
                                  <TableCell className="text-right font-semibold">{formatCurrency(material.unit_price)}</TableCell>
                                  <TableCell className="text-right font-bold">{formatCurrency(material.quantity * material.unit_price)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <div className="pt-2 flex justify-end space-x-2">
                        <Select value={order.status} onValueChange={val => handleStatusChange(order, val)}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ordered">Ordered</SelectItem>
                            <SelectItem value="arrived">Arrived</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(order)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteClick(order.purchase_order_id)}>
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </AccordionContent>
                </AccordionItem>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border">
                <FileText className="h-12 w-12 mx-auto mb-4 text-factory-gray-300" />
                <p className="text-factory-gray-500">No purchase orders found.</p>
                <p className="text-sm text-factory-gray-400 mt-1">Create a new purchase order to get started.</p>
              </div>
            )}
          </Accordion>
        </div>
      </div>
      {/* Pagination UI at bottom */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={`px-3 py-1 rounded border ${activePage === i + 1 ? 'bg-factory-primary text-white' : 'bg-white text-factory-primary border-factory-primary'}`}
              onClick={() => setActivePage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
      {/* Create Purchase Order Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            <div className="space-y-2">
              <Label htmlFor="date">Order Date</Label>
              <Input 
                id="date" 
                type="date" 
                value={newOrder.order_date} 
                onChange={(e) => setNewOrder({...newOrder, order_date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Select Supplier</Label>
              <Select
                onValueChange={handleSupplierChange}
                value={String(newOrder.supplier_id)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    supplier.supplier_id !== undefined && supplier.supplier_id !== null ? (
                      <SelectItem key={supplier.supplier_id} value={String(supplier.supplier_id)}>
                        {supplier.supplier_name}
                      </SelectItem>
                    ) : null
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Material section */}
            <div className="border-t pt-4 mt-2">
              <h3 className="text-lg font-medium mb-4">Add Materials</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="materialSelect">Select from Inventory</Label>
                  <Select
                    onValueChange={handleMaterialSelect}
                    value={newMaterial.material_id.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map(material => (
                        material.material_id !== undefined && material.material_id !== null ? (
                          <SelectItem key={material.material_id} value={String(material.material_id)}>
                            {material.material_name} ({material.unit})
                          </SelectItem>
                        ) : null
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input 
                      id="quantity" 
                      type="number" 
                      min="1" 
                      value={newMaterial.quantity} 
                      onChange={(e) => setNewMaterial({
                        ...newMaterial, 
                        quantity: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input 
                      id="unit" 
                      value={newMaterial.unit} 
                      onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                      placeholder="e.g., kg, pcs, m"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricePerUnit">Price per Unit</Label>
                    <Input 
                      id="pricePerUnit" 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={newMaterial.unit_price} 
                      onChange={(e) => setNewMaterial({
                        ...newMaterial, 
                        unit_price: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4"
                  onClick={handleAddMaterial}
                  disabled={
                    !newMaterial.material_id || 
                    !newMaterial.quantity || 
                    !newMaterial.unit_price
                  }
                >
                  Add Material to Order
                </Button>
                {/* Material list */}
                {(newOrder.materials && newOrder.materials.length > 0) && (
                  <div className="mt-4 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material ID</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newOrder.materials.map((material, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{material.material_id}</TableCell>
                            <TableCell>{material.quantity} {material.unit}</TableCell>
                            <TableCell>{formatCurrency(material.unit_price)}</TableCell>
                            <TableCell>{formatCurrency(material.quantity * material.unit_price)}</TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleRemoveMaterial(idx)}
                              >
                                <span className="sr-only">Remove</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <path d="M18 6 6 18"></path>
                                  <path d="m6 6 12 12"></path>
                                </svg>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
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
            {/* Pricing/Bill Section */}
            <div className="border rounded-md p-4 mt-2 bg-gray-50">
              <div className="flex justify-between mb-1">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>GST</span>
                <span>+{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between items-center mt-2 font-bold">
                <span>Final Price</span>
                <Input
                  type="number"
                  value={finalPrice}
                  onChange={e => setNewOrder({ ...newOrder, total_amount: Number(e.target.value) })}
                  className="w-32 text-right font-bold"
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
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
              disabled={
                !newOrder.order_date ||
                !newOrder.supplier_id ||
                !newOrder.materials ||
                newOrder.materials.length === 0 ||
                finalPrice <= 0
              }
            >
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Purchase Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
          </DialogHeader>
          {editOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-order-number">Order Number</Label>
                  <Input id="edit-order-number" value={editOrder.order_number} onChange={e => setEditOrder({ ...editOrder, order_number: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-order-date">Order Date</Label>
                  <Input id="edit-order-date" type="date" value={editOrder.order_date} onChange={e => setEditOrder({ ...editOrder, order_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editOrder.status} onValueChange={val => setEditOrder({ ...editOrder, status: val })}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ordered">Ordered</SelectItem>
                      <SelectItem value="arrived">Arrived</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t pt-4 mt-2">
                <h3 className="text-lg font-medium mb-4">Edit Materials</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(editOrder.materials || []).map((material, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            value={material.material_name || ''}
                            onChange={e => {
                              const updated = [...editOrder.materials];
                              updated[idx] = { ...updated[idx], material_name: e.target.value };
                              setEditOrder({ ...editOrder, materials: updated });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={material.quantity}
                            onChange={e => {
                              const updated = [...editOrder.materials];
                              updated[idx] = { ...updated[idx], quantity: parseFloat(e.target.value) || 0 };
                              setEditOrder({ ...editOrder, materials: updated });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={material.unit}
                            onChange={e => {
                              const updated = [...editOrder.materials];
                              updated[idx] = { ...updated[idx], unit: e.target.value };
                              setEditOrder({ ...editOrder, materials: updated });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={material.unit_price}
                            onChange={e => {
                              const updated = [...editOrder.materials];
                              updated[idx] = { ...updated[idx], unit_price: parseFloat(e.target.value) || 0 };
                              setEditOrder({ ...editOrder, materials: updated });
                            }}
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(material.quantity * material.unit_price)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => {
                            const updated = [...editOrder.materials];
                            updated.splice(idx, 1);
                            setEditOrder({ ...editOrder, materials: updated });
                          }}>
                            <span className="sr-only">Remove</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  className="mt-4"
                  onClick={() => {
                    setEditOrder({
                      ...editOrder,
                      materials: [
                        ...editOrder.materials,
                        { material_id: 0, material_name: '', quantity: 1, unit: 'pcs', unit_price: 0 }
                      ]
                    });
                  }}
                >
                  Add Material
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-factory-primary hover:bg-factory-primary/90">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Purchase Order Confirmation Dialog */}
      <Dialog open={deleteOrderId !== null} onOpenChange={open => { if (!open) setDeleteOrderId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase Order</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this purchase order?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOrderId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;
