import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

import axiosInstance from '@/utils/axios';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
      // Clear any stored tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
      // Redirect to login page
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      
      {/* Sidebar - hidden on mobile by default, shown when sidebarOpen is true */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with mobile menu button */}
        <header className="bg-white border-b border-factory-gray-200 p-4 flex items-center justify-between lg:justify-start">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              className="mr-2 lg:hidden" 
              onClick={toggleSidebar}
            >
              <Menu size={24} />
            </Button>
            <h1 className="text-xl font-bold text-factory-primary">Primetech Industry</h1>
          </div>

          <div className="hidden sm:flex items-center gap-4 ml-auto">
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 hover:text-factory-primary"
            >
              Logout
            </button>
          </div>
        </header>
        
        {/* Main content area */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
