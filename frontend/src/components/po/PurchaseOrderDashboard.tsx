import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import PurchaseOrderList from './PurchaseOrderList';
import { CreatePOModal } from './CreatePOModal';
import { PODetailModal } from './PODetailModal';
import { usePOStore } from '@/services/poStore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export const PurchaseOrderDashboard = () => {
  const { fetchPurchaseOrders, fetchMaterials, fetchSuppliers, isLoading, error } = usePOStore();
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);

  useEffect(() => {
    // Fetch initial data
    const loadData = async () => {
      await Promise.all([
        fetchPurchaseOrders(),
        fetchMaterials(),
        fetchSuppliers()
      ]);
    };
    loadData();
  }, [fetchPurchaseOrders, fetchMaterials, fetchSuppliers]);

  const handleCreateClick = () => {
    setIsCreateModalVisible(true);
  };

  const handleModalClose = () => {
    setIsCreateModalVisible(false);
  };

  const statusCounts = usePOStore.getState().purchaseOrders.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    { title: 'Total POs', value: usePOStore.getState().purchaseOrders.length, color: 'bg-blue-500' },
    { title: 'Ordered', value: statusCounts.ordered || 0, color: 'bg-yellow-500' },
    { title: 'In Progress', value: (statusCounts.arrived || 0) + (statusCounts.grn_verified || 0) + (statusCounts.qc_in_progress || 0), color: 'bg-orange-500' },
    { title: 'Completed', value: statusCounts.completed || 0, color: 'bg-green-500' },
  ];

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="flex justify-between items-center">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => fetchPurchaseOrders()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">Purchase Orders</CardTitle>
            <Button
              onClick={handleCreateClick}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Purchase Order
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading purchase orders...</span>
            </div>
          ) : (
            <PurchaseOrderList />
          )}
        </CardContent>
      </Card>

      <CreatePOModal
        isOpen={isCreateModalVisible}
        onClose={handleModalClose}
      />
      
      {selectedPO && (
        <PODetailModal 
          po={selectedPO}
          isOpen={!!selectedPO}
          onClose={() => setSelectedPO(null)}
        />
      )}
    </div>
  );
};