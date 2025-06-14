import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import Permission from '../models/permission.model.js';
import pool from '../db/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = User.verifyToken(token);
    
    const user = await User.findById(decoded.userId);
    

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    
    next();
  } catch (error) {
    console.log(error) 
    return res.status(401).json({ message: 'Invalid token' });
    
  }
};

export const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

export const checkPermission = (requiredRoute) => {
  return async (req, res, next) => {
    try {
      // Skip permission check for admin and owner roles
      const userRoles = await pool.query(
        `SELECT r.name 
         FROM auth.user_roles ur
         JOIN auth.roles r ON r.role_id = ur.role_id
         WHERE ur.user_id = $1 AND r.name IN ('admin', 'owner')`,
        [req.user.user_id]
      );

      if (userRoles.rows.length > 0) {
        return next();
      }

      // Check specific permission
      const hasPermission = await Permission.checkPermission(req.user.user_id, requiredRoute);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          message: 'You do not have permission to access this resource' 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ 
        message: 'Error checking permissions', 
        error: error.message 
      });
    }
  };
};

// Middleware to check multiple permissions (any of them)
export const checkAnyPermission = (requiredRoutes) => {
  return async (req, res, next) => {
    try {
      // Skip permission check for admin and owner roles
      const userRoles = await pool.query(
        `SELECT r.name 
         FROM auth.user_roles ur
         JOIN auth.roles r ON r.role_id = ur.role_id
         WHERE ur.user_id = $1 AND r.name IN ('admin', 'owner')`,
        [req.user.user_id]
      );

      if (userRoles.rows.length > 0) {
        return next();
      }

      // Check if user has any of the required permissions
      const hasAnyPermission = await Promise.any(
        requiredRoutes.map(route => 
          Permission.checkPermission(req.user.user_id, route)
        )
      ).catch(() => false);

      if (!hasAnyPermission) {
        return res.status(403).json({ 
          message: 'You do not have permission to access this resource' 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ 
        message: 'Error checking permissions', 
        error: error.message 
      });
    }
  };
};

// Middleware to check multiple permissions (all of them)
export const checkAllPermissions = (requiredRoutes) => {
  return async (req, res, next) => {
    try {
      // Skip permission check for admin and owner roles
      const userRoles = await pool.query(
        `SELECT r.name 
         FROM auth.user_roles ur
         JOIN auth.roles r ON r.role_id = ur.role_id
         WHERE ur.user_id = $1 AND r.name IN ('admin', 'owner')`,
        [req.user.user_id]
      );

      if (userRoles.rows.length > 0) {
        return next();
      }

      // Check if user has all required permissions
      const permissionChecks = await Promise.all(
        requiredRoutes.map(route => 
          Permission.checkPermission(req.user.user_id, route)
        )
      );

      const hasAllPermissions = permissionChecks.every(hasPermission => hasPermission);

      if (!hasAllPermissions) {
        return res.status(403).json({ 
          message: 'You do not have all required permissions to access this resource' 
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ 
        message: 'Error checking permissions', 
        error: error.message 
      });
    }
  };
}; 