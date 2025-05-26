import React, { useState } from 'react';
import { usePOStore } from '../../services/poStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PurchaseOrder, GRNMaterial } from '../../services/poStore';
import { toast } from 'sonner';

interface CreateGRNModalProps {
    po: PurchaseOrder;
    isOpen: boolean;
    onClose: () => void;
}

interface GRNItemForm {
    materialId: string;
    materialName: string;
    orderedQty: number;
    receivedQty: number;
    unit: string;
    unitPrice: number;
}

export const CreateGRNModal: React.FC<CreateGRNModalProps> = ({ po, isOpen, onClose }) => {
    const { addGRN, isLoading } = usePOStore();
    const [items, setItems] = useState<GRNItemForm[]>([]);
    const [formData, setFormData] = useState({
        grnNumber: '',
        date: new Date().toISOString().split('T')[0],
        remarks: '',
        grnType: 'initial' as const
    });

    // Always reset items from po.items when modal opens or po.items changes
    React.useEffect(() => {
        if (isOpen && po.items) {
          console.log(po)
            setItems(po.items.map(item => ({
                materialId: item.materialId,
                materialName: item.materialName,
                orderedQty: item.quantity,
                receivedQty: 0,
                unit: item.unit,
                unitPrice: item.unitPrice
            })));
        }
    }, [isOpen, po.items]);

    const handleItemChange = (index: number, field: keyof GRNItemForm, value: string | number) => {
        const newItems = [...items];
        const item = newItems[index];
        const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
        
        if (field === 'receivedQty') {
            // Ensure received quantity doesn't exceed ordered quantity
            const orderedQty = po.items.find(i => i.materialId === item.materialId)?.quantity || 0;
            item.receivedQty = Math.min(numValue, orderedQty);
        } else if (field === 'orderedQty') {
            item.orderedQty = numValue;
        } else if (field === 'materialId') {
            item.materialId = value as string;
        }

        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log(items);
        if (items.some(item => !item.materialId || Number(item.receivedQty) <= 0)) {
            toast.error('Please enter received quantity for all materials');
            return;
        }

        try {
            const grnData = {
                poId: po.id,
                grnNumber: formData.grnNumber,
                date: formData.date,
                status: 'pending' as const,
                remarks: formData.remarks,
                grnType: formData.grnType
            };

            // Only send required fields to backend, and ensure they are numbers
            const materialsData = items.map(item => ({
                materialId: item.materialId,
                orderedQty: Number(item.orderedQty),
                receivedQty: Number(item.receivedQty)
            }));

            // Debug log to verify payload
            console.log('Submitting GRN:', grnData, materialsData);

            await addGRN(po.id, grnData, materialsData);
            toast.success(`${(formData.grnType as string) === 'replacement' ? 'Replacement ' : ''}GRN created successfully`);
            onClose();

            // Reset form
            setFormData({
                grnNumber: `GRN-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                remarks: '',
                grnType: 'initial' as const
            });
        } catch (error) {
            console.error('Error creating GRN:', error);
            toast.error('Failed to create GRN. Please check your input and try again.');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Create Goods Receipt Note</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="grnNumber">GRN Number</Label>
                            <Input
                                id="grnNumber"
                                value={formData.grnNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, grnNumber: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Textarea
                            id="remarks"
                            value={formData.remarks}
                            onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                            placeholder="Enter any additional notes or remarks"
                        />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Materials</h3>
                        <div className="text-sm text-gray-500">Number of materials: {items.length}</div>
                        {items.map((item, index) => {
                            return (
                                <div key={index} className="grid grid-cols-4 gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label>Material</Label>
                                        <Input
                                            type="text"
                                            value={item.materialName}
                                            readOnly
                                            className="bg-gray-50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ordered Quantity</Label>
                                        <Input
                                            type="text"
                                            value={`${item.orderedQty} ${item.unit}`}
                                            readOnly
                                            className="bg-gray-50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Received Quantity</Label>
                                        <Input
                                            type="number"
                                            value={item.receivedQty || ''}
                                            onChange={(e) => handleItemChange(index, 'receivedQty', e.target.value)}
                                            min="0"
                                            max={item.orderedQty}
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unit Price</Label>
                                        <Input
                                            type="text"
                                            value={formatCurrency(item.unitPrice)}
                                            readOnly
                                            className="bg-gray-50"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-end space-x-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || items.every(item => item.receivedQty === 0)}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create GRN'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};