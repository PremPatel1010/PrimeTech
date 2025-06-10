import React from 'react';
import { ManufacturingBatch } from '../../../services/manufacturingApi';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompletedStepProps {
  selectedOrder: ManufacturingBatch;
  onStepChange: (stepId: string, status: string) => void;
}

export const CompletedStep = ({ selectedOrder, onStepChange }: CompletedStepProps) => {
  const completedStep = selectedOrder.workflows.find(w => w.step_name.toLowerCase().includes('completed'));
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Manufacturing Complete</h3>
          <p className="text-gray-600">All manufacturing steps have been completed</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Completion Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Completed
                </span>
              </div>
              {completedStep?.started_at && (
                <div>
                  <span className="text-gray-600">Started:</span>
                  <span className="ml-2">{new Date(completedStep.started_at).toLocaleString()}</span>
                </div>
              )}
              {completedStep?.completed_at && (
                <div>
                  <span className="text-gray-600">Completed:</span>
                  <span className="ml-2">{new Date(completedStep.completed_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-green-800">Manufacturing Process Complete</h4>
            <p className="text-sm text-green-700 mt-1">
              All manufacturing steps and sub-components have been successfully completed. The batch is ready for the next stage.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => onStepChange('packaging', 'completed')}>
          Previous: Packaging
        </Button>
        <Button>
          Generate Shipping Label
        </Button>
      </div>
    </div>
  );
};
