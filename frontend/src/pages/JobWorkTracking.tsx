import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobworkStore } from '@/services/jobwork.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis
} from '@/components/ui/pagination';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { EditJobworkOrderModal } from '@/components/jobwork/EditJobworkOrderModal';

import {
  Search,
  Plus,
  Package,
  Calendar,
  User,
  AlertCircle,
  RefreshCw,
  Edit,
  Trash2
} from 'lucide-react';

export const JobWorkTracking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { jobworkOrders, loading, error, fetchOrders, deleteJobworkOrder } = useJobworkStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Number of items per page
  const [activeTab, setActiveTab] = useState('active');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        await fetchOrders();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load jobwork orders",
          variant: "destructive"
        });
      }
    };
    loadOrders();
  }, [fetchOrders, toast]);

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

  const handleDelete = async (orderId: number) => {
    if (window.confirm("Are you sure you want to delete this jobwork order?")) {
      try {
        await deleteJobworkOrder(orderId);
        toast({
          title: "Success",
          description: "Jobwork order deleted successfully."
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to delete jobwork order.",
          variant: "destructive"
        });
      }
    }
  };

  const activeOrders = jobworkOrders.filter(order => 
    ['pending', 'in_progress', 'delayed'].includes(order.status)
  );
  const completedOrders = jobworkOrders.filter(order => 
    ['completed', 'cancelled'].includes(order.status)
  );

  const ordersToShow = activeTab === 'active' ? activeOrders : completedOrders;

  const filteredAndTabbedOrders = ordersToShow.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    return (
      order.jobwork_number.toLowerCase().includes(searchLower) ||
      order.component.toLowerCase().includes(searchLower) ||
      order.vendor_name.toLowerCase().includes(searchLower)
    );
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndTabbedOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndTabbedOrders.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Orders</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => fetchOrders()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              Jobwork Orders
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-[300px]"
                />
              </div>
              <Button onClick={() => navigate('/jobwork/create')}>
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'completed')}> 
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="active">Active Orders ({activeOrders.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed & Cancelled Orders ({completedOrders.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : currentItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No active orders match your search' : 'No active jobwork orders found'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jobwork Number</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map((order) => (
                        <TableRow key={order.order_id}>
                          <TableCell 
                            className="font-medium cursor-pointer hover:underline"
                            onClick={() => navigate(`/jobwork/${order.jobwork_number}`)}
                          >
                            {order.jobwork_number}
                          </TableCell>
                          <TableCell>{order.vendor_name}</TableCell>
                          <TableCell>{order.component}</TableCell>
                          <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(order.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingOrderId(order.order_id);
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row onClick
                                  handleDelete(order.order_id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            <TabsContent value="completed" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : currentItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No completed/cancelled orders match your search' : 'No completed/cancelled jobwork orders found'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jobwork Number</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentItems.map((order) => (
                        <TableRow key={order.order_id}>
                          <TableCell 
                            className="font-medium cursor-pointer hover:underline"
                            onClick={() => navigate(`/jobwork/${order.jobwork_number}`)}
                          >
                            {order.jobwork_number}
                          </TableCell>
                          <TableCell>{order.vendor_name}</TableCell>
                          <TableCell>{order.component}</TableCell>
                          <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(order.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingOrderId(order.order_id);
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row onClick
                                  handleDelete(order.order_id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            <div className="flex justify-center mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  />
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink 
                        onClick={() => handlePageChange(page)}
                        isActive={page === currentPage}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationContent>
              </Pagination>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Jobwork Order Modal */}
      <EditJobworkOrderModal
        orderId={editingOrderId || 0}
        isOpen={showEditModal && !!editingOrderId}
        onClose={() => {
          setShowEditModal(false);
          setEditingOrderId(null);
        }}
        onSuccess={() => {
          setShowEditModal(false);
          setEditingOrderId(null);
          fetchOrders();
        }}
      />
    </div>
  );
};

export default JobWorkTracking; 