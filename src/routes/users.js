const express = require('express');
const { body, query } = require('express-validator');
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

// All user management routes: must be authenticated AND admin
router.use(auth, requireAdmin);

// ─── GET /api/users ────────────────────────────────────────────────────────────
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['viewer', 'analyst', 'admin']),
    query('status').optional().isIn(['active', 'inactive'])
  ],
  validationResult,
  getAllUsers
);

// ─── GET /api/users/:id ────────────────────────────────────────────────────────
router.get('/:id', getUserById);

// ─── PATCH /api/users/:id/role ─────────────────────────────────────────────────
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

// ─── PATCH /api/users/:id/status ──────────────────────────────────────────────
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

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
router.delete('/:id', deleteUser);

module.exports = router;
