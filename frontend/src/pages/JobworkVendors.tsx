import { useState, useEffect } from 'react';
import { useJobworkStore, Vendor } from '@/services/jobwork.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Trash2, PlusCircle, User, Phone, Mail, MapPin, AlertCircle } from 'lucide-react';

export const JobworkVendors = () => {
  const { vendors, loading, error, fetchVendors, addVendor, updateVendor, deleteVendor } = useJobworkStore();
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [newVendorData, setNewVendorData] = useState<Omit<Vendor, 'vendor_id'>>({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    fetchVendors().catch(err => {
      toast({
        title: "Error",
        description: "Failed to fetch vendors.",
        variant: "destructive"
      });
    });
  }, [fetchVendors, toast]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorData.name || !newVendorData.contact_person || !newVendorData.phone) {
      toast({
        title: "Validation Error",
        description: "Name, Contact Person, and Phone are required fields.",
        variant: "destructive"
      });
      return;
    }
    try {
      await addVendor(newVendorData);
      toast({
        title: "Success",
        description: "Vendor added successfully."
      });
      setNewVendorData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: ''
      });
      setIsAddModalOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to add vendor.",
        variant: "destructive"
      });
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVendor) return;
    if (!currentVendor.name || !currentVendor.contact_person || !currentVendor.phone) {
      toast({
        title: "Validation Error",
        description: "Name, Contact Person, and Phone are required fields.",
        variant: "destructive"
      });
      return;
    }
    try {
      await updateVendor(currentVendor.vendor_id, currentVendor);
      toast({
        title: "Success",
        description: "Vendor updated successfully."
      });
      setIsEditModalOpen(false);
      setCurrentVendor(null);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update vendor.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (vendorId: number) => {
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      try {
        await deleteVendor(vendorId);
        toast({
          title: "Success",
          description: "Vendor deleted successfully."
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to delete vendor.",
          variant: "destructive"
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Vendors</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => fetchVendors()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <User className="h-6 w-6" />
            Jobwork Vendors
          </CardTitle>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button><PlusCircle className="mr-2 h-4 w-4" />Add New Vendor</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name *</Label>
                  <Input id="name" value={newVendorData.name} onChange={(e) => setNewVendorData({...newVendorData, name: e.target.value})} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="contact_person" className="text-right">Contact Person *</Label>
                  <Input id="contact_person" value={newVendorData.contact_person} onChange={(e) => setNewVendorData({...newVendorData, contact_person: e.target.value})} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Phone *</Label>
                  <Input id="phone" value={newVendorData.phone} onChange={(e) => setNewVendorData({...newVendorData, phone: e.target.value})} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input id="email" type="email" value={newVendorData.email} onChange={(e) => setNewVendorData({...newVendorData, email: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">Address</Label>
                  <Input id="address" value={newVendorData.address} onChange={(e) => setNewVendorData({...newVendorData, address: e.target.value})} className="col-span-3" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>Add Vendor</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No vendors found. Click "Add New Vendor" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.vendor_id}>
                      <TableCell className="font-medium flex items-center gap-2"><User className="h-4 w-4" />{vendor.name}</TableCell>
                      <TableCell>{vendor.contact_person}</TableCell>
                      <TableCell className="flex items-center gap-1"><Phone className="h-4 w-4 text-gray-500" />{vendor.phone}</TableCell>
                      <TableCell className="flex items-center gap-1"><Mail className="h-4 w-4 text-gray-500" />{vendor.email}</TableCell>
                      <TableCell className="flex items-center gap-1"><MapPin className="h-4 w-4 text-gray-500" />{vendor.address}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog open={isEditModalOpen && currentVendor?.vendor_id === vendor.vendor_id} onOpenChange={(open) => {
                            setIsEditModalOpen(open);
                            if (!open) setCurrentVendor(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setCurrentVendor(vendor);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            {currentVendor && currentVendor.vendor_id === vendor.vendor_id && (
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Vendor</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleEditSubmit} className="grid gap-4 py-4">
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-name" className="text-right">Name *</Label>
                                    <Input id="edit-name" value={currentVendor.name} onChange={(e) => setCurrentVendor({...currentVendor, name: e.target.value})} className="col-span-3" required />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-contact_person" className="text-right">Contact Person *</Label>
                                    <Input id="edit-contact_person" value={currentVendor.contact_person} onChange={(e) => setCurrentVendor({...currentVendor, contact_person: e.target.value})} className="col-span-3" required />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-phone" className="text-right">Phone *</Label>
                                    <Input id="edit-phone" value={currentVendor.phone} onChange={(e) => setCurrentVendor({...currentVendor, phone: e.target.value})} className="col-span-3" required />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-email" className="text-right">Email</Label>
                                    <Input id="edit-email" type="email" value={currentVendor.email} onChange={(e) => setCurrentVendor({...currentVendor, email: e.target.value})} className="col-span-3" />
                                  </div>
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-address" className="text-right">Address</Label>
                                    <Input id="edit-address" value={currentVendor.address} onChange={(e) => setCurrentVendor({...currentVendor, address: e.target.value})} className="col-span-3" />
                                  </div>
                                  <DialogFooter>
                                    <Button type="submit" disabled={loading}>Save Changes</Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            )}
                          </Dialog>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDelete(vendor.vendor_id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JobworkVendors; 