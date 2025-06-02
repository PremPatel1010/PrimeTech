import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, AlertTriangle, ChevronDown, ChevronRight, Settings, Package, Zap } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProductService } from '../services/Product.service';

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
  id: string;
  name: string;
  description?: string;
  unit: string;
  stockQuantity: number;
  minStockLevel: number;
  unitCost: number;
  supplier?: string;
}

export const ProductBuilder = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<RawMaterial[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadProducts();
    loadRawMaterials();
    loadLowStockMaterials();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await ProductService.getAllProducts();
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
      if (response.success && response.data) {
        setRawMaterials(response.data);
      }
    } catch (error) {
      console.error('Error loading raw materials:', error);
    }
  };

  const loadLowStockMaterials = async () => {
    try {
      const response = await ProductService.getLowStockMaterials();
      if (response.success && response.data) {
        setLowStockMaterials(response.data);
      }
    } catch (error) {
      console.error('Error loading low stock materials:', error);
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

  const handleCreateProduct = async () => {
    try {
      const newProduct = {
        name: 'New Product',
        productCode: `PRD-${Date.now()}`,
        description: 'Sample product description',
        ratingRange: '5 HP',
        dischargeRange: '20 LPM',
        headRange: '10 m',
        category: 'Pumps',
        version: '1.0',
        finalAssemblyTime: 60,
      };
      
      await ProductService.createProduct(newProduct);
      loadProducts();
    } catch (error) {
      console.error('Error creating product:', error);
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

  const handleAddSubComponent = async (productId: string) => {
    try {
      const newSubComponent = {
        name: 'New Sub-Component',
        description: 'Sample sub-component description',
        estimatedTime: 30,
        manufacturingSteps: []
      };

      await ProductService.addSubComponent(productId, newSubComponent);
      loadProducts();
    } catch (error) {
      console.error('Error adding sub-component:', error);
    }
  };

  const handleAddMaterial = async (productId: string, subComponentId: string) => {
    if (rawMaterials.length === 0) {
      alert('No raw materials available. Please add raw materials first.');
      return;
    }

    try {
      const newMaterial = {
        materialId: rawMaterials[0].id,
        quantityRequired: 1,
        unit: rawMaterials[0].unit
      };

      await ProductService.addMaterialToSubComponent(productId, subComponentId, newMaterial);
      loadProducts();
    } catch (error) {
      console.error('Error adding material:', error);
    }
  };

  const isLowStock = (materialId: string) => {
    return lowStockMaterials.some(m => m.id === materialId);
  };

  const ProductSpecifications = ({ product }: { product: Product }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <Zap className="h-4 w-4 text-blue-600" />
        <div>
          <span className="text-sm font-medium text-blue-800">Rating:</span>
          <p className="text-blue-700">{product.ratingRange || 'Not specified'}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Package className="h-4 w-4 text-blue-600" />
        <div>
          <span className="text-sm font-medium text-blue-800">Discharge:</span>
          <p className="text-blue-700">{product.dischargeRange || 'Not specified'}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Settings className="h-4 w-4 text-blue-600" />
        <div>
          <span className="text-sm font-medium text-blue-800">Head:</span>
          <p className="text-blue-700">{product.headRange || 'Not specified'}</p>
        </div>
      </div>
    </div>
  );

  const BillOfMaterials = ({ subComponent, productId }: { subComponent: SubComponent; productId: string }) => (
    <div className="mt-4">
      <h5 className="font-medium text-sm flex items-center mb-3">
        <Package className="h-4 w-4 mr-2" />
        Bill of Materials
      </h5>
      {subComponent.materials.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No materials assigned</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-600 border-b pb-1">
            <span>Material</span>
            <span>Quantity</span>
            <span>Unit</span>
          </div>
          {subComponent.materials.map((material, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2 text-sm py-1">
              <div className="flex items-center space-x-1">
                <span>{material.materialName}</span>
                {isLowStock(material.materialId) && (
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                )}
              </div>
              <span>{material.quantityRequired}</span>
              <span className="text-gray-600">{material.unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const ManufacturingSteps = ({ steps }: { steps: ManufacturingStep[] }) => (
    <div className="mt-4">
      <h5 className="font-medium text-sm flex items-center mb-3">
        <Settings className="h-4 w-4 mr-2" />
        Manufacturing Steps
      </h5>
      {steps.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No manufacturing steps defined</p>
      ) : (
        <div className="space-y-1">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center space-x-2 text-sm">
              <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
              <span>{step.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Product Builder</h2>
        <Button onClick={handleCreateProduct}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {lowStockMaterials.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockMaterials.map(material => (
                <Badge key={material.id} variant="destructive">
                  {material.name}: {material.stockQuantity} {material.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">Loading products...</div>
        ) : products.length > 0 ? (
          products.map(product => (
            <Card key={product.id} className="overflow-hidden">
              <Collapsible 
                open={expandedProducts.has(product.id)}
                onOpenChange={() => toggleProductExpansion(product.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedProducts.has(product.id) ? 
                          <ChevronDown className="h-5 w-5" /> : 
                          <ChevronRight className="h-5 w-5" />
                        }
                        <div>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <span>{product.name}</span>
                            <Badge variant="outline">{product.productCode}</Badge>
                          </CardTitle>
                          <p className="text-sm text-gray-600">
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
                            setSelectedProduct(product);
                            setIsEditing(true);
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
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Product Specifications */}
                      <ProductSpecifications product={product} />
                      
                      {/* Product Description */}
                      {product.description && (
                        <div className="p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-700">{product.description}</p>
                        </div>
                      )}

                      {/* Manufacturing Steps */}
                      <ManufacturingSteps steps={product.manufacturingSteps} />

                      {/* Sub-components */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Sub-Components</h4>
                        {product.subComponents.map(subComponent => (
                          <Card key={subComponent.id} className="ml-6">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{subComponent.name}</CardTitle>
                                <Badge variant="outline">{subComponent.estimatedTime}min</Badge>
                              </div>
                              {subComponent.description && (
                                <p className="text-sm text-gray-600">{subComponent.description}</p>
                              )}
                            </CardHeader>
                            <CardContent>
                              <BillOfMaterials subComponent={subComponent} productId={product.id} />
                              <ManufacturingSteps steps={subComponent.manufacturingSteps} />
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mt-3"
                                onClick={() => handleAddMaterial(product.id, subComponent.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Material
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                        
                        <Button 
                          variant="outline" 
                          className="ml-6"
                          onClick={() => handleAddSubComponent(product.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Sub-Component
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductBuilder;