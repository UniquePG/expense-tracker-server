const invitesService = require('./invite.service');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');

class InvitesController {
  async createInvite(req, res, next) {
    try {
      const invite = await invitesService.createInvite(req.user.id, req.validatedBody);
      return ApiResponse.success(res, 'Invite sent', { invite }, 201);
    } catch (error) {
      next(error);
    }
  }

  async getUserInvites(req, res, next) {
    try {
      const pagination = PaginationHelper.getPrismaPagination(req.query);
      const { invites, total } = await invitesService.getUserInvites(req.user.id, pagination);

      const meta = PaginationHelper.createPaginationMeta(
        total,
        pagination.skip / pagination.take + 1,
        pagination.take
      );

      return ApiResponse.paginated(res, 'Invites retrieved', invites, meta);
    } catch (error) {
      next(error);
    }
  }

  async getPendingInvites(req, res, next) {
    try {
      const invites = await invitesService.getPendingInvites(req.user.id);
      return ApiResponse.success(res, 'Pending invites retrieved', { invites });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InvitesController();
