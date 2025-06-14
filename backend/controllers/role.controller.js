import Role from '../models/role.model.js';
import Permission from '../models/permission.model.js';

export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching roles', error: error.message });
  }
};

export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching role', error: error.message });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if role already exists
    const existingRole = await Role.findByName(name);
    if (existingRole) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    const role = await Role.create({ name, description });
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: 'Error creating role', error: error.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const roleId = req.params.id;

    // Check if role exists
    const existingRole = await Role.findById(roleId);
    if (!existingRole) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Check if trying to update system role
    if (existingRole.is_system_role) {
      return res.status(403).json({ message: 'Cannot modify system roles' });
    }

    // Check if new name conflicts with existing role
    if (name !== existingRole.name) {
      const nameConflict = await Role.findByName(name);
      if (nameConflict) {
        return res.status(400).json({ message: 'Role name already exists' });
      }
    }

    const updatedRole = await Role.update(roleId, { name, description });
    res.json(updatedRole);
  } catch (error) {
    res.status(500).json({ message: 'Error updating role', error: error.message });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const roleId = req.params.id;

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Check if trying to delete system role
    if (role.is_system_role) {
      return res.status(403).json({ message: 'Cannot delete system roles' });
    }

    await Role.delete(roleId);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting role', error: error.message });
  }
};

export const getRolePermissions = async (req, res) => {
  try {
    const roleId = req.params.id;
    
    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const permissions = await Role.getRolePermissions(roleId);
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching role permissions', error: error.message });
  }
};

export const updateRolePermissions = async (req, res) => {
  try {
    const roleId = req.params.id;
    const { permissionIds } = req.body;

    // Check if role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Check if trying to modify system role
    if (role.is_system_role) {
      return res.status(403).json({ message: 'Cannot modify system role permissions' });
    }

    await Role.updateRolePermissions(roleId, permissionIds);
    
    // Return updated permissions
    const permissions = await Role.getRolePermissions(roleId);
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Error updating role permissions', error: error.message });
  }
};

export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Role.getAllPermissions();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching permissions', error: error.message });
  }
}; 