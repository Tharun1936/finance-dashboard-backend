const FinancialRecord = require('../models/financialrecord');

/**
 * Compute the start date for a given time period.
 * Returns null for 'all' (no date filter).
 */
const getPeriodStartDate = (period) => {
  const now = new Date();
  switch (period) {
    case 'week':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
    default:
      return null;
  }
};

/**
 * getDashboardData
 * @param {ObjectId|null} userId  - Pass userId to scope to one user, or null for global (admin/analyst)
 * @param {string}        period  - 'week' | 'month' | 'year' | 'all'
 */
const getDashboardData = async (userId, period = 'month') => {
  const startDate = getPeriodStartDate(period);

  // Build the match stage
  const matchStage = {};
  if (userId) matchStage.createdBy = userId;
  if (startDate) matchStage.date = { $gte: startDate };

  // ── 1. Total income & expenses ────────────────────────────────────────────
  const totals = await FinancialRecord.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const incomeData = totals.find((t) => t._id === 'income') || { total: 0, count: 0 };
  const expenseData = totals.find((t) => t._id === 'expense') || { total: 0, count: 0 };

  // ── 2. Category-wise breakdown (top 10) ───────────────────────────────────
  const categoryBreakdown = await FinancialRecord.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { category: '$category', type: '$type' },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } },
    { $limit: 10 }
  ]);

  // ── 3. Recent activity (last 10 records) ──────────────────────────────────
  const recentActivity = await FinancialRecord.find(matchStage)
    .sort({ date: -1 })
    .limit(10)
    .populate('createdBy', 'username');

  // ── 4. Monthly trends ─────────────────────────────────────────────────────
  const monthlyTrends = await FinancialRecord.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // ── 5. Weekly trends ──────────────────────────────────────────────────────
  const weeklyTrends = await FinancialRecord.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          week: { $week: '$date' }
        },
        income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
        expenses: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } }
  ]);

  return {
    period,
    totals: {
      income: incomeData.total,
      incomeCount: incomeData.count,
      expenses: expenseData.total,
      expenseCount: expenseData.count,
      balance: incomeData.total - expenseData.total,
      totalTransactions: incomeData.count + expenseData.count
    },
    categoryBreakdown,
    recentActivity,
    monthlyTrends,
    weeklyTrends
  };
};

module.exports = { getDashboardData };