// Auth middleware - runs on every protected route
// Its job is to check: "Is this person actually logged in and allowed to be here?"

const jwt = require('jsonwebtoken');
const User = require('../models/user');
const BlacklistToken = require('../models/blacklistmodel');

const auth = async (req, res, next) => {
  try {
    // Step 1: Get the token from the request header
    // The frontend should send: Authorization: Bearer <token>
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please log in first.'
      });
    }

    // Remove "Bearer " from the beginning to get just the token
    const token = authHeader.replace('Bearer ', '');

    // Step 2: Check if this token was logged out/blacklisted
    const isBlacklisted = await BlacklistToken.findOne({ token: token });
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'You have been logged out. Please log in again.'
      });
    }

    // Step 3: Verify the token is valid and not tampered with
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 4: Find the user in the database using the id from the token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists'
      });
    }

    // Step 5: Make sure the user account is still active
    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an admin.'
      });
    }

    // Step 6: Attach the user to the request so controllers can use it
    req.user = user;

    // Move on to the next middleware or route handler
    next();

  } catch (error) {
    // Handle specific JWT errors with helpful messages
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.'
      });
    }

    // Any other error
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

module.exports = auth;