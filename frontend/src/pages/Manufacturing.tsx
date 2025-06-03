import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Package, 
  Calendar, 
  AlertTriangle, 
  Play, 
  Pause, 
  CheckCircle, 
  MoreVertical,
  Plus 
} from 'lucide-react';
import { ManufacturingService, Product, ManufacturingBatch, RawMaterial } from '@/services/manufacturing.service';

export const ManufacturingDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ManufacturingBatch[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Batch creation form
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, batchesData, materialsData, lowStockData] = await Promise.all([
        ManufacturingService.getAllProducts(),
        ManufacturingService.getAllBatches(),
        ManufacturingService.getAllRawMaterials(),
        ManufacturingService.getLowStockMaterials()
      ]);
     
      setProducts(productsData);
      setBatches(batchesData);
      setRawMaterials(materialsData);
      setLowStockMaterials(lowStockData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const calculateMaterialRequirements = () => {
    if (!selectedProduct) return [];
    
    const requirements: Record<string, { name: string; total: number; unit: string; available: number; isLowStock: boolean }> = {};
    
    selectedProduct.subComponents?.forEach(subComponent => {
      subComponent.materials?.forEach(material => {
        
        const totalRequired = material.quantityRequired * quantity;
        const rawMaterial = rawMaterials.find(rm => rm.material_id === material.materialId);
        
        
        if (requirements[material.materialId]) {
          requirements[material.materialId].total += totalRequired;
        } else {
          requirements[material.materialId] = {
            name: material.materialName,
            total: totalRequired,
            unit: material.unit,
            available: rawMaterial?.current_stock || 0,
            isLowStock: lowStockMaterials.some(lsm => lsm.id === material.materialId)
          };
        }
      });
    });
    
    return Object.values(requirements);
  };

  const calculateEstimatedDuration = () => {
    if (!selectedProduct) return 0;
    
    const subComponentTime = selectedProduct.subComponents?.reduce((total, sc) => 
      total + (sc.estimatedTime * quantity), 0) || 0;
    const finalAssemblyTime = selectedProduct.finalAssemblyTime * quantity;
    
    return Math.round((subComponentTime + finalAssemblyTime) / 60); // Convert to hours
  };

  const handleCreateBatch = async () => {
    if (!selectedProduct) return;
    
    const batchNumber = `BATCH-${Date.now().toString().slice(-6)}`;
    const newBatch = {
      batchNumber: batchNumber,
      productId: selectedProduct.id,
      quantity,
      status: 'planning' as const,
      priority,
      targetCompletionDate: targetDate || undefined
    };
    
    const createdBatch = await ManufacturingService.createBatch(newBatch);
    console.log(createdBatch);
    if (createdBatch) {
      // Create workflows for the batch
      if (selectedProduct.subComponents) {
        for (const subComponent of selectedProduct.subComponents) {
          await ManufacturingService.createWorkflow({
            batchId: createdBatch.id,
            componentId: subComponent.id,
            componentName: subComponent.name,
            componentType: 'sub-component',
            quantity,
            estimatedDuration: subComponent.estimatedTime * quantity
          });
        }
      }
      
      // Create final assembly workflow
      await ManufacturingService.createWorkflow({
        batchId: createdBatch.id,
        componentId: 'final-assembly',
        componentName: 'Final Assembly',
        componentType: 'final-assembly',
        quantity,
        estimatedDuration: selectedProduct.finalAssemblyTime * quantity
      });
      
      // Reset form and reload data
      setSelectedProductId('');
      setQuantity(1);
      setTargetDate('');
      setPriority('medium');
      loadData();
    }
  };

  const handleWorkflowStatusChange = async (batchId: string, workflowId: string, newStatus: 'not_started' | 'in_progress' | 'completed' | 'on_hold') => {
    await ManufacturingService.updateWorkflowStatus(workflowId, newStatus);
    loadData();
  };

  const getBatchProgress = async (batchId: string) => {
    return await ManufacturingService.getBatchProgress(batchId);
  };

  const filteredBatches = batches.filter(batch => {
    if (statusFilter === 'all') return true;
    return batch.status === statusFilter;
  });

  const materialRequirements = calculateMaterialRequirements();
  const estimatedDuration = calculateEstimatedDuration();
  const hasInsufficientStock = materialRequirements.some(req => req.total > req.available);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'not_started': return 'bg-gray-400';
      case 'on_hold': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-400';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'on_hold': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Package className="h-6 w-6" />
        <h2 className="text-3xl font-bold">Manufacturing Dashboard</h2>
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

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Production Dashboard</TabsTrigger>
          <TabsTrigger value="create-batch">Create New Batch</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Active Batches</h3>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredBatches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No manufacturing batches found. Create a batch to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredBatches.map((batch) => (
                <BatchCard 
                  key={batch.id} 
                  batch={batch} 
                  onWorkflowStatusChange={handleWorkflowStatusChange}
                  getStatusColor={getStatusColor}
                  getWorkflowStatusColor={getWorkflowStatusColor}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create-batch" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Batch Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Batch Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="product">Product</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div>
                  <Label htmlFor="targetDate">Target Completion Date</Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Batch Preview */}
            {selectedProduct && (
              <Card>
                <CardHeader>
                  <CardTitle>Batch Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Product:</span>
                    <Badge variant="outline">{selectedProduct.name}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Quantity:</span>
                    <Badge>{quantity} units</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Sub-Components:</span>
                    <Badge variant="secondary">{selectedProduct.subComponents?.length || 0}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Est. Duration:</span>
                    <Badge className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {estimatedDuration}h
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Workflows:</span>
                    <Badge variant="outline">{(selectedProduct.subComponents?.length || 0) + 1}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

        
          {/* Material Requirements */}
          {materialRequirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  Material Requirements
                  {hasInsufficientStock && (
                    <AlertTriangle className="h-5 w-5 ml-2 text-orange-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {materialRequirements.map((req, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        req.total > req.available ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{req.name}</span>
                        {req.isLowStock && (
                          <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">
                          Need: <strong>{req.total} {req.unit}</strong>
                        </span>
                        <span className="text-sm text-gray-500">
                          Available: {req.available} {req.unit}
                        </span>
                        {req.total > req.available && (
                          <Badge variant="destructive">Insufficient</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleCreateBatch}
              disabled={!selectedProductId || hasInsufficientStock}
              size="lg"
            >
              Create Batch
            </Button>
          </div>
          
          {hasInsufficientStock && (
            <p className="text-sm text-red-600 text-center">
              Cannot create batch: Insufficient raw materials in stock
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Separate component for batch cards to keep the main component cleaner
const BatchCard = ({ 
  batch, 
  onWorkflowStatusChange, 
  getStatusColor, 
  getWorkflowStatusColor 
}: {
  batch: ManufacturingBatch;
  onWorkflowStatusChange: (batchId: string, workflowId: string, status: any) => void;
  getStatusColor: (status: string) => string;
  getWorkflowStatusColor: (status: string) => string;
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateProgress = async () => {
      const batchProgress = await ManufacturingService.getBatchProgress(batch.id);
      setProgress(batchProgress);
    };
    calculateProgress();
  }, [batch.id]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gray-50">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{batch.batchNumber}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {batch.product?.name} - Quantity: {batch.quantity}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(batch.status)}>
              {batch.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant="outline" className={`border-${batch.priority === 'high' ? 'red' : batch.priority === 'medium' ? 'yellow' : 'gray'}-300`}>
              {batch.priority.toUpperCase()}
            </Badge>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <h4 className="font-medium mb-4">Workflows</h4>
        <div className="space-y-3">
          {batch.workflows?.map((workflow) => (
            <div key={workflow.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Badge className={getWorkflowStatusColor(workflow.status)}>
                    {workflow.status.replace('_', ' ')}
                  </Badge>
                  <span className="font-medium">{workflow.componentName}</span>
                  <span className="text-sm text-gray-500">
                    ({workflow.componentType === 'sub-component' ? 'Sub-Component' : 'Final Assembly'})
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Quantity: {workflow.quantity} | Duration: {workflow.estimatedDuration} min
                  {workflow.assignedTeam && ` | Team: ${workflow.assignedTeam}`}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => onWorkflowStatusChange(batch.id, workflow.id, 'in_progress')}
                    disabled={workflow.status === 'in_progress'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onWorkflowStatusChange(batch.id, workflow.id, 'on_hold')}
                    disabled={workflow.status === 'on_hold'}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Hold
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onWorkflowStatusChange(batch.id, workflow.id, 'completed')}
                    disabled={workflow.status === 'completed'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ManufacturingDashboard;
