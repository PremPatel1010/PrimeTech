import React from 'react';
import { ManufacturingBatch } from '../../services/manufacturingApi';

interface MaterialRequirementsProps {
  selectedOrder: ManufacturingBatch;
}

export const MaterialRequirements = ({ selectedOrder }: MaterialRequirementsProps) => {
  const currentStep = selectedOrder.workflows.find(w => w.status === 'in_progress') || selectedOrder.workflows[0];
  const activeSubComponents = selectedOrder.sub_components.filter(sc => sc.status === 'in_progress');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-medium text-gray-900 mb-4">Material Requirements</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Step: {currentStep.step_name}</h4>
          <p className="text-sm text-gray-600">{currentStep.step_description}</p>
        </div>

        {activeSubComponents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Active Sub-Components</h4>
            <div className="space-y-2">
              {activeSubComponents.map(subComponent => (
                <div key={subComponent.sub_component_id} className="text-sm">
                  <p className="font-medium text-gray-900">{subComponent.name}</p>
                  <p className="text-gray-600">{subComponent.description}</p>
                  <div className="mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      subComponent.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : subComponent.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {subComponent.status.charAt(0).toUpperCase() + subComponent.status.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Required Materials</h4>
          <div className="space-y-2">
            {selectedOrder.sub_components.map(subComponent => (
              <div key={subComponent.sub_component_id} className="text-sm">
                <p className="font-medium text-gray-900">{subComponent.name}</p>
                <div className="mt-1 space-y-1">
                  {subComponent.manufacturing_steps.map(step => (
                    <div key={step.id} className="flex items-center justify-between">
                      <span className="text-gray-600">{step.name}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        step.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : step.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {step.status.charAt(0).toUpperCase() + step.status.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};