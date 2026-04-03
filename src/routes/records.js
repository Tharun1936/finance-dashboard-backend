// Financial Records Routes
// GET /          → everyone (viewer sees own, analyst/admin sees all)
// GET /:id       → everyone
// POST /         → analyst and admin only
// PUT /:id       → analyst (own) and admin (any)
// DELETE /:id    → analyst (soft delete) and admin (hard delete)
// GET /deleted   → admin only
// PATCH /:id/restore → admin only

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
const { validate } = require('../utils/validation');

const router = express.Router();

// Every record route needs authentication
router.use(auth);

// --- LIST ALL RECORDS ---
// GET /api/records
router.get(
  '/',
  requireViewer,
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive number'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('sortOrder must be asc or desc')
  ]),
  getRecords
);

// --- GET DELETED RECORDS (admin only) ---
// Must be before /:id so Express doesn't treat "deleted" as an ID
router.get('/deleted', requireAdmin, getDeletedRecords);

// --- GET ONE RECORD ---
router.get('/:id', requireViewer, getRecordById);

// --- CREATE RECORD ---
router.post(
  '/',
  requireAnalyst,
  validate([
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a number greater than 0'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('date').optional().isISO8601().withMessage('Date must be a valid date (e.g. 2026-04-01)'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ]),
  createRecord
);

// --- UPDATE RECORD ---
router.put(
  '/:id',
  requireAnalyst,
  validate([
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be a number greater than 0'),
    body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
    body('date').optional().isISO8601().withMessage('Date must be a valid date'),
    body('description').optional().isLength({ max: 500 }),
    body('tags').optional().isArray()
  ]),
  updateRecord
);

// --- DELETE RECORD ---
// analyst → soft delete, admin → hard delete (handled inside the controller)
router.delete('/:id', requireAnalyst, deleteRecord);

// --- RESTORE DELETED RECORD (admin only) ---
router.patch('/:id/restore', requireAdmin, restoreRecord);

module.exports = router;

