const jwt = require('jsonwebtoken');
const User = require('../models/user');
const tokenBlacklistModel = require('../models/blacklistmodel');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token not provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Check if token has been blacklisted (logged out)
    const isBlacklisted = await tokenBlacklistModel.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({ success: false, message: 'Token has been invalidated. Please log in again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User belonging to this token no longer exists' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Your account is inactive. Contact an administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
    }
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

module.exports = auth;