import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axiosInstance from '../utils/axios';

interface Notification {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  priority: string;
  status: string;
  module: string | null;
  user_id: number;
  reference_id?: number;
  reference_type?: string;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notification_id: number) => Promise<void>;
  deleteNotification: (notification_id: number) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { authState } = useAuth();

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get('/notifications');
      const notificationData = response.data?.data?.notifications || [];
      
      const validNotifications = Array.isArray(notificationData) 
        ? notificationData.filter((item): item is Notification => {
            return (
              typeof item === 'object' &&
              item !== null &&
              'notification_id' in item &&
              'title' in item &&
              'message' in item &&
              'type' in item &&
              'status' in item &&
              'priority' in item &&
              'module' in item &&
              'user_id' in item &&
              'created_at' in item
            );
          }).map(item => ({
            notification_id: item.notification_id,
            title: item.title,
            message: item.message,
            type: item.type,
            read: item.status === 'read',
            priority: item.priority,
            status: item.status,
            module: item.module,
            user_id: item.user_id,
            reference_id: item.reference_id,
            reference_type: item.reference_type,
            created_at: item.created_at
          }))
        : [];
      
      setNotifications(validNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [authState.isAuthenticated]);

  const markAsRead = async (notification_id: number) => {
    try {
      await axiosInstance.put(`/notifications/${notification_id}/read`);
      setNotifications(prev =>
        prev.map(notification =>
          notification.notification_id === notification_id ? { ...notification, read: true, status: 'read' } : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notification_id: number) => {
    try {
      await axiosInstance.delete(`/notifications/${notification_id}`);
      setNotifications(prev =>
        prev.filter(notification => notification.notification_id !== notification_id)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
  };

  const unreadCount = Array.isArray(notifications) 
    ? notifications.filter(n => !n.read).length 
    : 0;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        deleteNotification,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 