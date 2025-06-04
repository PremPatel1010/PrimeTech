
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManufacturingBatch } from '@/services/manufacturing.service';

interface BatchEditModalProps {
  batch: ManufacturingBatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<ManufacturingBatch>) => void;
}

const BatchEditModal: React.FC<BatchEditModalProps> = ({ batch, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    quantity: batch?.quantity || 1,
    priority: batch?.priority || 'medium',
    targetCompletionDate: batch?.targetCompletionDate?.split('T')[0] || '',
  });

  const handleSave = () => {
    if (!batch) return;
    
    const updateData: Partial<ManufacturingBatch> = {
      quantity: formData.quantity,
      priority: formData.priority as 'low' | 'medium' | 'high',
    };
    
    if (formData.targetCompletionDate) {
      updateData.targetCompletionDate = formData.targetCompletionDate;
    }
    
    onSave(batch.id, updateData);
    onClose();
  };

  if (!batch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Batch - {batch.batchNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Input
              id="product"
              value={batch.product?.name || 'Unknown Product'}
              disabled
              className="bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Completion Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={formData.targetCompletionDate}
              onChange={(e) => setFormData(prev => ({ ...prev, targetCompletionDate: e.target.value }))}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BatchEditModal;