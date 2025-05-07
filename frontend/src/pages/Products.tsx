
import React, { useState } from 'react';
import { useFactory } from '../context/FactoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '../utils/calculations';
import { BillOfMaterialItem, FinishedProduct, ManufacturingStep, RawMaterial } from '../types';
import { Plus, Edit, Trash2, Package, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Products: React.FC = () => {
  const { finishedProducts, rawMaterials, addFinishedProduct, addRawMaterial } = useFactory();
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProduct, setNewProduct] = useState<Partial<FinishedProduct>>({
    name: '',
    category: '',
    quantity: 0,
    price: 0,
    billOfMaterials: [],
    manufacturingSteps: []
  });

  // New state for product code
  const [productCode, setProductCode] = useState('');
  
  // For Bill of Materials editing
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [materialQuantity, setMaterialQuantity] = useState<number>(1);
  
  // For new raw material creation
  const [showNewMaterialForm, setShowNewMaterialForm] = useState(false);
  const [newMaterial, setNewMaterial] = useState<Partial<RawMaterial>>({
    name: '',
    unit: '',
    quantity: 0,
    pricePerUnit: 0
  });
  
  // For Manufacturing Steps editing
  const [newStep, setNewStep] = useState<string>('');
  
  const filteredProducts = finishedProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddMaterial = () => {
    if (selectedMaterial && materialQuantity > 0) {
      const material = rawMaterials.find(m => m.id === selectedMaterial);
      if (material) {
        const bomItem: BillOfMaterialItem = {
          materialId: material.id,
          materialName: material.name,
          quantityRequired: materialQuantity,
          unitOfMeasure: material.unit
        };
        
        setNewProduct({
          ...newProduct,
          billOfMaterials: [...(newProduct.billOfMaterials || []), bomItem]
        });
        
        setSelectedMaterial('');
        setMaterialQuantity(1);
      }
    } else if (showNewMaterialForm && newMaterial.name && newMaterial.unit) {
      // Create a new raw material and add it to the BOM
      addRawMaterial({
        name: newMaterial.name,
        unit: newMaterial.unit,
        quantity: newMaterial.quantity || 0,
        pricePerUnit: newMaterial.pricePerUnit || 0
      });
      
      // Reset new material form
      setNewMaterial({
        name: '',
        unit: '',
        quantity: 0,
        pricePerUnit: 0
      });
      
      setShowNewMaterialForm(false);
      
      toast({
        title: "Raw Material Added",
        description: `${newMaterial.name} has been added to inventory. You can now select it from the dropdown.`
      });
    }
  };
  
  const handleRemoveMaterial = (materialId: string) => {
    setNewProduct({
      ...newProduct,
      billOfMaterials: newProduct.billOfMaterials?.filter(item => item.materialId !== materialId)
    });
  };
  
  const handleAddStep = () => {
    if (newStep.trim()) {
      const step: ManufacturingStep = {
        id: Date.now().toString(),
        name: newStep,
        order: (newProduct.manufacturingSteps?.length || 0) + 1
      };
      
      setNewProduct({
        ...newProduct,
        manufacturingSteps: [...(newProduct.manufacturingSteps || []), step]
      });
      
      setNewStep('');
    }
  };
  
  const handleRemoveStep = (stepId: string) => {
    setNewProduct({
      ...newProduct,
      manufacturingSteps: newProduct.manufacturingSteps?.filter(step => step.id !== stepId)
        .map((step, index) => ({ ...step, order: index + 1 }))
    });
  };
  
  const handleCreateProduct = () => {
    if (
      newProduct.name &&
      productCode &&
      newProduct.category &&
      typeof newProduct.price === 'number' &&
      newProduct.price > 0
    ) {
      // Add the code to the product
      const productWithCode = {
        ...newProduct,
        name: `${productCode} - ${newProduct.name}` // Format: "CODE - Name"
      };
      
      addFinishedProduct(productWithCode as Omit<FinishedProduct, 'id' | 'lastUpdated'>);
      setIsProductDialogOpen(false);
      resetNewProduct();
    }
  };
  
  const resetNewProduct = () => {
    setNewProduct({
      name: '',
      category: '',
      quantity: 0,
      price: 0,
      billOfMaterials: [],
      manufacturingSteps: []
    });
    setProductCode('');
    setSelectedMaterial('');
    setMaterialQuantity(1);
    setNewStep('');
    setShowNewMaterialForm(false);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-factory-gray-900">Product Management</h1>
        <Button 
          onClick={() => setIsProductDialogOpen(true)}
          className="bg-factory-primary hover:bg-factory-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>
      
      <div className="bg-white rounded-lg p-4 border flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-auto flex-grow">
          <Search className="absolute left-3 top-3 h-4 w-4 text-factory-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="pumps">Solar Pumps</SelectItem>
              <SelectItem value="controllers">Controllers</SelectItem>
              <SelectItem value="accessories">Accessories</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardHeader className="bg-factory-gray-50 py-3 px-4">
                <div className="flex justify-between">
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <span className="text-sm px-2 py-1 bg-factory-primary/10 text-factory-primary rounded">
                    {product.category}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-factory-gray-500">Price</p>
                    <p className="font-medium">{formatCurrency(product.price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-factory-gray-500">In Stock</p>
                    <p className="font-medium">{product.quantity}</p>
                  </div>
                </div>
                
                {product.billOfMaterials && product.billOfMaterials.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Raw Materials Required:</p>
                    <div className="max-h-32 overflow-y-auto">
                      <Table>
                        <TableBody>
                          {product.billOfMaterials.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="py-1 px-2">{item.materialName}</TableCell>
                              <TableCell className="py-1 px-2 text-right">
                                {item.quantityRequired} {item.unitOfMeasure}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                
                {product.manufacturingSteps && product.manufacturingSteps.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Manufacturing Process:</p>
                    <div className="flex flex-wrap gap-1">
                      {product.manufacturingSteps
                        .sort((a, b) => a.order - b.order)
                        .map((step, idx, arr) => (
                          <div key={step.id} className="flex items-center">
                            <span className="text-xs px-2 py-1 bg-factory-gray-100 rounded">
                              {step.name}
                            </span>
                            {idx < arr.length - 1 && (
                              <span className="mx-1 text-factory-gray-400">→</span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-2 flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit size={16} className="mr-1" />
                    Edit
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
                <Input 
                  id="product-code" 
                  value={productCode} 
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="Enter product code"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input 
                  id="product-name" 
                  value={newProduct.name} 
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  placeholder="Enter product name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product-category">Category</Label>
              <Input 
                id="product-category" 
                value={newProduct.category} 
                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                placeholder="e.g., Solar Pump, Controller, Accessory"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-quantity">Initial Stock</Label>
                <Input 
                  id="product-quantity" 
                  type="number" 
                  min="0"
                  value={newProduct.quantity} 
                  onChange={(e) => setNewProduct({...newProduct, quantity: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="product-price">Price</Label>
                <Input 
                  id="product-price" 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={newProduct.price} 
                  onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            {/* Bill of Materials Section */}
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">Bill of Materials</h3>
              
              {!showNewMaterialForm ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-1 space-y-2">
                    <Label htmlFor="material">Raw Material</Label>
                    <Select 
                      value={selectedMaterial}
                      onValueChange={setSelectedMaterial}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        {rawMaterials.map((material) => (
                          <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="material-quantity">Quantity Required</Label>
                    <Input 
                      id="material-quantity" 
                      type="number" 
                      min="1" 
                      step="0.01"
                      value={materialQuantity} 
                      onChange={(e) => setMaterialQuantity(parseFloat(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <Button 
                      onClick={handleAddMaterial}
                      className="flex-1"
                    >
                      Add Material
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewMaterialForm(true)}
                      className="flex-1"
                    >
                      New Material
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-md p-4 mb-4 bg-gray-50">
                  <h4 className="text-sm font-medium mb-3">Add New Raw Material</h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-material-name">Material Name</Label>
                      <Input 
                        id="new-material-name" 
                        value={newMaterial.name} 
                        onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                        placeholder="Enter material name"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-material-unit">Unit of Measure</Label>
                        <Input 
                          id="new-material-unit" 
                          value={newMaterial.unit} 
                          onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                          placeholder="e.g., kg, m, pcs"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-material-price">Price Per Unit</Label>
                        <Input 
                          id="new-material-price" 
                          type="number"
                          step="0.01"
                          min="0"
                          value={newMaterial.pricePerUnit} 
                          onChange={(e) => setNewMaterial({...newMaterial, pricePerUnit: parseFloat(e.target.value) || 0})}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowNewMaterialForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddMaterial}
                        disabled={!newMaterial.name || !newMaterial.unit}
                      >
                        Add & Save Material
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {newProduct.billOfMaterials && newProduct.billOfMaterials.length > 0 && (
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
                      {newProduct.billOfMaterials.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.materialName}</TableCell>
                          <TableCell>{item.quantityRequired} {item.unitOfMeasure}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveMaterial(item.materialId)}
                            >
                              <Trash2 size={16} className="text-factory-danger" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            
            {/* Manufacturing Steps Section */}
            <div className="pt-4 border-t">
              <h3 className="font-medium mb-3">Manufacturing Process Steps</h3>
              
              <div className="flex gap-4 mb-4">
                <div className="flex-grow space-y-2">
                  <Label htmlFor="step-name">Step Name</Label>
                  <Input 
                    id="step-name" 
                    value={newStep} 
                    onChange={(e) => setNewStep(e.target.value)}
                    placeholder="e.g., Cutting, Assembly, Testing"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddStep}
                  >
                    Add Step
                  </Button>
                </div>
              </div>
              
              {newProduct.manufacturingSteps && newProduct.manufacturingSteps.length > 0 && (
                <div className="border rounded-md overflow-hidden mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Step Name</TableHead>
                        <TableHead className="w-20">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newProduct.manufacturingSteps
                        .sort((a, b) => a.order - b.order)
                        .map((step, idx) => (
                        <TableRow key={step.id}>
                          <TableCell>{step.order}</TableCell>
                          <TableCell>{step.name}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveStep(step.id)}
                            >
                              <Trash2 size={16} className="text-factory-danger" />
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
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsProductDialogOpen(false);
                resetNewProduct();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProduct}
              className="bg-factory-primary hover:bg-factory-primary/90"
              disabled={!newProduct.name || !productCode || !newProduct.category || !newProduct.price}
            >
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
