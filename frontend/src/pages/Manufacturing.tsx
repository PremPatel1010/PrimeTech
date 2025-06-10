import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ManufacturingBatch, WorkflowStatus, SubComponentStatus } from '../services/manufacturingApi';
import { manufacturingApi } from '../services/manufacturingApi';
import { WorkflowProgress } from '../components/manufacturing/WorkflowProgress';
import { ManufacturingSteps } from '../components/manufacturing/ManufacturingSteps';
import { MaterialRequirements } from '../components/manufacturing/MaterialRequirements';
import { BatchesTable } from '../components/manufacturing/BatchesTable';
import { BatchForm } from '../components/manufacturing/BatchForm';
import { Product } from '@/services/Product.service';
import ProductService from '@/services/Product.service';
import { Button } from '@/components/ui/button';

export const ManufacturingDashboard = () => {
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingBatch | null>(null);
  const [batches, setBatches] = useState<ManufacturingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const activeBatches = useMemo(() => {
    return batches.filter(batch => batch.workflows.some(w => w.status === 'in_progress' || w.status === 'pending'));
  }, [batches]);

  const completedBatches = useMemo(() => {
    return batches.filter(batch => batch.workflows.every(w => w.status === 'completed'));
  }, [batches]);

  useEffect(() => {
    fetchBatches();
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedOrder && selectedOrder.workflows.length > 0) {
      const sortedWorkflows = selectedOrder.workflows.sort((a, b) => a.sequence - b.sequence);
      let nextActiveStep = sortedWorkflows.find(w => w.status === 'in_progress');

      if (!nextActiveStep) {
        nextActiveStep = sortedWorkflows.find(w => w.status === 'pending');
      }
      
      if (!nextActiveStep) {
          nextActiveStep = sortedWorkflows[sortedWorkflows.length - 1]; // Fallback to last step if no active/pending
      }

      if (nextActiveStep) {
          setActiveStepId(nextActiveStep.step_id.toString());
      }
    } else {
      setActiveStepId(null);
    }
  }, [selectedOrder]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const data = await manufacturingApi.getAllBatches();
      setBatches(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch manufacturing batches');
      toast({
        title: 'Error',
        description: 'Failed to fetch manufacturing batches',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await ProductService.getAllProducts();
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleBatchCreate = async (batchData: any) => {
    try {
      const selectedProduct = products.find(p => p.id === batchData.product_id);
      if (!selectedProduct) {
        throw new Error('Selected product not found');
      }

      const newBatch = await manufacturingApi.createBatch({
        order_id: parseInt(batchData.customerOrder.split('-')[2]),
        product_name: selectedProduct.name,
        product_id: selectedProduct.id,
        product_code: selectedProduct.productCode || '',
        quantity: batchData.quantity,
        notes: batchData.notes
      });

      setBatches(prev => [...prev, newBatch]);
      setSelectedOrder(newBatch);
      toast({
        title: 'Success',
        description: 'Manufacturing batch created successfully',
      });
    } catch (err) {
      console.error('Error creating batch:', err);
      toast({
        title: 'Error',
        description: 'Failed to create manufacturing batch',
        variant: 'destructive',
      });
    }
  };

  const handleBatchEdit = (batch: ManufacturingBatch) => {
    // Implement edit logic, e.g., open a dialog with pre-filled data
    console.log('Editing batch:', batch);
    toast({
      title: 'Info',
      description: `Edit functionality for batch #${batch.batch_id} is not yet fully implemented.`,
    });
  };

  const handleBatchDelete = async (batchId: number) => {
    try {
      await manufacturingApi.deleteBatch(batchId);
      setBatches(prev => prev.filter(batch => batch.batch_id !== batchId));
      toast({
        title: 'Success',
        description: `Batch #${batchId} deleted successfully.`,
      });
      // If the deleted batch was the currently selected one, deselect it
      if (selectedOrder && selectedOrder.batch_id === batchId) {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error('Error deleting batch:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete manufacturing batch.',
        variant: 'destructive',
      });
    }
  };

  const handleStepChange = async (stepId: string, status: WorkflowStatus) => {
    if (!selectedOrder) return;

    try {
      await manufacturingApi.updateWorkflowStatus(selectedOrder.batch_id, parseInt(stepId), status);
      
      const updatedOrder: ManufacturingBatch = {
        ...selectedOrder,
        workflows: selectedOrder.workflows.map(w => 
          w.step_id.toString() === stepId 
            ? { 
                ...w, 
                status, 
                ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
                ...(status === 'in_progress' && !w.started_at ? { started_at: new Date().toISOString() } : {}) 
              } 
            : w
        ),
      };
      setSelectedOrder(updatedOrder);
      setBatches(prev => prev.map(b => b.batch_id === selectedOrder.batch_id ? updatedOrder : b));

      toast({
        title: 'Success',
        description: 'Workflow status updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update workflow status',
        variant: 'destructive',
      });
    }
  };

  const handleNavigateStep = (stepId: string) => {
    if (selectedOrder) {
      const navigatedStep = selectedOrder.workflows.find(w => w.step_id.toString() === stepId);
      if (navigatedStep) {
        setActiveStepId(navigatedStep.step_id.toString());
      }
    }
  };

  const handleSubComponentStatusChange = async (subComponentId: number, status: SubComponentStatus) => {
    if (!selectedOrder) return;

    try {
      await manufacturingApi.updateSubComponentStatus(selectedOrder.batch_id, subComponentId, status);
      
      const updatedOrder: ManufacturingBatch = {
        ...selectedOrder,
        sub_components: selectedOrder.sub_components.map(sc => 
          sc.sub_component_id === subComponentId 
            ? { 
                ...sc, 
                status, 
                ...(status === 'in_progress' && !sc.started_at ? { started_at: new Date().toISOString() } : {}),
                ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
              } 
            : sc
        ),
      };
      setSelectedOrder(updatedOrder);
      setBatches(prev => prev.map(b => b.batch_id === selectedOrder.batch_id ? updatedOrder : b));

      toast({
        title: 'Success',
        description: 'Sub-component status updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update sub-component status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!selectedOrder) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Manufacturing Batches</h2>
          <BatchForm onBatchCreate={handleBatchCreate} />
        </div>
        <div className="flex space-x-4 mb-4">
          <Button
            variant={activeTab === 'active' ? 'default' : 'outline'}
            onClick={() => setActiveTab('active')}
          >
            Active Batches
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('completed')}
          >
            Completed Batches
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'active' && (
            <BatchesTable 
              batches={activeBatches}
              onBatchSelect={(batch) => {
                setSelectedOrder(batch);
              }}
              onBatchEdit={handleBatchEdit}
              onBatchDelete={handleBatchDelete}
            />
          )}
          {activeTab === 'completed' && (
            <BatchesTable
              batches={completedBatches}
              onBatchSelect={(batch) => {
                setSelectedOrder(batch);
              }}
              onBatchEdit={handleBatchEdit}
              onBatchDelete={handleBatchDelete}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Manufacturing Dashboard</h2>
          <p className="text-gray-600">Batch #{selectedOrder.batch_id} - Order #{selectedOrder.order_id}</p>
        </div>
        <button
          onClick={() => setSelectedOrder(null)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Batches
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <WorkflowProgress workflows={selectedOrder.workflows} />
          </div>
          <ManufacturingSteps
            activeStep={activeStepId || ''}
            selectedOrder={selectedOrder}
            onStepChange={handleStepChange}
            onSubComponentStatusChange={handleSubComponentStatusChange}
            onNavigateStep={handleNavigateStep}
          />
        </div>
        <div>
          <MaterialRequirements selectedOrder={selectedOrder} />
        </div>
      </div>
    </div>
  );
};

export default ManufacturingDashboard;