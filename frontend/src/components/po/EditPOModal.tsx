import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePOStore, Supplier, POItem } from '@/services/poStore';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface EditPOModalProps {
    po: any;
    isOpen: boolean;
    onClose: () => void;
}

export const EditPOModal: React.FC<EditPOModalProps> = ({ po, isOpen, onClose }) => {
    const { updatePurchaseOrder, suppliers, materials } = usePOStore();
    const [formData, setFormData] = useState<any>({
        poNumber: '',
        date: '',
        supplierId: undefined as number | undefined,
        status: '',
        gstPercent: 0,
        discountPercent: 0,
        items: [] as POItem[],
        subtotal: 0,
        totalAmount: 0,
    });

    useEffect(() => {
        if (po) {
            const initialFormData = {
                poNumber: po.poNumber,
                date: formatDate(po.date),
                supplierId: po.supplierId ? Number(po.supplierId) : undefined,
                status: po.status,
                gstPercent: po.gstPercent || 0,
                discountPercent: po.discountPercent || 0,
                items: po.items || [],
                subtotal: 0,
                totalAmount: 0,
            };
            setFormData(initialFormData);
        }
    }, [po]);

    useEffect(() => {
        const calculateTotals = () => {
            const subtotal = formData.items.reduce((sum: number, item: POItem) => sum + (item.amount || 0), 0);
            const gstAmount = subtotal * (formData.gstPercent / 100);
            const discountAmount = subtotal * (formData.discountPercent / 100);
            const totalAmount = subtotal + gstAmount - discountAmount;
            setFormData((prevData: any) => ({ ...prevData, subtotal, totalAmount }));
        };

        calculateTotals();
    }, [formData.items, formData.gstPercent, formData.discountPercent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToUpdate: any = { ...formData };
            if (dataToUpdate.supplierId === undefined) {
                delete dataToUpdate.supplierId;
            }

            await updatePurchaseOrder(po.id, dataToUpdate);
            toast.success('Purchase order updated successfully');
            onClose();
        } catch (error) {
            toast.error('Failed to update purchase order');
            console.error('Error updating PO:', error);
        }
    };

    const handleItemChange = (index: number, field: keyof POItem, value: any) => {
        const newItems = [...formData.items];
        const updatedItem = { ...newItems[index], [field]: value };

        if (field === 'quantity' || field === 'unitPrice') {
            const quantity = Number(updatedItem.quantity);
            const unitPrice = Number(updatedItem.unitPrice);
            updatedItem.amount = quantity * unitPrice;
        }

        newItems[index] = updatedItem;
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { id: Date.now().toString(), materialId: '', materialName: '', quantity: 0, unitPrice: 0, unit: '', amount: 0 } as POItem]
        });
    };

    const removeItem = (index: number) => {
        const newItems = formData.items.filter((_: any, i: number) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Purchase Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="poNumber">PO Number</Label>
                            <Input
                                id="poNumber"
                                value={formData.poNumber}
                                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier">Supplier</Label>
                            <Select
                                value={formData.supplierId?.toString()}
                                onValueChange={(value) => setFormData({ ...formData, supplierId: value ? Number(value) : undefined })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((supplier: Supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                            {supplier.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ordered">Ordered</SelectItem>
                                    <SelectItem value="arrived">Arrived</SelectItem>
                                    <SelectItem value="grn_verified">GRN Verified</SelectItem>
                                    <SelectItem value="qc_in_progress">QC In Progress</SelectItem>
                                    <SelectItem value="returned_to_vendor">Returned to Vendor</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gstPercent">GST %</Label>
                            <Input
                                id="gstPercent"
                                type="number"
                                value={formData.gstPercent}
                                onChange={(e) => setFormData({ ...formData, gstPercent: parseFloat(e.target.value) })}
                                min="0"
                                max="100"
                                step="0.01"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discountPercent">Discount %</Label>
                            <Input
                                id="discountPercent"
                                type="number"
                                value={formData.discountPercent}
                                onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) })}
                                min="0"
                                max="100"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Items</h3>
                            <Button type="button" onClick={addItem} variant="outline">
                                Add Item
                            </Button>
                        </div>
                        {formData.items.map((item: POItem, index: number) => (
                            <div key={item.id || index} className="grid grid-cols-5 gap-4 p-4 border rounded-lg">
                                <div className="space-y-2">
                                    <Label>Material</Label>
                                    <Select
                                        value={item.materialId}
                                        onValueChange={(value) => handleItemChange(index, 'materialId', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select material" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {materials.map((material) => (
                                                <SelectItem key={material.id} value={material.id}>
                                                    {material.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit Price</Label>
                                    <Input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input
                                        type="number"
                                        value={item.amount.toFixed(2)}
                                        readOnly
                                        className="bg-muted"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() => removeItem(index)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Subtotal</Label>
                            <Input value={formData.subtotal.toFixed(2)} readOnly className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Total Amount</Label>
                            <Input value={formData.totalAmount.toFixed(2)} readOnly className="bg-muted" />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}; 