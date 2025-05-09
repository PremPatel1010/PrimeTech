import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Package, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { productService, Product, BOMItem, ManufacturingStage } from '../services/productService';
import { rawMaterialService, RawMaterial } from '../services/rawMaterial.service';

const statusOptions = [
  { value: 'inward', label: 'Inward' },
  { value: 'qc_inward', label: 'QC Inward' },
  { value: 'storage', label: 'Storage' }
];

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [stages, setStages] = useState<ManufacturingStage[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    product_name: '',
    product_code: '',
    price: 0,
    cost_price: 0,
    discharge_range: '',
    head_range: '',
    rating_range: '',
    status: 'inward'
  });
  const [bomItems, setBOMItems] = useState<BOMItem[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [materialQuantity, setMaterialQuantity] = useState<number>(1);
  const [selectedStages, setSelectedStages] = useState<number[]>([]);
  const [newStage, setNewStage] = useState<string>('');
  const [newStageType, setNewStageType] = useState<string>('pump');
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);

  useEffect(() => {
    loadProducts();
    loadRawMaterials();
    loadStages();
  }, []);

  const loadProducts = async () => {
    const data = await productService.getAllProducts();
    setProducts(data);
  };
  const loadRawMaterials = async () => {
    const data = await rawMaterialService.getAllRawMaterials();
    setRawMaterials(data);
  };
  const loadStages = async () => {
    const data = await productService.getManufacturingStages();
    setStages(data);
  };

  const handleAddMaterial = () => {
    if (selectedMaterial && materialQuantity > 0) {
      const material = rawMaterials.find(m => m.material_id.toString() === selectedMaterial);
      if (material) {
        setBOMItems([...bomItems, {
          material_id: material.material_id,
          quantity_required: materialQuantity
        }]);
        setSelectedMaterial('');
        setMaterialQuantity(1);
      }
    }
  };

  const handleRemoveMaterial = (materialId: number) => {
    setBOMItems(bomItems.filter(item => item.material_id !== materialId));
  };

  const handleAddStage = () => {
    if (newStage.trim()) {
      toast({ title: 'Custom stage addition not implemented in backend.' });
    }
  };

  const handleToggleStage = (stageId: number) => {
    setSelectedStages(prev => prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]);
  };

  const handleCreateProduct = async () => {
    try {
      // 1. Create product
      const created = await productService.createProduct({
        product_name: newProduct.product_name!,
        product_code: newProduct.product_code!,
        price: newProduct.price || 0,
        cost_price: newProduct.cost_price || 0,
        discharge_range: newProduct.discharge_range,
        head_range: newProduct.head_range,
        rating_range: newProduct.rating_range,
        status: newProduct.status || 'inward'
      });
      // 2. Add BOM
      if (bomItems.length > 0) {
        await productService.addProductBOM(created.product_id, {
          bomItems: bomItems.map(item => ({
            material_id: item.material_id,
            quantity_required: item.quantity_required
          }))
        });
      }
      toast({ title: 'Product created successfully' });
      setIsProductDialogOpen(false);
      setNewProduct({ product_name: '', product_code: '', price: 0, cost_price: 0, discharge_range: '', head_range: '', rating_range: '', status: 'inward' });
      setBOMItems([]);
      setSelectedStages([]);
      loadProducts();
    } catch (e) {
      toast({ title: 'Error creating product', variant: 'destructive' });
    }
  };

  const handleEditClick = (product: Product) => {
    setEditProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (editProduct) {
      await productService.updateProduct(editProduct.product_id, editProduct);
      setIsEditDialogOpen(false);
      setEditProduct(null);
      loadProducts();
      toast({ title: 'Product updated successfully' });
    }
  };

  const handleDeleteClick = (productId: number) => {
    setDeleteProductId(productId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteProductId !== null) {
      await productService.deleteProduct(deleteProductId);
      setDeleteProductId(null);
      loadProducts();
      toast({ title: 'Product deleted successfully' });
    }
  };

  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-factory-gray-900">Product Management</h1>
        <Button onClick={() => setIsProductDialogOpen(true)} className="bg-factory-primary hover:bg-factory-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>
      <div className="bg-white rounded-lg p-4 border flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-auto flex-grow">
          <Search className="absolute left-3 top-3 h-4 w-4 text-factory-gray-400" />
          <Input placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <Card key={product.product_id} className="overflow-hidden">
              <CardHeader className="bg-factory-gray-50 py-3 px-4">
                <div className="flex justify-between">
                  <CardTitle className="text-base">{product.product_name}</CardTitle>
                  <span className="text-sm px-2 py-1 bg-factory-primary/10 text-factory-primary rounded">{product.product_code}</span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-factory-gray-500">Price</p>
                    <p className="font-medium">₹{product.price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-factory-gray-500">Cost Price</p>
                    <p className="font-medium">₹{product.cost_price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-factory-gray-500">Discharge Range</p>
                    <p className="font-medium">{product.discharge_range}</p>
                  </div>
                  <div>
                    <p className="text-sm text-factory-gray-500">Head Range</p>
                    <p className="font-medium">{product.head_range}</p>
                  </div>
                  <div>
                    <p className="text-sm text-factory-gray-500">Rating Range</p>
                    <p className="font-medium">{product.rating_range}</p>
                  </div>
                  <div>
                    <p className="text-sm text-factory-gray-500">Status</p>
                    <p className="font-medium">{product.status}</p>
                  </div>
                </div>
                <div className="pt-2 flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(product)}>
                    <Edit size={16} className="mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteClick(product.product_id)}>
                    <Trash2 size={16} className="mr-1 text-factory-danger" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border">
            <Package className="mx-auto h-12 w-12 text-factory-gray-300" />
            <p className="mt-4 text-factory-gray-500">No products found. Add your first product.</p>
          </div>
        )}
      </div>
      {/* Add Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-code">Product Code</Label>
                <Input id="product-code" value={newProduct.product_code} onChange={e => setNewProduct({ ...newProduct, product_code: e.target.value })} placeholder="Enter product code" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input id="product-name" value={newProduct.product_name} onChange={e => setNewProduct({ ...newProduct, product_name: e.target.value })} placeholder="Enter product name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discharge-range">Discharge Range</Label>
                <Input id="discharge-range" value={newProduct.discharge_range} onChange={e => setNewProduct({ ...newProduct, discharge_range: e.target.value })} placeholder="e.g., 10-50 LPM" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="head-range">Head Range</Label>
                <Input id="head-range" value={newProduct.head_range} onChange={e => setNewProduct({ ...newProduct, head_range: e.target.value })} placeholder="e.g., 5-20 m" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating-range">Rating Range</Label>
                <Input id="rating-range" value={newProduct.rating_range} onChange={e => setNewProduct({ ...newProduct, rating_range: e.target.value })} placeholder="e.g., 0.5-2 HP" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost-price">Cost Price</Label>
                <Input id="cost-price" type="number" min="0" step="0.01" value={newProduct.cost_price} onChange={e => setNewProduct({ ...newProduct, cost_price: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={newProduct.status} onValueChange={val => setNewProduct({ ...newProduct, status: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-price">Price</Label>
                <Input id="product-price" type="number" min="0" step="0.01" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
              </div>
            </div>
            {/* Bill of Materials Section */}
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">Bill of Materials</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-1 space-y-2">
                  <Label htmlFor="material">Raw Material</Label>
                  <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map(material => (
                        <SelectItem key={material.material_id} value={material.material_id.toString()}>{material.material_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material-quantity">Quantity Required</Label>
                  <Input id="material-quantity" type="number" min="1" step="0.01" value={materialQuantity} onChange={e => setMaterialQuantity(parseFloat(e.target.value) || 1)} />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleAddMaterial} className="flex-1">Add Material</Button>
                </div>
              </div>
              {bomItems.length > 0 && (
                <div className="border rounded-md overflow-hidden mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead className="w-20">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomItems.map((item, idx) => {
                        const material = rawMaterials.find(m => m.material_id === item.material_id);
                        return (
                          <TableRow key={idx}>
                            <TableCell>{material?.material_name}</TableCell>
                            <TableCell>{item.quantity_required} {material?.unit}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveMaterial(item.material_id)}>
                                <Trash2 size={16} className="text-factory-danger" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            {/* Manufacturing Steps Section */}
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">Manufacturing Process Steps</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {stages.map(stage => (
                  <Button key={stage.stage_id} variant={selectedStages.includes(stage.stage_id) ? 'default' : 'outline'} size="sm" onClick={() => handleToggleStage(stage.stage_id)}>
                    {stage.stage_name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProduct} className="bg-factory-primary hover:bg-factory-primary/90" disabled={!newProduct.product_name || !newProduct.product_code || !newProduct.price}>Create Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-product-code">Product Code</Label>
                  <Input id="edit-product-code" value={editProduct.product_code} onChange={e => setEditProduct({ ...editProduct, product_code: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-product-name">Product Name</Label>
                  <Input id="edit-product-name" value={editProduct.product_name} onChange={e => setEditProduct({ ...editProduct, product_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-discharge-range">Discharge Range</Label>
                  <Input id="edit-discharge-range" value={editProduct.discharge_range} onChange={e => setEditProduct({ ...editProduct, discharge_range: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-head-range">Head Range</Label>
                  <Input id="edit-head-range" value={editProduct.head_range} onChange={e => setEditProduct({ ...editProduct, head_range: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-rating-range">Rating Range</Label>
                  <Input id="edit-rating-range" value={editProduct.rating_range} onChange={e => setEditProduct({ ...editProduct, rating_range: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cost-price">Cost Price</Label>
                  <Input id="edit-cost-price" type="number" min="0" step="0.01" value={editProduct.cost_price} onChange={e => setEditProduct({ ...editProduct, cost_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editProduct.status} onValueChange={val => setEditProduct({ ...editProduct, status: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-product-price">Price</Label>
                  <Input id="edit-product-price" type="number" min="0" step="0.01" value={editProduct.price} onChange={e => setEditProduct({ ...editProduct, price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-factory-primary hover:bg-factory-primary/90">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Product Confirmation Dialog */}
      <Dialog open={deleteProductId !== null} onOpenChange={open => { if (!open) setDeleteProductId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this product?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProductId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
