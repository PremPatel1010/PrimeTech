import React, { useState, useEffect } from 'react';
import { ManufacturingService } from '../services/manufacturing.service';
import { toast } from 'sonner';
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
import { Product, ManufacturingBatch, BatchWorkflow, RawMaterial } from '@/services/manufacturing.service';
import WorkflowSteps from '@/components/manufacturing/WorkflowsSteps';
import BatchEditModal from '@/components/manufacturing/BatchEditModal';
import BatchDeleteDialog from '@/components/manufacturing/BatchDeleteDialog';
import StepUpdateModal from '@/components/manufacturing/StepUpdateModal';
import BatchCreationWizard from '@/components/manufacturing/BatchCreationWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

// Define local extended interfaces to include properties used in this component
interface ExtendedManufacturingBatch extends ManufacturingBatch {
  productId: string; // Used for product lookup
  salesOrderNumber?: string; // Used in table display
}

interface ExtendedBatchWorkflow extends BatchWorkflow {
  progress?: number; // Used for progress bar
  assignedTeam?: string; // Corrected from assignedTo
  estimatedCompletionDate?: string; // Used for display
  startDate?: string; // Used for display
}

interface ExtendedProduct extends Product {
  billOfMaterials?: Array<{ rawMaterialId: string; quantity: number }>; // Used for material requirements
}

