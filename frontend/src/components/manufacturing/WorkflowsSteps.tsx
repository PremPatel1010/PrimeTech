
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Clock, Play, Pause, AlertTriangle, Users } from 'lucide-react';

interface WorkflowStepsProps {
  currentStep: number;
  totalSteps: number;
  steps: {
    name: string;
    status: 'completed' | 'in_progress' | 'pending' | 'on_hold' | 'not_started';
    estimatedTime?: number;
    actualTime?: number;
    workflow?: any;
  }[];
}

const WorkflowSteps: React.FC<WorkflowStepsProps> = ({ currentStep, totalSteps, steps }) => {
  const getStepIcon = (status: string, index: number) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-white" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-white" />;
      case 'on_hold':
        return <Pause className="h-4 w-4 text-white" />;
      case 'not_started':
        return <Clock className="h-4 w-4 text-white" />;
      default:
        return <span className="text-xs font-semibold text-gray-600">{index + 1}</span>;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-500';
      case 'in_progress':
        return 'bg-blue-500 border-blue-500';
      case 'on_hold':
        return 'bg-yellow-500 border-yellow-500';
      case 'not_started':
        return 'bg-gray-400 border-gray-400';
      default:
        return 'bg-gray-200 border-gray-300';
    }
  };

  const getStepTextColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700';
      case 'in_progress':
        return 'text-blue-700';
      case 'on_hold':
        return 'text-yellow-700';
      case 'not_started':
        return 'text-gray-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const progressPercentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-800">Production Workflow</h4>
        <Badge variant="outline" className="text-sm">
          Step {currentStep} of {totalSteps}
        </Badge>
      </div>
      
      <Progress value={progressPercentage} className="h-3 mb-6 bg-gray-200" />
      
      <div className="relative">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center mb-6 last:mb-0">
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="absolute left-6 mt-12 w-0.5 h-6 bg-gray-200 z-0" />
            )}
            
            {/* Step Circle */}
            <div className={`relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-sm ${getStepColor(step.status)}`}>
              {getStepIcon(step.status, index)}
            </div>
            
            {/* Step Content */}
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between mb-2">
                <h5 className={`font-medium text-base ${getStepTextColor(step.status)}`}>
                  {step.name}
                </h5>
                <Badge className={`text-xs ${getStatusBadgeColor(step.status)}`}>
                  {step.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {step.estimatedTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Est: {step.estimatedTime}min
                  </span>
                )}
                {step.actualTime && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" />
                    Actual: {step.actualTime}min
                  </span>
                )}
                {step.workflow?.assignedTeam && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {step.workflow.assignedTeam}
                  </span>
                )}
              </div>

              {/* Progress indicator for in-progress steps */}
              {step.status === 'in_progress' && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              )}

              {/* Warning for on-hold steps */}
              {step.status === 'on_hold' && (
                <div className="mt-2 flex items-center gap-1 text-yellow-600 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  Step is on hold
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowSteps;
