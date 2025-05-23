import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatDate } from '@/utils/calculations';
import axiosInstance from '../../utils/axios.ts';
import QCReportForm from './QCReportForm.jsx';

const GRNViewModal = ({ grn, onClose }) => {
  if (!grn) return null;

  const totalReceived = grn.materials?.reduce((sum, m) => sum + (m.received_quantity || 0), 0) || grn.received_quantity || 0;
  const totalDefective = grn.materials?.reduce((sum, m) => sum + (m.defective_quantity || 0), 0) || grn.defective_quantity || 0;

  return (
    <Dialog open={!!grn} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>View GRN #{grn.grn_id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* GRN Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-1">GRN Date</h4>
              <p>{formatDate(grn.grn_date)}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">Status</h4>
              <Badge className={grn.verified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                {grn.verified ? "Verified" : "Pending"}
              </Badge>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <h4 className="text-sm font-semibold mb-1">Total Received</h4>
              <p className="text-lg font-bold text-green-600">{totalReceived}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">Total Defective</h4>
              <p className="text-lg font-bold text-red-600">{totalDefective}</p>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <h4 className="text-sm font-semibold mb-1">Remarks</h4>
            <div className="p-2 bg-gray-50 rounded-md min-h-[40px]">
              {grn.remarks || "No remarks"}
            </div>
          </div>

          {/* PO Match Status */}
          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              checked={grn.matched_with_po}
              disabled
              className="rounded border-gray-300"
            />
            <span className="text-sm">Matched with Purchase Order</span>
          </div>

          {/* Materials Table */}
          {grn.materials && grn.materials.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Material Details</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Received Qty</TableHead>
                      <TableHead>Defective Qty</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grn.materials.map((material) => (
                      <TableRow key={material.material_id}>
                        <TableCell>{material.material_name}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {material.received_quantity}
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {material.defective_quantity || 0}
                        </TableCell>
                        <TableCell>{material.remarks || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Created By Info */}
          {grn.created_by_name && (
            <div className="text-sm text-gray-500 mt-4">
              Created by: {grn.created_by_name}
            </div>
          )}

          {/* Add PDF preview in modal if grn.grn_id exists */}
          {grn.grn_id && (
            <div style={{height: '80vh', marginTop: 16}}>
              <iframe src={`${axiosInstance.defaults.baseURL}/purchase/purchase-orders/grn/${grn.grn_id}/pdf`} width="100%" height="100%" style={{border: 'none'}} title="GRN PDF" />
            </div>
          )}

          {/* In the modal body, if grn.status === 'qc_in_progress', render <QCReportForm grn={grn} onSuccess={onClose} onCancel={onClose} /> */}
          {grn.status === 'qc_in_progress' && (
            <QCReportForm grn={grn} onSuccess={onClose} onCancel={onClose} />
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GRNViewModal; 