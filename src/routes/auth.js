const express = require('express');
const { body } = require('express-validator');
const { register, login, logout, getMe } = require('../controllers/authcontroller');
const { validationResult } = require('../utils/validation');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/auth/register ───────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters'),
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['viewer', 'analyst', 'admin']).withMessage('Role must be viewer, analyst, or admin')
  ],
  validationResult,
  register
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validationResult,
  login
);

// ─── POST /api/auth/logout  (requires token) ─────────────────────────────────
router.post('/logout', auth, logout);

// ─── GET /api/auth/me  (requires token) ───────────────────────────────────────
router.get('/me', auth, getMe);

module.exports = router;