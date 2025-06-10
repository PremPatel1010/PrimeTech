import React from 'react';
import { ManufacturingStep } from './steps/ManufacturingStep';
import { CompletedStep } from './steps/CompletedStep';
import { ManufacturingBatch } from '../../services/manufacturingApi';

interface ManufacturingStepsProps {
  activeStep: string;
  selectedOrder: ManufacturingBatch;
  onStepChange: (stepId: string, status: string) => void;
  onSubComponentStatusChange: (subComponentId: number, status: string) => void;
  onNavigateStep: (stepId: string) => void;
}

export const ManufacturingSteps = ({ 
  activeStep, 
  selectedOrder, 
  onStepChange,
  onSubComponentStatusChange,
  onNavigateStep
}: ManufacturingStepsProps) => {
  const renderStep = () => {
    const currentStep = selectedOrder.workflows.find(w => w.step_id.toString() === activeStep);
    
    if (!currentStep) {
      return <div>No active step found</div>;
    }

    // If the current step is manufacturing, show the manufacturing step with sub-components
    if (currentStep.step_name.toLowerCase().includes('manufacturing')) {
      return (
        <ManufacturingStep 
          selectedOrder={selectedOrder}
          onStepChange={onStepChange}
          onSubComponentStatusChange={onSubComponentStatusChange}
        />
      );
    }

    // If the current step is completed, show the completed step
    if (currentStep.step_name.toLowerCase().includes('completed')) {
      return (
        <CompletedStep 
          selectedOrder={selectedOrder}
          onStepChange={onStepChange}
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
                if (currentStep.status === 'pending') {
                  onStepChange(currentStep.step_id.toString(), 'in_progress');
                } else if (currentStep.status === 'in_progress') {
                  onStepChange(currentStep.step_id.toString(), 'completed');
                }
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                currentStep.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : currentStep.status === 'in_progress'
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

        <div className="flex justify-between mt-6">
          <button
            onClick={() => {
              const prevStep = selectedOrder.workflows
                .sort((a, b) => a.sequence - b.sequence)
                .find(w => w.sequence < currentStep.sequence);
              if (prevStep) {
                onNavigateStep(prevStep.step_id.toString());
              }
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={!selectedOrder.workflows.some(w => w.sequence < currentStep.sequence)}
          >
            Previous Step
          </button>
          <button
            onClick={() => {
              const sortedWorkflows = selectedOrder.workflows.sort((a, b) => a.sequence - b.sequence);
              const currentStepIndex = sortedWorkflows.findIndex(w => w.step_id.toString() === activeStep);
              const nextStep = sortedWorkflows[currentStepIndex + 1];

              if (nextStep) {
                if (nextStep.status === 'pending') {
                  onStepChange(nextStep.step_id.toString(), 'in_progress');
                }
                onNavigateStep(nextStep.step_id.toString());
              } else {
                console.log('All steps completed for this batch!');
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            disabled={currentStep.status !== 'completed' || !selectedOrder.workflows.some(w => w.sequence > currentStep.sequence)}
          >
            Next Step
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {renderStep()}
    </div>
  );
};