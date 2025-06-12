import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobworkStore } from '@/services/jobwork.service';
import { Product, ProductService } from '@/services/Product.service';
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
import { CalendarDays, Package, User, AlertCircle, ArrowLeft } from 'lucide-react';

interface CreateJobworkOrderProps {
  orderId?: number; // Optional order ID for editing
  onSuccess?: () => void; // Callback for successful creation/update
  onCancel?: () => void; // Callback for cancelling (e.g., closing modal)
}

export const CreateJobworkOrder = ({ orderId, onSuccess, onCancel }: CreateJobworkOrderProps) => {
  const { vendors, loading, error, fetchVendors, createJobworkOrder, fetchOrderById, updateJobworkOrder } = useJobworkStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [customComponent, setCustomComponent] = useState<string>('');
  const [allComponents, setAllComponents] = useState<{ id: string, name: string, type: 'product' | 'sub_component' }[]>([]);

  const [formData, setFormData] = useState({
    vendor_id: '',
    order_date: new Date().toISOString().split('T')[0],
    due_date: '',
    component: '',
    item_sent: '',
    quantity_sent: '',
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

    const loadProducts = async () => {
      try {
        const response = await ProductService.getAllProducts();
        if (response.success && response.data) {
          setProducts(response.data);
        } else {
          toast({
            title: "Error",
            description: "Failed to fetch products.",
            variant: "destructive"
          });
        }
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to fetch products.",
          variant: "destructive"
        });
      }
    };
    loadProducts();

  }, [fetchVendors, toast]);

  // Effect to load order data if editing
  useEffect(() => {
    let isMounted = true;
    if (orderId) {
      const loadOrder = async () => {
        try {
          const order = await fetchOrderById(orderId);
          if (order && isMounted) {
            setFormData({
              vendor_id: order.vendor_id.toString(),
              order_date: new Date(order.order_date).toISOString().split('T')[0],
              due_date: new Date(order.due_date).toISOString().split('T')[0],
              component: order.component || '',
              item_sent: order.item_sent || '',
              quantity_sent: order.quantity_sent ? order.quantity_sent.toString() : '',
              notes: order.notes || '',
            });
            // Determine if the component is a pre-existing product/sub-component or custom
            const matchedComponent = allComponents.find(c => c.name === order.component);
            if (matchedComponent) {
              setSelectedProduct(order.component);
              setCustomComponent('');
            } else {
              setSelectedProduct('');
              setCustomComponent(order.component);
            }
          }
        } catch (err) {
          if (isMounted) {
            toast({
              title: "Error",
              description: "Failed to load jobwork order for editing.",
              variant: "destructive"
            });
            onCancel?.(); // Close modal on error
          }
        }
      };
      loadOrder();
    }
    return () => {
      isMounted = false;
    };
  }, [orderId, fetchOrderById, toast, onCancel, allComponents]);

  // Separate effect for component selection
  useEffect(() => {
    if (selectedProduct) {
      setFormData(prev => ({ ...prev, component: selectedProduct }));
      setCustomComponent('');
    } else if (customComponent) {
      setFormData(prev => ({ ...prev, component: customComponent }));
    }
  }, [selectedProduct, customComponent]);

  useEffect(() => {
    if (products.length > 0) {
      const components: { id: string, name: string, type: 'product' | 'sub_component' }[] = [];
      products.forEach(product => {
        components.push({ id: product.id, name: product.name, type: 'product' });
        if (product.subComponents && product.subComponents.length > 0) {
          product.subComponents.forEach(subComponent => {
            components.push({ id: subComponent.id, name: `${product.name} - ${subComponent.name}`, type: 'sub_component' });
          });
        }
      });
      setAllComponents(components);
    }
  }, [products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalComponent = selectedProduct || customComponent;

    if (!formData.vendor_id || !finalComponent || !formData.quantity_sent) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields: Jobworker/Vendor, Component/Product, Quantity Sent",
        variant: "destructive"
      });
      return;
    }

    const selectedVendor = vendors.find(v => v.vendor_id.toString() === formData.vendor_id);
    const vendorName = selectedVendor ? selectedVendor.name : '';

    try {
      const orderData = {
        vendor_id: parseInt(formData.vendor_id),
        vendor_name: vendorName,
        order_date: formData.order_date,
        due_date: formData.due_date,
        component: finalComponent,
        item_sent: formData.item_sent,
        quantity_sent: parseInt(formData.quantity_sent),
        notes: formData.notes,
        expected_return_item: '',
        purpose: '',
        quantity_received: 0,
        quantity_loss: 0,
        status: 'pending',
      };

      if (orderId) {
        // Update existing order
        await updateJobworkOrder(orderId, orderData);
        toast({
          title: "Success",
          description: "Jobwork order updated successfully",
        });
      } else {
        // Create new order
        await createJobworkOrder(orderData);
        toast({
          title: "Success",
          description: "Jobwork order created successfully",
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        // Only navigate if not in modal context
        navigate('/jobwork/tracking');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${orderId ? 'update' : 'create'} jobwork order`,
        variant: "destructive"
      });
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => { fetchVendors(); }}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCancel ? onCancel() : navigate('/jobwork/tracking')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              {orderId ? 'Edit Jobwork Order' : 'Create New Jobwork Order'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vendor Selection */}
              <div className="space-y-2">
                <Label htmlFor="vendor">Jobworker/Vendor *</Label>
                <Select 
                  value={formData.vendor_id} 
                  onValueChange={(value) => setFormData({...formData, vendor_id: value})}
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
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
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
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="pl-10"
                    required
                    disabled={loading}
                    min={formData.order_date}
                  />
                </div>
              </div>

              {/* Component/Product */}
              <div className="space-y-2">
                <Label htmlFor="component">Component/Product *</Label>
                <Select
                  value={selectedProduct}
                  onValueChange={(value) => {
                    setSelectedProduct(value);
                    setCustomComponent(''); // Clear custom input when a selection is made
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an existing component or enter custom" />
                  </SelectTrigger>
                  <SelectContent>
                    {allComponents.map(comp => (
                      <SelectItem key={comp.id} value={comp.name}>
                        {comp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or enter custom component/product"
                  value={customComponent}
                  onChange={(e) => {
                    setCustomComponent(e.target.value);
                    setSelectedProduct(''); // Clear select when custom input is used
                  }}
                  className="mt-2"
                />
              </div>

              {/* Raw Material/Item Sent (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="itemSent">Raw Material/Item Sent (Optional)</Label>
                <Input
                  id="itemSent"
                  value={formData.item_sent}
                  onChange={(e) => setFormData({ ...formData, item_sent: e.target.value })}
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>
            </div>

            {/* Notes (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onCancel ? onCancel() : navigate('/jobwork/tracking')}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {orderId ? 'Update Jobwork Order' : 'Create Jobwork Order'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateJobworkOrder; 