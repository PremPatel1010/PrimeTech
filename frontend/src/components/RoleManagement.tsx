import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Shield } from 'lucide-react';
import { rbacService, Role, Permission } from '@/services/rbac.service';
import { useToast } from '@/components/ui/use-toast';

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const { toast } = useToast();

  // New loading states
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        rbacService.getAllRoles(),
        rbacService.getAllPermissions()
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load roles and permissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    try {
      setIsAddingRole(true);
      const role = await rbacService.createRole(newRole);
      setRoles([...roles, role]);
      setIsAddRoleDialogOpen(false);
      setNewRole({ name: '', description: '' });
      toast({
        title: 'Success',
        description: 'Role created successfully'
      });
    } catch (error) {
      console.error('Error creating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to create role',
        variant: 'destructive'
      });
    } finally {
      setIsAddingRole(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;

    try {
      setIsEditingRole(true);
      const updatedRole = await rbacService.updateRole(selectedRole.role_id, {
        name: selectedRole.name,
        description: selectedRole.description
      });
      setRoles(roles.map(role => 
        role.role_id === selectedRole.role_id ? updatedRole : role
      ));
      setIsEditRoleDialogOpen(false);
      setSelectedRole(null);
      toast({
        title: 'Success',
        description: 'Role updated successfully'
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role',
        variant: 'destructive'
      });
    } finally {
      setIsEditingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      setIsDeletingRole(true);
      await rbacService.deleteRole(roleId);
      setRoles(roles.filter(role => role.role_id !== roleId));
      toast({
        title: 'Success',
        description: 'Role deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete role',
        variant: 'destructive'
      });
    } finally {
      setIsDeletingRole(false);
    }
  };

  const handleEditPermissions = async (roleId: number) => {
    try {
      setIsUpdatingPermissions(true);
      await rbacService.updateRolePermissions(roleId, selectedPermissions);
      toast({
        title: 'Success',
        description: 'Role permissions updated successfully'
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role permissions',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  const loadRolePermissions = async (roleId: number) => {
    try {
      const rolePermissions = await rbacService.getRolePermissions(roleId);
      setSelectedPermissions(rolePermissions.map(p => p.permission_id));
    } catch (error) {
      console.error('Error loading role permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load role permissions',
        variant: 'destructive'
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-factory-gray-900">Role Management</h1>
        <Button 
          className="bg-factory-primary hover:bg-factory-primary/90"
          onClick={() => setIsAddRoleDialogOpen(true)}
          disabled={isAddingRole}
        >
          <Plus className="mr-2 h-4 w-4" />
          {isAddingRole ? 'Adding...' : 'Add Role'}
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-factory-gray-50">
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full md:min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.role_id}>
                    <TableCell className="font-medium break-all">{role.name}</TableCell>
                    <TableCell className="break-all">{role.description}</TableCell>
                    <TableCell>
                      <Badge variant={role.is_system_role ? "destructive" : "outline"}>
                        {role.is_system_role ? "System" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 flex-shrink-0 min-w-0">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelectedRole(role);
                            setIsEditRoleDialogOpen(true);
                          }}
                          disabled={isEditingRole}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSelectedRole(role);
                            loadRolePermissions(role.role_id);
                          }}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDeleteRole(role.role_id)}
                          disabled={isDeletingRole}
                        >
                          <Trash2 className="h-4 w-4 text-factory-danger" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={isAddRoleDialogOpen} onOpenChange={setIsAddRoleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddRole}
              disabled={!newRole.name || isAddingRole}
            >
              {isAddingRole ? 'Adding...' : 'Add Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name</Label>
              <Input
                id="edit-name"
                value={selectedRole?.name || ''}
                onChange={(e) => setSelectedRole(prev => 
                  prev ? { ...prev, name: e.target.value } : null
                )}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={selectedRole?.description || ''}
                onChange={(e) => setSelectedRole(prev => 
                  prev ? { ...prev, description: e.target.value } : null
                )}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditRole}
              disabled={!selectedRole?.name || isEditingRole}
            >
              {isEditingRole ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Permissions Dialog */}
      <Dialog 
        open={!!selectedRole} 
        onOpenChange={() => setSelectedRole(null)}
      >
        <DialogContent className="sm:max-w-[900px] md:max-w-[1000px] lg:max-w-[1100px]">
          <DialogHeader>
            <DialogTitle>
              Manage Permissions - {selectedRole?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Tabs defaultValue="all">
              <div className="overflow-x-auto pb-2">
                <TabsList className="min-w-full justify-start overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  <TabsTrigger value="all">All Permissions</TabsTrigger>
                  {Array.from(new Set(permissions.map(p => p.module))).map(module => (
                    <TabsTrigger key={module} value={module}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-4">
                  {permissions.map((permission) => (
                    <div key={permission.permission_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`perm-${permission.permission_id}`}
                        checked={selectedPermissions.includes(permission.permission_id)}
                        onCheckedChange={(checked) => {
                          setSelectedPermissions(prev => 
                            checked
                              ? [...prev, permission.permission_id]
                              : prev.filter(id => id !== permission.permission_id)
                          );
                        }}
                      />
                      <Label htmlFor={`perm-${permission.permission_id}`} className="break-words">
                        {permission.name}
                        <span className="text-sm text-gray-500 block">
                          {permission.description}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {Array.from(new Set(permissions.map(p => p.module))).map(module => (
                <TabsContent key={module} value={module} className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-4">
                    {permissions
                      .filter(p => p.module === module)
                      .map((permission) => (
                        <div key={permission.permission_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`perm-${permission.permission_id}`}
                            checked={selectedPermissions.includes(permission.permission_id)}
                            onCheckedChange={(checked) => {
                              setSelectedPermissions(prev => 
                                checked
                                  ? [...prev, permission.permission_id]
                                  : prev.filter(id => id !== permission.permission_id)
                              );
                            }}
                          />
                          <Label htmlFor={`perm-${permission.permission_id}`} className="break-words">
                            {permission.name}
                            <span className="text-sm text-gray-500 block">
                              {permission.description}
                            </span>
                          </Label>
                        </div>
                      ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRole(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedRole && handleEditPermissions(selectedRole.role_id)}
              disabled={isUpdatingPermissions}
            >
              {isUpdatingPermissions ? 'Saving...' : 'Save Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement; 