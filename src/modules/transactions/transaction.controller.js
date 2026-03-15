const transactionsService = require('./transaction.service');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');

class TransactionsController {
  async getTransactions(req, res, next) {
    try {
      const { page, limit, skip } = PaginationHelper.getPaginationParams(req.query);
      const filters = {
        type: req.query.type,
        categoryId: req.query.category,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const { transactions, total } = await transactionsService.getTransactions(req.user.id, filters, { skip, take: limit });
      const meta = PaginationHelper.createPaginationMeta(total, page, limit);

      return ApiResponse.paginated(res, 'Transactions retrieved', transactions, meta);
    } catch (error) {
      next(error);
    }
  }

  async createTransaction(req, res, next) {
    try {
      const transaction = await transactionsService.createTransaction(req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Transaction created', { transaction }, 201);
    } catch (error) {
      next(error);
    }
  }

  async getTransactionById(req, res, next) {
    try {
      const transaction = await transactionsService.getTransactionById(req.validatedParams.id, req.user.id);
      return ApiResponse.success(res, 'Transaction retrieved', { transaction });
    } catch (error) {
      next(error);
    }
  }

  async updateTransaction(req, res, next) {
    try {
      const transaction = await transactionsService.updateTransaction(req.validatedParams.id, req.user.id, req.body);
      return ApiResponse.success(res, 'Transaction updated', { transaction });
    } catch (error) {
      next(error);
    }
  }

  async deleteTransaction(req, res, next) {
    try {
      await transactionsService.deleteTransaction(req.validatedParams.id, req.user.id);
      return ApiResponse.success(res, 'Transaction deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await transactionsService.getCategories(req.query.type);
      return ApiResponse.success(res, 'Categories retrieved', categories);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TransactionsController();
