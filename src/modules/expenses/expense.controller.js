const expensesService = require('./expense.service');
const cloudinaryService = require('../../utils/cloudinary');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');
const fs = require('fs');
const logger = require('../../utils/logger');

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
      const query = req.validatedQuery || req.query;
      const { page, limit, skip } = PaginationHelper.getPaginationParams(query);
      const filters = {
        expenseType: query.expenseType,
        groupId: query.groupId,
        categoryId: query.categoryId,
        startDate: query.startDate,
        endDate: query.endDate,
        paidByMe: query.paidByMe,
        owedByMe: query.owedByMe,
        search: query.search
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
      // Check if file was uploaded
      if (!req.file) {
        return ApiResponse.error(res, 'No file provided', 400);
      }

      // Get expense to verify ownership and check for existing image
      const expense = await expensesService.getExpenseById(req.validatedParams.id, req.user.id);

      // Upload to Cloudinary
      const uploadResult = await cloudinaryService.uploadFile(
        req.file.path,
        'splitwise/expenses',
        `${req.validatedParams.id}-receipt`
      );

      // Clean up local file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      // Delete old image from Cloudinary if it exists
      if (expense.image) {
        const oldPublicId = cloudinaryService.extractPublicId(expense.image);
        if (oldPublicId) {
          await cloudinaryService.deleteFile(oldPublicId).catch(err => {
            logger.warn(`Failed to delete old expense image: ${err.message}`);
          });
        }
      }

      // Update expense with new image URL
      const updatedExpense = await expensesService.updateExpenseImage(
        req.validatedParams.id,
        req.user.id,
        uploadResult.url
      );

      return ApiResponse.success(res, 'Receipt uploaded successfully', {
        expense: updatedExpense,
        fileInfo: {
          size: uploadResult.size,
          format: uploadResult.format,
          width: uploadResult.width,
          height: uploadResult.height
        }
      });
    } catch (error) {
      // Clean up local file if upload failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }

  async deleteExpenseImage(req, res, next) {
    try {
      const expense = await expensesService.getExpenseById(req.validatedParams.id, req.user.id);

      if (!expense.image) {
        return ApiResponse.error(res, 'No image to delete', 400);
      }

      // Extract public ID and delete from Cloudinary
      const publicId = cloudinaryService.extractPublicId(expense.image);
      if (publicId) {
        await cloudinaryService.deleteFile(publicId);
      }

      // Remove image from expense
      const updatedExpense = await expensesService.updateExpenseImage(
        req.validatedParams.id,
        req.user.id,
        null
      );

      return ApiResponse.success(res, 'Expense image deleted successfully', {
        expense: updatedExpense
      });
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
