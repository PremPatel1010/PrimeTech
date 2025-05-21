import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { format } from 'date-fns';

const GRNViewModal = ({ grn, onClose }) => {
  if (!grn) return null;
  return (
    <Dialog open={!!grn} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>View GRN</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="font-bold">GRN Number</span>
              <div>#{grn.grn_number}</div>
            </div>
            <div className="space-y-2">
              <span className="font-bold">Date</span>
              <div>{format(new Date(grn.grn_date), 'PPP')}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="font-bold">Received Quantity</span>
              <div className="font-bold text-blue-600">
                {grn.materials.reduce((sum, m) => sum + (m.received_quantity || 0), 0)}
              </div>
            </div>
            <div className="space-y-2">
              <span className="font-bold">Defective Quantity</span>
              <div className="font-bold text-red-600">
                {grn.materials.reduce((sum, m) => sum + (m.defective_quantity || 0), 0)}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <span className="font-bold">Remarks</span>
            <div className="p-2 bg-gray-50 rounded-md">{grn.remarks || 'No remarks'}</div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={grn.matched_with_po} disabled className="rounded border-gray-300" />
            <span>Matched with PO</span>
          </div>
          <span className="font-bold mt-2">Material Details</span>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Defective</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grn.materials.map((m) => (
                  <TableRow key={m.material_id}>
                    <TableCell>{m.material_name}</TableCell>
                    <TableCell>{m.received_quantity}</TableCell>
                    <TableCell className="text-red-600">{m.defective_quantity}</TableCell>
                    <TableCell>{m.remarks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GRNViewModal; 