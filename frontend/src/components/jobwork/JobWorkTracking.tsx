import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobworkStore } from '@/services/jobwork.service';
import { Clock, User, Package, Search, Filter, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Jobwork } from '@/pages/JobWork';

export const JobworkTracking = () => {
  const { jobworkOrders, loading, error, fetchOrders } = useJobworkStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchOrders().catch(error => {
      toast({
        title: "Error",
        description: "Failed to fetch jobwork orders",
        variant: "destructive"
      });
    });
  }, [fetchOrders, toast]);

  const getStatusColor = (status: string) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-blue-100 text-blue-800', 
      'completed': 'bg-green-100 text-green-800',
      'delayed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const filteredOrders = jobworkOrders.filter(order => {
    const matchesSearch = order.jobwork_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOrderClick = (order: any) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Orders</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => fetchOrders()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Jobwork Tracking</h2>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by jobwork number, component, or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {/* Jobwork Orders List */}
      {!loading && (
        <div className="grid gap-4">
          {filteredOrders.map(order => (
            <Card 
              key={order.order_id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleOrderClick(order)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{order.jobwork_number}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-1" />
                        {order.component}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {order.vendor_name}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Due: {new Date(order.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Component:</span>
                    <p>{order.component}</p>
                  </div>
                  <div>
                    <span className="font-medium">Vendor:</span>
                    <p>{order.vendor_name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <p>{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium">Progress:</span>
                    <p>
                      {order.quantity_received} / {order.quantity_sent} units
                      {order.quantity_loss > 0 && (
                        <span className="text-red-600 ml-2">
                          (Loss: {order.quantity_loss})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredOrders.length === 0 && (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No jobwork orders found</p>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Jobwork
          order={selectedOrder}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
};