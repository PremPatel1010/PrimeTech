import axiosInstance from '@/utils/axios';

export const notificationService = {
  getAll: async () => {
    const res = await axiosInstance.get('/notifications');
    return res.data;
  },
  markAsRead: async (id: number) => {
    const res = await axiosInstance.patch(`/notifications/${id}/read`);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await axiosInstance.delete(`/notifications/${id}`);
    return res.data;
  },
}; 