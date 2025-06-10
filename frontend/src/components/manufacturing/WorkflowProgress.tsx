import React from 'react';
import { WorkflowStep } from '../../services/manufacturingApi';

interface WorkflowProgressProps {
  workflows: WorkflowStep[];
}

export const WorkflowProgress = ({ workflows }: WorkflowProgressProps) => {
  const sortedWorkflows = [...workflows].sort((a, b) => a.sequence - b.sequence);
  const currentStepIndex = sortedWorkflows.findIndex(w => w.status === 'in_progress');

  return (
    <div className="p-6">
      <div className="relative">
        {/* Progress bar */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{
              width: currentStepIndex >= 0
                ? `${((currentStepIndex + 1) / sortedWorkflows.length) * 100}%`
                : '0%'
            }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {sortedWorkflows.map((step, index) => {
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'in_progress';
            const isSkipped = step.status === 'skipped';
            const isPast = index < currentStepIndex;

            return (
              <div key={step.step_id} className="flex flex-col items-center">
                {/* Step circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-200 ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isActive
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : isSkipped
                          ? 'bg-gray-200 border-gray-300 text-gray-400'
                          : isPast
                            ? 'bg-blue-100 border-blue-300 text-blue-500'
                            : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isSkipped ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Step label */}
                <div className="mt-2 text-center">
                  <div className={`text-sm font-medium ${
                    isCompleted || isActive
                      ? 'text-gray-900'
                      : isSkipped
                        ? 'text-gray-400'
                        : 'text-gray-500'
                  }`}>
                    {step.step_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {step.step_description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};