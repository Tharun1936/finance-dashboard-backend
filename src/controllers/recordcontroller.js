// Record Controller
// Handles all CRUD operations for financial records
// Different roles have different levels of access:
//   viewer  → can only read (their own records)
//   analyst → can create, read, update, soft-delete (their own records)
//   admin   → full access to everything

const FinancialRecord = require('../models/financialrecord');

// --- CREATE RECORD ---
// POST /api/records
// Only analysts and admins can create records
const createRecord = async (req, res) => {
  try {
    const { amount, type, category, date, description, tags } = req.body;

    // Create a new record and link it to the logged-in user
    const newRecord = new FinancialRecord({
      amount: amount,
      type: type,
      category: category,
      date: date,
      description: description,
      tags: tags,
      createdBy: req.user._id  // this comes from the auth middleware
    });

    await newRecord.save();

    // Populate createdBy so we get the username instead of just the ID
    await newRecord.populate('createdBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'Record created successfully',
      data: newRecord
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// --- GET ALL RECORDS ---
// GET /api/records
// Viewer: sees only their own records
// Analyst/Admin: sees all records from everyone
const getRecords = async (req, res) => {
  try {
    // Read all the optional filters from query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type;
    const category = req.query.category;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder || 'desc';

    // Build the filter - viewers only see their own records
    const filter = {};

    if (req.user.role === 'viewer') {
      filter.createdBy = req.user._id;
    }

    // Add optional filters if they were provided
    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = { $regex: category, $options: 'i' };  // case-insensitive match
    }

    // Search across category and description at the same time
    if (search) {
      filter.$or = [
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Sorting direction: 1 for ascending, -1 for descending
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOption = { [sortBy]: sortDirection };

    const skip = (page - 1) * limit;

    // Run both queries at the same time for speed
    const [records, totalRecords] = await Promise.all([
      FinancialRecord.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'username'),
      FinancialRecord.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        records: records,
        pagination: {
          current: page,
          pages: Math.ceil(totalRecords / limit),
          total: totalRecords
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- GET SINGLE RECORD ---
// GET /api/records/:id
const getRecordById = async (req, res) => {
  try {
    const filter = { _id: req.params.id };

    // Viewers can only access their own records
    if (req.user.role === 'viewer') {
      filter.createdBy = req.user._id;
    }

    const record = await FinancialRecord.findOne(filter)
      .populate('createdBy', 'username email');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    res.json({
      success: true,
      data: record
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- UPDATE RECORD ---
// PUT /api/records/:id
// Analysts can only update their own records
// Admins can update any record
const updateRecord = async (req, res) => {
  try {
    const filter = { _id: req.params.id };

    // Analysts are restricted to their own records
    if (req.user.role === 'analyst') {
      filter.createdBy = req.user._id;
    }

    const record = await FinancialRecord.findOne(filter);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    // Only update the fields that were sent in the request body
    const allowedFields = ['amount', 'type', 'category', 'date', 'description', 'tags'];

    allowedFields.forEach(function (field) {
      if (req.body[field] !== undefined) {
        record[field] = req.body[field];
      }
    });

    await record.save();

    res.json({
      success: true,
      message: 'Record updated successfully',
      data: record
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// --- DELETE RECORD ---
// DELETE /api/records/:id
// Analysts → soft delete (marks as deleted, recoverable)
// Admins   → hard delete (permanently removed)
const deleteRecord = async (req, res) => {
  try {
    const filter = { _id: req.params.id };

    // Analysts can only delete their own records
    if (req.user.role === 'analyst') {
      filter.createdBy = req.user._id;
    }

    const record = await FinancialRecord.findOne(filter);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    if (req.user.role === 'admin') {
      // Admin: permanently delete it from the database
      await FinancialRecord.deleteOne({ _id: req.params.id });

      return res.json({
        success: true,
        message: 'Record permanently deleted'
      });
    }

    // Analyst: soft delete - just mark it as deleted
    record.isDeleted = true;
    record.deletedAt = new Date();
    await record.save();

    res.json({
      success: true,
      message: 'Record deleted'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- GET DELETED RECORDS ---
// GET /api/records/deleted
// Admin only - shows all soft-deleted records for auditing/recovery
const getDeletedRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // We use aggregate to bypass the pre-find hook that hides deleted records
    const [records, total] = await Promise.all([
      FinancialRecord.aggregate([
        { $match: { isDeleted: true } },
        { $sort: { deletedAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]),
      FinancialRecord.aggregate([
        { $match: { isDeleted: true } },
        { $count: 'total' }
      ])
    ]);

    const totalCount = total.length > 0 ? total[0].total : 0;

    res.json({
      success: true,
      data: {
        records: records,
        pagination: {
          current: page,
          pages: Math.ceil(totalCount / limit),
          total: totalCount
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- RESTORE RECORD ---
// PATCH /api/records/:id/restore
// Admin only - brings back a soft-deleted record
const restoreRecord = async (req, res) => {
  try {
    // We use aggregate here because the pre-find hook would hide deleted records
    const records = await FinancialRecord.aggregate([
      { $match: { _id: require('mongoose').Types.ObjectId.createFromHexString(req.params.id), isDeleted: true } }
    ]);

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Deleted record not found'
      });
    }

    // Restore the record by clearing the deleted flags
    const restored = await FinancialRecord.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Record restored successfully',
      data: restored
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
  getDeletedRecords,
  restoreRecord
};