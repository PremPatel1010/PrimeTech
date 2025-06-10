import React from 'react';
import { ManufacturingBatch } from '../../services/manufacturingApi';

interface MaterialRequirementsProps {
  selectedOrder: ManufacturingBatch;
}

export const MaterialRequirements = ({ selectedOrder }: MaterialRequirementsProps) => {
  const currentStep = selectedOrder.workflows.find(w => w.status === 'in_progress') || selectedOrder.workflows[0];

  // Aggregate all materials from all sub-components' BOMs
  const aggregatedMaterials = selectedOrder.sub_components.reduce((acc, subComponent) => {
    if (subComponent.bill_of_materials) {
      subComponent.bill_of_materials.forEach(material => {
        const existingMaterial = acc.find(item => item.material_id === material.material_id);
        if (existingMaterial) {
          existingMaterial.quantity += material.quantity;
        } else {
          acc.push({ ...material });
        }
      });
    }
    return acc;
  }, [] as (typeof selectedOrder.sub_components[0]['bill_of_materials'][0])[]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="font-medium text-gray-900 mb-4">Material Requirements</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Current Step: {currentStep.step_name}</h4>
          <p className="text-sm text-gray-600">{currentStep.step_description}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Combined Bill of Materials</h4>
          {aggregatedMaterials.length > 0 ? (
            <div className="space-y-2">
              {aggregatedMaterials.map(material => (
                <div key={material.material_id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900">{material.name}</span>
                  <span className="text-gray-600">{material.quantity} {material.unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No material requirements found for this batch.</p>
          )}
        </div>
      </div>
    </div>
  );
};