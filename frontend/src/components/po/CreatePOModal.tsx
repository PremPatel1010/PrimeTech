import React, { useEffect, useState } from 'react';
import { usePOStore } from '../../services/poStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CreatePOModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface POItemForm {
    materialId: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({ isOpen, onClose }) => {
    const { materials, suppliers, addPurchaseOrder, isLoading } = usePOStore();
    const [items, setItems] = useState<POItemForm[]>([]);
    const [formData, setFormData] = useState({
        poNumber: '',
        date: new Date().toISOString().split('T')[0],
        supplier: '',
        gstPercent: 18,
        discountPercent: 0,
        subtotal: 0,
        totalAmount: 0
    });

    useEffect(() => {
        if (isOpen) {
            // Reset form when modal opens
            setItems([]);
            setFormData({
                poNumber: '',
                date: new Date().toISOString().split('T')[0],
                supplier: '',
                gstPercent: 18,
                discountPercent: 0,
                subtotal: 0,
                totalAmount: 0
            });
        }
    }, [isOpen]);

    const calculateAmounts = (currentItems: POItemForm[]) => {
        const subtotal = currentItems.reduce((sum, item) => sum + item.amount, 0);
        const gstAmount = (subtotal * formData.gstPercent) / 100;
        const discountAmount = (subtotal * formData.discountPercent) / 100;
        const totalAmount = subtotal + gstAmount - discountAmount;

        setFormData(prev => ({
            ...prev,
            subtotal,
            totalAmount
        }));
    };

    const handleAddItem = () => {
        setItems([...items, { materialId: '', quantity: 0, unitPrice: 0, amount: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
        calculateAmounts(newItems);
    };

    const handleItemChange = (index: number, field: keyof POItemForm, value: string | number) => {
        const newItems = [...items];
        const item = newItems[index];
        
        if (field === 'materialId') {
            item.materialId = value as string;
            const material = materials.find(m => m.id === value);
            if (material) {
                item.unitPrice = 0; // Reset unit price when material changes
            }
        } else if (field === 'quantity' || field === 'unitPrice') {
            const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
            item[field] = numValue;
            item.amount = item.quantity * item.unitPrice;
        }

        setItems(newItems);
        calculateAmounts(newItems);
    };

    const supplierOptions = Array.isArray(suppliers) && suppliers.length > 0 && typeof suppliers[0] === 'object'
        ? suppliers
        : suppliers.map(s => ({ id: s, name: s }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Find supplier name if suppliers is array of objects
            let supplierName = formData.supplier;
            if (Array.isArray(suppliers) && suppliers.length > 0 && typeof suppliers[0] === 'object') {
                const found = suppliers.find((s: any) => s.id === formData.supplier);
                if (found != null && typeof found === 'object' && 'name' in found) supplierName = (found as any).name;
            }
            const poData = {
                poNumber: formData.poNumber,
                date: formData.date,
                supplierId: formData.supplier,
                supplier: supplierName,
                status: 'ordered' as const,
                gstPercent: formData.gstPercent,
                discountPercent: formData.discountPercent,
                subtotal: formData.subtotal,
                totalAmount: formData.totalAmount
            };
            await addPurchaseOrder(poData, items);
            onClose();
        } catch (error) {
            console.error('Error creating purchase order:', error);
            // You might want to show an error message to the user here
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Create Purchase Order</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="poNumber">PO Number</Label>
                            <Input
                                id="poNumber"
                                value={formData.poNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
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
                        <div className="space-y-2">
                            <Label htmlFor="supplier">Supplier</Label>
                            <Select
                                value={formData.supplier}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, supplier: value }))}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {supplierOptions.map((supplier) => (
                                        <SelectItem key={supplier.id} value={supplier.id}>
                                            {supplier.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="gstPercent">GST %</Label>
                                <Input
                                    id="gstPercent"
                                    type="number"
                                    value={formData.gstPercent}
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        setFormData(prev => ({ ...prev, gstPercent: value }));
                                        calculateAmounts(items);
                                    }}
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
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        setFormData(prev => ({ ...prev, discountPercent: value }));
                                        calculateAmounts(items);
                                    }}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Items</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddItem}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-5 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>Material</Label>
                                    <Select
                                        value={item.materialId}
                                        onValueChange={(value) => handleItemChange(index, 'materialId', value)}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select material" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {materials.map((material) => (
                                                <SelectItem key={material.id} value={material.id}>
                                                    {material.name} ({material.unit})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <Input
                                        type="number"
                                        value={item.quantity || ''}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit Price</Label>
                                    <Input
                                        type="number"
                                        value={item.unitPrice || ''}
                                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <Input
                                        type="text"
                                        value={formatCurrency(item.amount)}
                                        readOnly
                                        className="bg-gray-50"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveItem(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label>Subtotal</Label>
                            <Input
                                type="text"
                                value={formatCurrency(formData.subtotal)}
                                readOnly
                                className="bg-gray-50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Total Amount</Label>
                            <Input
                                type="text"
                                value={formatCurrency(formData.totalAmount)}
                                readOnly
                                className="bg-gray-50 font-medium"
                            />
                        </div>
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
                            disabled={isLoading || items.length === 0}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Purchase Order'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};