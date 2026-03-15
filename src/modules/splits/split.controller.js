const splitsService = require('./split.service');
const ApiResponse = require('../../utils/response');

class SplitsController {
  async getUserBalances(req, res, next) {
    try {
      const balances = await splitsService.getUserBalances(req.user.id);
      return ApiResponse.success(res, 'Balances retrieved', balances);
    } catch (error) {
      next(error);
    }
  }

  async getSimplifiedBalances(req, res, next) {
    try {
      const result = await splitsService.getSimplifiedBalances(req.user.id);
      return ApiResponse.success(res, 'Simplified balances retrieved', result);
    } catch (error) {
      next(error);
    }
  }

  async getGroupBalances(req, res, next) {
    try {
      const { groupId } = req.params;
      const balances = await splitsService.getGroupBalances(groupId, req.user.id);
      return ApiResponse.success(res, 'Group balances retrieved', { balances });
    } catch (error) {
      next(error);
    }
  }

  async getExpenseSplits(req, res, next) {
    try {
      const { expenseId } = req.params;
      const splits = await splitsService.getExpenseSplits(expenseId, req.user.id);
      return ApiResponse.success(res, 'Splits retrieved', { splits });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SplitsController();
