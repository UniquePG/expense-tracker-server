const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.get('/income-vs-expense', authenticate, analyticsController.getIncomeVsExpense);
router.get('/spending-by-category', authenticate, analyticsController.getSpendingByCategory);
router.get('/monthly-trends', authenticate, analyticsController.getMonthlyTrends);
router.get('/friend-balances', authenticate, analyticsController.getFriendBalances);
router.get('/group/:id', authenticate, analyticsController.getGroupAnalytics);

module.exports = router;
