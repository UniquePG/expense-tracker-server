const budgetService = require('./budget.service');
const ApiResponse = require('../../utils/response');

class BudgetController {
  /**
   * Create Budget
   * POST /budgets
   */
  async createBudget(req, res, next) {
    try {
      const budget = await budgetService.createBudget(req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Budget created successfully', { budget }, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all budgets
   * GET /budgets
   */
  async getBudgets(req, res, next) {
    try {
      const budgets = await budgetService.getBudgets(req.user.id);
      return ApiResponse.success(res, 'Budgets retrieved successfully', { budgets });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get budget progress
   * GET /budgets/:id/progress
   */
  async getBudgetProgress(req, res, next) {
    try {
      const { id } = req.params;
      const progress = await budgetService.getBudgetProgress(id, req.user.id);
      return ApiResponse.success(res, 'Budget progress retrieved', progress);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update budget
   * PUT /budgets/:id
   */
  async updateBudget(req, res, next) {
    try {
      const { id } = req.params;
      const budget = await budgetService.updateBudget(id, req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Budget updated successfully', { budget });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete budget
   * DELETE /budgets/:id
   */
  async deleteBudget(req, res, next) {
    try {
      const { id } = req.params;
      await budgetService.deleteBudget(id, req.user.id);
      return ApiResponse.success(res, 'Budget deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BudgetController();
