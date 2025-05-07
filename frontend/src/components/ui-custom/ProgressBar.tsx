
import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
  colorVariant?: 'default' | 'success' | 'warning' | 'danger';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  className, 
  showLabel = false,
  colorVariant = 'default'
}) => {
  const safeValue = Math.max(0, Math.min(100, value));
  
  const getColorClass = () => {
    switch (colorVariant) {
      case 'success': return 'bg-factory-success';
      case 'warning': return 'bg-factory-warning';
      case 'danger': return 'bg-factory-danger';
      default: return 'bg-factory-primary';
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between mb-1">
        {showLabel && (
          <>
            <span className="text-xs font-medium text-factory-gray-500">Progress</span>
            <span className="text-xs font-medium text-factory-gray-500">{safeValue}%</span>
          </>
        )}
      </div>
      <div className="w-full bg-factory-gray-200 rounded-full h-2.5">
        <div 
          className={cn("h-2.5 rounded-full", getColorClass())} 
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
