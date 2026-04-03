const accountService = require('./account.service');
const ApiResponse = require('../../utils/response');

class AccountController {
  /**
   * Create Account
   * POST /accounts
   */
  async createAccount(req, res, next) {
    try {
      const account = await accountService.createAccount(req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Account created successfully', { account }, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all accounts
   * GET /accounts
   */
  async getAccounts(req, res, next) {
    try {
      const accounts = await accountService.getAccounts(req.user.id);
      return ApiResponse.success(res, 'Accounts retrieved successfully', { accounts });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account by ID
   * GET /accounts/:id
   */
  async getAccountById(req, res, next) {
    try {
      const account = await accountService.getAccountById(req.validatedParams.id, req.user.id, req.query);
      return ApiResponse.success(res, 'Account retrieved successfully', { account });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update account
   * PUT /accounts/:id
   */
  async updateAccount(req, res, next) {
    try {
      const account = await accountService.updateAccount(req.validatedParams.id, req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Account updated successfully', { account });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete account
   * DELETE /accounts/:id
   */
  async deleteAccount(req, res, next) {
    try {
      const forceDelete = req.query.force === 'true';
      await accountService.deleteAccount(req.validatedParams.id, req.user.id, forceDelete);
      return ApiResponse.success(res, 'Account deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account balance
   * GET /accounts/:id/balance
   */
  async getAccountBalance(req, res, next) {
    try {
      const balance = await accountService.getAccountBalance(req.validatedParams.id, req.user.id);
      return ApiResponse.success(res, 'Account balance retrieved', { ...balance });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get total balance
   * GET /accounts/balance/total
   */
  async getTotalBalance(req, res, next) {
    try {
      const balance = await accountService.getTotalBalance(req.user.id);
      return ApiResponse.success(res, 'Total balance retrieved', balance);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adjust account balance
   * POST /accounts/:id/adjust
   */
  async adjustBalance(req, res, next) {
    try {
      const { newBalance, note } = req.validatedBody;
      const account = await accountService.adjustBalance(
        req.validatedParams.id,
        req.user.id,
        newBalance,
        note
      );
      return ApiResponse.success(res, 'Account balance adjusted successfully', { account });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AccountController();
