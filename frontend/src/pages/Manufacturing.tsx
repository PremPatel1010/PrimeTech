import React, { useState, useEffect } from 'react';
import { useFactory } from '../context/FactoryContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate as originalFormatDate } from '../utils/calculations';
import ProgressSteps from '../components/ui-custom/ProgressSteps';
import ProgressBar from '../components/ui-custom/ProgressBar';
import { ManufacturingBatch, ProductionStage, SalesOrder } from '../types';
import { Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { productService, ManufacturingStage as BackendStage } from '../services/productService';
import { createBatch, updateBatchStage, fetchBatches, deleteBatch as apiDeleteBatch, editBatch as apiEditBatch } from '../services/manufacturingService';
import { toast } from '@/components/ui/use-toast';

// Defensive formatDate for UI
const formatDate = (date: string | undefined) => {
  if (!date || date === '' || date === 'Invalid Date') return '-';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
};

const Manufacturing: React.FC = () => {
 const { manufacturingBatches, finishedProducts, backendProducts, salesOrders, rawMaterials, addManufacturingBatch, updateManufacturingStage, setManufacturingBatches, getActiveBatches, getCompletedBatches } = useFactory(); 
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [backendStages, setBackendStages] = useState<BackendStage[]>([]);
  const [newBatch, setNewBatch] = useState<Partial<ManufacturingBatch>>({
    batchNumber: `B-${new Date().getFullYear()}-${String(manufacturingBatches.length + 1).padStart(3, '0')}`,
    productId: '',
    productName: '',
    quantity: 1,
    currentStage: 'cutting',
    startDate: new Date().toISOString().split('T')[0],
    estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    stageCompletionDates: {
      cutting: null,
      assembly: null,
      testing: null,
      packaging: null,
      completed: null
    },
    progress: 0
  });
  const [editBatchData, setEditBatchData] = useState<ManufacturingBatch | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Fetch stages from backend on mount
  useEffect(() => {
    productService.getManufacturingStages()
      .then(stages => setBackendStages(stages))
      .catch(() => setBackendStages([]));
  }, []);

  // Helper to get the component type for a batch
  const getComponentType = (batch: ManufacturingBatch) => {
    // Try to get from batch (if available)
    if ((batch as any).componentType) return (batch as any).componentType;
    // Try to get from product
    const product = finishedProducts.find(p => p.id === batch.productId);
    if (product && (product as any).componentType) return (product as any).componentType;
    // Fallback to 'combined'
    return 'combined';
  };

  // Helper to get stages for a batch
  const getStagesForBatch = (batch: ManufacturingBatch) => {
    const type = getComponentType(batch);
    let stages = backendStages.filter(s => s.component_type === type);
    if (stages.length > 0 && !stages.some(s => s.stage_name.toLowerCase() === 'completed')) {
      stages = [...stages, { stage_id: 9999, component_type: type, stage_name: 'Completed', sequence: stages.length + 1 }];
    }
    return stages.length > 0 ? stages : backendStages;
  };

  // Use backend stages if available, else fallback
  const manufacturingStages: { value: ProductionStage, label: string }[] =
    backendStages.length > 0
      ? backendStages.map(s => ({ value: s.stage_name.toLowerCase(), label: s.stage_name }))
      : [
          { value: 'cutting', label: 'Cutting' },
          { value: 'assembly', label: 'Assembly' },
          { value: 'testing', label: 'Testing' },
          { value: 'packaging', label: 'Packaging' },
          { value: 'completed', label: 'Completed' }
        ];

  // Get orders awaiting materials for manufacturing
  const ordersAwaitingMaterials = (salesOrders || []).filter(order => 
    order.status === 'awaiting_materials'
  );

  // Get raw materials needed for a product
  const getRawMaterialsNeeded = (productId: string, quantity: number) => {
    const product = backendProducts.find((p: any) => String(p.product_id) === productId);
    if (!product || !product.bom_items) return [];
    return product.bom_items.map((item: any) => {
      const material = rawMaterials.find(m => m.id === String(item.material_id));
      const totalNeeded = item.quantity_required * quantity;
      const available = material ? material.quantity : 0;
      return {
        materialId: String(item.material_id),
        materialName: item.material_name || '',
        needed: totalNeeded,
        available,
        missing: Math.max(0, totalNeeded - available),
        unit: material ? material.unit : ''
      };
    });
  };

  // Calculate the maximum possible quantity that can be manufactured with current raw materials
  const getMaxPossibleQuantity = (productId: string) => {
    const product = backendProducts.find((p: any) => String(p.product_id) === productId);
    if (!product || !product.bom_items) return 0;
    let maxQty = Infinity;
    for (const item of product.bom_items) {
      const material = rawMaterials.find(m => m.id === String(item.material_id));
      if (!material) return 0;
      const possible = Math.floor(material.quantity / item.quantity_required);
      if (possible < maxQty) maxQty = possible;
    }
    return isFinite(maxQty) ? maxQty : 0;
  };

  // Check if raw materials are available for manufacturing
  const checkRawMaterialsAvailability = () => {
    if (!newBatch.productId) return { available: true, missing: [], maxPossible: 0 };
    const product = backendProducts.find((p: any) => String(p.product_id) === newBatch.productId);
    if (!product || !product.bom_items || product.bom_items.length === 0) {
      return { available: false, missing: [], maxPossible: 0 };
    }
    if (!rawMaterials || rawMaterials.length === 0) {
      const missing = product.bom_items.map((item: any) => ({
        materialId: String(item.material_id),
        materialName: item.material_name || '',
        needed: item.quantity_required * (newBatch.quantity || 0),
        available: 0,
        missing: item.quantity_required * (newBatch.quantity || 0),
        unit: ''
      }));
      return { available: false, missing, maxPossible: 0 };
    }
    const materialsNeeded = getRawMaterialsNeeded(newBatch.productId, newBatch.quantity || 0);
    const missingMaterials = materialsNeeded.filter(m => m.missing > 0 || m.available === 0);
    const maxPossible = getMaxPossibleQuantity(newBatch.productId);
    return {
      available: missingMaterials.length === 0,
      missing: missingMaterials,
      maxPossible
    };
  };
  
  const handleProductChange = (productId: string) => {
    const product = backendProducts.find((p: any) => String(p.product_id) === productId);
    setNewBatch({
      ...newBatch,
      productId,
      productName: product?.product_name || ''
    });
  };
  
  const handleEditBatch = (batch: ManufacturingBatch) => {
    setEditBatchData(batch);
    setNewBatch({ ...batch });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };
  
  const handleSaveBatch = async () => {
    if (
      newBatch.batchNumber &&
      newBatch.productId &&
      newBatch.quantity &&
      newBatch.startDate &&
      newBatch.estimatedCompletionDate
    ) {
      if (isEditMode && editBatchData) {
        // Edit mode
        let updated = await apiEditBatch(editBatchData.id, {
          batch_number: newBatch.batchNumber,
          product_id: newBatch.productId,
          product_name: newBatch.productName,
          quantity_in_process: newBatch.quantity,
          start_date: newBatch.startDate,
          estimated_completion_date: newBatch.estimatedCompletionDate,
          current_stage: newBatch.currentStage,
          stage_completion_dates: newBatch.stageCompletionDates,
          progress: newBatch.progress,
          status: newBatch.status
        });
        setManufacturingBatches(prev => prev.map(b => (b.id === updated.tracking_id || b.tracking_id === updated.tracking_id ? { ...b, ...updated } : b)));
        setIsDialogOpen(false);
        setIsEditMode(false);
        setEditBatchData(null);
      } else {
        // Add mode
        addManufacturingBatch(newBatch as Omit<ManufacturingBatch, 'id'>);
        setIsDialogOpen(false);
      }
      resetNewBatch();
    }
  };
  
  const resetNewBatch = () => {
    setNewBatch({
      batchNumber: `B-${new Date().getFullYear()}-${String(manufacturingBatches.length + 1).padStart(3, '0')}`,
      productId: '',
      productName: '',
      quantity: 1,
      currentStage: getStagesForBatch(newBatch as ManufacturingBatch)[0]?.stage_name.toLowerCase() || 'cutting',
      startDate: new Date().toISOString().split('T')[0],
      estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      stageCompletionDates: {
        cutting: null,
        assembly: null,
        testing: null,
        packaging: null,
        completed: null
      },
      progress: 0
    });
  };
  
  // Helper to get steps for progress indicator
  const getManufacturingProgressSteps = (batch: ManufacturingBatch) => {
    const stagesForBatch = getStagesForBatch(batch);
    const stageNames = stagesForBatch.map(s => s.stage_name.toLowerCase());
    const safeStageCompletionDates = stageNames.reduce((acc, key) => {
      acc[key] = batch.stageCompletionDates && key in batch.stageCompletionDates ? batch.stageCompletionDates[key] : null;
      return acc;
    }, {} as Record<string, string | null>);
    let foundCurrent = false;
    return stagesForBatch.map((stage, idx) => {
      let completed = Boolean(safeStageCompletionDates[stage.stage_name.toLowerCase()]);
      let current = false;
      if (!foundCurrent && !completed) {
        current = true;
        foundCurrent = true;
      }
      if (batch.progress === 0 && idx === 0) current = true;
      return {
        label: stage.stage_name,
        completed,
        current: batch.currentStage === stage.stage_name.toLowerCase() || current
      };
    });
  };
  
  // Use helpers for filtering
  const activeBatches = getActiveBatches(manufacturingBatches);
  const completedBatches = getCompletedBatches(manufacturingBatches);
  
  // Update stage handler
  const handleUpdateStage = async (batch: ManufacturingBatch, newStage: string) => {
    try {
      await updateManufacturingStage(batch.id, newStage);
      // Optionally, refetch batches or rely on context update
      // const batches = await fetchBatches();
      // setManufacturingBatches(batches);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update stage', variant: 'destructive' });
    }
  };

  // Delete batch handler
  const handleDeleteBatch = async (batchId: string) => {
    try {
      await apiDeleteBatch(batchId);
      setManufacturingBatches(prev => prev.filter(b => b.id !== batchId));
      toast({ title: 'Batch Deleted', description: 'The batch has been deleted.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete batch', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-factory-gray-900">Manufacturing</h1>
        <Button 
          onClick={() => setIsDialogOpen(true)}
          className="bg-factory-primary hover:bg-factory-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Batch
        </Button>
      </div>

      {/* Orders awaiting materials section */}
      {ordersAwaitingMaterials.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Orders Awaiting Materials
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {ordersAwaitingMaterials.map(order => {
              // Get all products that need to be manufactured for this order
              const productsToManufacture = order.products.filter(product => {
                const finishedProduct = finishedProducts.find(p => p.id === product.productId);
                return finishedProduct && finishedProduct.quantity < product.quantity;
              });
              
              return (
                <Card key={order.id} className="border-red-200">
                  <CardHeader className="bg-red-50 py-3 border-b border-red-200">
                    <div className="flex justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span>Order {order.orderNumber}</span>
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                          Awaiting Materials
                        </Badge>
                      </CardTitle>
                      <span className="text-sm text-red-700">{order.customerName}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Products Requiring Manufacturing</h4>
                      <div className="space-y-2">
                        {productsToManufacture.map((product, idx) => {
                          const finishedProduct = finishedProducts.find(p => p.id === product.productId);
                          const availableQty = finishedProduct ? finishedProduct.quantity : 0;
                          const manufacturingQty = product.quantity - availableQty;
                          
                          // Get missing raw materials for this product
                          const materialStatus = getRawMaterialsNeeded(product.productId, manufacturingQty);
                          const missingMaterials = materialStatus.filter(m => m.missing > 0);
                          
                          return (
                            <div key={idx} className="border rounded p-2">
                              <div className="flex justify-between">
                                <span className="font-medium">{product.productName}</span>
                                <span className="text-sm">{manufacturingQty} units needed</span>
                              </div>
                              
                              <div className="mt-2">
                                <h5 className="text-xs font-medium text-red-800 mb-1">Missing Raw Materials</h5>
                                <div className="space-y-1">
                                  {missingMaterials.map((material, midx) => (
                                    <div key={midx} className="flex justify-between text-xs">
                                      <span>{material.materialName}</span>
                                      <span>
                                        Missing: {material.missing} {material.unit} 
                                        (Have: {material.available}/{material.needed} {material.unit})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium mb-4">Active Manufacturing Batches</h2>
          {activeBatches.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeBatches.map(batch => (
                <Card key={batch.id} className="overflow-hidden">
                  <CardHeader className="bg-factory-gray-50 py-3">
                    <div className="flex justify-between">
                      <CardTitle className="text-base">{batch.productName || '-'}</CardTitle>
                      <span className="text-sm text-factory-gray-600">Batch: {batch.batchNumber || '-'}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-factory-gray-500">Quantity</p>
                        <p className="font-medium">{batch.quantity ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-factory-gray-500">Start Date</p>
                        <p className="font-medium">{formatDate(batch.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-factory-gray-500">Est. Completion</p>
                        <p className="font-medium">{formatDate(batch.estimatedCompletionDate)}</p>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-sm mb-2">Manufacturing Progress</p>
                      <ProgressSteps steps={getManufacturingProgressSteps(batch)} />
                      <ProgressBar 
                        value={batch.progress} 
                        showLabel 
                        className="mt-4" 
                        colorVariant={
                          batch.progress > 66 ? 'success' : 
                          batch.progress > 33 ? 'warning' : 
                          'default'
                        }
                      />
                    </div>
                    
                    {/* Show linked sales order if available */}
                    {batch.linkedSalesOrderId && (
                      <div className="text-sm text-factory-gray-600">
                        Linked to order: {salesOrders.find(o => o.id === batch.linkedSalesOrderId)?.orderNumber || 'Unknown'}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="bg-factory-gray-50 py-3 flex justify-between">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditBatch(batch)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteBatch(batch.id)}>Delete</Button>
                    </div>
                    <p className="text-sm text-factory-gray-600">
                      Current Stage: <span className="font-medium">
                        {getStagesForBatch(batch).find(s => s.stage_name.toLowerCase() === batch.currentStage)?.stage_name || '-'}
                      </span>
                    </p>
                    <Select 
                      value={batch.currentStage}
                      onValueChange={(value: ProductionStage) => handleUpdateStage(batch, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Update Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {getStagesForBatch(batch).map((stage) => (
                          <SelectItem key={stage.stage_name.toLowerCase()} value={stage.stage_name.toLowerCase()}>{stage.stage_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-factory-gray-500">No active manufacturing batches. Create your first batch!</p>
            </div>
          )}
        </div>
        
        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-factory-success" />
            Completed Batches
          </h2>
          
          {completedBatches.length > 0 ? (
            <div className="bg-white rounded-lg overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-factory-gray-50 text-left">
                      <th className="px-6 py-3 font-medium text-factory-gray-600">Batch #</th>
                      <th className="px-6 py-3 font-medium text-factory-gray-600">Product</th>
                      <th className="px-6 py-3 font-medium text-factory-gray-600">Quantity</th>
                      <th className="px-6 py-3 font-medium text-factory-gray-600">Start Date</th>
                      <th className="px-6 py-3 font-medium text-factory-gray-600">Completion Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {completedBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-factory-gray-50">
                        <td className="px-6 py-4">{batch.batchNumber}</td>
                        <td className="px-6 py-4">{batch.productName}</td>
                        <td className="px-6 py-4">{batch.quantity}</td>
                        <td className="px-6 py-4">{formatDate(batch.startDate)}</td>
                        <td className="px-6 py-4">
                          {batch.stageCompletionDates.completed 
                            ? formatDate(batch.stageCompletionDates.completed) 
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-lg border">
              <p className="text-factory-gray-500">No completed batches yet.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Create Manufacturing Batch Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Manufacturing Batch</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input 
                  id="batchNumber" 
                  value={newBatch.batchNumber} 
                  onChange={(e) => setNewBatch({...newBatch, batchNumber: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  min="1"
                  value={newBatch.quantity} 
                  onChange={(e) => setNewBatch({...newBatch, quantity: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select 
                value={newBatch.productId}
                onValueChange={handleProductChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {backendProducts.map(product => (
                    <SelectItem key={String(product.product_id)} value={String(product.product_id)}>
                      {product.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Raw materials availability check */}
            {newBatch.productId && (
              <div className="border rounded-md p-3">
                <h4 className="text-sm font-medium mb-2">Raw Materials Check</h4>
                {(() => {
                  const check = checkRawMaterialsAvailability();
                  if (check.available) {
                    return (
                      <div className="flex items-center text-green-600 gap-2">
                        <CheckCircle className="h-4 w-4" />
                        All raw materials are available for manufacturing
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col gap-2 text-yellow-700">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Not enough raw materials for the requested quantity.
                        </div>
                        <div>
                          <span>Maximum possible quantity: </span>
                          <span className="font-semibold">{check.maxPossible}</span>
                        </div>
                        <ul className="ml-4 list-disc text-xs">
                          {check.missing.map(m => (
                            <li key={m.materialId}>
                              {m.materialName}: Need {m.needed}, Available {m.available} {m.unit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input 
                  id="startDate" 
                  type="date"
                  value={newBatch.startDate} 
                  onChange={(e) => setNewBatch({...newBatch, startDate: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="estimatedCompletionDate">Est. Completion Date</Label>
                <Input 
                  id="estimatedCompletionDate" 
                  type="date"
                  value={newBatch.estimatedCompletionDate} 
                  onChange={(e) => setNewBatch({...newBatch, estimatedCompletionDate: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stage">Initial Stage</Label>
              <Select 
                value={newBatch.currentStage}
                onValueChange={(value: ProductionStage) => setNewBatch({...newBatch, currentStage: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select initial stage" />
                </SelectTrigger>
                <SelectContent>
                  {getStagesForBatch(newBatch as ManufacturingBatch).map((stage) => (
                    <SelectItem key={stage.stage_name.toLowerCase()} value={stage.stage_name.toLowerCase()}>{stage.stage_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveBatch}
              className="bg-factory-primary hover:bg-factory-primary/90"
              disabled={!newBatch.productId || !newBatch.batchNumber || !checkRawMaterialsAvailability().available}
            >
              {isEditMode ? 'Save Changes' : 'Create Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Manufacturing;
