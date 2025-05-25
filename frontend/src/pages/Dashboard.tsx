import React, { useState, useEffect } from 'react';
import StatCard from '../components/ui-custom/StatCard';
import ProgressBar from '../components/ui-custom/ProgressBar';
import { useFactory } from '../context/FactoryContext';
import { 
  calculateRawMaterialValue, 
  calculateFinishedProductValue, 
  calculateTotalSales,
  formatCurrency,
  formatDate
} from '../utils/calculations';
import { 
  Package, 
  Factory, 
  ShoppingCart, 
  TrendingUp,
  AlertCircle,
  Check,
  Truck,
  Hammer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { OrderStatus } from '../types';
import axiosInstance from '@/utils/axios';

const Dashboard: React.FC = () => {
  const { 
    rawMaterials, 
    finishedProducts, 
    salesOrders = [], 
    manufacturingBatches 
  } = useFactory();
  const [salesTrend, setSalesTrend] = useState<{ date: string, sales: number }[]>([]);
  const [inventoryValues, setInventoryValues] = useState({ raw_material_value: 0, finished_product_value: 0 });
  const [manufacturingEfficiency, setManufacturingEfficiency] = useState({ efficiency_percentage: 0, avg_completion_days: 0 });
  const [orderStatusDistribution, setOrderStatusDistribution] = useState<{ status: string, count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useDummyData, setUseDummyData] = useState(true);
  
  const rawMaterialValue = calculateRawMaterialValue(rawMaterials);
  const finishedProductValue = calculateFinishedProductValue(finishedProducts);
  const totalSales = calculateTotalSales(salesOrders, 'delivered');
  
  // Active manufacturing batches
  const activeBatches = manufacturingBatches.filter(batch => batch.currentStage !== 'completed');

  // Active orders for the dashboard
  const activeOrders = salesOrders.filter(order => 
    order.status !== 'completed' && 
    order.status !== 'delivered' && 
    order.status !== 'cancelled'
  );

  // Manufacturing efficiency: percent of completed batches
  const completedBatches = manufacturingBatches.filter(b => b.currentStage === 'completed');
  const efficiency = manufacturingBatches.length > 0 ? Math.round((completedBatches.length / manufacturingBatches.length) * 100) : 0;

  // Stock alerts: raw materials and finished products below minThreshold
  const stockAlerts = [
    ...rawMaterials.filter(m => m.minThreshold !== undefined && m.quantity < m.minThreshold).map(m => ({
      id: m.id,
      itemName: m.name,
      itemType: 'raw',
      currentQuantity: m.quantity,
      minThreshold: m.minThreshold!,
      status: m.quantity === 0 ? 'critical' : 'warning',
    })),
    ...finishedProducts.filter(p => p.minThreshold !== undefined && p.quantity < p.minThreshold).map(p => ({
      id: p.id,
      itemName: p.name,
      itemType: 'finished',
      currentQuantity: p.quantity,
      minThreshold: p.minThreshold!,
      status: p.quantity === 0 ? 'critical' : 'warning',
    })),
  ];

  // Fetch all KPIs
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);
        setError(null);

        if (useDummyData) {
          // Add dummy data for salesTrend
          const dummySalesTrend = [
            { date: '2023-10-01', sales: 1500 },
            { date: '2023-10-02', sales: 1800 },
            { date: '2023-10-03', sales: 1200 },
            { date: '2023-10-04', sales: 2000 },
            { date: '2023-10-05', sales: 1700 },
            { date: '2023-10-06', sales: 2200 },
            { date: '2023-10-07', sales: 1900 },
          ];
          setSalesTrend(dummySalesTrend);

          // Add dummy data for orderStatusDistribution
          const dummyOrderStatusDistribution = [
            { status: 'pending', count: 5 },
            { status: 'in_production', count: 8 },
            { status: 'confirmed', count: 12 },
            { status: 'delivered', count: 20 },
            { status: 'cancelled', count: 3 },
          ];
          setOrderStatusDistribution(dummyOrderStatusDistribution);

          setLoading(false);
        } else {
          // Fetch inventory values
          const inventoryRes = await axiosInstance.get('/kpi/inventory-values');
          if (inventoryRes.data.success) {
            setInventoryValues(inventoryRes.data.data);
          }

          // Fetch manufacturing efficiency
          const efficiencyRes = await axiosInstance.get('/kpi/manufacturing-efficiency');
          if (efficiencyRes.data.success) {
            setManufacturingEfficiency(efficiencyRes.data.data);
          }

          // Fetch order status distribution
          const distributionRes = await axiosInstance.get('/kpi/order-status-distribution');
          if (distributionRes.data.success) {
            setOrderStatusDistribution(distributionRes.data.data);
          }

          // Fetch sales trend
          const today = new Date();
          const startDate = '2000-01-01';
          const endDate = today.toISOString().slice(0, 10);
          const trendRes = await axiosInstance.get('/kpi/sales-trend', {
            params: { periodType: 'day', startDate, endDate }
          });
          if (trendRes.data.success) {
            setSalesTrend(trendRes.data.data.map((d: any) => ({
              date: d.period_start,
              sales: Number(d.total_revenue)
            })));
          }
        }
      } catch (err) {
        console.error('Error fetching KPIs:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        if (!useDummyData) {
          setLoading(false);
        }
      }
    };

    fetchKPIs();
  }, [useDummyData]);

  // Get status icon component
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'in_production':
        return <Hammer className="h-5 w-5 text-amber-500" />;
      case 'pending':
        return <div className="h-5 w-5 rounded-full bg-yellow-400" />;
      case 'partially_in_stock':
        return <div className="h-5 w-5 flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-blue-400 border-2 border-amber-400" />
        </div>;
      case 'awaiting_materials':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'delivered':
        return <Truck className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <Check className="h-5 w-5 text-green-700" />;
      case 'cancelled':
        return <div className="h-5 w-5 rounded-full bg-red-500" />;
      default:
        return null;
    }
  };
  
  // Get human-readable status label
  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return 'In Stock';
      case 'in_production':
        return 'In Manufacturing';
      case 'pending':
        return 'Pending';
      case 'partially_in_stock':
        return 'Partially In Stock';
      case 'awaiting_materials':
        return 'Awaiting Materials';
      case 'delivered':
        return 'Dispatched';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };
  
  // Calculate progress percentage based on status
  const getStatusProgress = (status: OrderStatus) => {
    const statuses: OrderStatus[] = ['pending', 'awaiting_materials', 'in_production', 'partially_in_stock', 'confirmed', 'completed', 'delivered'];
    const index = statuses.indexOf(status);
    if (index === -1) return 0;
    return Math.round((index / (statuses.length - 1)) * 100);
  };

  // Calculate partial fulfillment percentage
  const getPartialFulfillmentProgress = (order) => {
    if (!order.partialFulfillment || order.partialFulfillment.length === 0) {
      return 100; // No partial fulfillment data, assume complete
    }
    
    let totalQuantity = 0;
    let inStockQuantity = 0;
    
    order.partialFulfillment.forEach(item => {
      totalQuantity += item.totalQuantity;
      inStockQuantity += item.inStockQuantity;
    });
    
    return totalQuantity > 0 ? Math.round((inStockQuantity / totalQuantity) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-factory-gray-900">Dashboard</h1>
        <p className="text-sm text-factory-gray-500">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-factory-primary"></div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Raw Material Value" 
              value={formatCurrency(inventoryValues.raw_material_value)} 
              icon={<Package size={20} />} 
            />
            <StatCard 
              title="Finished Products Value" 
              value={formatCurrency(inventoryValues.finished_product_value)} 
              icon={<Factory size={20} />} 
            />
            <StatCard 
              title="Total Sales" 
              value={formatCurrency(totalSales)} 
              icon={<ShoppingCart size={20} />}
              trend={{ value: 12, positive: true }} 
            />
            <StatCard 
              title="Manufacturing Efficiency" 
              value={`${manufacturingEfficiency.efficiency_percentage}%`} 
              icon={<TrendingUp size={20} />}
              trend={{ 
                value: manufacturingEfficiency.efficiency_percentage - 80, 
                positive: manufacturingEfficiency.efficiency_percentage >= 80 
              }} 
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Daily Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`$${value}`, 'Sales']}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return `${date.toLocaleDateString()}`;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#1E3A8A" 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Active Orders Status - Only showing active orders as requested */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Active Orders Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] overflow-auto">
                  {activeOrders.length > 0 ? (
                    <div className="space-y-4">
                      {activeOrders.map(order => (
                        <div key={order.id} className="border-b pb-3 last:border-0">
                          <div className="flex justify-between mb-1">
                            <div className="font-medium">{order.orderNumber}</div>
                            <div className="text-sm text-factory-gray-500">{order.customerName}</div>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(order.status)}
                            <span className="text-sm">{getStatusLabel(order.status)}</span>
                          </div>
                          <Progress value={getStatusProgress(order.status)} className="h-2" />
                          
                          {/* Partial fulfillment details */}
                          {order.status === 'partially_in_stock' && order.partialFulfillment && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-100">
                              <p className="text-xs font-medium text-blue-800 mb-1">Partial Fulfillment</p>
                              <div className="flex justify-between text-xs text-blue-700">
                                <span>In Stock: {getPartialFulfillmentProgress(order)}%</span>
                                <span>
                                  {order.partialFulfillment.reduce((total, item) => total + item.inStockQuantity, 0)} / 
                                  {order.partialFulfillment.reduce((total, item) => total + item.totalQuantity, 0)} units
                                </span>
                              </div>
                              <Progress 
                                value={getPartialFulfillmentProgress(order)} 
                                className="h-1.5 mt-1 bg-blue-100" 
                              />
                            </div>
                          )}
                          
                          <div className="flex justify-between mt-1 text-xs text-factory-gray-500">
                            <span>Order Date: {formatDate(order.date)}</span>
                            <span>Value: {formatCurrency(order.totalValue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-factory-gray-500">
                      No active orders found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Active Manufacturing and Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Manufacturing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Active Manufacturing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeBatches.length > 0 ? (
                    activeBatches.map(batch => (
                      <div key={batch.id} className="border-b pb-4 last:border-0">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{batch.productName}</span>
                          <span className="text-sm">Batch: {batch.batchNumber}</span>
                        </div>
                        <ProgressBar 
                          value={batch.progress} 
                          showLabel 
                          colorVariant={
                            batch.progress > 66 ? 'success' : 
                            batch.progress > 33 ? 'warning' : 
                            'default'
                          }
                        />
                        <div className="flex justify-between mt-1 text-xs text-factory-gray-500">
                          <span>Started: {new Date(batch.startDate).toLocaleDateString()}</span>
                          <span>Est. Completion: {new Date(batch.estimatedCompletionDate).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Show linked sales order if available */}
                        {batch.linkedSalesOrderId && (
                          <div className="mt-2 text-xs text-factory-gray-600">
                            Linked to order: {salesOrders.find(o => o.id === batch.linkedSalesOrderId)?.orderNumber || 'Unknown'}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-factory-gray-500">No active manufacturing batches</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Stock Alerts */}
            <Card>
              <CardHeader className="bg-factory-gray-50 border-b">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-factory-warning" />
                  Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {stockAlerts.map(alert => (
                    <div key={alert.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{alert.itemName}</p>
                        <p className="text-sm text-factory-gray-500">
                          {alert.itemType === 'raw' ? 'Raw Material' : 'Finished Product'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">Current: {alert.currentQuantity}</p>
                          <p className="text-xs text-factory-gray-500">Min: {alert.minThreshold}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          alert.status === 'critical' ? 'bg-factory-danger' : 'bg-factory-warning'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
