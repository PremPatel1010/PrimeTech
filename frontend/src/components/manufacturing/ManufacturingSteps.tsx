import React from 'react';
import { ManufacturingStep } from './steps/ManufacturingStep';
import { ManufacturingBatch } from '../../services/manufacturingApi';
import { useToast } from '@/components/ui/use-toast';

interface ManufacturingStepsProps {
  activeStepId: string | null;
  selectedOrder: ManufacturingBatch;
  onStepChange: (stepId: string, status: string) => void;
  onSubComponentStatusChange: (subComponentId: number, status: string) => void;
}

export const ManufacturingSteps = ({ 
  activeStepId,
  selectedOrder, 
  onStepChange,
  onSubComponentStatusChange
}: ManufacturingStepsProps) => {
  const { toast } = useToast();

  const renderStep = () => {
    const currentStep = selectedOrder.workflows.find(w => w.step_id.toString() === activeStepId);
    
    if (!currentStep) {
      return <div>No active step found</div>;
    }

    // If the current step is sub-component assembly, show the manufacturing step with sub-components
    if (currentStep.step_name.toLowerCase().includes('sub-component assembly')) {
      return (
        <ManufacturingStep 
          selectedOrder={selectedOrder}
          onStepChange={onStepChange}
          onSubComponentStatusChange={onSubComponentStatusChange}
          activeStepId={activeStepId}
        />
      );
    }

    // For all other steps, show a generic step view
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{currentStep.step_name}</h3>
            <p className="text-gray-600">{currentStep.step_description}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                const stepIdToUpdate = currentStep?.step_id?.toString();
                if (stepIdToUpdate && !isNaN(parseInt(stepIdToUpdate))) {
                  if (currentStep.status === 'pending') {
                    onStepChange(stepIdToUpdate, 'in_progress');
                  } else if (currentStep.status === 'in_progress') {
                    onStepChange(stepIdToUpdate, 'completed');
                  }
                } else {
                  console.error('Attempted to mark step as complete, but currentStep.step_id is invalid:', currentStep);
                  toast({
                    title: 'Error',
                    description: 'Invalid step ID detected. Please refresh the page.',
                    variant: 'destructive',
                  });
                }
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                currentStep.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : (currentStep.status === 'in_progress' || currentStep.status === 'pending')
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-800 cursor-not-allowed'
              }`}
              disabled={currentStep.status === 'completed'}
            >
              {currentStep.status === 'completed' ? 'Completed' : currentStep.status === 'pending' ? 'Start Step' : 'Mark as Complete'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Step Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    currentStep.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : currentStep.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {currentStep.status.charAt(0).toUpperCase() + currentStep.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
                {currentStep.started_at && (
                  <div>
                    <span className="text-gray-600">Started:</span>
                    <span className="ml-2">{new Date(currentStep.started_at).toLocaleString()}</span>
                  </div>
                )}
                {currentStep.completed_at && (
                  <div>
                    <span className="text-gray-600">Completed:</span>
                    <span className="ml-2">{new Date(currentStep.completed_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Removed navigation buttons - handled by WorkflowProgress */}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {renderStep()}
    </div>
  );
};