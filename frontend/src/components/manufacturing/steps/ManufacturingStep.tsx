import React, { useState } from 'react';
import { Play, Pause, Settings, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ManufacturingBatch } from '../../../services/manufacturingApi';

interface ManufacturingStepProps {
  selectedOrder: ManufacturingBatch;
  onStepChange: (stepId: string, status: string) => void;
  onSubComponentStatusChange: (subComponentId: number, status: string) => void;
}

export const ManufacturingStep = ({ 
  selectedOrder, 
  onStepChange,
  onSubComponentStatusChange 
}: ManufacturingStepProps) => {
  const [activeSubComponents] = useState<string[]>([]);

  const subComponents = [
    { 
      id: 'motor-assembly', 
      name: 'Motor Assembly', 
      status: 'in-progress', 
      progress: 65,
      operator: 'John Smith',
      startTime: '09:30 AM',
      estimatedCompletion: '02:45 PM'
    },
    { 
      id: 'pump-housing', 
      name: 'Pump Housing', 
      status: 'completed', 
      progress: 100,
      operator: 'Sarah Johnson',
      startTime: '08:00 AM',
      estimatedCompletion: 'Completed'
    },
    { 
      id: 'control-unit', 
      name: 'Control Unit', 
      status: 'pending', 
      progress: 0,
      operator: 'Mike Wilson',
      startTime: 'Not Started',
      estimatedCompletion: '04:30 PM'
    },
    { 
      id: 'solar-controller', 
      name: 'Solar Controller', 
      status: 'in-progress', 
      progress: 30,
      operator: 'Lisa Brown',
      startTime: '10:15 AM',
      estimatedCompletion: '03:20 PM'
    }
  ];

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
            onClick={() => onStepChange(selectedOrder.workflows.find(w => w.step_name.toLowerCase().includes('manufacturing'))?.step_id.toString() || '', 'completed')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedOrder.workflows.find(w => w.step_name.toLowerCase().includes('manufacturing'))?.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
            disabled={selectedOrder.workflows.find(w => w.step_name.toLowerCase().includes('manufacturing'))?.status === 'completed'}
          >
            {selectedOrder.workflows.find(w => w.step_name.toLowerCase().includes('manufacturing'))?.status === 'completed' ? 'Completed' : 'Mark as Complete'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {selectedOrder.sub_components.map((subComponent) => (
          <div key={subComponent.sub_component_id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">{subComponent.name}</h4>
                <p className="text-sm text-gray-600">{subComponent.description}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onSubComponentStatusChange(subComponent.sub_component_id, 'in_progress')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    subComponent.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  disabled={subComponent.status === 'completed'}
                >
                  In Progress
                </button>
                <button
                  onClick={() => onSubComponentStatusChange(subComponent.sub_component_id, 'completed')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    subComponent.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Complete
                </button>
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
    </div>
  );
};