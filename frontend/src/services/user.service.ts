import axiosInstance from '../utils/axios';
import { User } from '../types';

export const userService = {
  async getAllUsers() {
    const response = await axiosInstance.get('/auth/admin/users');
    console.log(response.data);
    return response.data;
  },

  async createUser(userData: Partial<User>) {
    const response = await axiosInstance.post('/auth/register', {
      username: userData.username,
      email: userData.email,
      password: 'defaultPassword123',
      role: userData.role
    });
    return response.data;
  },

  async updateUser(id: string, userData: Partial<User>) {
    const response = await axiosInstance.put(`/auth/admin/users/${id}`, userData);
    return response.data;
  },

  async deleteUser(id: string) {
    const response = await axiosInstance.delete(`/auth/admin/users/${id}`);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return axiosInstance.post('/auth/change-password', { currentPassword, newPassword });
  },

  async forgotPassword(email: string) {
    return axiosInstance.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string) {
    return axiosInstance.post('/auth/reset-password', { token, newPassword });
  },

  async updateUserRole(userId: string, roleId: number) {
    const response = await axiosInstance.put(`/auth/users/${userId}/role`, { roleId });
    return response.data;
  },

  // Add more user-related functions as needed
}; 