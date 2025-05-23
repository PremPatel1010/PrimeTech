import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import axiosInstance from '../../utils/axios';

const QCReportForm = ({ grn, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [returnHistory, setReturnHistory] = useState([]);
  const [returnHistoryLoading, setReturnHistoryLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);

  useEffect(() => {
    if (grn && grn.materials) {
      setMaterials(grn.materials.map(m => ({
        ...m,
        defective_quantity: m.defective_quantity || 0,
        accepted_quantity: (m.received_quantity || 0) - (m.defective_quantity || 0),
        remarks: m.remarks || ''
      })));
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

  const handleDefectiveChange = (idx, value) => {
    setMaterials(prev => prev.map((m, i) => i === idx ? {
      ...m,
      defective_quantity: value,
      accepted_quantity: (m.received_quantity || 0) - value
    } : m));
  };

  const handleRemarksChange = (idx, value) => {
    setMaterials(prev => prev.map((m, i) => i === idx ? { ...m, remarks: value } : m));
  };

  const handleSaveQC = async () => {
    setLoading(true);
    try {
      for (const m of materials) {
        if (m.defective_quantity > m.received_quantity) {
          throw new Error(`Defective quantity cannot exceed received quantity for ${m.material_name}`);
        }
        await axiosInstance.patch(`/purchase/${grn.purchase_order_id}/grn/${grn.grn_id}/qc`, {
          grn_id: grn.grn_id,
          material_id: m.material_id,
          defective_quantity: m.defective_quantity,
          accepted_quantity: m.accepted_quantity,
          remarks: m.remarks
        });
      }
      window.toast && window.toast({ title: 'QC saved', variant: 'default' });
    } catch (e) {
      window.toast && window.toast({ title: 'Error', description: e?.message || e?.response?.data?.error || 'Failed to save QC', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (m) => {
    console.log('handleReturn called', m);
    setLoading(true);
    try {
      if (!m.remarks) {
        throw new Error('Please add remarks for defective items before returning');
      }
      await axiosInstance.post(`/purchase/${grn.purchase_order_id}/grn/${grn.grn_id}/return`, {
        grn_id: grn.grn_id,
        material_id: m.material_id,
        quantity: m.defective_quantity,
        remarks: m.remarks
      });
      window.toast && window.toast({ title: 'Return entry created', variant: 'default' });
      setMaterials(prev => {
        console.log('Updating materials state after return:', prev.map(item => item.material_id === m.material_id ? { ...item, qc_status: 'returned' } : item));
        return prev.map(item => item.material_id === m.material_id ? { ...item, qc_status: 'returned' } : item);
      });
      fetchReturnHistory(grn.grn_id);
    } catch (e) {
      window.toast && window.toast({ title: 'Error', description: e?.message || e?.response?.data?.error || 'Failed to create return', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendToStore = async (m) => {
    console.log('handleSendToStore called', m);
    setStoreLoading(true);
    try {
      if (m.accepted_quantity <= 0) {
        throw new Error('No accepted quantity to send to store');
      }
      await axiosInstance.post(`/purchase/${grn.purchase_order_id}/grn/${grn.grn_id}/store`, {
        grn_id: grn.grn_id,
        material_id: m.material_id,
        quantity: m.accepted_quantity
      });
      window.toast && window.toast({ title: 'Sent to store', variant: 'default' });
      setMaterials(prev => {
        console.log('Updating materials state after send to store:', prev.map(item => item.material_id === m.material_id ? { ...item, store_status: 'sent' } : item));
        return prev.map(item => item.material_id === m.material_id ? { ...item, store_status: 'sent' } : item);
      });
      onSuccess && onSuccess();
    } catch (e) {
      window.toast && window.toast({ title: 'Error', description: e?.message || e?.response?.data?.error || 'Failed to send to store', variant: 'destructive' });
    } finally {
      setStoreLoading(false);
    }
  };

  if (!grn || !grn.materials || materials.length === 0) {
    return <div className="flex justify-center items-center p-8">No materials found for QC</div>;
  }

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-lg font-bold mb-4">QC In Progress</h2>

      {/* Summary */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600">Total Received (This GRN)</div>
          <div className="text-2xl font-bold">{materials.reduce((sum, m) => sum + (m.received_quantity || 0), 0)}</div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-sm text-green-600">Total Accepted (This GRN)</div>
          <div className="text-2xl font-bold">{materials.reduce((sum, m) => sum + (m.accepted_quantity || 0), 0)}</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-sm text-red-600">Total Defective (This GRN)</div>
          <div className="text-2xl font-bold">{materials.reduce((sum, m) => sum + (m.defective_quantity || 0), 0)}</div>
        </div>
      </div>

      {/* QC Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Material</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Defective</TableHead>
            <TableHead>Accepted</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.map((m, idx) => {
            console.log(`Material ${m.material_id}: defective_quantity=${m.defective_quantity}, accepted_quantity=${m.accepted_quantity}, qc_status=${m.qc_status}, store_status=${m.store_status}, loading=${loading}, storeLoading=${storeLoading}`);
            return (
              <TableRow key={m.material_id}>
                <TableCell>
                  <div className="font-medium">{m.material_name}</div>
                  <div className="text-sm text-gray-500">#{m.material_id}</div>
                </TableCell>
                <TableCell>{m.received_quantity}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={m.received_quantity}
                    value={m.defective_quantity}
                    onChange={e => handleDefectiveChange(idx, Number(e.target.value))}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={m.accepted_quantity > 0 ? "success" : "outline"}>
                    {m.accepted_quantity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Input 
                    value={m.remarks} 
                    onChange={e => handleRemarksChange(idx, e.target.value)} 
                    className="w-full"
                    placeholder="Add remarks for defective items"
                  />
                </TableCell>
                <TableCell>
                  {m.store_status === 'sent' ? (
                    <Badge variant="success">Sent to Store</Badge>
                  ) : m.qc_status === 'returned' ? (
                    <Badge variant="destructive">Returned</Badge>
                  ) : m.qc_status === 'completed' ? (
                    <Badge variant="default">QC Completed</Badge>
                  ) : m.defective_quantity > 0 ? (
                    <Badge variant="destructive">Defective (Pending Return)</Badge>
                  ) : m.accepted_quantity > 0 ? (
                    <Badge variant="success">Accepted (Pending Store)</Badge>
                  ) : (
                    <Badge variant="outline">Pending QC</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveQC} disabled={loading}>
                      {loading ? 'Saving...' : 'Save QC'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReturn(m)} disabled={loading || m.defective_quantity <= 0 || m.qc_status === 'returned'}>
                      {loading ? 'Returning...' : 'Return Defective'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleSendToStore(m)} disabled={storeLoading || m.accepted_quantity <= 0 || m.store_status === 'sent'}>
                      {storeLoading ? 'Sending...' : 'Send to Store'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Return History */}
      <div className="mt-6">
        <h3 className="font-bold mb-4">Return History</h3>
        {returnHistoryLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : returnHistory.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No returns yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Qty Returned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnHistory.map(r => (
                <TableRow key={r.return_id}>
                  <TableCell>{r.date ? new Date(r.date).toLocaleDateString() : ''}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.material_name}</div>
                    <div className="text-sm text-gray-500">#{r.material_id}</div>
                  </TableCell>
                  <TableCell>{r.quantity_returned}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'completed' ? 'success' : r.status === 'pending' ? 'warning' : 'outline'}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.remarks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 text-right space-x-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSuccess}>Done</Button>
      </div>
    </div>
  );
};

export default QCReportForm;