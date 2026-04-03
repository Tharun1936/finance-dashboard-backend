// User Management Routes (Admin only)
// All these routes are for admins to manage other users

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
const { validate } = require('../utils/validation');

const router = express.Router();

// Apply auth + admin check to ALL routes in this file
router.use(auth);
router.use(requireAdmin);

// --- GET ALL USERS ---
// GET /api/users?page=1&limit=10&role=viewer&status=active&search=john
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive number'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('role').optional().isIn(['viewer', 'analyst', 'admin']).withMessage('Invalid role'),
    query('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
  ]),
  getAllUsers
);

// --- GET ONE USER ---
router.get('/:id', getUserById);

// --- CHANGE USER ROLE ---
router.patch(
  '/:id/role',
  validate([
    body('role').isIn(['viewer', 'analyst', 'admin']).withMessage('Role must be viewer, analyst, or admin')
  ]),
  updateUserRole
);

// --- CHANGE USER STATUS ---
router.patch(
  '/:id/status',
  validate([
    body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive')
  ]),
  updateUserStatus
);

// --- DELETE USER ---
router.delete('/:id', deleteUser);

module.exports = router;

