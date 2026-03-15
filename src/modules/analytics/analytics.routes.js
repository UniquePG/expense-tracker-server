const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/dashboard', authenticate, analyticsController.getDashboardData);
router.get('/spending-by-category', authenticate, analyticsController.getSpendingByCategory);
router.get('/income-vs-expense', authenticate, analyticsController.getIncomeVsExpense);
router.get('/monthly-trends', authenticate, analyticsController.getMonthlyTrends);
router.get('/friend-balances', authenticate, analyticsController.getFriendBalances);

module.exports = router;
