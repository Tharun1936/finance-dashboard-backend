// Auth Routes
// /api/auth/register → create account
// /api/auth/login    → get JWT token
// /api/auth/logout   → invalidate token
// /api/auth/me       → get logged-in user info

const express = require('express');
const { body } = require('express-validator');
const { register, login, logout, getMe } = require('../controllers/authcontroller');
const { validate } = require('../utils/validation');
const auth = require('../middleware/auth');

const router = express.Router();

// --- REGISTER ---
router.post(
  '/register',
  validate([
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
    body('email')
      .isEmail().withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['viewer', 'analyst', 'admin']).withMessage('Role must be viewer, analyst, or admin')
  ]),
  register
);

// --- LOGIN ---
router.post(
  '/login',
  validate([
    body('email')
      .isEmail().withMessage('Please enter a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ]),
  login
);

// --- LOGOUT ---
router.post('/logout', auth, logout);

// --- GET CURRENT USER ---
router.get('/me', auth, getMe);

module.exports = router;