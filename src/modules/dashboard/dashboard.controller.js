const dashboardService = require('./dashboard.service');
const ApiResponse = require('../../utils/response');

class DashboardController {
  /**
   * Get Dashboard Summary
   * GET /dashboard
   * Response: totalBalance, totalExpenses, totalIncome, groups, recentTransactions
   */
  async getDashboardSummary(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        groupId: req.query.groupId
      };

      const summary = await dashboardService.getDashboardSummary(req.user.id, filters);
      return ApiResponse.success(res, 'Dashboard summary retrieved', summary);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Dashboard Stats
   * GET /dashboard/stats
   */
  async getDashboardStats(req, res, next) {
    try {
      const stats = await dashboardService.getDashboardStats(req.user.id);
      return ApiResponse.success(res, 'Dashboard stats retrieved', stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Spending Trends
   * GET /dashboard/trends
   */
  async getSpendingTrends(req, res, next) {
    try {
      const months = parseInt(req.query.months) || 6;
      const trends = await dashboardService.getSpendingTrends(req.user.id, months);
      return ApiResponse.success(res, 'Spending trends retrieved', { trends });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Friend Balances
   * GET /dashboard/friend-balances
   */
  async getFriendBalances(req, res, next) {
    try {
      const balances = await dashboardService.getFriendBalances(req.user.id);
      return ApiResponse.success(res, 'Friend balances retrieved', { balances });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
