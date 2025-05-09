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
import { Plus, FileText, Upload, Search, Download, Filter } from 'lucide-react';
import { supplierService } from '../services/supplierService';
import { rawMaterialService } from '../services/rawMaterial.service';
import { toast } from '@/hooks/use-toast';

const PurchaseOrders: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newOrder, setNewOrder] = useState<Omit<PurchaseOrder, 'purchase_order_id'>>({
    order_number: `PO-${new Date().getFullYear()}-001`,
    order_date: new Date().toISOString().split('T')[0],
    supplier_id: 0,
    status: 'ordered',
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
    if (
      newOrder.order_number &&
      newOrder.supplier_id &&
      newOrder.materials &&
      newOrder.materials.length > 0
    ) {
      await purchaseOrderService.create(newOrder);
      setIsDialogOpen(false);
      resetNewOrder();
      loadPurchaseOrders();
    }
  };

  const resetNewOrder = () => {
    setNewOrder({
      order_number: `PO-${new Date().getFullYear()}-001`,
      order_date: new Date().toISOString().split('T')[0],
      supplier_id: 0,
      status: 'ordered',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-factory-gray-900">Purchase Orders</h1>
        <Button 
          onClick={() => setIsDialogOpen(true)}
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
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <Card key={order.purchase_order_id} className="overflow-hidden">
              <CardHeader className="bg-factory-gray-50 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-factory-primary" />
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                  </div>
                  <Badge className={getStatusBadgeColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
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
                          <TableHead>Material ID</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(order.materials || []).map((material, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{material.material_name || material.material_id}</TableCell>
                            <TableCell>{material.quantity}</TableCell>
                            <TableCell>{material.unit}</TableCell>
                            <TableCell>{formatCurrency(material.unit_price)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(material.quantity * material.unit_price)}
                            </TableCell>
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
            </Card>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border">
            <FileText className="h-12 w-12 mx-auto mb-4 text-factory-gray-300" />
            <p className="text-factory-gray-500">No purchase orders found.</p>
            <p className="text-sm text-factory-gray-400 mt-1">Create a new purchase order to get started.</p>
          </div>
        )}
      </div>
      {/* Create Purchase Order Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input 
                  id="orderNumber" 
                  value={newOrder.order_number} 
                  onChange={(e) => setNewOrder({...newOrder, order_number: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Order Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={newOrder.order_date} 
                  onChange={(e) => setNewOrder({...newOrder, order_date: e.target.value})}
                />
              </div>
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
                !newOrder.order_number || 
                !newOrder.supplier_id || 
                !newOrder.materials || 
                newOrder.materials.length === 0
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
