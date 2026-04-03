// Dashboard Controller
// Handles the analytics/summary endpoints for the frontend dashboard
// These routes pull together aggregated data for charts and summary cards

const { getDashboardData } = require('../services/dashboardservice');
const FinancialRecord = require('../models/financialrecord');

// --- DASHBOARD SUMMARY ---
// GET /api/dashboard/summary?period=month
// Returns: totals, category breakdown, recent activity, trends
const getSummary = async (req, res) => {
  try {
    const period = req.query.period || 'month';

    // Validate the period value
    const validPeriods = ['week', 'month', 'year', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: `Period must be one of: ${validPeriods.join(', ')}`
      });
    }

    // Viewers only see their own data
    // Analysts and admins see data from all users
    let userId = null;
    if (req.user.role === 'viewer') {
      userId = req.user._id;
    }

    // Get all the dashboard data from the service
    const data = await getDashboardData(userId, period);

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- CATEGORY BREAKDOWN ---
// GET /api/dashboard/category-breakdown?period=month&type=expense
// Returns totals grouped by category (good for pie/bar charts)
const getCategoryBreakdown = async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const type = req.query.type; // optional: 'income' or 'expense'

    // Figure out the start date based on the period
    const now = new Date();
    let startDate = null;

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    // if period is 'all', startDate stays null (no date filter)

    // Build the match conditions
    const matchConditions = {};

    if (startDate) {
      matchConditions.date = { $gte: startDate };
    }

    if (type) {
      matchConditions.type = type;
    }

    // Run the aggregation query
    const breakdown = await FinancialRecord.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            category: '$category',
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }  // highest amounts first
    ]);

    res.json({
      success: true,
      data: breakdown
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- TRENDS ---
// GET /api/dashboard/trends?granularity=monthly
// Returns income vs expense over time (good for line charts)
const getTrends = async (req, res) => {
  try {
    const granularity = req.query.granularity || 'monthly';

    // Group by month or week depending on the granularity
    let groupId;

    if (granularity === 'weekly') {
      groupId = {
        year: { $year: '$date' },
        week: { $week: '$date' }
      };
    } else {
      // default to monthly
      groupId = {
        year: { $year: '$date' },
        month: { $month: '$date' }
      };
    }

    const trends = await FinancialRecord.aggregate([
      {
        $group: {
          _id: groupId,
          // Sum all income amounts (conditional sum)
          income: {
            $sum: {
              $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
            }
          },
          // Sum all expense amounts
          expenses: {
            $sum: {
              $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
            }
          },
          count: { $sum: 1 }
        }
      },
      // Sort chronologically
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        granularity: granularity,
        trends: trends
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { getSummary, getCategoryBreakdown, getTrends };