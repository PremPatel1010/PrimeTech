import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

import axiosInstance from '@/utils/axios';
import { useFactory } from '../../context/FactoryContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, markNotificationAsRead, deleteNotification } = useFactory();
  const [showNotifications, setShowNotifications] = useState(false);

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

          <div className="hidden sm:flex items-center gap-4 ml-auto relative">
            {/* Notification Bell */}
            <button
              className="relative focus:outline-none"
              onClick={() => setShowNotifications(v => !v)}
            >
              <Bell size={22} className="text-factory-primary" />
              {notifications && notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-10 w-80 bg-white border border-factory-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b font-semibold text-factory-primary">Notifications</div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-factory-gray-500">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`flex items-start gap-2 px-4 py-3 border-b last:border-b-0 ${n.read ? 'bg-gray-50' : 'bg-factory-primary/10'}`}>
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">{n.type.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-factory-gray-700 mb-1">{n.message}</div>
                        <div className="text-xs text-factory-gray-400">{new Date(n.date).toLocaleString()}</div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {!n.read && (
                          <button className="text-xs text-blue-600 hover:underline" onClick={() => markNotificationAsRead(n.id)}>Mark as read</button>
                        )}
                        <button className="text-xs text-red-500 hover:underline" onClick={() => deleteNotification(n.id)}>Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
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
