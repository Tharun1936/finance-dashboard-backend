// Dashboard Service
// This file handles all the complex MongoDB aggregation queries
// for the dashboard summary endpoint
//
// I put this in a separate file (service layer) to keep the controller clean
// Controllers should just handle requests/responses, not complex DB logic

const FinancialRecord = require('../models/financialrecord');

// Helper function: figure out what date to start from based on the period
function getStartDate(period) {
  const now = new Date();

  if (period === 'week') {
    // 7 days ago
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (period === 'month') {
    // first day of this month
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (period === 'year') {
    // first day of this year
    return new Date(now.getFullYear(), 0, 1);
  }

  // 'all' - return null meaning no date filter
  return null;
}

// Main function - gets all the data needed for the dashboard
// userId: if provided, filter to just that user's records (viewer role)
//         if null, get data from all users (analyst/admin)
async function getDashboardData(userId, period) {
  const startDate = getStartDate(period);

  // Build the base filter for all our queries
  const baseFilter = {};

  if (userId) {
    baseFilter.createdBy = userId;
  }

  if (startDate) {
    baseFilter.date = { $gte: startDate };
  }

  // --- 1. Calculate total income and total expenses ---
  // $group groups all records by type, then sums up the amounts
  const totalResults = await FinancialRecord.aggregate([
    { $match: baseFilter },
    {
      $group: {
        _id: '$type',           // group by 'income' or 'expense'
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Extract the values (or 0 if there are no income/expense records)
  const incomeResult = totalResults.find(r => r._id === 'income');
  const expenseResult = totalResults.find(r => r._id === 'expense');

  const totalIncome = incomeResult ? incomeResult.total : 0;
  const incomeCount = incomeResult ? incomeResult.count : 0;
  const totalExpenses = expenseResult ? expenseResult.total : 0;
  const expenseCount = expenseResult ? expenseResult.count : 0;

  // --- 2. Category-wise breakdown (top 10 categories) ---
  const categoryBreakdown = await FinancialRecord.aggregate([
    { $match: baseFilter },
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
    { $sort: { total: -1 } },  // highest first
    { $limit: 10 }
  ]);

  // --- 3. Recent activity - last 10 records ---
  const recentActivity = await FinancialRecord.find(baseFilter)
    .sort({ date: -1 })
    .limit(10)
    .populate('createdBy', 'username');

  // --- 4. Monthly trends ---
  // Groups records by month and shows income vs expenses for each month
  const monthlyTrends = await FinancialRecord.aggregate([
    { $match: baseFilter },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        // $cond is like an if-else inside an aggregation
        income: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
          }
        },
        expenses: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }  // sort chronologically
  ]);

  // --- 5. Weekly trends ---
  const weeklyTrends = await FinancialRecord.aggregate([
    { $match: baseFilter },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          week: { $week: '$date' }
        },
        income: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
          }
        },
        expenses: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } }
  ]);

  // Return everything together
  return {
    period: period,
    totals: {
      income: totalIncome,
      incomeCount: incomeCount,
      expenses: totalExpenses,
      expenseCount: expenseCount,
      balance: totalIncome - totalExpenses,  // net balance
      totalTransactions: incomeCount + expenseCount
    },
    categoryBreakdown: categoryBreakdown,
    recentActivity: recentActivity,
    monthlyTrends: monthlyTrends,
    weeklyTrends: weeklyTrends
  };
}

module.exports = { getDashboardData };