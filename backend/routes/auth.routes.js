import express from 'express';
import { register, login, getProfile, getAllUsers } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);


// Protected routes
router.get('/profile', authenticate, getProfile);

// Admin only route
router.get('/admin/users', authenticate, authorize(['admin']), getAllUsers);

export default router; 