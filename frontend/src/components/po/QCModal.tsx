import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { usePOStore, PurchaseOrder, GRN, GRNMaterial } from '@/services/poStore';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { DialogFooter } from '@/components/ui/dialog';

interface QCModalProps {
  po: PurchaseOrder;
  grn: GRN;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface QCItemData extends Omit<GRNMaterial, 'id' | 'qcStatus'> {
  qcStatus: 'pending' | 'completed';
  orderedQty: number;
}

export const QCModal = ({ po, grn, isOpen, onClose, onSuccess }: QCModalProps) => {
  const { updateGRNMaterialQC, checkAndCompletePOAndAddInventory } = usePOStore();
  const [qcData, setQcData] = useState<QCItemData[]>(
    grn.materials.map((material: GRNMaterial) => ({
      materialId: material.materialId,
      materialName: material.materialName,
      orderedQty: material.orderedQty,
      receivedQty: material.receivedQty,
      defectiveQty: material.defectiveQty || 0,
      acceptedQty: material.acceptedQty || (material.receivedQty - (material.defectiveQty || 0)),
      qcRemarks: material.qcRemarks || '',
      unit: material.unit,
      qcStatus: material.qcStatus || 'pending',
    }))
  );

  console.log(qcData)

  const updateQCItem = (index: number, field: keyof QCItemData, value: string | number) => {
    const updatedData = [...qcData];
    const item = updatedData[index];
    
    if (field === 'defectiveQty') {
      const defectiveQty = Number(value);
      const receivedQty = item.receivedQty;
      item.defectiveQty = Math.min(Math.max(0, defectiveQty), receivedQty);
      item.acceptedQty = Math.max(0, receivedQty - item.defectiveQty);
      item.qcStatus = 'completed'; // Automatically set status to completed when quantities are updated
    } else if (field === 'qcRemarks') {
      item.qcRemarks = value as string;
    } else if (field === 'qcStatus') {
      item.qcStatus = value as 'pending' | 'completed';
      // If status is set to completed, ensure accepted quantity is calculated
      if (value === 'completed') {
        item.acceptedQty = Math.max(0, item.receivedQty - item.defectiveQty);
      }
    }
    
    setQcData(updatedData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Process each material individually
      for (const item of qcData) {
        await updateGRNMaterialQC(
          po.id,
          grn.id,
          item.materialId,
          {
            acceptedQty: item.acceptedQty,
            defectiveQty: item.defectiveQty,
            qcRemarks: item.qcRemarks
          }
        );
      }

      toast({ 
        title: 'Success',
        description: 'QC status updated successfully'
      });
      
      // After updating QC, check if the entire PO can be marked as complete and update inventory
      await checkAndCompletePOAndAddInventory(po.id);

      onClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error updating QC status:', error);
      toast({ 
        title: 'Error',
        description: error.response?.data?.error || 'Failed to update QC status',
        variant: 'destructive'
      });
    }
  };

  const totalDefective = qcData.reduce((sum, item) => sum + item.defectiveQty, 0);
  const hasDefectiveItems = totalDefective > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Quality Control - {grn.grnNumber}</DialogTitle>
          <DialogDescription>
            {grn.grnType === 'replacement' ? 'Replacement GRN QC' : 'Initial GRN QC'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Received Qty</TableHead>
                  <TableHead>Defective Qty</TableHead>
                  <TableHead>Accepted Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qcData.map((item, index) => (
                  <TableRow key={item.materialId}>
                    <TableCell>{item.materialName}</TableCell>
                    <TableCell>{item.receivedQty}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={item.receivedQty}
                        value={item.defectiveQty}
                        onChange={(e) => updateQCItem(index, 'defectiveQty', e.target.value)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>{item.acceptedQty}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={item.qcRemarks}
                        onChange={(e) => updateQCItem(index, 'qcRemarks', e.target.value)}
                        placeholder="Add remarks..."
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.qcStatus === 'completed' ? 'default' : 'secondary'}>
                        {item.qcStatus === 'completed' ? 'Completed' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Update QC Status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};