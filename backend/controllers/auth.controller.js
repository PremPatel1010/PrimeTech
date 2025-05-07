import User from '../models/user.model.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

// In-memory store for demo; use DB in production!
const passwordResetTokens = new Map();

export const register = async (req, res) => {
  try {
    const { username, email, role } = req.body;
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    // Generate random password
    const generatedPassword = crypto.randomBytes(6).toString('hex');
    // Create new user
    const user = await User.create({
      username,
      email,
      password: generatedPassword,
      role: role || 'employee'
    });
    // Send email with password
    await sendPasswordEmail(email, generatedPassword);
    res.status(201).json({
      message: 'User registered successfully. Password sent to email.',
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
    console.log(error)
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await User.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = User.generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    
    const user = await User.findById(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users.map(user => ({
      id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, departmentName } = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user
    const updatedUser = await User.update(id, {
      username,
      email,
      role,
      departmentName
    });

    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.user_id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        departmentName: updatedUser.departmentName
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user
    await User.delete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Fetch password_hash for comparison
    const userWithHash = await User.findByEmail(user.email);
    const isMatch = await User.comparePassword(currentPassword, userWithHash.password_hash);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });
    await User.updatePassword(userId, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password', error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findByEmail(email);
  if (!user) return res.status(200).json({ message: 'If the email exists, a reset link will be sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 1000 * 60 * 60; // 1 hour
  passwordResetTokens.set(token, { userId: user.user_id, expires });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendPasswordEmail(email, `Click to reset your password: ${resetLink}`);

  res.json({ message: 'If the email exists, a reset link will be sent.' });
};

export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  const data = passwordResetTokens.get(token);
  if (!data || data.expires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired token.' });
  }
  await User.updatePassword(data.userId, newPassword);
  passwordResetTokens.delete(token);
  res.json({ message: 'Password has been reset.' });
};

export const logout = async (req, res) => {
  try {
    // Since we're using JWT, we don't need to do anything server-side
    // The client will handle removing the token
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error during logout' });
  }
};

// Helper function to send email
async function sendPasswordEmail(email, password) {

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Your Account Password',
    text: `Your account has been created. Your password is: ${password}`
  });
} 