
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Clock, Play, Pause, AlertTriangle, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';

interface SubComponent {
  id: string;
  name: string;
  completed: boolean;
  progress: number;
}

interface WorkflowStep {
  name: string;
  status: 'completed' | 'in_progress' | 'pending' | 'on_hold' | 'not_started';
  estimatedTime?: number;
  actualTime?: number;
  subComponents?: SubComponent[];
  workflow?: any;
}

interface WorkflowStepsProps {
  currentStep: number;
  totalSteps: number;
  steps: WorkflowStep[];
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
        <h4 className="font-semibold text-gray-800">Manufacturing Stage</h4>
        <Badge variant="outline" className="text-sm">
          Step {currentStep} of {totalSteps}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        {steps.map((step, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h5 className={`font-medium text-lg ${getStepTextColor(step.status)}`}>
                {step.name}
              </h5>
              <Badge className={`${getStatusBadgeColor(step.status)}`}>
                {step.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            {step.subComponents && step.subComponents.length > 0 && (
              <div className="space-y-3 mt-4">
                {step.subComponents.map((subComponent) => (
                  <div key={subComponent.id} className="flex items-center space-x-4">
                    <Checkbox
                      id={subComponent.id}
                      checked={subComponent.completed}
                      onCheckedChange={(checked) => {
                        // Handle checkbox change
                        console.log(`Sub-component ${subComponent.id} checked:`, checked);
                      }}
                    />
                    <label
                      htmlFor={subComponent.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {subComponent.name}
                    </label>
                    <Progress
                      value={subComponent.progress}
                      className="h-2 flex-1"
                    />
                    <span className="text-sm text-gray-500">
                      {subComponent.progress}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              {step.estimatedTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Est: {step.estimatedTime}min
                </span>
              )}
              {step.workflow?.assignedTeam && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {step.workflow.assignedTeam}
                </span>
              )}
            </div>

            {step.status === 'on_hold' && (
              <div className="mt-2 flex items-center gap-1 text-yellow-600 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Step is on hold
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WorkflowSteps;
