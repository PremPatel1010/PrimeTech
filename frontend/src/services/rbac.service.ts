import axiosInstance from "@/utils/axios";


export interface Role {
  role_id: number;
  name: string;
  description: string;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  permission_id: number;
  name: string;
  description: string;
  module: string;
  route_path: string;
  is_allowed?: boolean;
}

export interface UserPermission extends Permission {
  is_allowed: boolean;
}

class RbacService {
  // Role management
  async getAllRoles(): Promise<Role[]> {
    const response = await axiosInstance.get('/auth/roles');
    return response.data;
  }

  async createRole(data: { name: string; description: string }): Promise<Role> {
    const response = await axiosInstance.post('/auth/roles', data);
    return response.data;
  }

  async updateRole(roleId: number, data: { name: string; description: string }): Promise<Role> {
    const response = await axiosInstance.put(`/auth/roles/${roleId}`, data);
    return response.data;
  }

  async deleteRole(roleId: number): Promise<void> {
    await axiosInstance.delete(`/auth/roles/${roleId}`);
  }

  // Permission management
  async getAllPermissions(): Promise<Permission[]> {
    const response = await axiosInstance.get('/auth/permissions');
    return response.data;
  }

  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const response = await axiosInstance.get(`/auth/roles/${roleId}/permissions`);
    return response.data;
  }

  async updateRolePermissions(roleId: number, permissionIds: number[]): Promise<Permission[]> {
    const response = await axiosInstance.put(`/auth/roles/${roleId}/permissions`, { permissionIds });
    return response.data;
  }

  async getUserPermissions(userId: number): Promise<UserPermission[]> {
    const response = await axiosInstance.get(`/auth/users/${userId}/permissions`);
    return response.data;
  }

  async updateUserPermissions(userId: number, permissions: UserPermission[]): Promise<UserPermission[]> {
    const response = await axiosInstance.put(`/auth/users/${userId}/permissions`, { permissions });
    return response.data;
  }

  // Permission checking
  async checkPermission(routePath: string): Promise<boolean> {
    const response = await axiosInstance.post('/auth/check-permission', { routePath });
    return response.data.hasPermission;
  }
}

export const rbacService = new RbacService(); 