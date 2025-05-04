import express from 'express';
import { register, login, getProfile } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticate, getProfile);

// Admin only route example
router.get('/admin/users', authenticate, authorize(['admin']), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

export default router; 