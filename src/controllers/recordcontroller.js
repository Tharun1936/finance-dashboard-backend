const FinancialRecord = require('../models/financialrecord');

// ─── POST /api/records  (analyst, admin) ──────────────────────────────────────
const createRecord = async (req, res) => {
  try {
    const { amount, type, category, date, description, tags } = req.body;

    const record = new FinancialRecord({
      amount,
      type,
      category,
      date,
      description,
      tags,
      createdBy: req.user._id
    });
    await record.save();
    await record.populate('createdBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'Record created successfully',
      data: record
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── GET /api/records  (all roles) ───────────────────────────────────────────
const getRecords = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Admins & analysts can see all records; viewers see only their own
    const filter = {};
    if (req.user.role === 'viewer') {
      filter.createdBy = req.user._id;
    }

    if (type) filter.type = type;
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (search) {
      filter.$or = [
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      FinancialRecord.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'username'),
      FinancialRecord.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/records/:id  (all roles) ───────────────────────────────────────
const getRecordById = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    // Viewers can only fetch their own
    if (req.user.role === 'viewer') filter.createdBy = req.user._id;

    const record = await FinancialRecord.findOne(filter).populate('createdBy', 'username email');
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PUT /api/records/:id  (analyst, admin) ───────────────────────────────────
const updateRecord = async (req, res) => {
  try {
    // Analysts can only update their own records; admins can update any
    const filter = { _id: req.params.id };
    if (req.user.role === 'analyst') filter.createdBy = req.user._id;

    const record = await FinancialRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const allowedFields = ['amount', 'type', 'category', 'date', 'description', 'tags'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) record[field] = req.body[field];
    });

    await record.save();

    res.json({ success: true, message: 'Record updated successfully', data: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── DELETE /api/records/:id  (admin only: hard delete; analyst: soft delete) ──
const deleteRecord = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === 'analyst') filter.createdBy = req.user._id;

    const record = await FinancialRecord.findOne(filter);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    if (req.user.role === 'admin') {
      // Hard delete for admins
      await FinancialRecord.deleteOne({ _id: req.params.id });
      return res.json({ success: true, message: 'Record permanently deleted' });
    }

    // Soft delete for analysts
    record.isDeleted = true;
    record.deletedAt = new Date();
    await record.save();

    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/records/deleted  (admin only) ───────────────────────────────────
const getDeletedRecords = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Bypass the pre-find hook that excludes deleted records
    const query = FinancialRecord.find({ isDeleted: true });
    query._skipDeletedFilter = true;

    const [records, total] = await Promise.all([
      FinancialRecord.find({ isDeleted: true })
        .setOptions({ skipDeletedFilter: true })
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'username'),
      FinancialRecord.countDocuments({ isDeleted: true })
    ]);

    res.json({
      success: true,
      data: {
        records,
        pagination: { current: parseInt(page), pages: Math.ceil(total / parseInt(limit)), total }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PATCH /api/records/:id/restore  (admin only) ────────────────────────────
const restoreRecord = async (req, res) => {
  try {
    const record = await FinancialRecord.findOneAndUpdate(
      { _id: req.params.id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: 'Deleted record not found' });
    }

    res.json({ success: true, message: 'Record restored successfully', data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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