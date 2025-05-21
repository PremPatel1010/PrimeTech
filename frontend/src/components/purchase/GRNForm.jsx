import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { format } from 'date-fns';
import axiosInstance from '../../utils/axios.ts';

const GRNForm = ({ isOpen, onClose, purchaseOrder, onSuccess }) => {
  const [materials, setMaterials] = useState([]);
  const [formData, setFormData] = useState({
    grn_date: format(new Date(), 'yyyy-MM-dd'),
    matched_with_po: false,
    remarks: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      setMaterials(
        purchaseOrder.materials.map(material => ({
          material_id: material.material_id,
          material_name: material.name,
          ordered_quantity: material.quantity,
          received_quantity: 0,
          defective_quantity: 0,
          remarks: ''
        }))
      );
      setFormData({
        grn_date: format(new Date(), 'yyyy-MM-dd'),
        matched_with_po: false,
        remarks: ''
      });
    }
    if (!isOpen) {
      setMaterials([]);
      setFormData({
        grn_date: format(new Date(), 'yyyy-MM-dd'),
        matched_with_po: false,
        remarks: ''
      });
    }
  }, [isOpen, purchaseOrder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (materials.some(m => !m.received_quantity || m.received_quantity <= 0)) {
      window.toast && window.toast({
        title: 'Validation Error',
        description: 'Please enter received quantity for every material (must be > 0).',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    try {
      const response = await axiosInstance.post(
        `/purchase-orders/${purchaseOrder.purchase_order_id}/grn`,
        {
          ...formData,
          materials: materials.map(m => ({
            material_id: m.material_id,
            received_quantity: m.received_quantity,
            defective_quantity: m.defective_quantity,
            remarks: m.remarks
          }))
        }
      );
      window.toast && window.toast({
        title: 'GRN Created',
        description: 'Goods Receipt Note has been created successfully.',
        variant: 'default'
      });
      onSuccess(response.data);
      onClose();
    } catch (error) {
      window.toast && window.toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create GRN',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialChange = (index, field, value) => {
    const newMaterials = [...materials];
    newMaterials[index] = {
      ...newMaterials[index],
      [field]: value
    };
    setMaterials(newMaterials);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Goods Receipt Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="grn_date">GRN Date</Label>
              <Input
                id="grn_date"
                type="date"
                value={formData.grn_date}
                onChange={e => setFormData({ ...formData, grn_date: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="matched_with_po"
                checked={formData.matched_with_po}
                onChange={e => setFormData({ ...formData, matched_with_po: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="matched_with_po">Matched with Purchase Order</Label>
            </div>
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                value={formData.remarks}
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Enter any remarks..."
              />
            </div>
            <div className="font-bold mt-4">Materials</div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Defective</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material, index) => (
                    <TableRow key={material.material_id}>
                      <TableCell>{material.material_name}</TableCell>
                      <TableCell>{material.ordered_quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={material.ordered_quantity}
                          value={material.received_quantity}
                          onChange={e => handleMaterialChange(index, 'received_quantity', parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={material.received_quantity}
                          value={material.defective_quantity}
                          onChange={e => handleMaterialChange(index, 'defective_quantity', parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={material.remarks}
                          onChange={e => handleMaterialChange(index, 'remarks', e.target.value)}
                          placeholder="Material remarks..."
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create GRN'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GRNForm; 