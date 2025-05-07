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
import { AlertTriangle, Package, Search, ArrowDown, ArrowUp, Plus, Edit, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rawMaterialService, CreateRawMaterialDTO } from '../services/rawMaterial.service';
import { useToast } from '@/components/ui/use-toast';

const Inventory: React.FC = () => {
  const { finishedProducts, addFinishedProduct } = useFactory();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Raw materials state
  const [searchRawMaterial, setSearchRawMaterial] = useState('');
  const [isRawMaterialDialogOpen, setIsRawMaterialDialogOpen] = useState(false);
  const [newRawMaterial, setNewRawMaterial] = useState<CreateRawMaterialDTO>({
    material_code: '',
    material_name: '',
    moc: '',
    unit_weight: 0,
    unit: 'kg',
    current_stock: 0,
    minimum_stock: 0,
    unit_price: 0
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

  // Edit/Delete state
  const [editMaterial, setEditMaterial] = useState<null | CreateRawMaterialDTO & { material_id: number }>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteMaterialId, setDeleteMaterialId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch raw materials
  const { data: rawMaterials = [], isLoading } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: rawMaterialService.getAllRawMaterials
  });
  
  // Create raw material mutation
  const createRawMaterialMutation = useMutation({
    mutationFn: rawMaterialService.createRawMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      setIsRawMaterialDialogOpen(false);
      setNewRawMaterial({
        material_code: '',
        material_name: '',
        moc: '',
        unit_weight: 0,
        unit: 'kg',
        current_stock: 0,
        minimum_stock: 0,
        unit_price: 0
      });
      toast({
        title: 'Success',
        description: 'Raw material added successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add raw material',
        variant: 'destructive'
      });
    }
  });
  
  // Edit mutation
  const updateRawMaterialMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateRawMaterialDTO> }) => rawMaterialService.updateRawMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      setIsEditDialogOpen(false);
      setEditMaterial(null);
      toast({ title: 'Success', description: 'Raw material updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update raw material', variant: 'destructive' });
    }
  });

  // Delete mutation
  const deleteRawMaterialMutation = useMutation({
    mutationFn: (id: number) => rawMaterialService.deleteRawMaterial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      setIsDeleteDialogOpen(false);
      setDeleteMaterialId(null);
      toast({ title: 'Success', description: 'Raw material deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete raw material', variant: 'destructive' });
    }
  });
  
  // Filtered data
  const filteredRawMaterials = rawMaterials.filter(material => 
    material.material_name.toLowerCase().includes(searchRawMaterial.toLowerCase()) ||
    material.material_code.toLowerCase().includes(searchRawMaterial.toLowerCase())
  );
  
  const filteredFinishedProducts = finishedProducts.filter(product => 
    product.name.toLowerCase().includes(searchFinishedProduct.toLowerCase()) ||
    product.category.toLowerCase().includes(searchFinishedProduct.toLowerCase())
  );
  
  // Calculations
  const totalRawMaterialValue = rawMaterials.reduce(
    (total, material) => total + (material.current_stock * material.unit_price), 0
  );
  
  const totalFinishedProductValue = finishedProducts.reduce(
    (total, product) => total + (product.quantity * product.price), 0
  );
  
  // Form handlers
  const handleAddRawMaterial = () => {
    createRawMaterialMutation.mutate(newRawMaterial);
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
          
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-2 text-gray-500">Loading raw materials...</p>
            </div>
          ) : filteredRawMaterials.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material Code</TableHead>
                        <TableHead>Material Name</TableHead>
                        <TableHead>MOC</TableHead>
                        <TableHead>Unit Weight</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead className="text-right">Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRawMaterials.map((material) => (
                        <TableRow key={material.material_id}>
                          <TableCell className="font-medium">{material.material_code}</TableCell>
                          <TableCell>{material.material_name}</TableCell>
                          <TableCell>{material.moc || '-'}</TableCell>
                          <TableCell>{material.unit_weight?.toLocaleString() || '-'}</TableCell>
                          <TableCell>{material.current_stock.toLocaleString()}</TableCell>
                          <TableCell>{material.unit}</TableCell>
                          <TableCell>{formatCurrency(material.unit_price)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(material.current_stock * material.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">{formatDate(material.updated_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" onClick={() => { setEditMaterial(material); setIsEditDialogOpen(true); }}><Pencil size={16} /></Button>
                            <Button size="icon" variant="ghost" onClick={() => { setDeleteMaterialId(material.material_id); setIsDeleteDialogOpen(true); }}><Trash2 size={16} className="text-red-500" /></Button>
                          </TableCell>
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
              <Label htmlFor="material-code">Material Code</Label>
              <Input
                id="material-code"
                placeholder="Enter material code"
                value={newRawMaterial.material_code}
                onChange={(e) => setNewRawMaterial({...newRawMaterial, material_code: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="material-name">Material Name</Label>
              <Input
                id="material-name"
                placeholder="Enter material name"
                value={newRawMaterial.material_name}
                onChange={(e) => setNewRawMaterial({...newRawMaterial, material_name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="material-moc">Material of Construction (MOC)</Label>
              <Input
                id="material-moc"
                placeholder="Enter material of construction"
                value={newRawMaterial.moc}
                onChange={(e) => setNewRawMaterial({...newRawMaterial, moc: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material-unit-weight">Unit Weight</Label>
                <Input
                  id="material-unit-weight"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newRawMaterial.unit_weight}
                  onChange={(e) => setNewRawMaterial({...newRawMaterial, unit_weight: parseFloat(e.target.value) || 0})}
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="material-stock">Current Stock</Label>
                <Input
                  id="material-stock"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={newRawMaterial.current_stock}
                  onChange={(e) => setNewRawMaterial({...newRawMaterial, current_stock: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="material-min-stock">Minimum Stock</Label>
                <Input
                  id="material-min-stock"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={newRawMaterial.minimum_stock}
                  onChange={(e) => setNewRawMaterial({...newRawMaterial, minimum_stock: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="material-price">Unit Price</Label>
              <Input
                id="material-price"
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={newRawMaterial.unit_price}
                onChange={(e) => setNewRawMaterial({...newRawMaterial, unit_price: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRawMaterialDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={handleAddRawMaterial}
              disabled={!newRawMaterial.material_code || !newRawMaterial.material_name || !newRawMaterial.unit || newRawMaterial.current_stock < 0 || newRawMaterial.unit_price <= 0}
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

      {/* Edit Raw Material Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Raw Material</DialogTitle>
          </DialogHeader>
          {editMaterial && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-material-code">Material Code</Label>
                <Input id="edit-material-code" value={editMaterial.material_code} onChange={e => setEditMaterial({ ...editMaterial, material_code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-material-name">Material Name</Label>
                <Input id="edit-material-name" value={editMaterial.material_name} onChange={e => setEditMaterial({ ...editMaterial, material_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-material-moc">Material of Construction (MOC)</Label>
                <Input id="edit-material-moc" value={editMaterial.moc || ''} onChange={e => setEditMaterial({ ...editMaterial, moc: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-material-unit-weight">Unit Weight</Label>
                  <Input id="edit-material-unit-weight" type="number" step="0.01" min="0" value={editMaterial.unit_weight || 0} onChange={e => setEditMaterial({ ...editMaterial, unit_weight: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-material-unit">Unit of Measurement</Label>
                  <Input id="edit-material-unit" value={editMaterial.unit} onChange={e => setEditMaterial({ ...editMaterial, unit: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-material-stock">Current Stock</Label>
                  <Input id="edit-material-stock" type="number" step="1" min="0" value={editMaterial.current_stock} onChange={e => setEditMaterial({ ...editMaterial, current_stock: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-material-min-stock">Minimum Stock</Label>
                  <Input id="edit-material-min-stock" type="number" step="1" min="0" value={editMaterial.minimum_stock} onChange={e => setEditMaterial({ ...editMaterial, minimum_stock: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-material-price">Unit Price</Label>
                <Input id="edit-material-price" type="number" step="1" min="0" value={editMaterial.unit_price} onChange={e => setEditMaterial({ ...editMaterial, unit_price: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button className="bg-factory-primary hover:bg-factory-primary/90" onClick={() => updateRawMaterialMutation.mutate({ id: editMaterial!.material_id, data: editMaterial! })} disabled={!editMaterial?.material_code || !editMaterial?.material_name || !editMaterial?.unit || editMaterial?.current_stock < 0 || editMaterial?.unit_price <= 0}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Raw Material</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this raw material?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteRawMaterialMutation.mutate(deleteMaterialId!)} disabled={!deleteMaterialId}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
