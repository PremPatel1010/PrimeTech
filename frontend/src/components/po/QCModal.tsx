import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { usePOStore, PurchaseOrder, GRN, GRNMaterial } from '@/services/poStore';
import { toast } from '@/hooks/use-toast';

interface QCModalProps {
  po: PurchaseOrder;
  grn: GRN;
  isOpen: boolean;
  onClose: () => void;
}

interface QCItemData extends Omit<GRNMaterial, 'id' | 'qcStatus'> {
  qcStatus: 'pending' | 'completed';
  orderedQty: number;
}

export const QCModal = ({ po, grn, isOpen, onClose }: QCModalProps) => {
  const { updateGRNMaterialQC } = usePOStore();
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

  const updateQCItem = (index: number, field: keyof QCItemData, value: string | number) => {
    const updatedData = [...qcData];
    const item = updatedData[index];
    
    if (field === 'defectiveQty') {
      const defectiveQty = Number(value);
      const receivedQty = item.receivedQty;
      item.defectiveQty = Math.min(Math.max(0, defectiveQty), receivedQty);
      item.acceptedQty = Math.max(0, receivedQty - item.defectiveQty);
    } else if (field === 'qcRemarks') {
      item.qcRemarks = value as string;
    } else if (field === 'qcStatus') {
      item.qcStatus = value as 'pending' | 'completed';
    }
    
    setQcData(updatedData);
  };

  const handleSubmitQC = async () => {
    // Validate QC data
    const hasInvalidData = qcData.some(item => 
      item.defectiveQty < 0 || 
      item.defectiveQty > item.receivedQty ||
      item.acceptedQty < 0
    );

    if (hasInvalidData) {
      toast({ 
        title: 'Error', 
        description: 'Please ensure defective quantity is valid', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      // Update each material's QC status
      await Promise.all(qcData.map(item => 
        updateGRNMaterialQC(po.id, grn.id, item.materialId, {
          acceptedQty: item.acceptedQty,
          defectiveQty: item.defectiveQty,
          qcRemarks: item.qcRemarks
        })
      ));

      toast({ title: 'Success', description: 'Quality check completed successfully' });
      onClose();
    } catch (error) {
      console.error('Error updating QC status:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update QC status', 
        variant: 'destructive' 
      });
    }
  };

  const totalDefective = qcData.reduce((sum, item) => sum + item.defectiveQty, 0);
  const hasDefectiveItems = totalDefective > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span>Quality Control - {grn.grnNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">PO Number</p>
                <p className="font-medium">{po.poNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">GRN Date</p>
                <p className="font-medium">{new Date(grn.date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {hasDefectiveItems && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Defective items detected. These will be marked for return to vendor and replacement GRN can be created.
              </AlertDescription>
            </Alert>
          )}

          {/* QC Table */}
          <div>
            <Label className="text-base font-medium">Quality Check Results</Label>
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Material Name</TableHead>
                  <TableHead>Received Qty</TableHead>
                  <TableHead>Defective Qty</TableHead>
                  <TableHead>Accepted Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>QC Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qcData.map((item, index) => (
                  <TableRow key={item.materialId}>
                    <TableCell className="font-medium">{item.materialName}</TableCell>
                    <TableCell>{item.receivedQty}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.defectiveQty}
                        onChange={(e) => updateQCItem(index, 'defectiveQty', Number(e.target.value))}
                        min="0"
                        max={item.receivedQty}
                        className={item.defectiveQty > 0 ? 'border-red-300 bg-red-50' : ''}
                      />
                    </TableCell>
                    <TableCell>
                      <div className={`p-2 rounded text-center font-medium ${
                        item.acceptedQty === item.receivedQty 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.acceptedQty}
                      </div>
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Textarea
                        value={item.qcRemarks}
                        onChange={(e) => updateQCItem(index, 'qcRemarks', e.target.value)}
                        placeholder="Enter QC remarks..."
                        className="min-h-[60px]"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">QC Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Received</p>
                <p className="font-medium">{qcData.reduce((sum, item) => sum + item.receivedQty, 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Accepted</p>
                <p className="font-medium text-green-600">{qcData.reduce((sum, item) => sum + item.acceptedQty, 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Defective</p>
                <p className="font-medium text-red-600">{totalDefective}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmitQC} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete QC
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};