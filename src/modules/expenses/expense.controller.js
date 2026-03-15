const expensesService = require('./expense.service');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');

class ExpensesController {
  async createExpense(req, res, next) {
    try {
      const expense = await expensesService.createExpense(req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Expense created successfully', { expense }, 201);
    } catch (error) {
      next(error);
    }
  }

  async getExpenses(req, res, next) {
    try {
      const { page, limit, skip } = PaginationHelper.getPaginationParams(req.query);
      const filters = {
        groupId: req.query.groupId,
        categoryId: req.query.categoryId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const { expenses, total } = await expensesService.getUserExpenses(
        req.user.id,
        filters,
        { skip, take: limit }
      );

      const meta = PaginationHelper.createPaginationMeta(total, page, limit);
      return ApiResponse.paginated(res, 'Expenses retrieved', expenses, meta);
    } catch (error) {
      next(error);
    }
  }

  async getExpenseById(req, res, next) {
    try {
      const expense = await expensesService.getExpenseById(req.validatedParams.id, req.user.id);
      return ApiResponse.success(res, 'Expense retrieved', { expense });
    } catch (error) {
      next(error);
    }
  }

  async updateExpense(req, res, next) {
    try {
      const expense = await expensesService.updateExpense(
        req.validatedParams.id,
        req.user.id,
        req.validatedBody
      );
      return ApiResponse.success(res, 'Expense updated', { expense });
    } catch (error) {
      next(error);
    }
  }

  async deleteExpense(req, res, next) {
    try {
      await expensesService.deleteExpense(req.validatedParams.id, req.user.id);
      return ApiResponse.success(res, 'Expense deleted');
    } catch (error) {
      next(error);
    }
  }

  async getExpenseSummary(req, res, next) {
    try {
      const summary = await expensesService.getExpenseSummary(req.user.id);
      return ApiResponse.success(res, 'Expense summary retrieved', { summary });
    } catch (error) {
      next(error);
    }
  }

  async splitExpense(req, res, next) {
    try {
      const expense = await expensesService.createExpense(req.user.id, {
        ...req.validatedBody,
        groupId: req.validatedParams.id
      });
      return ApiResponse.success(res, 'Expense split created successfully', { expense }, 201);
    } catch (error) {
      next(error);
    }
  }

  async uploadReceipt(req, res, next) {
    try {
      // Mocked receipt upload as we don't have multer set up here
      const receiptUrl = await expensesService.uploadReceipt(req.validatedParams.id, req.user.id, req.body);
      return ApiResponse.success(res, 'Receipt uploaded', { receipt: receiptUrl });
    } catch (error) {
      next(error);
    }
  }

  async updateSplit(req, res, next) {
    try {
      const expense = await expensesService.updateSplit(req.validatedParams.id, req.user.id, req.body);
      return ApiResponse.success(res, 'Expense split updated', { expense });
    } catch (error) {
      next(error);
    }
  }

  async getComments(req, res, next) {
    try {
      const comments = await expensesService.getComments(req.validatedParams.id, req.user.id);
      return ApiResponse.success(res, 'Comments retrieved', comments);
    } catch (error) {
      next(error);
    }
  }

  async addComment(req, res, next) {
    try {
      const comment = await expensesService.addComment(req.validatedParams.id, req.user.id, req.body);
      return ApiResponse.success(res, 'Comment added', comment, 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExpensesController();
