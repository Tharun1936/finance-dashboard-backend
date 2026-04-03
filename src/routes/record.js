const express = require('express');
const {
  createRecord,
  getRecords,
  updateRecord,
  deleteRecord
} = require('../controllers/recordcontroller');
const { requireViewer, requireAnalyst, requireAdmin } = require('../middleware/rolecheck');
const auth = require('../middleware/auth');
const { body, query } = require('express-validator');
const { validationResult } = require('../utils/validation');

const router = express.Router();

router.use(auth);

// Viewer & Analyst: Read only
router.get('/', requireViewer, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], validationResult, getRecords);

// Analyst & Admin: Create, Update, Delete
router.post('/', requireAnalyst, [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('type').isIn(['income', 'expense']).withMessage('Invalid type'),
  body('category').notEmpty().withMessage('Category is required')
], validationResult, createRecord);

router.put('/:id', requireAnalyst, [
  body('amount').optional().isFloat({ min: 0 }),
  body('type').optional().isIn(['income', 'expense']),
  body('category').optional().notEmpty()
], validationResult, updateRecord);

router.delete('/:id', requireAnalyst, updateRecord, deleteRecord);

module.exports = router;