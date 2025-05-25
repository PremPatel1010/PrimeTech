import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import axiosInstance from '../../utils/axios';

const QCReportForm = ({ grn, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [returnHistory, setReturnHistory] = useState([]);
  const [returnHistoryLoading, setReturnHistoryLoading] = useState(false);
  const [qcStatus, setQcStatus] = useState('pending'); // 'pending', 'in_progress', 'completed'
  const [qcLoading, setQcLoading] = useState(false);
  const [qcData, setQcData] = useState([]);

  useEffect(() => {
    if (grn && grn.materials) {
      setMaterials(grn.materials.map(m => ({
        ...m,
        defective_quantity: m.defective_quantity || 0,
        accepted_quantity: (m.received_quantity || 0) - (m.defective_quantity || 0),
        remarks: m.remarks || '',
        qc_status: m.qc_status || 'pending',
        store_status: m.store_status || 'pending'
      })));
      // Set overall QC status based on materials
      const allCompleted = grn.materials.every(m => m.qc_status === 'completed');
      const anyInProgress = grn.materials.some(m => m.qc_status === 'in_progress');
      setQcStatus(allCompleted ? 'completed' : anyInProgress ? 'in_progress' : 'pending');
    } else {
      setMaterials([]);
    }
    if (grn?.grn_id) {
      fetchReturnHistory(grn.grn_id);
    }
  }, [grn]);

  const fetchReturnHistory = async (grnId) => {
    setReturnHistoryLoading(true);
    try {
      const res = await axiosInstance.get(`/purchase/${grn.purchase_order_id}/grn/${grnId}/returns`);
      setReturnHistory(res.data);
    } catch {
      setReturnHistory([]);
    } finally {
      setReturnHistoryLoading(false);
    }
  };

  const handleQuantityChange = (idx, field, value) => {
    const newItems = [...materials]; // Use materials state directly
    const receivedQty = newItems[idx].received_quantity;
    let newValue = parseFloat(value) || 0;

    // Ensure quantity does not exceed received quantity and is not negative
    newValue = Math.max(0, Math.min(newValue, receivedQty));

    newItems[idx][field] = newValue;

    // Recalculate the other quantity based on the change
    if (field === 'defective_quantity') {
      newItems[idx].accepted_quantity = receivedQty - newValue;
    } else if (field === 'accepted_quantity') {
      newItems[idx].defective_quantity = receivedQty - newValue;
    }

    // Set status to 'in_progress' if quantities are being changed from initial state
    if (newItems[idx].qc_status !== 'passed' && newItems[idx].qc_status !== 'returned') {
         newItems[idx].qc_status = 'in_progress';
    }

    setMaterials(newItems); // Update materials state
  };

  const handleSaveQC = async () => {
    console.log('Save QC button clicked.');
    setLoading(true);
    try {
      // Iterate through each material and call the save function for that item
      for (const material of materials) {
        // Call the specific handler for saving a single item's QC
        await handleSaveQCForItem(material);
      }

      // After all items are processed, trigger a full data refresh for the PO
      // The individual item saves already trigger onSuccess, but a final one here ensures consistency.

      toast({ title: 'All QC results saved successfully', variant: 'default' });
      console.log('All QC results saved successfully.');
    } catch (e) {
      console.error('Error saving QC:', e);
      toast({ 
        title: 'Error', 
        description: e?.message || e?.response?.data?.error || 'Failed to save QC for one or more items', // More general error message
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQCForItem = async (item) => {
    console.log('Save QC for item clicked.');
    setLoading(true);
    try {
      // Validate the item
      if (item.defective_quantity > item.received_quantity) {
        throw new Error(`Defective quantity cannot exceed received quantity for ${item.material_name}`);
      }
      // Remarks are now optional, removed validation
       // if (item.defective_quantity > 0 && !item.remarks) {
       //     throw new Error(`Please add remarks for defective items in ${item.material_name}`);
       // }
        // if (item.accepted_quantity < item.received_quantity && !item.remarks) {
        //      throw new Error(`Please add remarks for partially accepted items in ${item.material_name}`);
        // }

      // Determine the QC status based on quantities
      let determinedQcStatus = 'passed';
      if (item.defective_quantity > 0) {
        determinedQcStatus = 'returned';
      } else if (item.accepted_quantity === item.received_quantity) {
        determinedQcStatus = 'passed';
      } else {
          // This case should ideally not happen if sum of accepted and defective equals received, but as a fallback:
          determinedQcStatus = 'in_progress';
      }

      console.log('Sending QC data to backend:', {
        grn_id: grn.grn_id,
        grn_item_id: item.grn_item_id,
        material_id: item.material_id,
        defective_quantity: item.defective_quantity,
        accepted_quantity: item.accepted_quantity,
        remarks: item.remarks,
        qc_status: determinedQcStatus // Send the determined status
      });

      // Use the correct backend endpoint for updating GRN item QC status
      await axiosInstance.patch(`/purchase-orders/grn-item/${item.grn_item_id}/qc`, {
        defective_quantity: item.defective_quantity,
        accepted_quantity: item.accepted_quantity,
        remarks: item.remarks || null, // Send null if remarks are empty
        qc_status: determinedQcStatus
      });

      // Update local state to reflect the saved QC status
      setMaterials(prev => prev.map(m =>
        m.grn_item_id === item.grn_item_id
          ? { ...m, qc_status: determinedQcStatus, remarks: item.remarks, defective_quantity: item.defective_quantity, accepted_quantity: item.accepted_quantity }
          : m
      ));

      toast({ title: 'QC saved successfully', variant: 'default' });
      // Trigger a full data refresh for the PO to update overall status and summaries
      console.log('QC saved successfully.');
    } catch (e) {
      console.error('Error saving QC:', e);
      toast({ 
        title: 'Error', 
        description: e?.message || e?.response?.data?.error || 'Failed to save QC', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReturnItem = async (item) => {
    console.log('Return Defective button clicked for material:', item);
    setLoading(true);
    try {
      if (item.defective_quantity <= 0) {
        throw new Error('No defective items to return');
      }

      console.log('Sending return data to backend:', {
        grn_id: grn.grn_id,
        material_id: item.material_id,
        quantity: item.defective_quantity,
        remarks: item.remarks
      });

      // Call the specific backend endpoint for returning a GRN item
      await axiosInstance.put(`/purchase-orders/grn-item/${item.grn_item_id}/return`, {
        quantity: item.defective_quantity, // Quantity to return
        remarks: item.remarks // Remarks for return
      });

      // Update local state to reflect the return status
      setMaterials(prev => prev.map(m =>
        m.grn_item_id === item.grn_item_id
          ? { ...m, qc_status: 'returned', defective_quantity: item.defective_quantity, remarks: item.remarks, store_status: 'returned' } // Mark as returned, update defective qty and remarks, set store_status to 'returned'
          : m
      ));

      toast({ title: 'Item Marked as Returned', description: 'Defective item quantity marked for return.' });
      // Trigger a full data refresh for the PO to update overall status and summaries
      onSuccess && onSuccess();
      console.log('Return entry created successfully.');
    } catch (e) {
      console.error('Error creating return:', e);
      toast({ 
        title: 'Error', 
        description: e?.message || e?.response?.data?.error || 'Failed to create return', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setQcLoading(true);
    try {
      const qcReportData = {
        grn_id: grn.grn_id,
        items: qcData.map(item => ({
          grn_item_id: item.grn_item_id,
          qc_status: item.qc_status,
          qc_quantity: item.qc_quantity,
          qc_notes: item.qc_notes
        }))
      };

      await axiosInstance.post(`/purchase-orders/${grn.purchase_order_id}/qc`, qcReportData);
      toast({ title: 'QC Report Submitted', description: 'QC report has been submitted successfully' });
      onSuccess();
    } catch (error) {
      console.error('Error submitting QC report:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to submit QC report',
        status: 'error'
      });
    } finally {
      setQcLoading(false);
    }
  };

  // Prevent closing dialog if loading
  const handleOpenChange = (open) => {
    if (!loading) {
      if (!open) onCancel();
    }
  };

  if (!grn || !grn.materials || materials.length === 0) {
    return <div className="flex justify-center items-center p-8">No materials found for QC</div>;
  }

  return (
    <Dialog open={!!grn} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>QC In Progress for GRN #{grn?.grn_id}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {/* Summary adapted for this GRN */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <div className="text-sm text-blue-600 font-medium">Total Received (This GRN)</div>
              <div className="text-2xl font-bold text-blue-700">{grn?.received_quantity || 0}</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <div className="text-sm text-green-600 font-medium">Total Accepted (Added to Store)</div>
              <div className="text-2xl font-bold text-green-700">{materials.reduce((sum, item) => sum + item.accepted_quantity, 0) || 0}</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <div className="text-sm text-red-600 font-medium">Total Defective (This GRN)</div>
              <div className="text-2xl font-bold text-red-700">{materials.reduce((sum, item) => sum + item.defective_quantity, 0) || 0}</div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="w-[100px]">Defective</TableHead>
                <TableHead className="w-[100px]">Accepted</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((item, index) => (
                <TableRow key={item.grn_item_id || index}>
                  <TableCell className="font-medium">{item.material_name || 'N/A'} #{item.material_id}</TableCell>
                  <TableCell px={2} py={2}>{item.received_quantity}</TableCell>
                  <TableCell px={2} py={2}>
                    <Input
                      type="number"
                      min="0"
                      value={item.defective_quantity}
                      onChange={(e) => handleQuantityChange(index, 'defective_quantity', e.target.value)}
                      disabled={item.qc_status === 'passed' || item.qc_status === 'returned' || item.store_status === 'sent'}
                       width="80px"
                       textAlign="right"
                    />
                  </TableCell>
                  <TableCell px={2} py={2}>
                    <Input
                      type="number"
                      min="0"
                      value={item.accepted_quantity}
                      onChange={(e) => handleQuantityChange(index, 'accepted_quantity', e.target.value)}
                      disabled={item.qc_status === 'passed' || item.qc_status === 'returned' || item.store_status === 'sent'}
                      width="80px"
                      textAlign="right"
                    />
                  </TableCell>
                  <TableCell px={2} py={2}>
                    <Textarea
                      value={item.remarks}
                      onChange={(e) => handleQuantityChange(index, 'remarks', e.target.value)}
                      placeholder="Remarks for defective items"
                      disabled={item.qc_status === 'passed' || item.qc_status === 'returned' || item.store_status === 'sent'}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell px={2} py={2}>
                     <Badge variant={
                       item.qc_status === 'returned' ? 'destructive' :
                       item.store_status === 'sent' ? 'default' :
                       item.qc_status === 'passed' ? 'success' :
                       item.qc_status === 'in_progress' ? 'secondary' :
                       'outline'
                     }>
                       {item.qc_status === 'returned' ? 'Returned' : // Prioritize 'Returned' status
                        item.store_status === 'sent' ? 'Sent to Store' : // Then 'Sent to Store'
                        item.qc_status === 'passed' ? 'QC Passed (Pending Store)' : // If passed QC but not sent
                        item.qc_status === 'in_progress' ? 'QC In Progress' : // During QC
                        item.defective_quantity > 0 && item.qc_status !== 'returned' ? 'Defective (Pending Return)' : // Defective but not yet returned
                        'Pending QC'} {/* Default status */}
                     </Badge>
                   </TableCell>
                 <TableCell px={2} py={2} className="space-y-2">
                   {/* Button to Save initial QC Result (sets qc_status to passed or returned) */}
                   {(item.qc_status === 'pending' || item.qc_status === 'in_progress') && item.received_quantity > 0 && (item.accepted_quantity !== item.received_quantity || item.defective_quantity > 0) && (
                         <Button size="sm" onClick={() => handleSaveQCForItem(item)} disabled={loading}>
                           Save QC Result
                         </Button>
                    )}

                   {/* Button to Return Defective Quantity - Logic moved to Save QC, keep button for visibility? Or remove? */}
                    {/* Decided to remove this button as recording defective quantity is now part of Save QC */}

                   {/* Display badges for final states */}
                   {item.qc_status === 'returned' && (
                        <Badge variant="destructive">Returned ({item.defective_quantity})</Badge>
                   )}
                   {/* Changed store_status check to qc_status for completed QC */}
                   {item.qc_status === 'passed' && item.qc_passed_quantity > 0 && (
                        <Badge colorScheme="green">QC Completed ({item.qc_passed_quantity})</Badge>
                    )}

                   {/* Badge for QC Passed but not yet sent to store - REMOVED */}
                    {/* {item.qc_status === 'passed' && item.store_status === 'pending' && item.qc_passed_quantity > 0 && (
                         <Badge colorScheme="green">QC Passed (Pending Store)</Badge>
                    )} */}

                 </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Add Return History section if needed */}
          <div className="mt-6">
            <h4 className="font-semibold mb-2 text-gray-700">Return History (This GRN)</h4>
            {/* You would fetch and display return history for this GRN here */}
            <div className="text-gray-500 text-sm italic">No return history found for this GRN.</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QCReportForm;