const jwt = require('jsonwebtoken');
const Database = require('../utils/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await Database.findByField('users', 'username', decoded.username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireOwnerOrAdmin = (usernameParam = 'username') => {
  return (req, res, next) => {
    const targetUsername = req.params[usernameParam];
    
    if (req.user.role === 'admin' || req.user.username === targetUsername) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied' });
    }
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnerOrAdmin,
  JWT_SECRET
};