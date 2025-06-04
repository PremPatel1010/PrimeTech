import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ManufacturingBatch } from '@/services/manufacturing.service';
import { Clock, Users, Calendar } from 'lucide-react';

interface StepUpdateModalProps {
  workflow: any;
  batch: ManufacturingBatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (workflowId: string, data: any) => void;
}

const StepUpdateModal: React.FC<StepUpdateModalProps> = ({ 
  workflow, 
  batch, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    status: workflow?.status || 'not_started',
    assignedTeam: workflow?.assignedTeam || '',
    estimatedDuration: workflow?.estimatedDuration || 60,
    actualDuration: workflow?.actualDuration || '',
    startDate: workflow?.startDate?.split('T')[0] || '',
    endDate: workflow?.endDate?.split('T')[0] || '',
    notes: workflow?.notes || ''
  });

  useEffect(() => {
    if (workflow) {
      setFormData({
        status: workflow.status || 'not_started',
        assignedTeam: workflow.assignedTeam || '',
        estimatedDuration: workflow.estimatedDuration || 60,
        actualDuration: workflow.actualDuration || '',
        startDate: workflow.startDate?.split('T')[0] || '',
        endDate: workflow.endDate?.split('T')[0] || '',
        notes: workflow.notes || ''
      });
    }
  }, [workflow]);

  const handleSave = () => {
    if (!workflow) return;
    
    const updateData = {
      status: formData.status,
      assignedTeam: formData.assignedTeam,
      estimatedDuration: formData.estimatedDuration,
      actualDuration: formData.actualDuration ? parseInt(formData.actualDuration) : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      notes: formData.notes
    };
    
    onSave(workflow.id, updateData);
    onClose();
  };

  if (!workflow || !batch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Update Step: {workflow.componentName}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Batch: {batch.batchNumber} | Product: {batch.product?.name}
          </p>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assigned Team */}
          <div className="space-y-2">
            <Label htmlFor="assignedTeam">Assigned Team</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="assignedTeam"
                value={formData.assignedTeam}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTeam: e.target.value }))}
                placeholder="Enter team or person responsible"
                className="pl-10"
              />
            </div>
          </div>

          {/* Time Estimates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                min={1}
                value={formData.estimatedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 60 }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="actualDuration">Actual Duration (minutes)</Label>
              <Input
                id="actualDuration"
                type="number"
                min={0}
                value={formData.actualDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, actualDuration: e.target.value }))}
                placeholder="Enter when completed"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any notes or comments about this step..."
              rows={3}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StepUpdateModal;