const analyticsService = require('./analytics.service');
const ApiResponse = require('../../utils/response');

class AnalyticsController {
  async getDashboardData(req, res, next) {
    try {
      const data = await analyticsService.getDashboardData(req.user.id);
      return ApiResponse.success(res, 'Dashboard data retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async getSpendingByCategory(req, res, next) {
    try {
      const data = await analyticsService.getSpendingByCategory(req.user.id);
      return ApiResponse.success(res, 'Spending by category retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async getIncomeVsExpense(req, res, next) {
    try {
      const data = await analyticsService.getIncomeVsExpense(req.user.id);
      return ApiResponse.success(res, 'Income vs expense retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyTrends(req, res, next) {
    try {
      const data = await analyticsService.getMonthlyTrends(req.user.id);
      return ApiResponse.success(res, 'Monthly trends retrieved', data);
    } catch (error) {
      next(error);
    }
  }

  async getFriendBalances(req, res, next) {
    try {
      const data = await analyticsService.getFriendBalances(req.user.id);
      return ApiResponse.success(res, 'Friend balances retrieved', data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
