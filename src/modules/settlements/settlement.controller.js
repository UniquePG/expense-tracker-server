const settlementsService = require('./settlement.service');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');

class SettlementsController {
  async createSettlement(req, res, next) {
    try {
      const settlement = await settlementsService.createSettlement(
        req.user.id,
        req.validatedBody
      );
      return ApiResponse.success(res, 'Settlement recorded', { settlement }, 201);
    } catch (error) {
      next(error);
    }
  }

  async getUserSettlements(req, res, next) {
    try {
      const pagination = PaginationHelper.getPrismaPagination(req.query);
      const { settlements, total } = await settlementsService.getUserSettlements(
        req.user.id,
        pagination
      );

      const meta = PaginationHelper.createPaginationMeta(
        total,
        pagination.skip / pagination.take + 1,
        pagination.take
      );

      return ApiResponse.paginated(res, 'Settlements retrieved', settlements, meta);
    } catch (error) {
      next(error);
    }
  }

  async getSettlementById(req, res, next) {
    try {
      const settlement = await settlementsService.getSettlementById(
        req.validatedParams.id,
        req.user.id
      );
      return ApiResponse.success(res, 'Settlement retrieved', { settlement });
    } catch (error) {
      next(error);
    }
  }

  async updateSettlement(req, res, next) {
    try {
      const settlement = await settlementsService.updateSettlement(
        req.validatedParams.id,
        req.user.id,
        req.body
      );
      return ApiResponse.success(res, 'Settlement updated', { settlement });
    } catch (error) {
      next(error);
    }
  }

  async deleteSettlement(req, res, next) {
    try {
      await settlementsService.deleteSettlement(
        req.validatedParams.id,
        req.user.id
      );
      return ApiResponse.success(res, 'Settlement deleted');
    } catch (error) {
      next(error);
    }
  }

  async confirmSettlement(req, res, next) {
    try {
      const settlement = await settlementsService.confirmSettlement(
        req.validatedParams.id,
        req.user.id
      );
      return ApiResponse.success(res, 'Settlement confirmed', { settlement });
    } catch (error) {
      next(error);
    }
  }

  async rejectSettlement(req, res, next) {
    try {
      const settlement = await settlementsService.rejectSettlement(
        req.validatedParams.id,
        req.user.id
      );
      return ApiResponse.success(res, 'Settlement rejected', { settlement });
    } catch (error) {
      next(error);
    }
  }

  async cancelSettlement(req, res, next) {
    try {
      const settlement = await settlementsService.cancelSettlement(
        req.validatedParams.id,
        req.user.id
      );
      return ApiResponse.success(res, 'Settlement cancelled', { settlement });
    } catch (error) {
      next(error);
    }
  }

  async remindSettlement(req, res, next) {
    try {
      await settlementsService.remindSettlement(
        req.validatedParams.id,
        req.user.id
      );
      return ApiResponse.success(res, 'Reminder sent');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettlementsController();
