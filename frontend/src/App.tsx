import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./components/layout/Layout";
import { RbacProvider } from './contexts/RbacContext';
import { withPermission } from './contexts/RbacContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Pages
import Dashboard from "./pages/Dashboard";
import ViewOrderStatus from "./pages/ViewOrderStatus";
import Inventory from "./pages/Inventory";
import Manufacturing from "./pages/Manufacturing";
import Reports from "./pages/Reports";
import Products from "./pages/Products";

import Suppliers from "./pages/Suppliers";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/Users";
import SettingsPage from "./pages/settings";
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { PurchaseOrderDashboard } from './components/po/PurchaseOrderDashboard';
import  ProductDashboard  from './pages/ProductDashboard';
import Jobwork from './pages/JobWork'
import JobWorkTracking from './pages/JobWorkTracking';
import CreateJobworkOrder from './pages/CreateJobworkOrder';
import JobworkVendors from './pages/JobworkVendors';
import AdminPanel from './pages/AdminPanel';

const queryClient = new QueryClient();

// Wrap components with withPermission HOC
const ProtectedDashboard = withPermission(Dashboard, '/dashboard');
const ProtectedViewOrderStatus = withPermission(ViewOrderStatus, '/sales');
const ProtectedInventory = withPermission(Inventory, '/inventory');
const ProtectedManufacturing = withPermission(Manufacturing, '/manufacturing');
const ProtectedReports = withPermission(Reports, '/reports');
const ProtectedProductDashboard = withPermission(ProductDashboard, '/products');
const ProtectedPurchaseOrderDashboard = withPermission(PurchaseOrderDashboard, '/purchase');
const ProtectedJobWorkTracking = withPermission(JobWorkTracking, '/jobwork');
const ProtectedCreateJobworkOrder = withPermission(CreateJobworkOrder, '/jobwork/create');
const ProtectedJobworkVendors = withPermission(JobworkVendors, '/jobwork/vendors');
const ProtectedJobwork = withPermission(Jobwork, '/jobwork');
const ProtectedSuppliers = withPermission(Suppliers, '/suppliers');
const ProtectedUserManagement = withPermission(UserManagement, '/users');
const ProtectedSettingsPage = withPermission(SettingsPage, '/settings');
const ProtectedAdminPanel = withPermission(AdminPanel, '/admin');

const App: React.FC = () => {
  const { authState } = useAuth();
  // const admin = authState.user?.role === 'admin'; // No longer needed as withPermission handles it
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <NotificationProvider>
            <RbacProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Protected Routes with Layout */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Outlet />
                      </Layout>
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<ProtectedDashboard />} />
                  <Route path="/sales" element={<ProtectedViewOrderStatus />} />
                  <Route path="/inventory" element={<ProtectedInventory />} />
                  <Route path="/manufacturing" element={<ProtectedManufacturing />} />
                  <Route path="/reports" element={<ProtectedReports />} />
                  {/* <Route path="/products" element={<Products />} /> */}
                  <Route path="/products" element={<ProtectedProductDashboard />} />

                  <Route path="/purchase" element={<ProtectedPurchaseOrderDashboard />} />
                  {/* Jobwork Routes */}
                  <Route path="/jobwork">
                    <Route index element={<ProtectedJobWorkTracking />} />
                    <Route path="tracking" element={<ProtectedJobWorkTracking />} />
                    <Route path="create" element={<ProtectedCreateJobworkOrder />} />
                    <Route path="vendors" element={<ProtectedJobworkVendors />} />
                    <Route path=":jobworkNumber" element={<ProtectedJobwork />} />
                  </Route>
                  <Route path="/suppliers" element={<ProtectedSuppliers />} />
                  {/* Removed admin conditional as withPermission handles it */}
                  <Route path="/users" element={<ProtectedUserManagement />} />
                  <Route path="/settings" element={<ProtectedSettingsPage />} />
                </Route>

                {/* Admin Panel Route (already protected, but using ProtectedAdminPanel for consistency) */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <Layout>
                        <ProtectedAdminPanel />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Unauthorized Route */}
                <Route
                  path="/unauthorized"
                  element={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Unauthorized Access</h1>
                        <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
                        <button
                          onClick={() => window.history.back()}
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          Go Back
                        </button>
                      </div>
                    </div>
                  }
                />

                {/* Redirect root to dashboard if authenticated, otherwise to login */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Navigate to="/dashboard" replace />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Route */}
                <Route
                  path="*"
                  element={
                    <div className="min-h-screen flex items-center justify-center">
                      <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                        <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                        <button
                          onClick={() => window.history.back()}
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          Go Back
                        </button>
                      </div>
                    </div>
                  }
                />

                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Routes>
            </RbacProvider>
          </NotificationProvider>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
