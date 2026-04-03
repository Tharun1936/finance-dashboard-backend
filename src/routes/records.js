// Financial Records Routes
// Maps URLs to controller functions + adds validation + role checks
//
// Access rules:
//   GET /          → everyone (viewer sees own, analyst/admin sees all)
//   GET /:id       → everyone (viewer sees own only)
//   POST /         → analyst and admin only
//   PUT /:id       → analyst (own) and admin (any)
//   DELETE /:id    → analyst (soft delete, own) and admin (hard delete, any)
//   GET /deleted   → admin only
//   PATCH /:id/restore → admin only

const express = require('express');
const { body, query } = require('express-validator');
const {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
  getDeletedRecords,
  restoreRecord
} = require('../controllers/recordcontroller');
const { requireViewer, requireAnalyst, requireAdmin } = require('../middleware/rolecheck');
const auth = require('../middleware/auth');
const { validationResult } = require('../utils/validation');

const router = express.Router();

// Every record route needs authentication
router.use(auth);

// --- LIST ALL RECORDS ---
// GET /api/records
// Optional query params: page, limit, type, category, startDate, endDate, search, sortBy, sortOrder
router.get(
  '/',
  requireViewer,  // viewer, analyst, and admin can all access this
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive number'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc')
  ],
  validationResult,
  getRecords
);

// --- GET DELETED RECORDS (admin only) ---
// This must be before /:id so Express doesn't treat "deleted" as an ID
// GET /api/records/deleted
router.get('/deleted', requireAdmin, getDeletedRecords);

// --- GET ONE RECORD ---
// GET /api/records/:id
router.get('/:id', requireViewer, getRecordById);

// --- CREATE RECORD ---
// POST /api/records
router.post(
  '/',
  requireAnalyst,  // only analyst and admin can create
  [
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a number greater than 0'),

    body('type')
      .isIn(['income', 'expense'])
      .withMessage('Type must be income or expense'),

    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required'),

    body('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be a valid date (e.g. 2026-04-01)'),

    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description cannot be longer than 500 characters'),

    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
  ],
  validationResult,
  createRecord
);

// --- UPDATE RECORD ---
// PUT /api/records/:id
router.put(
  '/:id',
  requireAnalyst,
  [
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a number greater than 0'),

    body('type')
      .optional()
      .isIn(['income', 'expense'])
      .withMessage('Type must be income or expense'),

    body('category')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Category cannot be empty'),

    body('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be a valid date'),

    body('description')
      .optional()
      .isLength({ max: 500 }),

    body('tags')
      .optional()
      .isArray()
  ],
  validationResult,
  updateRecord
);

// --- DELETE RECORD ---
// DELETE /api/records/:id
// analyst → soft delete, admin → hard delete (handled inside the controller)
router.delete('/:id', requireAnalyst, deleteRecord);

// --- RESTORE DELETED RECORD (admin only) ---
// PATCH /api/records/:id/restore
router.patch('/:id/restore', requireAdmin, restoreRecord);

module.exports = router;
