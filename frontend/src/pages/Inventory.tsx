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
import { ProductService, Product } from '../services/Product.service';
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
    price: 0,
    rating_range: '',
    discharge_range: '',
    head_range: ''
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
  const [selectedBackendProductDetails, setSelectedBackendProductDetails] = useState<Product | null>(null);

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
  const { data: backendProductsResponse } = useProductsQuery({
    queryKey: ['backendProducts'],
    queryFn: ProductService.getAllProducts
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
    (product.category?.toLowerCase() || '').includes(searchFinishedProduct.toLowerCase()) ||
    (product.rating_range?.toLowerCase() || '').includes(searchFinishedProduct.toLowerCase()) ||
    (product.discharge_range?.toLowerCase() || '').includes(searchFinishedProduct.toLowerCase()) ||
    (product.head_range?.toLowerCase() || '').includes(searchFinishedProduct.toLowerCase())
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
        price: 0,
        rating_range: '',
        discharge_range: '',
        head_range: ''
      });
      setSelectedBackendProductId(null);
      setSelectedBackendProductDetails(null);
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
    mutationFn: ({ id, data }: { id: number; data: Partial<FinishedProductAPI> }) => finishedProductService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      setIsEditProductDialogOpen(false);
      setEditProduct(null);
      toast({ title: 'Success', description: 'Finished product updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update finished product', variant: 'destructive' });
    }
  });

  // Delete finished product mutation
  const deleteFinishedProductMutation = useMutation({
    mutationFn: (id: number) => finishedProductService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      setIsDeleteProductDialogOpen(false);
      setDeleteProductId(null);
      toast({ title: 'Success', description: 'Finished product deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete finished product', variant: 'destructive' });
    }
  });

  // Dispatch finished product mutation
  const dispatchFinishedProductMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => finishedProductService.dispatch(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishedProducts'] });
      setIsDispatchDialogOpen(false);
      setDispatchProduct(null);
      setDispatchQuantity(1);
      toast({ title: 'Success', description: 'Product dispatched successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to dispatch product', variant: 'destructive' });
    }
  });

  const handleUpdateFinishedProduct = () => {
    if (editProduct) {
      updateFinishedProductMutation.mutate({
        id: editProduct.finished_product_id,
        data: {
          quantity_available: editProduct.quantity_available,
          unit_price: editProduct.unit_price,
          minimum_stock: editProduct.minimum_stock,
          storage_location: editProduct.storage_location,
          status: editProduct.status
        }
      });
    }
  };

  const handleDeleteFinishedProduct = () => {
    if (deleteProductId) {
      deleteFinishedProductMutation.mutate(deleteProductId);
    }
  };

  const handleDispatchFinishedProduct = () => {
    if (dispatchProduct && dispatchQuantity > 0) {
      dispatchFinishedProductMutation.mutate({
        id: dispatchProduct.finished_product_id,
        quantity: dispatchQuantity
      });
    }
  };

  // Form handlers
  const handleAddRawMaterial = () => {
    createRawMaterialMutation.mutate(newRawMaterial);
  };
  
  const handleAddFinishedProduct = async () => {
    if (!selectedBackendProductId) return;
    
    const selectedProduct = backendProducts.find(p => p.id === selectedBackendProductId);
    if (!selectedProduct) return;

    await createFinishedProductMutation.mutate({
      product_id: selectedBackendProductId,
      quantity_available: newProduct.quantity,
      unit_price: newProduct.price,
      product_name: selectedProduct.name,
      product_code: selectedProduct.productCode,
      category: selectedProduct.category,
      rating_range: selectedProduct.ratingRange,
      discharge_range: selectedProduct.dischargeRange,
      head_range: selectedProduct.headRange
    });
  };

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
          description={`${subComponents.length} sub-component types in stock`}
        />
      </div>
      
      {/* Inventory Tabs */}
      <Tabs defaultValue="finished-products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="finished-products">Finished Products</TabsTrigger>
          <TabsTrigger value="sub-components">Sub-Components</TabsTrigger>
        </TabsList>

        {/* Raw Materials Tab Content */}
        <TabsContent value="raw-materials" className="space-y-4">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Raw Materials</h2>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search materials..."
                value={searchRawMaterial}
                onChange={(e) => setSearchRawMaterial(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => setIsRawMaterialDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Material
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Raw Materials Overview</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material Code</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead>MOC</TableHead>
                    <TableHead>Unit Weight</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>In Stock</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={11} className="text-center">Loading raw materials...</TableCell></TableRow>
                  ) : paginatedRawMaterials.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center">No raw materials found.</TableCell></TableRow>
                  ) : (
                    paginatedRawMaterials.map((material) => (
                      <TableRow key={material.material_id}>
                        <TableCell className="font-medium">{material.material_code}</TableCell>
                        <TableCell>{material.material_name}</TableCell>
                        <TableCell>{material.moc}</TableCell>
                        <TableCell>{material.unit_weight} kg</TableCell>
                        <TableCell>{material.unit}</TableCell>
                        <TableCell>
                          <Badge variant={material.current_stock > material.minimum_stock ? "default" : "destructive"}>
                            {material.current_stock}
                          </Badge>
                        </TableCell>
                        <TableCell>{material.minimum_stock}</TableCell>
                        <TableCell>{formatCurrency(material.unit_price)}</TableCell>
                        <TableCell>{formatCurrency(material.current_stock * material.unit_price)}</TableCell>
                        <TableCell>{formatDate(material.updated_at || material.created_at || '')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditMaterial(material);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setDeleteMaterialId(material.material_id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => setRawMaterialPage(prev => Math.max(prev - 1, 1))}
                  disabled={rawMaterialPage === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <span>Page {rawMaterialPage} of {totalRawMaterialPages}</span>
                <Button
                  onClick={() => setRawMaterialPage(prev => Math.min(prev + 1, totalRawMaterialPages))}
                  disabled={rawMaterialPage === totalRawMaterialPages}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finished Products Tab Content */}
        <TabsContent value="finished-products" className="space-y-4">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Finished Products</h2>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search products..."
                value={searchFinishedProduct}
                onChange={(e) => setSearchFinishedProduct(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => setIsProductDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Product
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finished Products Overview</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => queryClient.invalidateQueries({ queryKey: ['finishedProducts'] })} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>HP Rating</TableHead>
                    <TableHead>Discharge Range</TableHead>
                    <TableHead>Head Range</TableHead>
                    <TableHead>In Stock</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingFinishedProducts ? (
                    <TableRow><TableCell colSpan={10} className="text-center">Loading finished products...</TableCell></TableRow>
                  ) : paginatedFinishedProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center">No finished products found.</TableCell></TableRow>
                  ) : (
                    paginatedFinishedProducts.map((product) => (
                      <TableRow key={product.finished_product_id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{product.rating_range || 'N/A'}</TableCell>
                        <TableCell>{product.discharge_range || 'N/A'}</TableCell>
                        <TableCell>{product.head_range || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={product.quantity_available && product.quantity_available > (product.minimum_stock || 0) ? "default" : "destructive"}>
                            {product.quantity_available}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(product.unit_price || 0)}</TableCell>
                        <TableCell>{formatCurrency((product.quantity_available || 0) * (product.unit_price || 0))}</TableCell>
                        <TableCell>{formatDate(product.added_on || '')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditProduct(product);
                                setIsEditProductDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDispatchProduct(product);
                                setIsDispatchDialogOpen(true);
                              }}
                            >
                              <ArrowUp className="h-4 w-4" /> Dispatch
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setDeleteProductId(product.finished_product_id);
                                setIsDeleteProductDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={() => setFinishedProductPage(prev => Math.max(prev - 1, 1))}
                  disabled={finishedProductPage === 1}
                  variant="outline"
                >
                  Previous
                </Button>
                <span>Page {finishedProductPage} of {totalFinishedProductPages}</span>
                <Button
                  onClick={() => setFinishedProductPage(prev => Math.min(prev + 1, totalFinishedProductPages))}
                  disabled={finishedProductPage === totalFinishedProductPages}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add Finished Product Dialog */}
          <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Finished Product</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="product_name" className="text-right">Product Name</Label>
                  <select
                    id="product_name"
                    value={selectedBackendProductId || ''}
                    onChange={e => {
                      const productId = Number(e.target.value);
                      setSelectedBackendProductId(productId);
                      const product = backendProducts.find(p => p.id === productId);
                      setSelectedBackendProductDetails(product || null);
                      setNewProduct(prev => ({
                        ...prev,
                        product_name: product?.name || '',
                        category: product?.category || '',
                        rating_range: product?.rating_range || '',
                        discharge_range: product?.discharge_range || '',
                        head_range: product?.head_range || ''
                      }));
                    }}
                    className="col-span-3 border rounded px-2 py-1"
                  >
                    <option value="">Select a product</option>
                    {backendProducts.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.rating_range ? `(${product.rating_range})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">Category</Label>
                  <Input
                    id="category"
                    value={newProduct.category}
                    readOnly
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rating_range" className="text-right">HP Rating</Label>
                  <Input
                    id="rating_range"
                    value={newProduct.rating_range}
                    readOnly
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="discharge_range" className="text-right">Discharge Range</Label>
                  <Input
                    id="discharge_range"
                    value={newProduct.discharge_range}
                    readOnly
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="head_range" className="text-right">Head Range</Label>
                  <Input
                    id="head_range"
                    value={newProduct.head_range}
                    readOnly
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="product-quantity" className="text-right">Initial Stock</Label>
                  <Input
                    id="product-quantity"
                    type="number"
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: Number(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="product-price" className="text-right">Unit Price</Label>
                  <Input
                    id="product-price"
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddFinishedProduct} disabled={!selectedBackendProductId || newProduct.quantity <= 0 || newProduct.price <= 0}>Add Product</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Finished Product Dialog */}
          <Dialog open={isEditProductDialogOpen} onOpenChange={setIsEditProductDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Finished Product</DialogTitle>
              </DialogHeader>
              {editProduct && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_product_name" className="text-right">Product Name</Label>
                    <Input
                      id="edit_product_name"
                      value={editProduct.product_name}
                      readOnly
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_category" className="text-right">Category</Label>
                    <Input
                      id="edit_category"
                      value={editProduct.category}
                      readOnly
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_rating_range" className="text-right">HP Rating</Label>
                    <Input
                      id="edit_rating_range"
                      value={editProduct.rating_range || 'N/A'}
                      readOnly
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_discharge_range" className="text-right">Discharge Range</Label>
                    <Input
                      id="edit_discharge_range"
                      value={editProduct.discharge_range || 'N/A'}
                      readOnly
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_head_range" className="text-right">Head Range</Label>
                    <Input
                      id="edit_head_range"
                      value={editProduct.head_range || 'N/A'}
                      readOnly
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_quantity" className="text-right">Quantity Available</Label>
                    <Input
                      id="edit_quantity"
                      type="number"
                      value={editProduct.quantity_available}
                      onChange={(e) => setEditProduct({ ...editProduct, quantity_available: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_unit_price" className="text-right">Unit Price</Label>
                    <Input
                      id="edit_unit_price"
                      type="number"
                      value={editProduct.unit_price}
                      onChange={(e) => setEditProduct({ ...editProduct, unit_price: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_minimum_stock" className="text-right">Minimum Stock</Label>
                    <Input
                      id="edit_minimum_stock"
                      type="number"
                      value={editProduct.minimum_stock}
                      onChange={(e) => setEditProduct({ ...editProduct, minimum_stock: Number(e.target.value) })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_storage_location" className="text-right">Storage Location</Label>
                    <Input
                      id="edit_storage_location"
                      value={editProduct.storage_location || ''}
                      onChange={(e) => setEditProduct({ ...editProduct, storage_location: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit_status" className="text-right">Status</Label>
                    <select
                      id="edit_status"
                      value={editProduct.status || 'available'}
                      onChange={(e) => setEditProduct({ ...editProduct, status: e.target.value })}
                      className="col-span-3 border rounded px-2 py-1"
                    >
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="dispatched">Dispatched</option>
                    </select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditProductDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateFinishedProduct} disabled={!editProduct || editProduct.quantity_available < 0 || editProduct.unit_price < 0 || editProduct.minimum_stock < 0}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dispatch Finished Product Dialog */}
          <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dispatch Product: {dispatchProduct?.product_name}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dispatch_quantity" className="text-right">Quantity to Dispatch</Label>
                  <Input
                    id="dispatch_quantity"
                    type="number"
                    value={dispatchQuantity}
                    onChange={(e) => setDispatchQuantity(Number(e.target.value))}
                    className="col-span-3"
                  />
                </div>
                <p className="col-span-4 text-center text-sm text-gray-500">
                  Available: {dispatchProduct?.quantity_available} {dispatchProduct?.category}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDispatchDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleDispatchFinishedProduct} disabled={dispatchQuantity <= 0 || dispatchQuantity > (dispatchProduct?.quantity_available || 0)}>Dispatch</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Finished Product Dialog */}
          <Dialog open={isDeleteProductDialogOpen} onOpenChange={setIsDeleteProductDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Delete</DialogTitle>
              </DialogHeader>
              <p>Are you sure you want to delete this finished product? This action cannot be undone.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteProductDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteFinishedProduct}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Sub-Components Tab Content */}
        <TabsContent value="sub-components" className="space-y-4">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Sub-Components</h2>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search sub-components..."
                value={searchSubComponent}
                onChange={(e) => setSearchSubComponent(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => setIsSubComponentDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Sub-Component
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sub-Components Overview</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => queryClient.invalidateQueries({ queryKey: ['subComponents'] })} />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component Code</TableHead>
                    <TableHead>Component Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>In Stock</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSubComponents ? (
                    <TableRow><TableCell colSpan={9} className="text-center">Loading sub-components...</TableCell></TableRow>
                  ) : paginatedSubComponents.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center">No sub-components found.</TableCell></TableRow>
                  ) : (
                    paginatedSubComponents.map((component) => (
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
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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
                <DialogTitle>Confirm Delete</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                Are you sure you want to delete this sub-component?
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteSubComponentDialogOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    if (deleteSubComponentId) {
                      deleteSubComponentMutation.mutate(deleteSubComponentId);
                    }
                  }}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventory;
