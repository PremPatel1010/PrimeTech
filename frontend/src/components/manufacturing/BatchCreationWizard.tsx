import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Package, Calendar, Clock, Factory, CheckCircle } from 'lucide-react';
import { ManufacturingService, Product, RawMaterial } from '@/services/manufacturing.service';

interface BatchCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchCreated: () => void;
  products: Product[];
  rawMaterials: RawMaterial[];
  lowStockMaterials: RawMaterial[];
}

const DEFAULT_WORKFLOW_STEPS = [
  'Inward',
  'QC',
  'Components Assembly', 
  'Final Assembly',
  'Testing',
  'Packaging',
  'Completed'
];

const BatchCreationWizard: React.FC<BatchCreationWizardProps> = ({
  isOpen,
  onClose,
  onBatchCreated,
  products,
  rawMaterials,
  lowStockMaterials
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    selectedProductId: '',
    quantity: 1,
    targetDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  const selectedProduct = products.find(p => p.id === formData.selectedProductId);

  const calculateMaterialRequirements = () => {
    if (!selectedProduct) return [];
    
    const requirements: Record<string, { name: string; total: number; unit: string; available: number; isLowStock: boolean }> = {};
    
    console.log(selectedProduct);
    console.log(rawMaterials);
    selectedProduct.subComponents?.forEach(subComponent => {
      subComponent.materials?.forEach(material => {
        const totalRequired = material.quantityRequired * formData.quantity;
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
      total + (sc.estimatedTime * formData.quantity), 0) || 0;
    const finalAssemblyTime = selectedProduct.finalAssemblyTime * formData.quantity;
    
    return Math.round((subComponentTime + finalAssemblyTime) / 60); // Convert to hours
  };

  const getProductSteps = () => {
    if (!selectedProduct) return DEFAULT_WORKFLOW_STEPS;
    
    if (selectedProduct.manufacturingSteps && selectedProduct.manufacturingSteps.length > 0) {
      return selectedProduct.manufacturingSteps.map(step => step.name);
    }
    
    if (selectedProduct.subComponents && selectedProduct.subComponents.length > 0) {
      const subComponentSteps = selectedProduct.subComponents.flatMap(sc => 
        sc.manufacturingSteps?.map(step => step.name) || []
      );
      
      if (subComponentSteps.length > 0) {
        return [...new Set([...subComponentSteps, 'Final Assembly', 'Testing', 'Packaging', 'Completed'])];
      }
    }
    
    return DEFAULT_WORKFLOW_STEPS;
  };

  const handleCreateBatch = async () => {
    if (!selectedProduct) return;
    
    const batchNumber = `BATCH-${Date.now().toString().slice(-6)}`;
    const workflowSteps = getProductSteps();
    const newBatch = {
      batchNumber: batchNumber,
      productId: selectedProduct.id,
      quantity: formData.quantity,
      status: 'in_progress' as const,
      priority: formData.priority,
      targetCompletionDate: formData.targetDate || undefined
    };
    
    const createdBatch = await ManufacturingService.createBatch(newBatch);
    
    if (createdBatch) {
      // Create workflows for each step
      for (let i = 0; i < workflowSteps.length; i++) {
        const stepName = workflowSteps[i];
        const componentType = stepName === 'Final Assembly' ? 'final-assembly' : 'sub-component';
        const estimatedTime = stepName === 'Final Assembly' 
          ? selectedProduct.finalAssemblyTime * formData.quantity
          : Math.round((selectedProduct.subComponents?.[0]?.estimatedTime || 30) * formData.quantity / workflowSteps.length);
        
        await ManufacturingService.createWorkflow(createdBatch.id, {
          componentId: null,
          componentName: stepName,
          componentType,
          quantity: formData.quantity,
          estimatedDuration: estimatedTime,
          status: i === 0 ? 'in_progress' : 'not_started'
        });
      }
      
      onBatchCreated();
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      selectedProductId: '',
      quantity: 1,
      targetDate: '',
      priority: 'medium'
    });
    onClose();
  };

  const materialRequirements = calculateMaterialRequirements();
  const estimatedDuration = calculateEstimatedDuration();
  const hasInsufficientStock = materialRequirements.some(req => req.total > req.available);
  const workflowSteps = getProductSteps();

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="product" className="text-base font-medium">Select Product</Label>
              <Select 
                value={formData.selectedProductId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, selectedProductId: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a product to manufacture" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {product.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity" className="text-base font-medium">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="priority" className="text-base font-medium">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="targetDate" className="text-base font-medium">Target Completion Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Batch Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Product:</span>
                    <Badge variant="outline">{selectedProduct?.name}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Quantity:</span>
                    <Badge>{formData.quantity} units</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Priority:</span>
                    <Badge className={formData.priority === 'high' ? 'bg-red-500' : formData.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'}>
                      {formData.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Est. Duration:</span>
                    <Badge className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {estimatedDuration}h
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Steps ({workflowSteps.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {workflowSteps.map((step, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {index + 1}. {step}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {materialRequirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Material Requirements
                    {hasInsufficientStock && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {materialRequirements.map((req, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">{req.name}</span>
                          <div className="text-sm text-gray-600">
                            Required: {req.total} {req.unit} | Available: {req.available} {req.unit}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.total > req.available ? (
                            <Badge variant="destructive">Insufficient</Badge>
                          ) : (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Available
                            </Badge>
                          )}
                          {req.isLowStock && (
                            <Badge variant="outline" className="border-orange-300 text-orange-600">
                              Low Stock
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-6 w-6 text-blue-600" />
            Create New Manufacturing Batch
          </DialogTitle>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Step {currentStep} of 2</span>
              <span className="text-sm text-gray-600">
                {currentStep === 1 ? 'Batch Configuration' : 'Review & Confirm'}
              </span>
            </div>
            <Progress value={(currentStep / 2) * 100} className="h-2" />
          </div>
        </DialogHeader>
        
        <div className="py-6">
          {renderStepContent()}
        </div>
        
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)}>
                Back
              </Button>
            )}
            
            {currentStep < 2 ? (
              <Button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!formData.selectedProductId}
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleCreateBatch}
                disabled={!selectedProduct}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Batch
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BatchCreationWizard;