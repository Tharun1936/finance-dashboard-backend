const { getDashboardData } = require('../services/dashboardservice');
const FinancialRecord = require('../models/financialrecord');

// ─── GET /api/dashboard/summary  (viewer, analyst, admin) ────────────────────
const getSummary = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const validPeriods = ['week', 'month', 'year', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      });
    }

    // Viewers see only their own data; admin/analyst see global data
    const userId = req.user.role === 'viewer' ? req.user._id : null;
    const data = await getDashboardData(userId, period);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/dashboard/category-breakdown  (analyst, admin) ─────────────────
const getCategoryBreakdown = async (req, res) => {
  try {
    const { period = 'month', type } = req.query;

    const now = new Date();
    let startDate = null;
    if (period === 'week') startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'year') startDate = new Date(now.getFullYear(), 0, 1);

    const matchStage = {};
    if (startDate) matchStage.date = { $gte: startDate };
    if (type) matchStage.type = type;

    const result = await FinancialRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/dashboard/trends  (analyst, admin) ──────────────────────────────
const getTrends = async (req, res) => {
  try {
    const { granularity = 'monthly' } = req.query;

    const groupId =
      granularity === 'weekly'
        ? { year: { $year: '$date' }, week: { $week: '$date' } }
        : { year: { $year: '$date' }, month: { $month: '$date' } };

    const trends = await FinancialRecord.aggregate([
      {
        $group: {
          _id: groupId,
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
    ]);

    res.json({ success: true, data: { granularity, trends } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSummary, getCategoryBreakdown, getTrends };