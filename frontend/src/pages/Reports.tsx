
import React, { useState } from 'react';
import { useFactory } from '../context/FactoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  calculateRawMaterialValue, 
  calculateFinishedProductValue, 
  calculateTotalSales,
  formatCurrency 
} from '../utils/calculations';
import { stockAlerts, dailySalesData, manufacturingProgressData } from '../data/mockData';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#1E3A8A', '#2563EB', '#4F46E5', '#6366F1', '#8B5CF6'];

const Reports: React.FC = () => {
  const { rawMaterials, finishedProducts, salesOrders, manufacturingBatches } = useFactory();
  const [timeRange, setTimeRange] = useState('all');
  
  // Calculate key metrics
  const rawMaterialValue = calculateRawMaterialValue(rawMaterials);
  const finishedProductValue = calculateFinishedProductValue(finishedProducts);
  const totalSalesValue = calculateTotalSales(salesOrders, 'delivered');
  
  // Manufacturing data
  const manufacturingBatchesByStage = {
    cutting: manufacturingBatches.filter(b => b.currentStage === 'cutting').length,
    assembly: manufacturingBatches.filter(b => b.currentStage === 'assembly').length,
    testing: manufacturingBatches.filter(b => b.currentStage === 'testing').length,
    packaging: manufacturingBatches.filter(b => b.currentStage === 'packaging').length,
    completed: manufacturingBatches.filter(b => b.currentStage === 'completed').length,
  };
  
  const stageNames: Record<string, string> = {
    'cutting': 'Cutting',
    'assembly': 'Assembly',
    'testing': 'Testing',
    'packaging': 'Packaging',
    'completed': 'Completed'
  };
  
  // Inventory distribution data for pie chart
  const inventoryDistributionData = [
    { name: 'Raw Materials', value: rawMaterialValue },
    { name: 'Finished Products', value: finishedProductValue }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-factory-gray-900">Reports & Analytics</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-factory-gray-600">Time Range:</span>
          <Select 
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales Analysis</TabsTrigger>
          <TabsTrigger value="manufacturing">Manufacturing Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Metrics Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Key Business Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-factory-gray-500">Total Inventory Value</p>
                      <p className="text-2xl font-bold text-factory-primary">
                        {formatCurrency(rawMaterialValue + finishedProductValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-factory-gray-500">Total Sales Value</p>
                      <p className="text-2xl font-bold text-factory-primary">{formatCurrency(totalSalesValue)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-factory-gray-500">Raw Material Value</p>
                      <p className="text-xl font-semibold">{formatCurrency(rawMaterialValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-factory-gray-500">Finished Product Value</p>
                      <p className="text-xl font-semibold">{formatCurrency(finishedProductValue)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-factory-gray-500">Active Orders</p>
                      <p className="text-lg font-medium">{salesOrders.filter(o => o.status === 'pending').length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-factory-gray-500">Completed Orders</p>
                      <p className="text-lg font-medium">{salesOrders.filter(o => o.status === 'delivered').length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-factory-gray-500">Manufacturing Batches</p>
                      <p className="text-lg font-medium">{manufacturingBatches.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Inventory Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Value Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {inventoryDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value), 'Value']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* Sales Trend Chart */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailySalesData}>
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
                        formatter={(value: any) => [formatCurrency(value), 'Sales']}
                        labelFormatter={(label) => {
                          const date = new Date(label);
                          return `${date.toLocaleDateString()}`;
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#1E3A8A" 
                        strokeWidth={2} 
                        dot={{ r: 4 }}
                        name="Daily Sales" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales by Product</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={finishedProducts.map(product => {
                        // Calculate total quantity sold for each product
                        const quantitySold = salesOrders
                          .filter(o => o.status === 'delivered')
                          .flatMap(o => o.products)
                          .filter(p => p.productId === product.id)
                          .reduce((sum, p) => sum + p.quantity, 0);
                          
                        return {
                          name: product.name,
                          quantity: quantitySold,
                          revenue: quantitySold * product.price
                        };
                      })}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          return name === 'revenue' 
                            ? [formatCurrency(value), 'Revenue'] 
                            : [value, 'Quantity'];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="quantity" fill="#2563EB" name="Quantity Sold" />
                      <Bar dataKey="revenue" fill="#1E3A8A" name="Revenue ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Delivered', value: salesOrders.filter(o => o.status === 'delivered').length },
                          { name: 'Pending', value: salesOrders.filter(o => o.status === 'pending').length },
                          { name: 'Cancelled', value: salesOrders.filter(o => o.status === 'cancelled').length }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      >
                        <Cell fill="#10B981" /> {/* Delivered */}
                        <Cell fill="#F59E0B" /> {/* Pending */}
                        <Cell fill="#EF4444" /> {/* Cancelled */}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="manufacturing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Manufacturing Stage Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(manufacturingBatchesByStage).map(([stage, count]) => ({
                        stage: stageNames[stage] || stage,
                        count
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`${value} batches`, 'Count']} />
                      <Legend />
                      <Bar dataKey="count" fill="#2563EB" name="Batches" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Manufacturing Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={finishedProducts.map(product => {
                      // Find all completed batches for this product
                      const completedBatches = manufacturingBatches
                        .filter(b => b.productId === product.id && b.currentStage === 'completed');
                      
                      // Calculate average time to complete (in days)
                      const avgCompletionDays = completedBatches.length > 0
                        ? completedBatches.reduce((sum, batch) => {
                            const startDate = new Date(batch.startDate).getTime();
                            const endDate = batch.stageCompletionDates.completed 
                              ? new Date(batch.stageCompletionDates.completed).getTime() 
                              : new Date().getTime();
                            return sum + (endDate - startDate) / (1000 * 60 * 60 * 24);
                          }, 0) / completedBatches.length
                        : 0;
                      
                      return {
                        name: product.name,
                        days: avgCompletionDays.toFixed(1),
                        batches: completedBatches.length
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="days" fill="#1E3A8A" name="Avg. Days to Complete" />
                      <Bar dataKey="batches" fill="#10B981" name="Completed Batches" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
