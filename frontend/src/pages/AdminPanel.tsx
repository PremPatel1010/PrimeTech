import React from 'react';
import RoleManagement from '@/components/RoleManagement';
import UserRoleAssignment from '@/components/UserRoleAssignment';
import UserPermissionOverride from '@/components/UserPermissionOverride';

const AdminPanel: React.FC = () => (
  <div className="space-y-8">
    <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
    <RoleManagement />
    <UserRoleAssignment />
    <UserPermissionOverride />
  </div>
);

export default AdminPanel; 