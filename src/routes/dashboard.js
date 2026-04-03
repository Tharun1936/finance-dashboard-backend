// Dashboard Routes
// These routes return summarized/aggregated data for the dashboard UI
// Think of it like the "stats" page of the app
//
// Access rules:
//   /summary           → all roles (viewers see own data, others see all)
//   /category-breakdown → analyst and admin only
//   /trends            → analyst and admin only

const express = require('express');
const { getSummary, getCategoryBreakdown, getTrends } = require('../controllers/dashboardcontroller');
const { requireViewer, requireAnalyst } = require('../middleware/rolecheck');
const auth = require('../middleware/auth');

const router = express.Router();

// All dashboard routes need authentication
router.use(auth);

// --- SUMMARY ---
// GET /api/dashboard/summary?period=month
// Returns: income total, expense total, balance, recent activity, trends
// Viewers get their own data; analysts/admins get global data
router.get('/summary', requireViewer, getSummary);

// --- CATEGORY BREAKDOWN ---
// GET /api/dashboard/category-breakdown?period=month&type=expense
// Returns totals grouped by category (useful for pie charts)
router.get('/category-breakdown', requireAnalyst, getCategoryBreakdown);

// --- TRENDS ---
// GET /api/dashboard/trends?granularity=monthly
// Returns income vs expenses over time (useful for line/area charts)
router.get('/trends', requireAnalyst, getTrends);

module.exports = router;
