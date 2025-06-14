import User from '../models/user.model.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import  pool  from '../db/db.js';

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

    // Get the user's role(s) from the auth.user_roles table
    const userRolesResult = await pool.query(
      `SELECT r.name, r.role_id 
       FROM auth.user_roles ur
       JOIN auth.roles r ON ur.role_id = r.role_id
       WHERE ur.user_id = $1`,
      [user.user_id]
    );

    // Determine the primary role for the frontend (e.g., if multiple roles, pick the highest privilege or first)
    const primaryRole = userRolesResult.rows.length > 0 
      ? userRolesResult.rows[0].name 
      : user.role; // Fallback to role from users table if no entry in user_roles
    
    const primaryRoleId = userRolesResult.rows.length > 0 
      ? userRolesResult.rows[0].role_id 
      : null; // Fallback to null if no entry in user_roles


    // Generate token
    const token = User.generateToken({
      user_id: user.user_id,
      email: user.email,
      role: primaryRole // Use the role from user_roles table
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: primaryRole, // Use the role from user_roles table
        role_id: primaryRoleId // Include role_id for frontend role assignment
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

    // For each user, fetch their assigned role from auth.user_roles
    const usersWithRoles = await Promise.all(users.map(async (user) => {
      const userRoleResult = await pool.query(
        `SELECT r.name, r.role_id 
         FROM auth.user_roles ur
         JOIN auth.roles r ON ur.role_id = r.role_id
         WHERE ur.user_id = $1`,
        [user.user_id]
      );
      const roleName = userRoleResult.rows.length > 0 ? userRoleResult.rows[0].name : user.role; // Fallback
      const roleId = userRoleResult.rows.length > 0 ? userRoleResult.rows[0].role_id : null; // Fallback

      return {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: roleName,
        role_id: roleId,
        created_at: user.created_at
      };
    }));

    res.json(usersWithRoles);
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
  passwordResetTokens.delete(token); // Invalidate token after use
  res.json({ message: 'Password has been reset successfully.' });
};

export const logout = async (req, res) => {
  try {
    res.clearCookie('token'); 
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ message: 'Role ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the provided roleId exists in the roles table
    const roleExists = await pool.query('SELECT 1 FROM auth.roles WHERE role_id = $1', [roleId]);
    if (roleExists.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid role ID provided' });
    }

    // Update the user_roles table
    // First, remove existing roles for the user (if any, though a user should ideally have one primary role)
    await pool.query('DELETE FROM auth.user_roles WHERE user_id = $1', [userId]);

    // Then, insert the new role
    await pool.query('INSERT INTO auth.user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);

    // Fetch the updated user details including the associated role_id and role name
    const result = await pool.query(
      `SELECT u.user_id, u.username, u.email, r.role_id, r.name as role
       FROM auth.users u
       JOIN auth.user_roles ur ON u.user_id = ur.user_id
       JOIN auth.roles r ON ur.role_id = r.role_id
       WHERE u.user_id = $1`,
      [userId]
    );
    const updatedUser = result.rows[0];

    res.json({
      message: 'User role updated successfully',
      user: {
        id: updatedUser.user_id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role, // This now comes from the joined roles table
        role_id: updatedUser.role_id // Ensure role_id is included
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
};

async function sendPasswordEmail(email, password) {
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Primetech Industry Account Password',
    text: `Hello, your password for Primetech Industry is: ${password}. Please change it after logging in.`,
  };

  await transporter.sendMail(mailOptions);
} 