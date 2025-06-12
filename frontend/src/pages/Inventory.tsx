import React, { useState } from 'react';
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
import { useQuery as useProductsQuery } from '@tanstack/react-query';
import { productService, ProductApiResponse } from '../services/productService';
import { finishedProductService, FinishedProductAPI } from '../services/finishedProduct.service';
import { subComponentService, SubComponent, CreateSubComponentDTO } from '../services/subComponent.service';

const Inventory: React.FC = () => {
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
    product_name: '',
    category: '',
    quantity: 0,
    price: 0
  });

  // Edit/Delete state
  const [editMaterial, setEditMaterial] = useState<null | CreateRawMaterialDTO & { material_id: number }>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteMaterialId, setDeleteMaterialId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Add state for edit, delete, and dispatch dialogs
  const [editProduct, setEditProduct] = useState<null | FinishedProductAPI>(null);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const [isDeleteProductDialogOpen, setIsDeleteProductDialogOpen] = useState(false);
  const [dispatchProduct, setDispatchProduct] = useState<null | FinishedProductAPI>(null);
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false);
  const [dispatchQuantity, setDispatchQuantity] = useState(1);

  // Add state for selecting a backend product when adding a finished product
  const [selectedBackendProductId, setSelectedBackendProductId] = useState<number | null>(null);

  // Add state for pagination
  const [rawMaterialPage, setRawMaterialPage] = useState(1);
  const [finishedProductPage, setFinishedProductPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // Add state for sub-components
  const [searchSubComponent, setSearchSubComponent] = useState('');
  const [isSubComponentDialogOpen, setIsSubComponentDialogOpen] = useState(false);
  const [newSubComponent, setNewSubComponent] = useState<CreateSubComponentDTO>({
    component_code: '',
    component_name: '',
    description: '',
    category: '',
    unit: 'pcs',
    current_stock: 0,
    minimum_stock: 0,
    unit_price: 0
  });
  const [editSubComponent, setEditSubComponent] = useState<null | SubComponent>(null);
  const [isEditSubComponentDialogOpen, setIsEditSubComponentDialogOpen] = useState(false);
  const [deleteSubComponentId, setDeleteSubComponentId] = useState<number | null>(null);
  const [isDeleteSubComponentDialogOpen, setIsDeleteSubComponentDialogOpen] = useState(false);
  const [subComponentPage, setSubComponentPage] = useState(1);

  // Fetch raw materials
  const { data: rawMaterials = [], isLoading } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: rawMaterialService.getAllRawMaterials
  });
  
  // Fetch backend products
  const { data: backendProductsResponse } = useProductsQuery<ProductApiResponse>({
    queryKey: ['backendProducts'],
    queryFn: productService.getAllProducts
  });

  const backendProducts = backendProductsResponse?.data || [];

  // Fetch finished products
  const { data: finishedProducts = [], isLoading: isLoadingFinishedProducts } = useQuery({
    queryKey: ['finishedProducts'],
    queryFn: finishedProductService.getAll
  });

  // Fetch sub-components
  const { data: subComponents = [], isLoading: isLoadingSubComponents } = useQuery({
    queryKey: ['subComponents'],
    queryFn: subComponentService.getAllSubComponents
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
    (product.product_name?.toLowerCase() || '').includes(searchFinishedProduct.toLowerCase()) ||
    (product.category?.toLowerCase() || '').includes(searchFinishedProduct.toLowerCase())
  );
  
  // Paginated data
  const paginatedRawMaterials = filteredRawMaterials.slice((rawMaterialPage - 1) * ROWS_PER_PAGE, rawMaterialPage * ROWS_PER_PAGE);
  const totalRawMaterialPages = Math.ceil(filteredRawMaterials.length / ROWS_PER_PAGE);
  const paginatedFinishedProducts = filteredFinishedProducts.slice((finishedProductPage - 1) * ROWS_PER_PAGE, finishedProductPage * ROWS_PER_PAGE);
  const totalFinishedProductPages = Math.ceil(filteredFinishedProducts.length / ROWS_PER_PAGE);
  
  // Calculations
  const totalRawMaterialValue = rawMaterials.reduce(
    (total, material) => total + (material.current_stock * material.unit_price), 0
  );
  
  const totalFinishedProductValue = finishedProducts.reduce(
    (total, product) => total + ((product.quantity_available || 0) * (product.unit_price || 0)), 0
  );
  
  // Filtered data for sub-components
  const filteredSubComponents = subComponents.filter(component =>
    component.component_name.toLowerCase().includes(searchSubComponent.toLowerCase()) ||
    component.component_code.toLowerCase().includes(searchSubComponent.toLowerCase())
  );

  // Paginated data for sub-components
  const paginatedSubComponents = filteredSubComponents.slice((subComponentPage - 1) * ROWS_PER_PAGE, subComponentPage * ROWS_PER_PAGE);
  const totalSubComponentPages = Math.ceil(filteredSubComponents.length / ROWS_PER_PAGE);

  // Calculations for sub-components
  const totalSubComponentValue = subComponents.reduce(
    (total, component) => total + (component.current_stock * component.unit_price), 0
  );

  // Form handlers
  const handleAddRawMaterial = () => {
    createRawMaterialMutation.mutate(newRawMaterial);
  };
  
  const handleAddFinishedProduct = async () => {
    if (!selectedBackendProductId) return;
    
    const selectedProduct = backendProducts.find(p => p.product_id === selectedBackendProductId);
    if (!selectedProduct) return;

    await createFinishedProductMutation.mutate({
      product_id: selectedBackendProductId,
      quantity_available: newProduct.quantity,
      unit_price: newProduct.price,
      product_name: selectedProduct.product_name,
      product_code: selectedProduct.product_code,
      category: selectedProduct.category
    });
  };
  
  // Create finished product mutation
  const createFinishedProductMutation = useMutation({
    mutationFn: (data: Partial<FinishedProductAPI>) => finishedProductService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      setIsProductDialogOpen(false);
      setNewProduct({
        product_name: '',
        category: '',
        quantity: 0,
        price: 0
      });
      setSelectedBackendProductId(null);
      toast({
        title: 'Success',
        description: 'Finished product added successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add finished product',
        variant: 'destructive'
      });
    }
  });

  // Update finished product mutation
  const updateFinishedProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FinishedProductAPI> }) => 
      finishedProductService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      setIsEditProductDialogOpen(false);
      setEditProduct(null);
      toast({
        title: 'Success',
        description: 'Finished product updated successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update finished product',
        variant: 'destructive'
      });
    }
  });

  // Delete finished product mutation
  const deleteFinishedProductMutation = useMutation({
    mutationFn: (id: number) => finishedProductService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      setIsDeleteProductDialogOpen(false);
      setDeleteProductId(null);
      toast({
        title: 'Success',
        description: 'Finished product deleted successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete finished product',
        variant: 'destructive'
      });
    }
  });

  // Create sub-component mutation
  const createSubComponentMutation = useMutation({
    mutationFn: subComponentService.createSubComponent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subComponents'] });
      setIsSubComponentDialogOpen(false);
      setNewSubComponent({
        component_code: '',
        component_name: '',
        description: '',
        category: '',
        unit: 'pcs',
        current_stock: 0,
        minimum_stock: 0,
        unit_price: 0
      });
      toast({
        title: 'Success',
        description: 'Sub-component added successfully'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add sub-component',
        variant: 'destructive'
      });
    }
  });

  // Update sub-component mutation
  const updateSubComponentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSubComponentDTO> }) => subComponentService.updateSubComponent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subComponents'] });
      setIsEditSubComponentDialogOpen(false);
      setEditSubComponent(null);
      toast({ title: 'Success', description: 'Sub-component updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update sub-component', variant: 'destructive' });
    }
  });

  // Delete sub-component mutation
  const deleteSubComponentMutation = useMutation({
    mutationFn: (id: number) => subComponentService.deleteSubComponent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subComponents'] });
      setIsDeleteSubComponentDialogOpen(false);
      setDeleteSubComponentId(null);
      toast({ title: 'Success', description: 'Sub-component deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete sub-component', variant: 'destructive' });
    }
  });

  // Form handlers for sub-components
  const handleAddSubComponent = () => {
    createSubComponentMutation.mutate(newSubComponent);
  };

  const handleEditSubComponent = () => {
    if (editSubComponent) {
      updateSubComponentMutation.mutate({ id: editSubComponent.sub_component_id, data: editSubComponent });
    }
  };

  const handleDeleteSubComponent = () => {
    if (deleteSubComponentId) {
      deleteSubComponentMutation.mutate(deleteSubComponentId);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-factory-gray-900">Inventory Management</h1>
      
      {/* Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <StatCard
          title="Sub-Component Inventory Value"
          value={formatCurrency(totalSubComponentValue)}
          icon={<Package size={20} />}
          description={`${subComponents.length} sub-components in stock`}
        />
      </div>
      
      {/* Tabs for Raw Materials, Finished Products, and Sub-Components */}
      <Tabs defaultValue="raw-materials" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="finished-products">Finished Products</TabsTrigger>
          <TabsTrigger value="sub-components">Sub-Components</TabsTrigger>
        </TabsList>

        <TabsContent value="raw-materials" className="space-y-4">
          {/* Raw Materials Tab Content */}
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
                      {paginatedRawMaterials.map((material) => (
                        <TableRow key={material.material_id}>
                          <TableCell className="font-medium">{material.material_code}</TableCell>
                          <TableCell>{material.material_name}</TableCell>
                          <TableCell>{material.moc}</TableCell>
                          <TableCell>{(Number(material.unit_weight) || 0).toFixed(2)}</TableCell>
                          <TableCell>{material.current_stock.toLocaleString()}</TableCell>
                          <TableCell>{material.unit}</TableCell>
                          <TableCell>{formatCurrency(material.unit_price)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(material.current_stock * material.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">{formatDate(material.updated_at || material.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditMaterial(material);
                              setIsEditDialogOpen(true);
                            }}>Edit</Button>
                            <Button size="sm" variant="destructive" className="ml-2" onClick={() => {
                              setDeleteMaterialId(material.material_id);
                              setIsDeleteDialogOpen(true);
                            }}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalRawMaterialPages > 1 && (
                  <div className="flex justify-center mt-4 gap-2">
                    <button
                      className={`px-3 py-1 rounded border ${rawMaterialPage === 1 ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
                      onClick={() => rawMaterialPage > 1 && setRawMaterialPage(rawMaterialPage - 1)}
                      disabled={rawMaterialPage === 1}
                      aria-label="Previous Page"
                    >
                      &#60;
                    </button>
                    <span className="px-2 py-1 text-sm text-gray-700">{rawMaterialPage} <span className="mx-1">of</span> {totalRawMaterialPages}</span>
                    <button
                      className={`px-3 py-1 rounded border ${rawMaterialPage === totalRawMaterialPages ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
                      onClick={() => rawMaterialPage < totalRawMaterialPages && setRawMaterialPage(rawMaterialPage + 1)}
                      disabled={rawMaterialPage === totalRawMaterialPages}
                      aria-label="Next Page"
                    >
                      &#62;
                    </button>
                  </div>
                )}
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

        <TabsContent value="finished-products" className="space-y-4">
          {/* Finished Products Tab Content */}
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
          
          {isLoadingFinishedProducts ? (
            <div className="text-center py-12">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-2 text-gray-500">Loading finished products...</p>
            </div>
          ) : filteredFinishedProducts.length > 0 ? (
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
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      
                      {paginatedFinishedProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.quantity_available.toLocaleString()}</TableCell>
                          <TableCell>{formatCurrency(product.unit_price || 0)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency((product.quantity_available || 0) * (product.unit_price || 0))}
                          </TableCell>
                          <TableCell className="text-right">{formatDate(product.added_on || '')}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditProduct(product);
                              setIsEditProductDialogOpen(true);
                            }}>Edit</Button>
                            <Button size="sm" variant="destructive" className="ml-2" onClick={() => {
                              setDeleteProductId(product.finished_product_id);
                              setIsDeleteProductDialogOpen(true);
                            }}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalFinishedProductPages > 1 && (
                  <div className="flex justify-center mt-4 gap-2">
                    <button
                      className={`px-3 py-1 rounded border ${finishedProductPage === 1 ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
                      onClick={() => finishedProductPage > 1 && setFinishedProductPage(finishedProductPage - 1)}
                      disabled={finishedProductPage === 1}
                      aria-label="Previous Page"
                    >
                      &#60;
                    </button>
                    <span className="px-2 py-1 text-sm text-gray-700">{finishedProductPage} <span className="mx-1">of</span> {totalFinishedProductPages}</span>
                    <button
                      className={`px-3 py-1 rounded border ${finishedProductPage === totalFinishedProductPages ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
                      onClick={() => finishedProductPage < totalFinishedProductPages && setFinishedProductPage(finishedProductPage + 1)}
                      disabled={finishedProductPage === totalFinishedProductPages}
                      aria-label="Next Page"
                    >
                      &#62;
                    </button>
                  </div>
                )}
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

        <TabsContent value="sub-components" className="space-y-4">
          {/* Sub-Components Tab Content */}
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-factory-gray-400" />
              <Input
                placeholder="Search sub-components..."
                value={searchSubComponent}
                onChange={(e) => setSearchSubComponent(e.target.value)}
                className="pl-9 pr-4"
              />
            </div>
            <Button 
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={() => setIsSubComponentDialogOpen(true)}
            >
              <Plus size={16} className="mr-2" />
              Add Sub-Component
            </Button>
          </div>
          
          {isLoadingSubComponents ? (
            <div className="text-center py-12">
              <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-2 text-gray-500">Loading sub-components...</p>
            </div>
          ) : filteredSubComponents.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component Code</TableHead>
                        <TableHead>Component Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        <TableHead className="text-right">Last Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      
                      {paginatedSubComponents.map((component) => (
                        <TableRow key={component.sub_component_id}>
                          <TableCell className="font-medium">{component.component_code}</TableCell>
                          <TableCell>{component.component_name}</TableCell>
                          <TableCell>{component.category}</TableCell>
                          <TableCell>{component.current_stock.toLocaleString()}</TableCell>
                          <TableCell>{component.unit}</TableCell>
                          <TableCell>{formatCurrency(component.unit_price)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(component.current_stock * component.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">{formatDate(component.updated_at || component.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => {
                              setEditSubComponent(component);
                              setIsEditSubComponentDialogOpen(true);
                            }}>Edit</Button>
                            <Button size="sm" variant="destructive" className="ml-2" onClick={() => {
                              setDeleteSubComponentId(component.sub_component_id);
                              setIsDeleteSubComponentDialogOpen(true);
                            }}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalSubComponentPages > 1 && (
                  <div className="flex justify-center mt-4 gap-2">
                    <button
                      className={`px-3 py-1 rounded border ${subComponentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
                      onClick={() => subComponentPage > 1 && setSubComponentPage(subComponentPage - 1)}
                      disabled={subComponentPage === 1}
                      aria-label="Previous Page"
                    >
                      &#60;
                    </button>
                    <span className="px-2 py-1 text-sm text-gray-700">{subComponentPage} <span className="mx-1">of</span> {totalSubComponentPages}</span>
                    <button
                      className={`px-3 py-1 rounded border ${subComponentPage === totalSubComponentPages ? 'opacity-50 cursor-not-allowed' : 'bg-white text-factory-primary border-factory-primary'}`}
                      onClick={() => subComponentPage < totalSubComponentPages && setSubComponentPage(subComponentPage + 1)}
                      disabled={subComponentPage === totalSubComponentPages}
                      aria-label="Next Page"
                    >
                      &#62;
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium">No sub-components found</h3>
              <p className="mt-1 text-gray-500">Add your first sub-component to get started.</p>
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
              <Label htmlFor="backend-product">Select Product</Label>
              <select
                id="backend-product"
                value={selectedBackendProductId ?? ''}
                onChange={e => setSelectedBackendProductId(Number(e.target.value) || null)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="">Select a product</option>
                {backendProducts.map((p: any) => (
                  <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                ))}
              </select>
            </div>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={handleAddFinishedProduct}
              disabled={!selectedBackendProductId || newProduct.quantity <= 0 || newProduct.price <= 0}
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
                <Input
                  id="edit-material-code"
                  value={editMaterial.material_code}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-material-name">Material Name</Label>
                <Input
                  id="edit-material-name"
                  value={editMaterial.material_name}
                  onChange={(e) => setEditMaterial({...editMaterial, material_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-material-moc">Material of Construction (MOC)</Label>
                <Input
                  id="edit-material-moc"
                  value={editMaterial.moc}
                  onChange={(e) => setEditMaterial({...editMaterial, moc: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-material-unit-weight">Unit Weight</Label>
                  <Input
                    id="edit-material-unit-weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editMaterial.unit_weight}
                    onChange={(e) => setEditMaterial({...editMaterial, unit_weight: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-material-unit">Unit of Measurement</Label>
                  <Input
                    id="edit-material-unit"
                    value={editMaterial.unit}
                    onChange={(e) => setEditMaterial({...editMaterial, unit: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-material-stock">Current Stock</Label>
                  <Input
                    id="edit-material-stock"
                    type="number"
                    step="1"
                    min="0"
                    value={editMaterial.current_stock}
                    onChange={(e) => setEditMaterial({...editMaterial, current_stock: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-material-min-stock">Minimum Stock</Label>
                  <Input
                    id="edit-material-min-stock"
                    type="number"
                    step="1"
                    min="0"
                    value={editMaterial.minimum_stock}
                    onChange={(e) => setEditMaterial({...editMaterial, minimum_stock: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-material-price">Unit Price</Label>
                <Input
                  id="edit-material-price"
                  type="number"
                  step="1"
                  min="0"
                  value={editMaterial.unit_price}
                  onChange={(e) => setEditMaterial({...editMaterial, unit_price: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={() => updateRawMaterialMutation.mutate({ id: editMaterial!.material_id, data: editMaterial! })}
              disabled={!editMaterial?.material_name || !editMaterial?.unit || editMaterial.current_stock < 0 || editMaterial.unit_price <= 0}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Raw Material Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete this raw material?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteRawMaterialMutation.mutate(deleteMaterialId!)}
              disabled={!deleteMaterialId}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Finished Product Dialog */}
      <Dialog open={isEditProductDialogOpen} onOpenChange={setIsEditProductDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Finished Product</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-product-name">Product Name</Label>
                <Input
                  id="edit-product-name"
                  value={editProduct.product_name}
                  onChange={(e) => setEditProduct({...editProduct, product_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-category">Category</Label>
                <Input
                  id="edit-product-category"
                  value={editProduct.category}
                  onChange={(e) => setEditProduct({...editProduct, category: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-quantity">Quantity Available</Label>
                <Input
                  id="edit-product-quantity"
                  type="number"
                  min="0"
                  value={editProduct.quantity_available}
                  onChange={(e) => setEditProduct({...editProduct, quantity_available: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-price">Unit Price</Label>
                <Input
                  id="edit-product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editProduct.unit_price}
                  onChange={(e) => setEditProduct({...editProduct, unit_price: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={() => {
                if (editProduct) {
                  updateFinishedProductMutation.mutate({
                    id: editProduct.finished_product_id,
                    data: {
                      quantity_available: editProduct.quantity_available,
                      unit_price: editProduct.unit_price
                    }
                  });
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Finished Product Dialog */}
      <Dialog open={isDeleteProductDialogOpen} onOpenChange={setIsDeleteProductDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete this finished product?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteProductDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (deleteProductId) {
                  deleteFinishedProductMutation.mutate(deleteProductId);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Sub-Component Dialog */}
      <Dialog open={isSubComponentDialogOpen} onOpenChange={setIsSubComponentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Sub-Component</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="component-code">Component Code</Label>
              <Input
                id="component-code"
                placeholder="Enter component code"
                value={newSubComponent.component_code}
                onChange={(e) => setNewSubComponent({...newSubComponent, component_code: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="component-name">Component Name</Label>
              <Input
                id="component-name"
                placeholder="Enter component name"
                value={newSubComponent.component_name}
                onChange={(e) => setNewSubComponent({...newSubComponent, component_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="component-description">Description</Label>
              <Input
                id="component-description"
                placeholder="Enter description"
                value={newSubComponent.description || ''}
                onChange={(e) => setNewSubComponent({...newSubComponent, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="component-category">Category</Label>
              <Input
                id="component-category"
                placeholder="Enter category"
                value={newSubComponent.category || ''}
                onChange={(e) => setNewSubComponent({...newSubComponent, category: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="component-unit">Unit</Label>
                <Input
                  id="component-unit"
                  placeholder="e.g., pcs, kg"
                  value={newSubComponent.unit}
                  onChange={(e) => setNewSubComponent({...newSubComponent, unit: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="component-stock">Current Stock</Label>
                <Input
                  id="component-stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newSubComponent.current_stock}
                  onChange={(e) => setNewSubComponent({...newSubComponent, current_stock: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="component-min-stock">Minimum Stock</Label>
                <Input
                  id="component-min-stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newSubComponent.minimum_stock}
                  onChange={(e) => setNewSubComponent({...newSubComponent, minimum_stock: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="component-unit-price">Unit Price</Label>
                <Input
                  id="component-unit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newSubComponent.unit_price}
                  onChange={(e) => setNewSubComponent({...newSubComponent, unit_price: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubComponentDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={handleAddSubComponent}
              disabled={!newSubComponent.component_code || !newSubComponent.component_name || newSubComponent.current_stock < 0 || newSubComponent.unit_price <= 0}
            >
              Add Sub-Component
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sub-Component Dialog */}
      <Dialog open={isEditSubComponentDialogOpen} onOpenChange={setIsEditSubComponentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Sub-Component</DialogTitle>
          </DialogHeader>
          {editSubComponent && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-component-code">Component Code</Label>
                <Input
                  id="edit-component-code"
                  value={editSubComponent.component_code}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-component-name">Component Name</Label>
                <Input
                  id="edit-component-name"
                  value={editSubComponent.component_name}
                  onChange={(e) => setEditSubComponent({...editSubComponent, component_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-component-description">Description</Label>
                <Input
                  id="edit-component-description"
                  placeholder="Enter description"
                  value={editSubComponent.description || ''}
                  onChange={(e) => setEditSubComponent({...editSubComponent, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-component-category">Category</Label>
                <Input
                  id="edit-component-category"
                  placeholder="Enter category"
                  value={editSubComponent.category || ''}
                  onChange={(e) => setEditSubComponent({...editSubComponent, category: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-component-unit">Unit</Label>
                  <Input
                    id="edit-component-unit"
                    placeholder="e.g., pcs, kg"
                    value={editSubComponent.unit}
                    onChange={(e) => setEditSubComponent({...editSubComponent, unit: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-component-stock">Current Stock</Label>
                  <Input
                    id="edit-component-stock"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editSubComponent.current_stock}
                    onChange={(e) => setEditSubComponent({...editSubComponent, current_stock: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-component-min-stock">Minimum Stock</Label>
                  <Input
                    id="edit-component-min-stock"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editSubComponent.minimum_stock}
                    onChange={(e) => setEditSubComponent({...editSubComponent, minimum_stock: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-component-unit-price">Unit Price</Label>
                  <Input
                    id="edit-component-unit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editSubComponent.unit_price}
                    onChange={(e) => setEditSubComponent({...editSubComponent, unit_price: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSubComponentDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-factory-primary hover:bg-factory-primary/90"
              onClick={handleEditSubComponent}
              disabled={!editSubComponent?.component_name || editSubComponent.current_stock < 0 || editSubComponent.unit_price <= 0}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Sub-Component Dialog */}
      <Dialog open={isDeleteSubComponentDialogOpen} onOpenChange={setIsDeleteSubComponentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            Are you sure you want to delete this sub-component?
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteSubComponentDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteSubComponent}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
