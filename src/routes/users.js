// User Management Routes (Admin only)
// All these routes are for admins to manage other users
// Regular users cannot access any of these

const express = require('express');
const { query, body } = require('express-validator');
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser
} = require('../controllers/usercontroller');
const { requireAdmin } = require('../middleware/rolecheck');
const auth = require('../middleware/auth');
const { validationResult } = require('../utils/validation');

const router = express.Router();

// Apply auth + admin check to ALL routes in this file
// So we don't have to repeat it on every route
router.use(auth);         // must be logged in
router.use(requireAdmin); // must be an admin

// --- GET ALL USERS ---
// GET /api/users?page=1&limit=10&role=viewer&status=active&search=john
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive number'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('role').optional().isIn(['viewer', 'analyst', 'admin']).withMessage('Invalid role'),
    query('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
  ],
  validationResult,
  getAllUsers
);

// --- GET ONE USER ---
// GET /api/users/:id
router.get('/:id', getUserById);

// --- CHANGE USER ROLE ---
// PATCH /api/users/:id/role
router.patch(
  '/:id/role',
  [
    body('role')
      .isIn(['viewer', 'analyst', 'admin'])
      .withMessage('Role must be viewer, analyst, or admin')
  ],
  validationResult,
  updateUserRole
);

// --- CHANGE USER STATUS ---
// PATCH /api/users/:id/status
router.patch(
  '/:id/status',
  [
    body('status')
      .isIn(['active', 'inactive'])
      .withMessage('Status must be active or inactive')
  ],
  validationResult,
  updateUserStatus
);

// --- DELETE USER ---
// DELETE /api/users/:id
router.delete('/:id', deleteUser);

module.exports = router;
