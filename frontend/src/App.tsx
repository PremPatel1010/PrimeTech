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
import { FactoryProvider } from "./context/FactoryContext";

// Pages
import Dashboard from "./pages/Dashboard";
import ViewOrderStatus from "./pages/ViewOrderStatus";
import Inventory from "./pages/Inventory";
import Manufacturing from "./pages/Manufacturing";
import Reports from "./pages/Reports";
import Products from "./pages/Products";
import PurchaseOrders from "./pages/PurchaseOrders";
import Suppliers from "./pages/Suppliers";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/Users";
import SettingsPage from "./pages/settings";
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const queryClient = new QueryClient();

const App: React.FC = () => {
  const { authState } = useAuth();
  const admin = authState.user?.role === 'admin';
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Router>
          <FactoryProvider>
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
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/sales" element={<ViewOrderStatus />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/manufacturing" element={<Manufacturing />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/products" element={<Products />} />
                <Route path="/purchase" element={<PurchaseOrders />} />
                <Route path="/suppliers" element={<Suppliers />} />
                {admin && <Route path="/users" element={<UserManagement />} />}
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Admin Only Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Layout>
                      <div>Admin Panel (Coming Soon)</div>
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
          </FactoryProvider>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
