import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import ProductService from '@/services/Product.service';
import { Product } from '@/services/Product.service';

interface BatchFormProps {
  onBatchCreate: (batch: any) => void;
}



export const BatchForm = ({ onBatchCreate }: BatchFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    product_id: '',
    product_name: '',
    quantity: '',
    customerOrder: '',
    notes: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await ProductService.getAllProducts();
      if (response.success && response.data) {
        setProducts(response.data);
      }
      console.log(products);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate a new batch ID
    const batchId = `SP-2024-${String(Date.now()).slice(-3)}`;
    
    const newBatch = {
      id: batchId,
      product_id: formData.product_id,
      quantity: parseInt(formData.quantity),
      status: 'In Progress',
      customerOrder: formData.customerOrder,
      notes: formData.notes
    };

    console.log(newBatch);
    onBatchCreate(newBatch);
    
    // Reset form and close dialog
    setFormData({
      product_id: '',
      product_name: '',
      quantity: '',
      customerOrder: '',
      notes: ''
    });
    setIsOpen(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create Batch</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Production Batch</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Select 
              value={formData.product_id} 
              onValueChange={(value) => {
                const selectedProduct = products.find(p => p.id === value);
                if (selectedProduct) {
                  handleInputChange('product_id', selectedProduct.id);
                  handleInputChange('product_name', selectedProduct.name);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product">
                  {products.find(p => p.id === formData.product_id)?.name || 'Select product'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Enter quantity"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerOrder">Customer Sales Order</Label>
            <Input
              id="customerOrder"
              placeholder="e.g., SO-2024-150"
              value={formData.customerOrder}
              onChange={(e) => handleInputChange('customerOrder', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Batch</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};