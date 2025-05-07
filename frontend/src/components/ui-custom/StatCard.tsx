
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  description?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  description,
  className 
}) => {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          {icon && <div className="text-factory-primary">{icon}</div>}
        </div>
        <div className="mt-2 flex items-baseline">
          <p className="text-xl md:text-2xl font-semibold">{value}</p>
          
          {trend && (
            <span 
              className={cn(
                "ml-2 text-xs font-medium",
                trend.positive ? "text-factory-success" : "text-factory-danger"
              )}
            >
              {trend.positive ? "+" : "-"}{trend.value}%
            </span>
          )}
        </div>
        
        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
