const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

/**
 * Dashboard Routes
 * All routes require authentication
 */

// Get dashboard summary - Main endpoint as per API doc
router.get('/', authenticate, dashboardController.getDashboardSummary);

// Get dashboard statistics
router.get('/stats', authenticate, dashboardController.getDashboardStats);

// Get spending trends
router.get('/trends', authenticate, dashboardController.getSpendingTrends);

// Get friend balances
router.get('/friend-balances', authenticate, dashboardController.getFriendBalances);

module.exports = router;
