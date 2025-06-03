import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, AlertTriangle, ChevronDown, ChevronRight, Settings, Package, Zap, X, Save, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ProductService from '@/services/Product.service';

interface Product {
  id: string;
  name: string;
  productCode: string;
  description?: string;
  ratingRange?: string;
  dischargeRange?: string;
  headRange?: string;
  category?: string;
  version?: string;
  finalAssemblyTime: number;
  subComponents: SubComponent[];
  manufacturingSteps: ManufacturingStep[];
  createdAt: string;
  updatedAt: string;
}

interface SubComponent {
  id: string;
  name: string;
  description?: string;
  estimatedTime: number;
  materials: ComponentMaterial[];
  manufacturingSteps: ManufacturingStep[];
}

interface ComponentMaterial {
  materialId: string;
  materialName: string;
  quantityRequired: number;
  unit: string;
}

interface ManufacturingStep {
  id: string;
  name: string;
  description?: string;
  estimatedTime: number;
  sequence: number;
}

interface RawMaterial {
  material_id: string;
  material_code: string;
  material_name: string;
  description?: string;
  unit: string;
  current_stock: string;
  minimum_stock: string;
  unit_price: string;
  supplier?: string;
  created_at: string;
  updated_at: string;
  moc: string;
  unit_weight: string;
}


