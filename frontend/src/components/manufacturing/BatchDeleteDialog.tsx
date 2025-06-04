
import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ManufacturingBatch } from '@/services/manufacturing.service';

interface BatchDeleteDialogProps {
  batch: ManufacturingBatch | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

const BatchDeleteDialog: React.FC<BatchDeleteDialogProps> = ({ batch, isOpen, onClose, onConfirm }) => {
  const handleConfirm = () => {
    if (batch) {
      onConfirm(batch.id);
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Manufacturing Batch</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete batch <strong>{batch?.batchNumber}</strong>? 
            This action cannot be undone and will permanently remove the batch and all associated workflows.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
            Delete Batch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BatchDeleteDialog;