
import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressStepsProps {
  steps: {
    label: string;
    completed: boolean;
    current: boolean;
  }[];
  className?: string;
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ steps, className }) => {
  return (
    <div className={cn("flex w-full", className)}>
      {steps.map((step, index) => (
        <div key={step.label} className="relative flex-1">
          {/* Connector Line */}
          {index > 0 && (
            <div 
              className={cn(
                "absolute inset-0 flex items-center",
                "left-0 right-0 -mx-2"
              )}
            >
              <div 
                className={cn(
                  "h-0.5 w-full",
                  step.completed ? "bg-factory-primary" : "bg-factory-gray-200"
                )}
              />
            </div>
          )}
          
          {/* Step Circle */}
          <div className="relative flex flex-col items-center group">
            <div 
              className={cn(
                "h-8 w-8 rounded-full border-2 flex items-center justify-center",
                step.completed 
                  ? "border-factory-primary bg-factory-primary text-white" 
                  : step.current 
                    ? "border-factory-primary text-factory-primary" 
                    : "border-gray-300 text-gray-300"
              )}
            >
              {step.completed ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span 
              className={cn(
                "mt-2 text-xs",
                step.current 
                  ? "font-medium text-factory-primary" 
                  : step.completed 
                    ? "font-medium text-factory-gray-700" 
                    : "text-factory-gray-500"
              )}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgressSteps;
