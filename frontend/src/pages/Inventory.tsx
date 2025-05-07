
import React, { useState } from 'react';
import { useFactory } from '../context/FactoryContext';
import { formatCurrency, formatDate } from '../utils/calculations';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatCard from '@/components/ui-custom/StatCard';
import { AlertTriangle, Package, Search, ArrowDown, ArrowUp, Plus, Edit, RefreshCw } from 'lucide-react';

const Inventory: React.FC = () => {
  const { rawMaterials, finishedProducts, addRawMaterial, addFinishedProduct } = useFactory();
  
  // Raw materials state
  const [searchRawMaterial, setSearchRawMaterial] = useState('');
  const [isRawMaterialDialogOpen, setIsRawMaterialDialogOpen] = useState(false);
  const [newRawMaterial, setNewRawMaterial] = useState({
    name: '',
    unit: '',
    quantity: 0,
    pricePerUnit: 0
  });
  
  // Finished products state
  const [searchFinishedProduct, setSearchFinishedProduct] = useState('');
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    quantity: 0,
    price: 0
  });
  
  // Filtered data
  const filteredRawMaterials = rawMaterials.filter(material => 
    material.name.toLowerCase().includes(searchRawMaterial.toLowerCase())
  );
  
  const filteredFinishedProducts = finishedProducts.filter(product => 
    product.name.toLowerCase().includes(searchFinishedProduct.toLowerCase()) ||
    product.category.toLowerCase().includes(searchFinishedProduct.toLowerCase())
  );
  
  // Calculations
  const totalRawMaterialValue = rawMaterials.reduce(
    (total, material) => total + (material.quantity * material.pricePerUnit), 0
  );
  
  const totalFinishedProductValue = finishedProducts.reduce(
    (total, product) => total + (product.quantity * product.price), 0
  );
  
  // Form handlers
  const handleAddRawMaterial = () => {
    addRawMaterial(newRawMaterial);
    setIsRawMaterialDialogOpen(false);
    setNewRawMaterial({
      name: '',
      unit: '',
      quantity: 0,
      pricePerUnit: 0
    });
  };
  
  const handleAddFinishedProduct = () => {
    addFinishedProduct(newProduct);
    setIsProductDialogOpen(false);
    setNewProduct({
      name: '',
      category: '',
      quantity: 0,
      price: 0
    });
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-factory-gray-900">Inventory Management</h1>
      
      {/* Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Raw Material Inventory Value"
          value={formatCurrency(totalRawMaterialValue)}
          icon={<Package size={20} />}
          description={`${rawMaterials.length} unique materials in stock`}
        />
        
        <StatCard
          title="Finished Product Inventory Value"
          value={formatCurrency(totalFinishedProductValue)}
          icon={<Package size={20} />}
          description={`${finishedProducts.length} product types in stock`}
        />
      </div>
      
      {/* Tabs for Raw Materials and Finished Products */}
      <Tabs defaultValue="raw" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="raw">Raw Materials</TabsTrigger>
          <TabsTrigger value="finished">Finished Products</TabsTrigger>
        </TabsList>
        
        {/* Raw Materials Tab */}
        <TabsContent value="raw" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-factory-gray-400" />
              <Input
                placeholder="Search materials..."
                value={searchRawMaterial}
                onChange={(e) => setSearchRawMaterial(e.target.value)}
                className="pl-9 pr-4"
              />
            </div>
            <Button 
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={() => setIsRawMaterialDialogOpen(true)}
            >
              <Plus size={16} className="mr-2" />
              Add Raw Material
            </Button>
          </div>
          
          {filteredRawMaterials.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Material Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Price Per Unit</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead className="text-right">Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRawMaterials.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium">{material.name}</TableCell>
                          <TableCell>{material.quantity.toLocaleString()}</TableCell>
                          <TableCell>{material.unit}</TableCell>
                          <TableCell>{formatCurrency(material.pricePerUnit)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(material.quantity * material.pricePerUnit)}
                          </TableCell>
                          <TableCell className="text-right">{formatDate(material.lastUpdated)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">No raw materials found</h3>
              <p className="mt-1 text-gray-500">Add your first raw material to get started.</p>
            </div>
          )}
        </TabsContent>
        
        {/* Finished Products Tab */}
        <TabsContent value="finished" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-factory-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchFinishedProduct}
                onChange={(e) => setSearchFinishedProduct(e.target.value)}
                className="pl-9 pr-4"
              />
            </div>
            <Button 
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={() => setIsProductDialogOpen(true)}
            >
              <Plus size={16} className="mr-2" />
              Add Product
            </Button>
          </div>
          
          {filteredFinishedProducts.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Product Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>In Stock</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead className="text-right">Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFinishedProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.quantity.toLocaleString()}</TableCell>
                          <TableCell>{formatCurrency(product.price)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(product.quantity * product.price)}
                          </TableCell>
                          <TableCell className="text-right">{formatDate(product.lastUpdated)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">No products found</h3>
              <p className="mt-1 text-gray-500">Add your first product to get started.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Add Raw Material Dialog */}
      <Dialog open={isRawMaterialDialogOpen} onOpenChange={setIsRawMaterialDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Raw Material</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="material-name">Material Name</Label>
              <Input
                id="material-name"
                placeholder="Enter material name"
                value={newRawMaterial.name}
                onChange={(e) => setNewRawMaterial({...newRawMaterial, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material-quantity">Quantity</Label>
                <Input
                  id="material-quantity"
                  type="number"
                  placeholder="0"
                  min="0"
                  value={newRawMaterial.quantity}
                  onChange={(e) => setNewRawMaterial({...newRawMaterial, quantity: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="material-unit">Unit of Measurement</Label>
                <Input
                  id="material-unit"
                  placeholder="e.g., kg, m, pcs"
                  value={newRawMaterial.unit}
                  onChange={(e) => setNewRawMaterial({...newRawMaterial, unit: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="material-price">Price Per Unit</Label>
              <Input
                id="material-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newRawMaterial.pricePerUnit}
                onChange={(e) => setNewRawMaterial({...newRawMaterial, pricePerUnit: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRawMaterialDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={handleAddRawMaterial}
              disabled={!newRawMaterial.name || !newRawMaterial.unit || newRawMaterial.quantity <= 0 || newRawMaterial.pricePerUnit <= 0}
            >
              Add Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Finished Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Finished Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                placeholder="Enter product name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-category">Category</Label>
              <Input
                id="product-category"
                placeholder="e.g., Appliance, Electronic, Mechanical"
                value={newProduct.category}
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-quantity">Initial Stock</Label>
                <Input
                  id="product-quantity"
                  type="number"
                  placeholder="0"
                  min="0"
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct({...newProduct, quantity: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="product-price">Price</Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={handleAddFinishedProduct}
              disabled={!newProduct.name || !newProduct.category || newProduct.price <= 0}
            >
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
