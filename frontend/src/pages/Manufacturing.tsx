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
  Plus,
  Edit,
  Trash2,
  Factory,
  Clock,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { ManufacturingService, Product, ManufacturingBatch, BatchWorkflow, RawMaterial } from '@/services/manufacturing.service';
import WorkflowSteps from '@/components/manufacturing/WorkflowsSteps';
import BatchEditModal from '@/components/manufacturing/BatchEditModal';
import BatchDeleteDialog from '@/components/manufacturing/BatchDeleteDialog';
import StepUpdateModal from '@/components/manufacturing/StepUpdateModal';
import BatchCreationWizard from '@/components/manufacturing/BatchCreationWizard';

// Default workflow steps
const DEFAULT_WORKFLOW_STEPS = [
  'Inward',
  'QC',
  'Components Assembly', 
  'Final Assembly',
  'Testing',
  'Packaging',
  'Completed'
];

export const ManufacturingDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ManufacturingBatch[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stepUpdateModalOpen, setStepUpdateModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ManufacturingBatch | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<BatchWorkflow | null>(null);
  
  // Batch creation wizard
  const [showBatchWizard, setShowBatchWizard] = useState(false);

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

  const handleWorkflowStatusChange = async (batchId: string, workflowId: string, newStatus: BatchWorkflow['status']) => {
    try {
      const success = await ManufacturingService.updateWorkflowStatus(workflowId, newStatus);
      if (success) {
        toast.success('Workflow status updated');
        loadData();
      }
    } catch (error) {
      console.error('Error updating workflow status:', error);
      toast.error('Failed to update workflow status');
    }
  };

  const handleEditBatch = (batch: ManufacturingBatch) => {
    setSelectedBatch(batch);
    setEditModalOpen(true);
  };

  const handleDeleteBatch = (batch: ManufacturingBatch) => {
    setSelectedBatch(batch);
    setDeleteDialogOpen(true);
  };

  const handleEditStep = async (workflow: BatchWorkflow, batch: ManufacturingBatch) => {
    setSelectedWorkflow(workflow);
    setSelectedBatch(batch);
    setStepUpdateModalOpen(true);
  };

  const handleSaveBatch = async (id: string, data: Partial<ManufacturingBatch>) => {
    try {
      const success = await ManufacturingService.updateBatchStatus(id, data.status as ManufacturingBatch['status']);
      if (success) {
        toast.success('Batch updated successfully');
        loadData();
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      toast.error('Failed to update batch');
    }
  };

  const handleConfirmDelete = async (id: string) => {
    try {
      const success = await ManufacturingService.updateBatchStatus(id, 'cancelled');
      if (success) {
        toast.success('Batch cancelled successfully');
        loadData();
      }
    } catch (error) {
      console.error('Error cancelling batch:', error);
      toast.error('Failed to cancel batch');
    }
  };

  const handleBatchCreated = async () => {
    setShowBatchWizard(false);
    await loadData();
  };

  const handleUpdateWorkflow = async (workflowId: string, data: Partial<BatchWorkflow>) => {
    try {
      if (data.status) {
        const success = await ManufacturingService.updateWorkflowStatus(workflowId, data.status);
        if (success) {
          toast.success('Workflow updated successfully');
          loadData();
        }
      }
    } catch (error) {
      console.error('Error updating workflow:', error);
      toast.error('Failed to update workflow');
    }
  };

  const filteredBatches = batches.filter(batch => {
    if (statusFilter === 'all') return true;
    return batch.status === statusFilter;
  });

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

  const getProductSteps = (product: Product | undefined) => {
    if (!product) return DEFAULT_WORKFLOW_STEPS;
    
    // If product has manufacturing steps defined, use those
    if (product.manufacturingSteps && product.manufacturingSteps.length > 0) {
      return product.manufacturingSteps.map(step => step.name);
    }
    
    // If sub-components have steps, combine them
    if (product.subComponents && product.subComponents.length > 0) {
      const subComponentSteps = product.subComponents.flatMap(sc => 
        sc.manufacturingSteps?.map(step => step.name) || []
      );
      
      if (subComponentSteps.length > 0) {
        return [...new Set([...subComponentSteps, 'Final Assembly', 'Testing', 'Packaging', 'Completed'])];
      }
    }
    
    return DEFAULT_WORKFLOW_STEPS;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-md">
                <Factory className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                  Manufacturing Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Solar Pump Production Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{batches.filter(b => b.status === 'in_progress').length}</div>
                <div className="text-sm text-gray-500">Active Batches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{batches.filter(b => b.status === 'completed').length}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
              <Button 
                onClick={() => setShowBatchWizard(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Batch
              </Button>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockMaterials.length > 0 && (
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 shadow-md">
            <CardHeader>
              <CardTitle className="text-orange-800 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Low Stock Alert ({lowStockMaterials.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStockMaterials.slice(0, 5).map(material => (
                  <Badge key={material.id} variant="destructive" className="bg-orange-100 text-orange-800 border-orange-300">
                    {material.name}: {material.stockQuantity} {material.unit}
                  </Badge>
                ))}
                {lowStockMaterials.length > 5 && (
                  <Badge variant="outline" className="border-orange-300">
                    +{lowStockMaterials.length - 5} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manufacturing Batches Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-800">Manufacturing Batches</h3>
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
            <Card className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 border-dashed border-2 border-gray-200">
              <CardContent>
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No batches found</h3>
                <p className="text-gray-500 mb-4">Create a new manufacturing batch to get started.</p>
                <Button onClick={() => setShowBatchWizard(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Batch
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredBatches.map((batch) => (
                <EnhancedBatchCard 
                  key={batch.id} 
                  batch={batch} 
                  products={products}
                  onWorkflowStatusChange={handleWorkflowStatusChange}
                  onEdit={handleEditBatch}
                  onDelete={handleDeleteBatch}
                  onEditStep={handleEditStep}
                  getStatusColor={getStatusColor}
                  getProductSteps={getProductSteps}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modals */}
        <BatchCreationWizard
          isOpen={showBatchWizard}
          onClose={() => setShowBatchWizard(false)}
          onBatchCreated={handleBatchCreated}
          products={products}
          rawMaterials={rawMaterials}
          lowStockMaterials={lowStockMaterials}
        />

        <BatchEditModal
          batch={selectedBatch}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={handleSaveBatch}
        />

        <BatchDeleteDialog
          batch={selectedBatch}
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
        />

        <StepUpdateModal
          workflow={selectedWorkflow}
          batch={selectedBatch}
          isOpen={stepUpdateModalOpen}
          onClose={() => setStepUpdateModalOpen(false)}
          onSave={handleUpdateWorkflow}
        />
      </div>
    </div>
  );
};

// Enhanced Batch Card Component
const EnhancedBatchCard = ({ 
  batch, 
  products,
  onWorkflowStatusChange, 
  onEdit,
  onDelete,
  onEditStep,
  getStatusColor,
  getProductSteps
}: {
  batch: ManufacturingBatch;
  products: Product[];
  onWorkflowStatusChange: (batchId: string, workflowId: string, status: BatchWorkflow['status']) => void;
  onEdit: (batch: ManufacturingBatch) => void;
  onDelete: (batch: ManufacturingBatch) => void;
  onEditStep: (workflow: BatchWorkflow, batch: ManufacturingBatch) => void;
  getStatusColor: (status: string) => string;
  getProductSteps: (product: Product | undefined) => string[];
}) => {
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const calculateProgress = async () => {
      const batchProgress = await ManufacturingService.getBatchProgress(batch.id);
      setProgress(batchProgress);
    };
    calculateProgress();
  }, [batch.id]);

  // Find the actual product object
  const product = products.find(p => p.id === batch.product_id);
  const productSteps = getProductSteps(product);
  
  const workflowSteps = productSteps.map((stepName, index) => {
    const workflow = batch.workflows?.find(w => w.componentName === stepName);
    return {
      name: stepName,
      status: workflow?.status || 'not_started' as const,
      estimatedTime: workflow?.estimatedDuration,
      actualTime: workflow?.actualDuration,
      workflow: workflow
    };
  });

  const getCurrentStep = () => {
    const completedSteps = workflowSteps.filter(s => s.status === 'completed').length;
    const inProgressSteps = workflowSteps.filter(s => s.status === 'in_progress').length;
    return completedSteps + (inProgressSteps > 0 ? 1 : 0);
  };

  const currentStep = getCurrentStep();

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 bg-white">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-xl text-gray-900">{batch.batchNumber}</CardTitle>
              <Badge className={getStatusColor(batch.status)}>
                {batch.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline" className={`border-${batch.priority === 'high' ? 'red' : batch.priority === 'medium' ? 'yellow' : 'gray'}-300`}>
                {batch.priority.toUpperCase()} PRIORITY
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {product?.name || 'Unknown Product'}
              </span>
              <span className="flex items-center gap-1">
                <Factory className="h-4 w-4" />
                Qty: {batch.quantity}
              </span>
              {batch.targetCompletionDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Due: {new Date(batch.targetCompletionDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Workflow Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(batch)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Batch
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(batch)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Batch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{progress}% Complete</span>
          </div>
          <Progress value={progress} className="h-3 bg-gray-200" />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-6 bg-gray-50">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Workflow Steps */}
            <div>
              <WorkflowSteps
                currentStep={currentStep}
                totalSteps={productSteps.length}
                steps={workflowSteps}
              />
            </div>
            
            {/* Workflow Actions */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Workflow Management
              </h4>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {batch.workflows?.map((workflow) => (
                  <div key={workflow.id} className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(workflow.status)}>
                          {workflow.status.replace('_', ' ')}
                        </Badge>
                        <span className="font-medium">{workflow.componentName}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {workflow.estimatedDuration}min
                        </span>
                        {workflow.assignedTeam && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {workflow.assignedTeam}
                          </span>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Workflow Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditStep(workflow, batch)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Step
                        </DropdownMenuItem>
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
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ManufacturingDashboard;