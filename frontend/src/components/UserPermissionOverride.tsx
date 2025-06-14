import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { rbacService, Permission, UserPermission } from '@/services/rbac.service';
import { userService } from '@/services/user.service';
import { User } from '@/types';
import { useToast } from '@/components/ui/use-toast';

const UserPermissionOverride: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsersAndPermissions();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadUserPermissions(selectedUserId);
    } else {
      setUserPermissions([]);
    }
  }, [selectedUserId]);

  const loadUsersAndPermissions = async () => {
    setLoading(true);
    try {
      const [usersData, permissionsData] = await Promise.all([
        userService.getAllUsers(),
        rbacService.getAllPermissions()
      ]);
      setUsers(usersData);
      setPermissions(permissionsData);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load users or permissions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      const perms = await rbacService.getUserPermissions(Number(userId));
      setUserPermissions(perms);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load user permissions', variant: 'destructive' });
    }
  };

  const handlePermissionChange = (permissionId: number, is_allowed: boolean) => {
    setUserPermissions(prev => {
      const existing = prev.find(p => p.permission_id === permissionId);
      if (existing) {
        return prev.map(p =>
          p.permission_id === permissionId ? { ...p, is_allowed } : p
        );
      } else {
        const perm = permissions.find(p => p.permission_id === permissionId);
        if (!perm) return prev;
        return [
          ...prev,
          { ...perm, is_allowed } as UserPermission
        ];
      }
    });
  };

  const handleSave = async () => {
    try {
      await rbacService.updateUserPermissions(Number(selectedUserId), userPermissions);
      toast({ title: 'Success', description: 'User permissions updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update user permissions', variant: 'destructive' });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Permission Override</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.username} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedUserId && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {permissions.map(permission => {
              const userPerm = userPermissions.find(p => p.permission_id === permission.permission_id);
              return (
                <div key={permission.permission_id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`perm-${permission.permission_id}`}
                    checked={userPerm?.is_allowed || false}
                    onCheckedChange={checked => handlePermissionChange(permission.permission_id, !!checked)}
                  />
                  <label htmlFor={`perm-${permission.permission_id}`}>{permission.name}</label>
                  <span className="text-xs text-gray-500">{permission.description}</span>
                </div>
              );
            })}
          </div>
        )}
        <Button onClick={handleSave} disabled={!selectedUserId}>
          Save Overrides
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserPermissionOverride; 