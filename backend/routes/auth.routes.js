import express from 'express';
import { register, login, getProfile, getAllUsers, updateUser, deleteUser, changePassword, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);


// Protected routes
router.get('/profile', authenticate, getProfile);
router.post('/change-password', authenticate, changePassword);

// Admin only routes
router.get('/admin/users', authenticate, authorize(['admin']), getAllUsers);
router.put('/admin/users/:id', authenticate, authorize(['admin']), updateUser);
router.delete('/admin/users/:id', authenticate, authorize(['admin']), deleteUser);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router; 