export const ManufacturingDashboard = () => {
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [batches, setBatches] = useState<ExtendedManufacturingBatch[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [stepUpdateModalOpen, setStepUpdateModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ExtendedManufacturingBatch | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<ExtendedBatchWorkflow | null>(null);
  
  // Batch creation wizard
  const [showBatchWizard, setShowBatchWizard] = useState(false);

  // State for detailed batch view
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<ExtendedManufacturingBatch | null>(null);

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
     
      setProducts(productsData as ExtendedProduct[]);
      setBatches(batchesData as ExtendedManufacturingBatch[]);
      setRawMaterials(materialsData);
      setLowStockMaterials(lowStockData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowStatusChange = async (workflowId: string, newStatus: BatchWorkflow['status']) => {
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

  const handleEditBatch = (batch: ExtendedManufacturingBatch) => {
    setSelectedBatch(batch);
    setEditModalOpen(true);
  };

  const handleDeleteBatch = (batch: ExtendedManufacturingBatch) => {
    setSelectedBatch(batch);
    setDeleteDialogOpen(true);
  };

  const handleViewBatchDetails = (batch: ExtendedManufacturingBatch) => {
    setSelectedBatchDetail(batch);
  };

  const handleBackToBatches = () => {
    setSelectedBatchDetail(null);
  };

  const handleEditStep = async (workflow: ExtendedBatchWorkflow, batch: ExtendedManufacturingBatch) => {
    setSelectedWorkflow(workflow);
    setSelectedBatch(batch);
    setStepUpdateModalOpen(true);
  };

  const handleSaveBatch = async (id: string, data: Partial<ExtendedManufacturingBatch>) => {
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

  const handleUpdateWorkflow = async (workflowId: string, data: Partial<ExtendedBatchWorkflow>) => {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100/50 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-200">
                <Factory className="h-10 w-10 text-white drop-shadow-md" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent tracking-tight">
                  Manufacturing Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Solar Pump Production Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex space-x-6">
                <div className="text-center p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 cursor-default">
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {batches.filter(b => b.status === 'in_progress').length}
                  </div>
                  <div className="text-sm font-medium text-blue-600/80 mt-1">Active Batches</div>
                </div>
                <div className="text-center p-4 bg-green-50/50 rounded-xl border border-green-100/50 backdrop-blur-sm hover:shadow-md transition-all duration-300 cursor-default">
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {batches.filter(b => b.status === 'completed').length}
                  </div>
                  <div className="text-sm font-medium text-green-600/80 mt-1">Completed</div>
                </div>
              </div>
              <Button 
                onClick={() => setShowBatchWizard(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 text-white font-medium"
              >
                <Plus className="h-5 w-5 mr-2 animate-pulse" />
                New Batch
              </Button>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockMaterials.length > 0 && (
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
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
        {!selectedBatchDetail ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-800">Production Batches</h3>
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
              <Card className="text-center py-16 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 border-dashed border-2 border-blue-200/50 shadow-inner hover:shadow-xl transition-all duration-300">
                <CardContent>
                  <Package className="h-16 w-16 text-blue-400 mx-auto mb-6 animate-pulse" />
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-3">No batches found</h3>
                  <p className="text-gray-600 mb-6">Create a new manufacturing batch to get started.</p>
                  <Button onClick={() => setShowBatchWizard(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Batch
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border bg-card text-card-foreground shadow">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Current Stage</TableHead>
                      <TableHead>Sales Order</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.map((batch) => {
                      const product = products.find(p => p.id === batch.productId);
                      const currentWorkflow = batch.workflows?.find(wf => wf.status === 'in_progress' || wf.status === 'not_started');
                      return (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                          <TableCell>{product?.name || 'N/A'}</TableCell>
                          <TableCell>{batch.quantity}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`border-2 shadow-sm backdrop-blur-sm font-medium px-3 py-1 ${batch.priority === 'high' ? 'border-red-400 text-red-700 bg-red-50/50' : batch.priority === 'medium' ? 'border-yellow-400 text-yellow-700 bg-yellow-50/50' : 'border-gray-400 text-gray-700 bg-gray-50/50'}`}
                            >
                              {batch.priority.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{batch.targetCompletionDate ? new Date(batch.targetCompletionDate).toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell>{currentWorkflow?.componentName || 'N/A'}</TableCell>
                          <TableCell>{batch.salesOrderNumber || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="link" onClick={() => handleViewBatchDetails(batch)}>
                              View Details
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
        ) : (
          <div className="space-y-6">
            <Button variant="ghost" onClick={handleBackToBatches} className="mb-4">
              &larr; Back to All Batches
            </Button>
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-800">Batch: {selectedBatchDetail.batchNumber} - Quantity: {selectedBatchDetail.quantity}</h2>
              <Badge className={`${getStatusColor(selectedBatchDetail.status)} shadow-sm backdrop-blur-sm font-medium px-3 py-1`}>
                {selectedBatchDetail.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {/* This badge is hardcoded as per prototype for the detailed view */}
              <Badge className="bg-blue-500 shadow-sm backdrop-blur-sm font-medium px-3 py-1">
                IN PROGRESS
              </Badge>
            </div>

            {/* Workflow Steps Visualizer */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Workflow Progress</h3>
              <WorkflowSteps
                currentStep={getProductSteps(products.find(p => p.id === selectedBatchDetail.productId))?.indexOf(selectedBatchDetail.workflows?.find(wf => wf.status === 'in_progress' || wf.status === 'not_started' || wf.status === 'completed')?.componentName || '') + 1}
                totalSteps={getProductSteps(products.find(p => p.id === selectedBatchDetail.productId)).length}
                steps={getProductSteps(products.find(p => p.id === selectedBatchDetail.productId)).map(stepName => {
                  const workflow = selectedBatchDetail.workflows?.find(w => w.componentName === stepName);
                  return {
                    name: stepName,
                    status: workflow?.status || 'not_started' as const,
                    estimatedTime: workflow?.estimatedDuration,
                    actualTime: workflow?.actualDuration,
                    workflow: workflow
                  };
                })}
              />
            </Card>

            {/* Manufacturing Stage Section */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Manufacturing Stage</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {selectedBatchDetail.workflows?.map(workflow => (
                  <Card key={workflow.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{workflow.componentName}</div>
                      <div className="text-sm text-gray-600">
                        {workflow.status === 'in_progress' ? `Progress: ${workflow.progress || 0}%` : `Status: ${workflow.status.replace('_', ' ')}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        Operator: {workflow.assignedTeam || 'N/A'} | Start: {workflow.startDate ? new Date(workflow.startDate).toLocaleDateString() : 'N/A'} | Est. Completion: {workflow.estimatedCompletionDate ? new Date(workflow.estimatedCompletionDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div>
                      {workflow.status === 'in_progress' && <Progress value={workflow.progress || 0} className="w-24 h-2" />}
                      <Badge className={`${getStatusColor(workflow.status)} ml-2`}>{workflow.status.replace('_', ' ')}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            {/* Raw Material Alert (if any) */}
            {lowStockMaterials.length > 0 && (
              <Card className="border-orange-200 bg-orange-50 shadow-sm">
                <CardContent className="p-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-700" />
                  <span className="text-orange-800 font-medium">Raw Material Alert:</span>
                  <span className="ml-2 text-sm text-orange-700">
                    {lowStockMaterials.map(m => `${m.name} (${m.stockQuantity} ${m.unit})`).join(', ')} inventory running low. Consider ordering additional stock for continuous production.
                  </span>
                </CardContent>
              </Card>
            )}

            {/* Material Requirements */}
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">Material Requirements</h3>
              <div className="space-y-3">
                {products.find(p => p.id === selectedBatchDetail.productId)?.billOfMaterials?.map(bomItem => {
                  const material = rawMaterials.find(rm => rm.id === bomItem.rawMaterialId);
                  const required = bomItem.quantity * selectedBatchDetail.quantity;
                  const available = material?.stockQuantity || 0;
                  const status = available < required ? 'Insufficient' : 'Sufficient';
                  const statusColor = status === 'Insufficient' ? 'text-red-600' : 'text-green-600';
                  return (
                    <div key={bomItem.rawMaterialId} className="flex justify-between items-center pb-2 border-b last:border-b-0">
                      <div className="font-medium">{material?.name || 'Unknown Material'}</div>
                      <div className="text-sm text-gray-700">
                        Required: {required} {material?.unit} | Available: {available} {material?.unit}
                        <span className={`ml-2 font-semibold ${statusColor}`}>({status})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
              <Button variant="outline" disabled>Previous: QC</Button>
              <Button>Next: Final Assembly</Button>
            </div>
          </div>
        )}
        
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

// Add custom scrollbar styles
const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(241, 245, 249, 0.5);
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.3);
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.5);
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default ManufacturingDashboard;