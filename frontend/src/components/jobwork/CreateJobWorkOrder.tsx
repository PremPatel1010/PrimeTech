import { useState, useEffect } from 'react';
import { useJobworkStore } from '@/services/jobwork.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Package, User, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CreateJobworkOrder = () => {
  const { vendors, loading, error, fetchVendors, createJobworkOrder } = useJobworkStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    vendorId: '',
    orderDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    component: '',
    itemSent: '',
    expectedReturnItem: '',
    quantitySent: '',
    purpose: '',
    notes: ''
  });

  useEffect(() => {
    fetchVendors().catch(error => {
      toast({
        title: "Error",
        description: "Failed to fetch vendors",
        variant: "destructive"
      });
    });
  }, [fetchVendors, toast]);

  const purposeOptions = [
    'CNC Machining',
    'Surface Treatment',
    'Painting',
    'Assembly',
    'Polishing',
    'Heat Treatment',
    'Welding',
    'Custom Processing'
  ];

  const product = [{
    id:1,
    name:"V8 Pumpset"
   },{
    id:2,
    name:"V6 Pumpset"
}]

const subComponent = [{
  id:1,
  name:"rotor"
},{
  id:2, 
  name:"shaft"
}]
const rawMaterials = [{
  id:1,
  name:"pipe",
  unit:"m"

},{
  id:2, 
  name:"screw",
  unit:"pcs"

}]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vendorId || !formData.component || !formData.itemSent || !formData.quantitySent) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await createJobworkOrder({
        vendorId: parseInt(formData.vendorId),
        orderDate: formData.orderDate,
        dueDate: formData.dueDate,
        component: formData.component,
        itemSent: formData.itemSent,
        expectedReturnItem: formData.expectedReturnItem,
        quantitySent: parseInt(formData.quantitySent),
        purpose: formData.purpose,
        notes: formData.notes
      });

      toast({
        title: "Success",
        description: "Jobwork order created successfully",
      });

      // Reset form and navigate to tracking page
      setFormData({
        vendorId: '',
        orderDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        component: '',
        itemSent: '',
        expectedReturnItem: '',
        quantitySent: '',
        purpose: '',
        notes: ''
      });
      navigate('/jobwork/tracking');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create jobwork order",
        variant: "destructive"
      });
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Vendors</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => fetchVendors()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Create New Jobwork Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vendor Selection */}
              <div className="space-y-2">
                <Label htmlFor="vendor">Jobworker/Vendor *</Label>
                <Select 
                  value={formData.vendorId} 
                  onValueChange={(value) => setFormData({...formData, vendorId: value})}
                  disabled={loading}
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
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({...formData, orderDate: e.target.value})}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    className="pl-10"
                    required
                    disabled={loading}
                    min={formData.orderDate}
                  />
                </div>
              </div>

              {/* Component */}
              <div className="space-y-2">
                <Label htmlFor="component">Component/Product *</Label>
                <Input
                  id="component"
                  value={formData.component}
                  onChange={(e) => setFormData({...formData, component: e.target.value})}
                  placeholder="Enter component name"
                  required
                  disabled={loading}
                />
              </div>

              {/* Item Sent */}
              <div className="space-y-2">
                <Label htmlFor="itemSent">Raw Material/Item Sent *</Label>
                <Input
                  id="itemSent"
                  value={formData.itemSent}
                  onChange={(e) => setFormData({...formData, itemSent: e.target.value})}
                  placeholder="Enter item name"
                  required
                  disabled={loading}
                />
              </div>

              {/* Expected Return Item */}
              <div className="space-y-2">
                <Label htmlFor="expectedReturn">Expected Return Item *</Label>
                <Input
                  id="expectedReturn"
                  value={formData.expectedReturnItem}
                  onChange={(e) => setFormData({...formData, expectedReturnItem: e.target.value})}
                  placeholder="e.g., Machined rotor, Painted housing"
                  required
                  disabled={loading}
                />
              </div>

              {/* Quantity Sent */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity Sent *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantitySent}
                  onChange={(e) => setFormData({...formData, quantitySent: e.target.value})}
                  placeholder="Enter quantity"
                  min="1"
                  required
                  disabled={loading}
                />
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Jobwork *</Label>
                <Select 
                  value={formData.purpose} 
                  onValueChange={(value) => setFormData({...formData, purpose: value})}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {purposeOptions.map((purpose) => (
                      <SelectItem key={purpose} value={purpose}>
                        {purpose}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes/Instructions</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any special instructions or requirements..."
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/jobwork/tracking')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Jobwork Order'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};