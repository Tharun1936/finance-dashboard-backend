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

// All record routes require authentication
router.use(auth);

// ─── GET /api/records  (viewer+) ──────────────────────────────────────────────
// Viewers: own records only | Analysts/Admins: all records
router.get(
  '/',
  requireViewer,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  validationResult,
  getRecords
);

// ─── GET /api/records/deleted  (admin only) ───────────────────────────────────
router.get('/deleted', requireAdmin, getDeletedRecords);

// ─── GET /api/records/:id  (viewer+) ─────────────────────────────────────────
router.get('/:id', requireViewer, getRecordById);

// ─── POST /api/records  (analyst+) ───────────────────────────────────────────
router.post(
  '/',
  requireAnalyst,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ],
  validationResult,
  createRecord
);

// ─── PUT /api/records/:id  (analyst+) ────────────────────────────────────────
router.put(
  '/:id',
  requireAnalyst,
  [
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').optional().trim().notEmpty().withMessage('Category cannot be empty'),
    body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
    body('description').optional().isLength({ max: 500 }),
    body('tags').optional().isArray()
  ],
  validationResult,
  updateRecord
);

// ─── DELETE /api/records/:id  (analyst+) ─────────────────────────────────────
// Analysts: soft delete own records | Admins: hard delete any
router.delete('/:id', requireAnalyst, deleteRecord);

// ─── PATCH /api/records/:id/restore  (admin only) ────────────────────────────
router.patch('/:id/restore', requireAdmin, restoreRecord);

module.exports = router;
