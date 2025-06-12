import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobworkStore, JobworkOrder } from '@/services/jobwork.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Calendar,
  User,
  Package,
  FileText,
  CheckCircle,
  Download,
  AlertCircle,
  ArrowLeft,
  Edit
} from 'lucide-react';
import { Label } from '@/components/ui/label';

export const Jobwork = () => {
  const { jobworkNumber } = useParams<{ jobworkNumber: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, error, fetchOrderByJobworkNumber, updateOrderStatus } = useJobworkStore();
  const [order, setOrder] = useState<JobworkOrder | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<JobworkOrder['status']>(order?.status || 'pending');

  useEffect(() => {
    if (order) {
      setNewStatus(order.status);
    }
  }, [order]);

  useEffect(() => {
    const loadOrder = async () => {
      setOrder(null);
      if (!jobworkNumber) {
        toast({
          title: "Error",
          description: "Jobwork number is missing.",
          variant: "destructive"
        });
        navigate('/jobwork/tracking');
        return;
      }
      const fetchedOrder = await fetchOrderByJobworkNumber(jobworkNumber);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
      } else {
        toast({
          title: "Error",
          description: useJobworkStore.getState().error || "Jobwork order not found",
          variant: "destructive"
        });
        navigate('/jobwork/tracking');
      }
    };

    loadOrder();
  }, [jobworkNumber, fetchOrderByJobworkNumber, toast, navigate]);

  const handleStatusUpdate = async () => {
    if (!order) return;
    try {
      await updateOrderStatus(order.order_id, newStatus);
      toast({
        title: "Success",
        description: "Order status updated successfully."
      });
      setIsStatusModalOpen(false);
      // Re-fetch order to get the latest status
      await fetchOrderByJobworkNumber(order.jobwork_number);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'delayed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {error ? "Error Loading Order" : "Order Not Found"}
        </h3>
        <p className="text-gray-600 mb-4">
          {error || "The requested jobwork order could not be found."}
        </p>
        <Button onClick={() => navigate('/jobwork/tracking')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tracking
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/jobwork/tracking')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Jobwork Order Details
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(order.status)}>
                {order.status.toUpperCase()}
              </Badge>
              <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Order Status</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">New Status</Label>
                      <Select
                        value={newStatus}
                        onValueChange={(value) => setNewStatus(value as JobworkOrder['status'])}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsStatusModalOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={handleStatusUpdate} disabled={loading}>Update</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Order Header */}
            <div>
              <h3 className="text-xl font-semibold">{order.jobwork_number}</h3>
              <p className="text-gray-600">Created on {new Date(order.created_at).toLocaleDateString()}</p>
            </div>

            <Separator />

            {/* Vendor Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Vendor Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Vendor:</span>
                    <span className="ml-2 font-medium">{order.vendor_name}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Order Date:</span>
                    <span className="ml-2 font-medium">{new Date(order.order_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <span className="ml-2 font-medium">{new Date(order.due_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Jobwork Details */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="h-5 w-5" />
                Jobwork Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-600">Component:</span>
                    <span className="ml-2 font-medium">{order.component}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Item Sent:</span>
                    <span className="ml-2 font-medium">{order.item_sent}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Expected Return:</span>
                    <span className="ml-2 font-medium">{order.expected_return_item}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-600">Purpose:</span>
                    <span className="ml-2 font-medium">{order.purpose}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantity Sent:</span>
                    <span className="ml-2 font-medium">{order.quantity_sent}</span>
                  </div>
                  {order.quantity_received !== undefined && (
                    <div>
                      <span className="text-gray-600">Quantity Received:</span>
                      <span className="ml-2 font-medium">{order.quantity_received}</span>
                    </div>
                  )}
                  {order.quantity_loss > 0 && (
                    <div>
                      <span className="text-gray-600">Quantity Loss:</span>
                      <span className="ml-2 font-medium text-red-600">{order.quantity_loss}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {order.notes && (
                <div className="mt-4">
                  <span className="text-gray-600">Notes:</span>
                  <p className="mt-1 p-3 bg-gray-500 rounded text-sm">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Receipts */}
            {order.receipts && order.receipts.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Receipts
                  </h4>
                  <div className="space-y-3">
                    {order.receipts.map((receipt) => (
                      <div key={receipt.receipt_id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Receipt Date:</span>
                            <div className="font-medium">{new Date(receipt.receipt_date).toLocaleDateString()}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Final Item:</span>
                            <div className="font-medium">{receipt.final_item_name}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Quantity:</span>
                            <div className="font-medium">
                              Received: {receipt.quantity_received}
                              {receipt.quantity_loss > 0 && (
                                <span className="text-red-600 ml-2">
                                  (Loss: {receipt.quantity_loss})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {receipt.remarks && (
                          <div className="mt-2">
                            <span className="text-gray-600 text-sm">Remarks:</span>
                            <p className="text-sm mt-1">{receipt.remarks}</p>
                          </div>
                        )}
                        {receipt.document_url && (
                          <div className="mt-2">
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download Receipt
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Jobwork;