export const ProductBuilder = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
const [lowStockMaterials, setLowStockMaterials] = useState<RawMaterial[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [showProductForm, setShowProductForm] = useState(false);
  const [showSubComponentForm, setShowSubComponentForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingSubComponent, setEditingSubComponent] = useState<{ productId: string; subComponent: SubComponent | null }>({ productId: '', subComponent: null });
  const [editingMaterial, setEditingMaterial] = useState<{ productId: string; subComponentId: string; material: ComponentMaterial | null }>({ productId: '', subComponentId: '', material: null });

  // Form data
  const [productForm, setProductForm] = useState({
    name: '',
    productCode: '',
    description: '',
    ratingRange: '',
    dischargeRange: '',
    headRange: '',
    category: '',
    version: '',
    finalAssemblyTime: 0
  });

  const [subComponentForm, setSubComponentForm] = useState({
    name: '',
    description: '',
    estimatedTime: 0
  });

  const [materialForm, setMaterialForm] = useState({
    materialId: '',
    quantityRequired: 0,
    unit: ''
  });

  useEffect(() => {
    loadProducts();
    loadRawMaterials();
    loadLowStockMaterials();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await ProductService.getAllProducts();
      console.log(response);
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRawMaterials = async () => {
    try {
      const response = await ProductService.getAllRawMaterials();
      console.log(response);
      if (Array.isArray(response)) {
        setRawMaterials(response);
      }
      
    } catch (error) {
      console.error('Error loading raw materials:', error);
    }
  };

  const loadLowStockMaterials = async () => {
    try {
      const response = await ProductService.getLowStockMaterials();
      if (Array.isArray(response)) {
        setLowStockMaterials(response);
      }
    } catch (error) {
      console.error('Error loading low stock materials:', error);
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      productCode: '',
      description: '',
      ratingRange: '',
      dischargeRange: '',
      headRange: '',
      category: '',
      version: '',
      finalAssemblyTime: 0
    });
    setEditingProduct(null);
  };

  const resetSubComponentForm = () => {
    setSubComponentForm({
      name: '',
      description: '',
      estimatedTime: 0
    });
    setEditingSubComponent({ productId: '', subComponent: null });
  };

  const resetMaterialForm = () => {
    setMaterialForm({
      materialId: '',
      quantityRequired: 0,
      unit: ''
    });
    setEditingMaterial({ productId: '', subComponentId: '', material: null });
  };

  const handleCreateProduct = () => {
    resetProductForm();
    setProductForm(prev => ({ ...prev, productCode: `PRD-${Date.now()}`, version: '1.0' }));
    setShowProductForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setProductForm({
      name: product.name,
      productCode: product.productCode,
      description: product.description || '',
      ratingRange: product.ratingRange || '',
      dischargeRange: product.dischargeRange || '',
      headRange: product.headRange || '',
      category: product.category || '',
      version: product.version || '',
      finalAssemblyTime: product.finalAssemblyTime
    });
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleSaveProduct = async () => {
    try {
      if (editingProduct) {
        await ProductService.updateProduct(editingProduct.id, productForm);
      } else {
        await ProductService.createProduct(productForm);
      }
      setShowProductForm(false);
      resetProductForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await ProductService.deleteProduct(productId);
        loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleCreateSubComponent = (productId: string) => {
    resetSubComponentForm();
    setEditingSubComponent({ productId, subComponent: null });
    setShowSubComponentForm(true);
  };

  const handleEditSubComponent = (productId: string, subComponent: SubComponent) => {
    setSubComponentForm({
      name: subComponent.name,
      description: subComponent.description || '',
      estimatedTime: subComponent.estimatedTime
    });
    setEditingSubComponent({ productId, subComponent });
    setShowSubComponentForm(true);
  };

  const handleSaveSubComponent = async () => {
    try {
      if (editingSubComponent.subComponent) {
        await ProductService.updateSubComponent(
          editingSubComponent.productId,
          editingSubComponent.subComponent.id,
          subComponentForm
        );
      } else {
        await ProductService.addSubComponent(editingSubComponent.productId, subComponentForm);
      }
      setShowSubComponentForm(false);
      resetSubComponentForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving sub-component:', error);
    }
  };

  const handleDeleteSubComponent = async (productId: string, subComponentId: string) => {
    if (window.confirm('Are you sure you want to delete this sub-component?')) {
      try {
        await ProductService.deleteSubComponent(productId, subComponentId);
        loadProducts();
      } catch (error) {
        console.error('Error deleting sub-component:', error);
      }
    }
  };

  const handleCreateMaterial = (productId: string, subComponentId: string) => {
    resetMaterialForm();
    setEditingMaterial({ productId, subComponentId, material: null });
    setShowMaterialForm(true);
  };

  const handleEditMaterial = (productId: string, subComponentId: string, material: ComponentMaterial) => {
    setMaterialForm({
      materialId: material.materialId,
      quantityRequired: material.quantityRequired,
      unit: material.unit
    });
    setEditingMaterial({ productId, subComponentId, material });
    setShowMaterialForm(true);
  };

  const handleSaveMaterial = async () => {
    try {
      const selectedMaterial = rawMaterials.find(m => m.material_id === materialForm.materialId);
      const materialData = {
        ...materialForm,
        materialName: selectedMaterial?.material_name || '',
        unit: selectedMaterial?.unit || materialForm.unit
      };

      if (editingMaterial.material) {
        await ProductService.updateMaterial(
          editingMaterial.productId,
          editingMaterial.subComponentId,
          editingMaterial.material.materialId,
          materialData
        );
      } else {
        await ProductService.addMaterialToSubComponent(
          editingMaterial.productId,
          editingMaterial.subComponentId,
          materialData
        );
      }
      setShowMaterialForm(false);
      resetMaterialForm();
      loadProducts();
    } catch (error) {
      console.error('Error saving material:', error);
    }
  };

  const handleDeleteMaterial = async (productId: string, subComponentId: string, materialId: string) => {
    if (window.confirm('Are you sure you want to remove this material?')) {
      try {
        await ProductService.deleteMaterial(productId, subComponentId, materialId);
        loadProducts();
      } catch (error) {
        console.error('Error deleting material:', error);
      }
    }
  };

  const toggleProductExpansion = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const isLowStock = (materialId: string) => {
    return lowStockMaterials.some(m => 
      m.material_id === materialId && parseFloat(m.current_stock) < parseFloat(m.minimum_stock)
    );
  };

  const ProductSpecifications = ({ product }: { product: Product }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-full">
          <Zap className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <span className="text-sm font-medium text-blue-800">Rating</span>
          <p className="text-blue-700 font-semibold">{product.ratingRange || 'Not specified'}</p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-full">
          <Package className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <span className="text-sm font-medium text-blue-800">Discharge</span>
          <p className="text-blue-700 font-semibold">{product.dischargeRange || 'Not specified'}</p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-full">
          <Settings className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <span className="text-sm font-medium text-blue-800">Head</span>
          <p className="text-blue-700 font-semibold">{product.headRange || 'Not specified'}</p>
        </div>
      </div>
    </div>
  );

  const BillOfMaterials = ({ subComponent, productId }: { subComponent: SubComponent; productId: string }) => (
    
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-medium text-sm flex items-center">
          <Package className="h-4 w-4 mr-2 text-gray-600" />
          Bill of Materials
        </h5>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCreateMaterial(productId, subComponent.id)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Material
        </Button>
      </div>
      {console.log(subComponent)}
      
      {(subComponent.materials || []).length === 0 ? (
        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No materials assigned</p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 text-xs font-medium text-gray-600 border-b">
            <span>Material</span>
            <span>Quantity</span>
            <span>Unit</span>
            <span>Actions</span>
          </div>
          {(subComponent.materials || []).map((material, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-4 p-3 border-b last:border-b-0 hover:bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-sm">{material.materialName}</span>
                {isLowStock(material.materialId) && (
                  <AlertTriangle className="h-3 w-3 text-orange-500" aria-label="Low stock" />
                )}
              </div>
              <span className="text-sm font-medium">{material.quantityRequired}</span>
              <span className="text-sm text-gray-600">{material.unit}</span>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditMaterial(productId, subComponent.id, material)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteMaterial(productId, subComponent.id, material.materialId)}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-600 mt-1">Manage products, sub-components, and bill of materials</p>
        </div>
        <Button onClick={handleCreateProduct} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : products.length > 0 ? (
          products.map(product => (
            <Card key={product.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <Collapsible 
                open={expandedProducts.has(product.id)}
                onOpenChange={() => toggleProductExpansion(product.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-100 rounded-full">
                          {expandedProducts.has(product.id) ? 
                            <ChevronDown className="h-5 w-5 text-blue-600" /> : 
                            <ChevronRight className="h-5 w-5 text-blue-600" />
                          }
                        </div>
                        <div>
                          <CardTitle className="text-xl flex items-center space-x-3">
                            <span>{product.name}</span>
                            <Badge variant="outline" className="text-xs">{product.productCode}</Badge>
                            {product.category && <Badge variant="secondary" className="text-xs">{product.category}</Badge>}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            {product.subComponents.length} sub-components • {product.finalAssemblyTime}min assembly
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProduct(product);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    <ProductSpecifications product={product} />
                    
                    {product.description && (
                      <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm text-gray-700">{product.description}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">Sub-Components</h4>
                        <Button 
                          variant="outline"
                          onClick={() => handleCreateSubComponent(product.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Sub-Component
                        </Button>
                      </div>
                      
                      {product.subComponents.length === 0 ? (
                        <div className="text-center py-8 bg-white border-2 border-dashed border-gray-200 rounded-lg">
                          <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-500">No sub-components defined</p>
                        </div>
                      ) : (
                        product.subComponents.map(subComponent => (
                          <Card key={subComponent.id} className="ml-6 border-l-4 border-l-blue-200">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-lg">{subComponent.name}</CardTitle>
                                  {subComponent.description && (
                                    <p className="text-sm text-gray-600 mt-1">{subComponent.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">{subComponent.estimatedTime}min</Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditSubComponent(product.id, subComponent)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSubComponent(product.id, subComponent.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <BillOfMaterials subComponent={subComponent} productId={product.id} />
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first product</p>
            <Button onClick={handleCreateProduct} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Button>
          </div>
        )}
      </div>

      {/* Product Form Dialog */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Product Code *</Label>
              <Input
                id="code"
                value={productForm.productCode}
                onChange={(e) => setProductForm(prev => ({ ...prev, productCode: e.target.value }))}
                placeholder="PRD-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={productForm.category} onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pumps">Pumps</SelectItem>
                  <SelectItem value="Motors">Motors</SelectItem>
                  <SelectItem value="Valves">Valves</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={productForm.version}
                onChange={(e) => setProductForm(prev => ({ ...prev, version: e.target.value }))}
                placeholder="1.0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating Range</Label>
              <Input
                id="rating"
                value={productForm.ratingRange}
                onChange={(e) => setProductForm(prev => ({ ...prev, ratingRange: e.target.value }))}
                placeholder="5 HP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discharge">Discharge Range</Label>
              <Input
                id="discharge"
                value={productForm.dischargeRange}
                onChange={(e) => setProductForm(prev => ({ ...prev, dischargeRange: e.target.value }))}
                placeholder="20 LPM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="head">Head Range</Label>
              <Input
                id="head"
                value={productForm.headRange}
                onChange={(e) => setProductForm(prev => ({ ...prev, headRange: e.target.value }))}
                placeholder="10 m"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assembly">Final Assembly Time (minutes)</Label>
              <Input
                id="assembly"
                type="number"
                value={productForm.finalAssemblyTime}
                onChange={(e) => setProductForm(prev => ({ ...prev, finalAssemblyTime: parseInt(e.target.value) || 0 }))}
                placeholder="60"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter product description"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowProductForm(false)}>Cancel</Button>
            <Button onClick={handleSaveProduct}>
              <Save className="h-4 w-4 mr-2" />
              {editingProduct ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SubComponent Form Dialog */}
      <Dialog open={showSubComponentForm} onOpenChange={setShowSubComponentForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubComponent.subComponent ? 'Edit Sub-Component' : 'Create New Sub-Component'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subName">Sub-Component Name *</Label>
              <Input
                id="subName"
                value={subComponentForm.name}
                onChange={(e) => setSubComponentForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter sub-component name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subTime">Estimated Time (minutes)</Label>
              <Input
                id="subTime"
                type="number"
                value={subComponentForm.estimatedTime}
                onChange={(e) => setSubComponentForm(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || 0 }))}
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subDescription">Description</Label>
              <Textarea
                id="subDescription"
                value={subComponentForm.description}
                onChange={(e) => setSubComponentForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter sub-component description"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowSubComponentForm(false)}>Cancel</Button>
            <Button onClick={handleSaveSubComponent}>
              <Save className="h-4 w-4 mr-2" />
              {editingSubComponent.subComponent ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Material Form Dialog */}
      <Dialog open={showMaterialForm} onOpenChange={setShowMaterialForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMaterial.material ? 'Edit Material' : 'Add New Material'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="material">Raw Material *</Label>
              <Select
                value={materialForm.materialId}
                onValueChange={(value) => {
                  const selectedMaterial = rawMaterials.find(m => m.material_id === value);
                  setMaterialForm(prev => ({
                    ...prev,
                    materialId: value,
                    unit: selectedMaterial?.unit || prev.unit
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select raw material" />
                </SelectTrigger>
                <SelectContent>
                  {rawMaterials.map(material => (
                    <SelectItem key={material.material_id} value={material.material_id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{material.material_name}</span>
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge variant="outline" className="text-xs">{material.unit}</Badge>
                          {isLowStock(material.material_id) && (
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity Required *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={materialForm.quantityRequired}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, quantityRequired: parseFloat(e.target.value) || 0 }))}
                  placeholder="1.0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={materialForm.unit}
                  onChange={(e) => setMaterialForm(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="kg, pcs, m"
                  disabled={!!materialForm.materialId}
                />
              </div>
            </div>
            {materialForm.materialId && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 text-sm">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    {rawMaterials.find(m => m.material_id === materialForm.materialId)?.material_name}
                  </span>
                  <span className="text-blue-600">
                    (Stock: {rawMaterials.find(m => m.material_id === materialForm.materialId)?.current_stock} {materialForm.unit})
                  </span>
                  {isLowStock(materialForm.materialId) && (
                    <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowMaterialForm(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveMaterial}
              disabled={!materialForm.materialId || materialForm.quantityRequired <= 0}
            >
              <Save className="h-4 w-4 mr-2" />
              {editingMaterial.material ? 'Update' : 'Add'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductBuilder;