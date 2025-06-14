import express from 'express';
import { register, login, getProfile, getAllUsers, updateUser, deleteUser, changePassword, forgotPassword, resetPassword, logout, updateUserRole } from '../controllers/auth.controller.js';
import { authenticate, authorize, checkPermission } from '../middleware/auth.middleware.js';
import * as roleController from '../controllers/role.controller.js';
import * as permissionController from '../controllers/permission.controller.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);


// Protected routes
router.get('/profile', authenticate, getProfile);
router.post('/change-password', authenticate, changePassword);

// Admin only routes
router.get('/admin/users', authenticate, authorize(['admin']), getAllUsers);
router.put('/admin/users/:id', authenticate, authorize(['admin']), updateUser);
router.delete('/admin/users/:id', authenticate, authorize(['admin']), deleteUser);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// User management routes (admin only)
router.get('/users', authenticate, getAllUsers);
router.put('/users/:id', authenticate,  updateUser);
router.delete('/users/:id', authenticate, deleteUser);
router.put('/users/:userId/role', authenticate,  updateUserRole);

// Role management routes (admin only)
router.get('/roles', authenticate,   roleController.getAllRoles);
router.post('/roles', authenticate,  roleController.createRole);
router.get('/roles/:id', authenticate,  roleController.getRoleById);
router.put('/roles/:id', authenticate, roleController.updateRole);
router.delete('/roles/:id', authenticate,  roleController.deleteRole);

// Role permissions routes (admin only)
router.get('/roles/:id/permissions', authenticate, roleController.getRolePermissions);
router.put('/roles/:id/permissions', authenticate,  roleController.updateRolePermissions);

// Permission management routes (admin only)
router.get('/permissions', authenticate,  permissionController.getAllPermissions);
router.get('/users/:userId/permissions', authenticate,  permissionController.getUserPermissions);
router.put('/users/:userId/permissions', authenticate, permissionController.updateUserPermissions);

// Permission check route (for frontend)
router.post('/check-permission', authenticate, permissionController.checkPermission);

export default router; 