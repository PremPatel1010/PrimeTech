import { useState, useEffect } from 'react';
import { useJobworkStore } from '@/services/jobwork.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Package, User } from 'lucide-react';
import { JobworkOrder } from '@/services/jobwork.service';

interface EditJobworkOrderModalProps {
  orderId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditJobworkOrderModal = ({
  orderId,
  isOpen,
  onClose,
  onSuccess
}: EditJobworkOrderModalProps) => {
  const { toast } = useToast();
  const { fetchOrderById, updateJobworkOrder, vendors } = useJobworkStore();
  const [formData, setFormData] = useState({
    vendor_id: '',
    order_date: '',
    due_date: '',
    component: '',
    item_sent: '',
    expected_return_item: '',
    quantity_sent: '',
    purpose: '',
    notes: '',
    quantity_received: '0',
    quantity_loss: '0',
    status: 'pending',
  });
  const [fetching, setFetching] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        vendor_id: '',
        order_date: '',
        due_date: '',
        component: '',
        item_sent: '',
        expected_return_item: '',
        quantity_sent: '',
        purpose: '',
        notes: '',
        quantity_received: '0',
        quantity_loss: '0',
        status: 'pending',
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && orderId) {
      setFetching(true);
      fetchOrderById(orderId)
        .then(order => {
          if (order) {
            setFormData({
              vendor_id: order.vendor_id.toString(),
              order_date: new Date(order.order_date).toISOString().split('T')[0],
              due_date: new Date(order.due_date).toISOString().split('T')[0],
              component: order.component || '',
              item_sent: order.item_sent || '',
              expected_return_item: order.expected_return_item || '',
              quantity_sent: order.quantity_sent ? order.quantity_sent.toString() : '',
              purpose: order.purpose || '',
              notes: order.notes || '',
              quantity_received: order.quantity_received.toString(),
              quantity_loss: order.quantity_loss.toString(),
              status: order.status,
            });
          }
        })
        .catch(() => {
          toast({
            title: "Error",
            description: "Failed to load jobwork order for editing.",
            variant: "destructive"
          });
        })
        .finally(() => setFetching(false));
    }
  }, [orderId, isOpen, fetchOrderById, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor_id) {
      toast({
        title: "Error",
        description: "Please select a vendor",
        variant: "destructive"
      });
      return;
    }
    const vendor = vendors.find(v => v.vendor_id.toString() === formData.vendor_id);
    if (!vendor) {
      toast({
        title: "Error",
        description: "Selected vendor not found",
        variant: "destructive"
      });
      return;
    }

    const parsedVendorId = parseInt(formData.vendor_id);
    if (isNaN(parsedVendorId)) {
      toast({
        title: "Error",
        description: "Invalid Vendor ID. Please select a valid vendor.",
        variant: "destructive"
      });
      return;
    }

    const parsedQuantitySent = parseInt(formData.quantity_sent);
    if (isNaN(parsedQuantitySent)) {
      toast({
        title: "Error",
        description: "Quantity Sent must be a valid number.",
        variant: "destructive"
      });
      return;
    }

    const parsedQuantityReceived = parseInt(formData.quantity_received);
    if (isNaN(parsedQuantityReceived)) {
      toast({
        title: "Error",
        description: "Quantity Received must be a valid number.",
        variant: "destructive"
      });
      return;
    }

    const parsedQuantityLoss = parseInt(formData.quantity_loss);
    if (isNaN(parsedQuantityLoss)) {
      toast({
        title: "Error",
        description: "Quantity Loss must be a valid number.",
        variant: "destructive"
      });
      return;
    }

    try {
      const orderData = {
        vendor_id: parsedVendorId,
        vendor_name: vendor.name,
        order_date: formData.order_date,
        due_date: formData.due_date,
        component: formData.component,
        item_sent: formData.item_sent,
        expected_return_item: formData.expected_return_item,
        quantity_sent: parsedQuantitySent,
        purpose: formData.purpose,
        notes: formData.notes,
        quantity_received: parsedQuantityReceived,
        quantity_loss: parsedQuantityLoss,
        status: formData.status as JobworkOrder['status'],
      };
      await updateJobworkOrder(orderId, orderData);
      toast({
        title: "Success",
        description: "Jobwork order updated successfully",
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update jobwork order",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[800px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Edit Jobwork Order
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vendor Selection */}
            <div className="space-y-2">
              <Label htmlFor="vendor">Jobworker/Vendor *</Label>
              <Select 
                value={formData.vendor_id} 
                onValueChange={(value) => setFormData({...formData, vendor_id: value})}
                disabled={fetching}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.vendor_id} value={vendor.vendor_id.toString()}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {vendor.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Date */}
            <div className="space-y-2">
              <Label htmlFor="orderDate">Order Date *</Label>
              <Input
                id="orderDate"
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                required
                disabled={fetching}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
                disabled={fetching}
              />
            </div>

            {/* Component */}
            <div className="space-y-2">
              <Label htmlFor="component">Component *</Label>
              <Input
                id="component"
                value={formData.component}
                onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                required
                disabled={fetching}
              />
            </div>

            {/* Item Sent */}
            <div className="space-y-2">
              <Label htmlFor="itemSent">Item Sent</Label>
              <Input
                id="itemSent"
                value={formData.item_sent}
                onChange={(e) => setFormData({ ...formData, item_sent: e.target.value })}
                disabled={fetching}
              />
            </div>

            {/* Expected Return Item */}
            <div className="space-y-2">
              <Label htmlFor="expectedReturnItem">Expected Return Item</Label>
              <Input
                id="expectedReturnItem"
                value={formData.expected_return_item}
                onChange={(e) => setFormData({ ...formData, expected_return_item: e.target.value })}
                disabled={fetching}
              />
            </div>

            {/* Quantity Sent */}
            <div className="space-y-2">
              <Label htmlFor="quantitySent">Quantity Sent *</Label>
              <Input
                id="quantitySent"
                type="number"
                value={formData.quantity_sent}
                onChange={(e) => setFormData({ ...formData, quantity_sent: e.target.value })}
                required
                disabled={fetching}
              />
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                disabled={fetching}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              disabled={fetching}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={fetching}>
              Update Jobwork Order
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 