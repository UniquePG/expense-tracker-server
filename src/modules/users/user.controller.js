const userService = require('./user.service');
const authService = require('../auth/auth.service');
const cloudinaryService = require('../../utils/cloudinary');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');
const fs = require('fs');
const logger = require('../../utils/logger');

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
      // Check if file was uploaded
      if (!req.file) {
        return ApiResponse.error(res, 'No file provided', 400);
      }

      // Get current user to check for existing avatar
      const currentUser = await userService.getUserById(req.user.id);

      // Upload to Cloudinary
      const uploadResult = await cloudinaryService.uploadFile(
        req.file.path,
        'splitwise/avatars',
        `${req.user.id}-avatar`
      );

      // Clean up local file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      // Delete old avatar from Cloudinary if it exists
      if (currentUser.avatar) {
        const oldPublicId = cloudinaryService.extractPublicId(currentUser.avatar);
        if (oldPublicId) {
          await cloudinaryService.deleteFile(oldPublicId).catch(err => {
            logger.warn(`Failed to delete old avatar: ${err.message}`);
          });
        }
      }

      // Update user profile with new avatar URL
      const user = await userService.updateProfile(req.user.id, {
        avatar: uploadResult.url
      });

      return ApiResponse.success(res, 'Avatar updated successfully', {
        avatar: user.avatar,
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

  async deleteAvatar(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id);

      if (!user.avatar) {
        return ApiResponse.error(res, 'No avatar to delete', 400);
      }

      // Extract public ID and delete from Cloudinary
      const publicId = cloudinaryService.extractPublicId(user.avatar);
      if (publicId) {
        await cloudinaryService.deleteFile(publicId);
      }

      // Remove avatar from user profile
      const updatedUser = await userService.updateProfile(req.user.id, {
        avatar: null
      });

      return ApiResponse.success(res, 'Avatar deleted successfully', {
        avatar: updatedUser.avatar
      });
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
