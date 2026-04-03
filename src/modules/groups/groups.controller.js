const groupsService = require('./groups.service');
const cloudinaryService = require('../../utils/cloudinary');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');
const fs = require('fs');
const logger = require('../../utils/logger');

class GroupsController {
  async createGroup(req, res, next) {
    try {
      const group = await groupsService.createGroup(req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Group created successfully', { group }, 201);
    } catch (error) {
      next(error);
    }
  }

  async getGroupById(req, res, next) {
    try {
      const group = await groupsService.getGroupById(parseInt(req.validatedParams.id), req.user.id);
      return ApiResponse.success(res, 'Group retrieved', { group });
    } catch (error) {
      next(error);
    }
  }

  async getUserGroups(req, res, next) {
    try {
      const pagination = PaginationHelper.getPrismaPagination(req.query);
      const { groups, total } = await groupsService.getUserGroups(req.user.id, pagination);

      const meta = PaginationHelper.createPaginationMeta(
        total,
        pagination.skip / pagination.take + 1,
        pagination.take
      );

      return ApiResponse.paginated(res, 'Groups retrieved', groups, meta);
    } catch (error) {
      next(error);
    }
  }

  async updateGroup(req, res, next) {
    try {
      const group = await groupsService.updateGroup(
        req.validatedParams.id,
        req.user.id,
        req.validatedBody
      );
      return ApiResponse.success(res, 'Group updated', { group });
    } catch (error) {
      next(error);
    }
  }

  async deleteGroup(req, res, next) {
    try {
      await groupsService.deleteGroup(req.validatedParams.id, req.user.id);
      return ApiResponse.success(res, 'Group deleted');
    } catch (error) {
      next(error);
    }
  }

  async addMember(req, res, next) {
    try {
      const member = await groupsService.addMember(
        req.validatedParams.id,
        req.user.id,
        req.validatedBody
      );
      return ApiResponse.success(res, 'Member added', { member }, 201);
    } catch (error) {
      next(error);
    }
  }

  async getGroupMembers(req, res, next) {
    try {
      const members = await groupsService.getGroupMembers(
        parseInt(req.validatedParams.id),
        req.user.id
      );
      return ApiResponse.success(res, 'Group members retrieved', { members });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      await groupsService.removeMember(
        req.validatedParams.id,
        req.user.id,
        req.validatedBody.userId
      );
      return ApiResponse.success(res, 'Member removed');
    } catch (error) {
      next(error);
    }
  }

  async removeMemberById(req, res, next) {
    try {
      await groupsService.removeMember(
        req.validatedParams.id,
        req.user.id,
        req.validatedParams.memberId
      );
      return ApiResponse.success(res, 'Member removed');
    } catch (error) {
      next(error);
    }
  }

  async toggleMemberAdmin(req, res, next) {
    try {
      const member = await groupsService.toggleMemberAdmin(
        req.validatedParams.id,
        req.user.id,
        req.params.memberId,
        req.validatedBody.isAdmin
      );

      return ApiResponse.success(res, 'Member admin status updated', { member });
    } catch (error) {
      next(error);
    }
  }

  async getGroupBalances(req, res, next) {
    try {
      const balances = await groupsService.getGroupBalances(
        parseInt(req.validatedParams.id),
        req.user.id
      );
      return ApiResponse.success(res, 'Group balances retrieved', { balances });
    } catch (error) {
      next(error);
    }
  }

  async getGroupExpenses(req, res, next) {
    try {
      const pagination = PaginationHelper.getPrismaPagination(req.query);
      const { expenses, total } = await groupsService.getGroupExpenses(
        parseInt(req.validatedParams.id),
        req.user.id,
        pagination
      );
      const meta = PaginationHelper.createPaginationMeta(
        total,
        pagination.skip / pagination.take + 1,
        pagination.take
      );
      return ApiResponse.paginated(res, 'Group expenses retrieved', expenses, meta);
    } catch (error) {
      next(error);
    }
  }

  async settleGroup(req, res, next) {
    try {
      const result = await groupsService.settleGroup(
        req.validatedParams.id,
        req.user.id
      );
      return ApiResponse.success(res, 'Group settled successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async uploadImage(req, res, next) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return ApiResponse.error(res, 'No file provided', 400);
      }

      // Get group to verify membership and check for existing image
      const group = await groupsService.getGroupById(req.validatedParams.id, req.user.id);

      // Upload to Cloudinary
      const uploadResult = await cloudinaryService.uploadFile(
        req.file.path,
        'splitwise/groups',
        `${req.validatedParams.id}-image`
      );

      // Clean up local file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      // Delete old image from Cloudinary if it exists
      if (group.image) {
        const oldPublicId = cloudinaryService.extractPublicId(group.image);
        if (oldPublicId) {
          await cloudinaryService.deleteFile(oldPublicId).catch(err => {
            logger.warn(`Failed to delete old group image: ${err.message}`);
          });
        }
      }

      // Update group with new image URL
      const updatedGroup = await groupsService.updateGroup(
        req.validatedParams.id,
        req.user.id,
        { image: uploadResult.url }
      );

      return ApiResponse.success(res, 'Group image uploaded successfully', {
        group: updatedGroup,
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

  async deleteImage(req, res, next) {
    try {
      const group = await groupsService.getGroupById(req.validatedParams.id, req.user.id);

      if (!group.image) {
        return ApiResponse.error(res, 'No image to delete', 400);
      }

      // Extract public ID and delete from Cloudinary
      const publicId = cloudinaryService.extractPublicId(group.image);
      if (publicId) {
        await cloudinaryService.deleteFile(publicId);
      }

      // Remove image from group
      const updatedGroup = await groupsService.updateGroup(
        req.validatedParams.id,
        req.user.id,
        { image: null }
      );

      return ApiResponse.success(res, 'Group image deleted successfully', {
        group: updatedGroup
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GroupsController();
