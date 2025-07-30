const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('../utils/database');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');

const router = express.Router();

// GET all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await Database.getCollection('users');
    
    // Remove passwords from response
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET single user (admin or owner)
router.get('/:username', authenticateToken, requireOwnerOrAdmin(), async (req, res) => {
  try {
    const user = await Database.findByField('users', 'username', req.params.username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH update user (admin or owner)
router.patch('/:username', authenticateToken, requireOwnerOrAdmin(), async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['street_address', 'email', 'first', 'last'];
    
    // Admins can also update role
    if (req.user.role === 'admin') {
      allowedUpdates.push('role');
    }

    const filteredUpdates = {};

    // Filter only allowed updates
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    // Check if email is already taken by another user
    if (filteredUpdates.email) {
      const existingUser = await Database.findByField('users', 'email', filteredUpdates.email);
      if (existingUser && existingUser.username !== req.params.username) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const users = await Database.getCollection('users');
    const userIndex = users.findIndex(user => user.username === req.params.username);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user
    users[userIndex] = { ...users[userIndex], ...filteredUpdates };
    await Database.updateCollection('users', users);

    // Return updated user without password
    const { password, ...safeUser } = users[userIndex];
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PATCH update password (admin or owner)
router.patch('/:username/password', authenticateToken, requireOwnerOrAdmin(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password required' });
    }

    const user = await Database.findByField('users', 'username', req.params.username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If not admin, verify current password
    if (req.user.role !== 'admin') {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required' });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid current password' });
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const users = await Database.getCollection('users');
    const userIndex = users.findIndex(u => u.username === req.params.username);
    users[userIndex].password = hashedPassword;
    await Database.updateCollection('users', users);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// DELETE user (admin only)
router.delete('/:username', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await Database.getCollection('users');
    const filteredUsers = users.filter(user => user.username !== req.params.username);
    
    if (filteredUsers.length === users.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    await Database.updateCollection('users', filteredUsers);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;