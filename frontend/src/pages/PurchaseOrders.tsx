
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
import { PurchaseOrder, PurchaseMaterial, PurchaseOrderStatus } from '../types';
import { Plus, FileText, Upload, Search, Download, Filter } from 'lucide-react';

const PurchaseOrders: React.FC = () => {
  const { purchaseOrders = [], addPurchaseOrder, rawMaterials, updatePurchaseOrderStatus, suppliers = [] } = useFactory();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newOrder, setNewOrder] = useState<Partial<PurchaseOrder>>({
    orderNumber: `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
    date: new Date().toISOString().split('T')[0],
    supplierName: '',
    supplierId: '',
    materials: [],
    status: 'ordered',
    totalValue: 0
  });
  const [newMaterial, setNewMaterial] = useState<Partial<PurchaseMaterial>>({
    materialId: '',
    materialName: '',
    quantity: 1,
    unit: 'pcs',
    pricePerUnit: 0
  });

  // When supplier changes, update the supplierId in the new order
  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setNewOrder({
        ...newOrder,
        supplierId,
        supplierName: supplier.name
      });
    }
  };

  // When material is selected from inventory, update the material details
  const handleMaterialSelect = (materialId: string) => {
    const material = rawMaterials.find(m => m.id === materialId);
    if (material) {
      setNewMaterial({
        materialId: material.id,
        materialName: material.name,
        quantity: 1,
        unit: material.unit,
        pricePerUnit: material.pricePerUnit
      });
    }
  };

  // Filter orders based on search term and status
  const filteredOrders = purchaseOrders.filter(order => {
    const matchesSearchTerm = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            order.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearchTerm && matchesStatus;
  });

  const handleAddMaterial = () => {
    if (newMaterial.materialName && newMaterial.quantity && newMaterial.pricePerUnit) {
      const material: PurchaseMaterial = {
        materialId: newMaterial.materialId || Date.now().toString(),
        materialName: newMaterial.materialName,
        quantity: newMaterial.quantity,
        unit: newMaterial.unit || 'pcs',
        pricePerUnit: newMaterial.pricePerUnit
      };
      
      const updatedMaterials = [...(newOrder.materials || []), material];
      const totalValue = updatedMaterials.reduce((total, m) => total + (m.quantity * m.pricePerUnit), 0);
      
      setNewOrder({
        ...newOrder,
        materials: updatedMaterials,
        totalValue
      });
      
      // Reset form
      setNewMaterial({
        materialId: '',
        materialName: '',
        quantity: 1,
        unit: 'pcs',
        pricePerUnit: 0
      });
    }
  };
  
  const handleRemoveMaterial = (index: number) => {
    const updatedMaterials = [...(newOrder.materials || [])];
    updatedMaterials.splice(index, 1);
    
    const totalValue = updatedMaterials.reduce((total, m) => total + (m.quantity * m.pricePerUnit), 0);
    
    setNewOrder({
      ...newOrder,
      materials: updatedMaterials,
      totalValue
    });
  };
  
  const handleCreateOrder = () => {
    if (
      newOrder.orderNumber && 
      newOrder.supplierName && 
      newOrder.materials && 
      newOrder.materials.length > 0
    ) {
      addPurchaseOrder(newOrder as Omit<PurchaseOrder, 'id'>);
      setIsDialogOpen(false);
      resetNewOrder();
    }
  };
  
  const resetNewOrder = () => {
    setNewOrder({
      orderNumber: `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      supplierName: '',
      supplierId: '',
      materials: [],
      status: 'ordered',
      totalValue: 0
    });
  };

  const getStatusBadgeColor = (status: PurchaseOrderStatus) => {
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
            placeholder="Search by order number or supplier..." 
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
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-factory-gray-50 py-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-factory-primary" />
                    <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                  </div>
                  <Badge className={getStatusBadgeColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-factory-gray-500">Supplier</p>
                    <p className="font-medium">{order.supplierName}</p>
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
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Materials</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.materials.map((material, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{material.materialName}</TableCell>
                            <TableCell>{material.quantity}</TableCell>
                            <TableCell>{material.unit}</TableCell>
                            <TableCell>{formatCurrency(material.pricePerUnit)}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(material.quantity * material.pricePerUnit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                {/* Invoice section */}
                <div className="mt-4 border-t pt-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                      <h4 className="font-medium">Invoice Details</h4>
                      <p className="text-sm text-factory-gray-500">
                        {order.invoiceNumber ? 
                          `Invoice #: ${order.invoiceNumber}` : 
                          'No invoice uploaded yet'
                        }
                      </p>
                    </div>
                    
                    {order.status === 'ordered' && (
                      <div className="flex mt-2 sm:mt-0 gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updatePurchaseOrderStatus(order.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-factory-primary hover:bg-factory-primary/90"
                          onClick={() => updatePurchaseOrderStatus(order.id, 'arrived')}
                        >
                          Mark as Arrived
                        </Button>
                      </div>
                    )}
                  </div>
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
                  value={newOrder.orderNumber} 
                  onChange={(e) => setNewOrder({...newOrder, orderNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Order Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={newOrder.date} 
                  onChange={(e) => setNewOrder({...newOrder, date: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplier">Select Supplier</Label>
              {suppliers.length > 0 ? (
                <Select
                  onValueChange={handleSupplierChange}
                  value={newOrder.supplierId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center space-x-2">
                  <Input 
                    id="supplierName" 
                    value={newOrder.supplierName} 
                    onChange={(e) => setNewOrder({...newOrder, supplierName: e.target.value})}
                    placeholder="Enter supplier name"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.location.href = '/suppliers'}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Suppliers
                  </Button>
                </div>
              )}
            </div>
            
            {/* Material section */}
            <div className="border-t pt-4 mt-2">
              <h3 className="text-lg font-medium mb-4">Add Materials</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="materialSelect">Select from Inventory</Label>
                  <Select
                    onValueChange={handleMaterialSelect}
                    value={newMaterial.materialId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map(material => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name} ({material.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="text-sm text-center text-factory-gray-500 my-2">OR</div>
                
                <div className="space-y-2">
                  <Label htmlFor="materialName">Material Name</Label>
                  <Input 
                    id="materialName" 
                    value={newMaterial.materialName} 
                    onChange={(e) => setNewMaterial({...newMaterial, materialName: e.target.value})}
                    placeholder="Enter material name"
                  />
                </div>
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
                    value={newMaterial.pricePerUnit} 
                    onChange={(e) => setNewMaterial({
                      ...newMaterial, 
                      pricePerUnit: parseFloat(e.target.value) || 0
                    })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <Button 
                className="w-full mt-4"
                onClick={handleAddMaterial}
                disabled={!newMaterial.materialName || 
                  !newMaterial.quantity || 
                  !newMaterial.pricePerUnit}
              >
                Add Material to Order
              </Button>
              
              {/* Material list */}
              {(newOrder.materials && newOrder.materials.length > 0) && (
                <div className="mt-4 border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newOrder.materials.map((material, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{material.materialName}</TableCell>
                          <TableCell>{material.quantity} {material.unit}</TableCell>
                          <TableCell>{formatCurrency(material.pricePerUnit)}</TableCell>
                          <TableCell>{formatCurrency(material.quantity * material.pricePerUnit)}</TableCell>
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
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">Total:</TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(newOrder.totalValue || 0)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
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
              disabled={!newOrder.orderNumber || 
                !newOrder.supplierName || 
                !newOrder.materials || 
                newOrder.materials.length === 0}
            >
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;
