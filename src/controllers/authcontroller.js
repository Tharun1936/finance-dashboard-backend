// Auth Controller
// Handles everything related to user accounts:
// - Register (create account)
// - Login (get a token)
// - Logout (invalidate token)
// - Get current user info

const jwt = require('jsonwebtoken');
const User = require('../models/user');
const BlacklistToken = require('../models/blacklistmodel');

// Helper function to create a JWT token for a user
// We put the user's ID inside the token, not their password or role (security!)
function createToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }  // token expires in 7 days
  );
}

// --- REGISTER ---
// POST /api/auth/register
// Anyone can call this to create a new account
const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if someone already registered with this email or username
    const existingUser = await User.findOne({
      $or: [{ email: email }, { username: username }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with that email or username already exists'
      });
    }

    // Create the new user (password gets hashed automatically in the model)
    const newUser = new User({
      username: username,
      email: email,
      password: password,
      role: role || 'viewer'  // default to viewer if no role given
    });

    await newUser.save();

    // Generate a token so the user is automatically logged in after registering
    const token = createToken(newUser._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status
        },
        token: token
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- LOGIN ---
// POST /api/auth/login
// User sends email + password, we send back a JWT token
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    // We need .select('+password') because password has select:false in the model
    const user = await User.findOne({ email: email }).select('+password');

    // If no user found with that email
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }

    // Check if the account is deactivated by admin
    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an admin.'
      });
    }

    // Compare the entered password with the hashed one in the database
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password'
      });
    }

    // Everything is good - create a token and send it back
    const token = createToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status
        },
        token: token
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- LOGOUT ---
// POST /api/auth/logout
// We add the token to a blacklist so it can't be used again
const logout = async (req, res) => {
  try {
    // Get the token from the request header
    const token = req.header('Authorization').replace('Bearer ', '');

    // Save it to the blacklist in the database
    await BlacklistToken.create({ token: token });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- GET ME ---
// GET /api/auth/me
// Returns the profile of whoever is currently logged in
// We know who they are because auth middleware already set req.user
const getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
      createdAt: req.user.createdAt
    }
  });
};

module.exports = { register, login, logout, getMe };