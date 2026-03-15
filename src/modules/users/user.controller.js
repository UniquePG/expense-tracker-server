const userService = require('./user.service');
const authService = require('../auth/auth.service');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');

class UserController {
  async getProfile(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id);
      return ApiResponse.success(res, 'Profile retrieved successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Profile updated successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req, res, next) {
    try {
      await userService.deleteAccount(req.user.id);
      return ApiResponse.success(res, 'Account deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(req, res, next) {
    try {
      const { avatar } = req.body;
      if (!avatar) {
        return ApiResponse.error(res, 'Avatar is required', 400);
      }
      const user = await userService.updateProfile(req.user.id, { avatar });
      return ApiResponse.success(res, 'Avatar updated successfully', { avatar: user.avatar });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.validatedBody;
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      return ApiResponse.success(res, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserById(req.validatedParams.id);
      return ApiResponse.success(res, 'User retrieved successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req, res, next) {
    try {
      // Support both 'q' (spec) and 'query' (legacy) params
      const query = req.query.q || req.query.query || '';
      const pagination = PaginationHelper.getPrismaPagination(req.query);

      const { users, total } = await userService.searchUsers(
        query,
        req.user.id,
        pagination
      );

      const meta = PaginationHelper.createPaginationMeta(
        total,
        pagination.skip / pagination.take + 1,
        pagination.take
      );

      return ApiResponse.paginated(res, 'Users retrieved successfully', users, meta);
    } catch (error) {
      next(error);
    }
  }

  async getUserStats(req, res, next) {
    try {
      const stats = await userService.getUserStats(req.user.id);
      return ApiResponse.success(res, 'User stats retrieved', { stats });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
