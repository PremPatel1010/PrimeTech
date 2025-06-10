import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ManufacturingBatch } from '../../services/manufacturingApi';
import { Eye, Edit, Trash2 } from 'lucide-react';

interface BatchesTableProps {
  onBatchSelect: (batch: ManufacturingBatch) => void;
  batches: ManufacturingBatch[];
  onBatchEdit: (batch: ManufacturingBatch) => void;
  onBatchDelete: (batchId: number) => void;
}

export const BatchesTable = ({ onBatchSelect, batches, onBatchEdit, onBatchDelete }: BatchesTableProps) => {
  const getStageColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'skipped': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Batch ID</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="w-[80px]">Qty</TableHead>
            <TableHead className="w-[140px]">Current Stage</TableHead>
            <TableHead className="w-[120px]">Sales Order</TableHead>
            <TableHead className="w-[60px] text-center">Edit</TableHead>
            <TableHead className="w-[60px] text-center">Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                No manufacturing batches found.
              </TableCell>
            </TableRow>
          ) : (
            batches.map((batch) => {
              const isBatchCompleted = batch.workflows.every(w => w.status === 'completed');
              const currentWorkflowStep = isBatchCompleted 
                ? null // No active step if batch is completed
                : batch.workflows.find(w => w.status === 'in_progress') || 
                  batch.workflows.find(w => w.status === 'pending') || 
                  batch.workflows[0];

              return (
                <TableRow 
                  key={batch.batch_id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onBatchSelect(batch)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span>#{batch.batch_id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{batch.product_name}</div>
                      <div className="text-sm text-gray-600">{batch.product_code}</div>
                    </div>
                  </TableCell>
                  <TableCell>{batch.quantity}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(currentWorkflowStep?.status || 'pending')}`}>
                      {isBatchCompleted ? 'Completed' : currentWorkflowStep?.step_name || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">SO-{batch.order_id}</TableCell>
                  <TableCell className="text-center">
                    <button 
                      className="text-blue-600 hover:text-blue-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBatchEdit(batch);
                      }}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <button 
                      className="text-red-600 hover:text-red-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBatchDelete(batch.batch_id);
                      }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};
