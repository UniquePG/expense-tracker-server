const groupsService = require('./groups.service');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');

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
      const group = await groupsService.getGroupById(req.validatedParams.id, req.user.id);
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
        req.validatedBody.userId
      );
      return ApiResponse.success(res, 'Member added', { member }, 201);
    } catch (error) {
      next(error);
    }
  }

  async getGroupMembers(req, res, next) {
    try {
      const members = await groupsService.getGroupMembers(
        req.validatedParams.id,
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
        req.params.userId
      );
      return ApiResponse.success(res, 'Member removed');
    } catch (error) {
      next(error);
    }
  }

  async getGroupBalances(req, res, next) {
    try {
      const balances = await groupsService.getGroupBalances(
        req.validatedParams.id,
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
        req.validatedParams.id,
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
}

module.exports = new GroupsController();
