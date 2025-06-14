import Permission from '../models/permission.model.js';

export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching permissions', error: error.message });
  }
};

export const getUserPermissions = async (req, res) => {
  try {
    const userId = req.params.userId;
    const permissions = await Permission.getUserPermissions(userId);
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user permissions', error: error.message });
  }
};

export const updateUserPermissions = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { permissions } = req.body;

    // Validate permissions array
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Invalid permissions format' });
    }

    // Validate each permission object
    for (const perm of permissions) {
      if (!perm.permission_id || typeof perm.is_allowed !== 'boolean') {
        return res.status(400).json({ 
          message: 'Invalid permission format. Each permission must have permission_id and is_allowed fields' 
        });
      }
    }

    await Permission.updateUserPermissions(userId, permissions);
    
    // Return updated permissions
    const updatedPermissions = await Permission.getUserPermissions(userId);
    res.json(updatedPermissions);
  } catch (error) {
    res.status(500).json({ message: 'Error updating user permissions', error: error.message });
  }
};

export const checkPermission = async (req, res) => {
  try {
    const userId = req.user.user_id; // From auth middleware
    const { routePath } = req.body;

    if (!routePath) {
      return res.status(400).json({ message: 'Route path is required' });
    }

    const hasPermission = await Permission.checkPermission(userId, routePath);
    res.json({ hasPermission });
  } catch (error) {
    res.status(500).json({ message: 'Error checking permission', error: error.message });
  }
}; 