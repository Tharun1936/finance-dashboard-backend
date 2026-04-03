const express = require('express');
const { getSummary, getCategoryBreakdown, getTrends } = require('../controllers/dashboardcontroller');
const { requireViewer, requireAnalyst } = require('../middleware/rolecheck');
const auth = require('../middleware/auth');

const router = express.Router();

// All dashboard routes require authentication
router.use(auth);

// ─── GET /api/dashboard/summary  (all roles) ──────────────────────────────────
// ?period=week|month|year|all
// Viewers see own data; analysts & admins see global data
router.get('/summary', requireViewer, getSummary);

// ─── GET /api/dashboard/category-breakdown  (analyst+) ────────────────────────
// ?period=week|month|year  &type=income|expense
router.get('/category-breakdown', requireAnalyst, getCategoryBreakdown);

// ─── GET /api/dashboard/trends  (analyst+) ────────────────────────────────────
// ?granularity=monthly|weekly
router.get('/trends', requireAnalyst, getTrends);

module.exports = router;
