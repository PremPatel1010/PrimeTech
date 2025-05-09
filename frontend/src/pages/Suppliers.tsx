import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash, Building2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supplierService, Supplier } from '../services/supplierService';

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({
    supplier_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_number: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await supplierService.getAllSuppliers();
      setSuppliers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load suppliers",
        variant: "destructive"
      });
    }
  };

  const handleOpen = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData(supplier);
    } else {
      setEditingSupplier(null);
      setFormData({
        supplier_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        gst_number: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.supplier_id, formData);
        toast({
          title: "Success",
          description: "Supplier updated successfully"
        });
      } else {
        await supplierService.createSupplier(formData as Omit<Supplier, 'supplier_id' | 'created_at'>);
        toast({
          title: "Success",
          description: "Supplier created successfully"
        });
      }
      handleClose();
      loadSuppliers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save supplier",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (supplierId: number) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await supplierService.deleteSupplier(supplierId);
        toast({
          title: "Success",
          description: "Supplier deleted successfully"
        });
        loadSuppliers();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete supplier",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-factory-gray-900">Suppliers</h1>
        <Button 
          onClick={() => handleOpen()}
          className="bg-factory-primary hover:bg-factory-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Supplier
        </Button>
      </div>

      {suppliers.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>GST Number</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.supplier_id}>
                  <TableCell className="font-medium">{supplier.supplier_name}</TableCell>
                  <TableCell>{supplier.contact_person}</TableCell>
                  <TableCell>{supplier.phone}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell>{supplier.gst_number}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleOpen(supplier)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(supplier.supplier_id)}
                    >
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <Building2 className="h-12 w-12 mb-4 text-factory-gray-300" />
            <p className="text-factory-gray-500">No suppliers found.</p>
            <p className="text-sm text-factory-gray-400 mt-1">Add a new supplier to get started.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name</Label>
              <Input 
                id="name" 
                value={formData.supplier_name} 
                onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                placeholder="Enter supplier name"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input 
                  id="contactPerson" 
                  value={formData.contact_person} 
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  placeholder="Enter contact name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea 
                id="address" 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Enter supplier address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gst">GST Number</Label>
              <Input 
                id="gst" 
                value={formData.gst_number} 
                onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                placeholder="Enter GST number"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.supplier_name || !formData.contact_person || !formData.phone}
            >
              {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers; 