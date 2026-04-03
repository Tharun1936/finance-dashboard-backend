// Auth Routes
// Defines all the URL paths for authentication
// /api/auth/register → create account
// /api/auth/login    → get JWT token
// /api/auth/logout   → invalidate token
// /api/auth/me       → get logged-in user info

const express = require('express');
const { body } = require('express-validator');
const { register, login, logout, getMe } = require('../controllers/authcontroller');
const { validationResult } = require('../utils/validation');
const auth = require('../middleware/auth');

const router = express.Router();

// --- REGISTER ---
// Validate input before hitting the controller
router.post(
  '/register',
  [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),

    body('email')
      .isEmail().withMessage('Please enter a valid email')
      .normalizeEmail(),  // converts to lowercase and trims

    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    body('role')
      .optional()  // role is not required
      .isIn(['viewer', 'analyst', 'admin']).withMessage('Role must be viewer, analyst, or admin')
  ],
  validationResult,  // this checks for errors and returns 400 if found
  register           // if no errors, run the controller
);

// --- LOGIN ---
router.post(
  '/login',
  [
    body('email')
      .isEmail().withMessage('Please enter a valid email')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  validationResult,
  login
);

// --- LOGOUT ---
// auth middleware ensures user is logged in before they can log out
router.post('/logout', auth, logout);

// --- GET CURRENT USER ---
router.get('/me', auth, getMe);

module.exports = router;