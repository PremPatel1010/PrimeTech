import React from 'react';
import { Play, Pause, Settings, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ManufacturingBatch } from '../../../services/manufacturingApi';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

interface ManufacturingStepProps {
  selectedOrder: ManufacturingBatch;
  onStepChange: (stepId: string, status: string) => void;
  onSubComponentStatusChange: (subComponentId: number, status: string) => void;
  activeStepId: string;
}

export const ManufacturingStep = ({ 
  selectedOrder, 
  onStepChange,
  onSubComponentStatusChange,
  activeStepId
}: ManufacturingStepProps) => {
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Manufacturing</h3>
          <p className="text-gray-600">Track and manage manufacturing progress</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              const currentAssemblyStep = selectedOrder.workflows.find(w => w.step_id.toString() === activeStepId);
              if (currentAssemblyStep && !isNaN(parseInt(currentAssemblyStep.step_id.toString()))) {
                onStepChange(currentAssemblyStep.step_id.toString(), 'completed');
              } else {
                console.error('Attempted to mark manufacturing step as complete, but step ID is invalid:', currentAssemblyStep);
                toast({
                  title: 'Error',
                  description: 'Invalid step ID for manufacturing step detected. Please refresh the page.',
                  variant: 'destructive',
                });
              }
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedOrder.workflows.find(w => w.step_id.toString() === activeStepId)?.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
            disabled={selectedOrder.workflows.find(w => w.step_id.toString() === activeStepId)?.status === 'completed'}
          >
            {selectedOrder.workflows.find(w => w.step_id.toString() === activeStepId)?.status === 'completed' ? 'Completed' : 'Mark as Complete'}
          </button>
        </div>
      </div>

      {selectedOrder.workflows.find(w => w.step_id.toString() === activeStepId)?.step_name.toLowerCase() === 'sub-component assembly' && (
        <div className="space-y-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Sub-components</h4>
          {selectedOrder.sub_components.map((subComponent) => (
            <div key={subComponent.sub_component_id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Checkbox
                    id={`sub-component-${subComponent.sub_component_id}`}
                    checked={subComponent.status === 'completed'}
                    onCheckedChange={(checked) => {
                      onSubComponentStatusChange(
                        subComponent.sub_component_id,
                        checked ? 'completed' : 'in_progress'
                      );
                    }}
                    className="mr-3"
                  />
                  <div>
                    <label
                      htmlFor={`sub-component-${subComponent.sub_component_id}`}
                      className="font-medium text-gray-900 cursor-pointer"
                    >
                      {subComponent.name}
                    </label>
                    <p className="text-sm text-gray-600">{subComponent.description}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    subComponent.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : subComponent.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {subComponent.status.charAt(0).toUpperCase() + subComponent.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
                {subComponent.started_at && (
                  <div>
                    <span className="text-gray-600">Started:</span>
                    <span className="ml-2">{new Date(subComponent.started_at).toLocaleString()}</span>
                  </div>
                )}
                {subComponent.completed_at && (
                  <div>
                    <span className="text-gray-600">Completed:</span>
                    <span className="ml-2">{new Date(subComponent.completed_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};