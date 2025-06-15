import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu, Bell, X, Check, Trash2, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  const { notifications, unreadCount, markAsRead, deleteNotification } = useNotifications();

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    authLogout();
    navigate('/login');
  };

  const filteredNotifications = notifications.filter(n => 
    notificationFilter === 'all' || !n.read
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'purchase_order':
        return '🛒';
      case 'grn':
        return '📦';
      case 'qc':
        return '🔍';
      case 'manufacturing':
        return '🏭';
      case 'inventory':
        return '📊';
      case 'user_management':
        return '👥';
      default:
        return '📢';
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
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-factory-gray-200 p-4 flex items-center justify-between lg:justify-start">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              className="mr-2 lg:hidden" 
              onClick={toggleSidebar}
            >
              <Menu size={24} />
            </Button>
            <img src="/logo.png" alt="Primetech Logo" className="h-8 w-auto" />
          </div>

          <div className="hidden sm:flex items-center gap-4 ml-auto relative">
            {/* Notification Bell */}
            <div ref={notificationRef} className="relative">
              <button
                className={cn(
                  "relative p-2 rounded-full hover:bg-gray-100 transition-colors",
                  showNotifications && "bg-gray-100"
                )}
                onClick={() => setShowNotifications(v => !v)}
              >
                <Bell size={22} className="text-factory-primary" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] flex items-center justify-center px-1">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {/* Header */}
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Filter size={16} className="mr-2" />
                          {notificationFilter === 'all' ? 'All' : 'Unread'}
                          <ChevronDown size={16} className="ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setNotificationFilter('all')}>
                          All Notifications
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setNotificationFilter('unread')}>
                          Unread Only
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Notifications List */}
                  <ScrollArea className="h-[400px]">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Bell size={24} className="mx-auto mb-2 text-gray-400" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredNotifications.map((notification) => {
                          console.log('Notification object in Layout:', notification);
                          return (
                            <div
                              key={notification.notification_id}
                              className={cn(
                                "p-4 hover:bg-gray-50 transition-colors",
                                !notification.read && "bg-blue-50/50"
                              )}
                            >
                              <div className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                                  {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className={cn(
                                        "text-sm font-semibold",
                                        !notification.read && "text-gray-900",
                                        notification.read && "text-gray-700"
                                      )}>
                                        {notification.title}
                                      </p>
                                      <p className="text-sm text-gray-600 mt-1">
                                        {notification.message}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-gray-500">
                                      {new Date(notification.created_at).toLocaleString()}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {!notification.read && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700"
                                          onClick={() => markAsRead(notification.notification_id)}
                                        >
                                          <Check size={14} className="mr-1" />
                                          Mark as read
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                                        onClick={() => deleteNotification(notification.notification_id)}
                                      >
                                        <Trash2 size={14} className="mr-1" />
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

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
