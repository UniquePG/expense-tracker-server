const friendsService = require('./friends.service');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');

class FriendsController {
  // Legacy: send request by userId
  async sendRequest(req, res, next) {
    try {
      const { addresseeId } = req.validatedBody;
      const friendship = await friendsService.sendFriendRequest(req.user.id, addresseeId);
      return ApiResponse.success(res, 'Friend request sent', { friendship }, 201);
    } catch (error) {
      next(error);
    }
  }

  // New: send request by email (per API spec)
  async sendRequestByEmail(req, res, next) {
    try {
      const { email } = req.validatedBody;
      const result = await friendsService.sendFriendRequestByEmail(req.user.id, email);
      return ApiResponse.success(res, 'Friend request sent', result, 201);
    } catch (error) {
      next(error);
    }
  }

  // Accept a friend request by requestId (URL param)
  async acceptRequest(req, res, next) {
    try {
      const friendship = await friendsService.respondToRequest(
        req.params.requestId,
        req.user.id,
        'accept'
      );
      return ApiResponse.success(res, 'Friend request accepted', { friendship });
    } catch (error) {
      next(error);
    }
  }

  // Reject a friend request by requestId (URL param)
  async rejectRequest(req, res, next) {
    try {
      const friendship = await friendsService.respondToRequest(
        req.params.requestId,
        req.user.id,
        'reject'
      );
      return ApiResponse.success(res, 'Friend request rejected', { friendship });
    } catch (error) {
      next(error);
    }
  }

  // Legacy: respond using body { friendshipId, action }
  async respondRequest(req, res, next) {
    try {
      const { friendshipId, action } = req.validatedBody;
      const friendship = await friendsService.respondToRequest(friendshipId, req.user.id, action);
      return ApiResponse.success(res, `Friend request ${action}ed`, { friendship });
    } catch (error) {
      next(error);
    }
  }

  // Legacy: remove via POST body
  async removeFriend(req, res, next) {
    try {
      const { friendId } = req.validatedBody;
      await friendsService.removeFriend(req.user.id, friendId);
      return ApiResponse.success(res, 'Friend removed successfully');
    } catch (error) {
      next(error);
    }
  }

  // New: remove via DELETE /:friendId (per API spec)
  async removeFriendById(req, res, next) {
    try {
      await friendsService.removeFriend(req.user.id, req.params.friendId);
      return ApiResponse.success(res, 'Friend removed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getFriends(req, res, next) {
    try {
      const pagination = PaginationHelper.getPrismaPagination(req.query);
      const { friends, total } = await friendsService.getFriends(req.user.id, pagination);

      const meta = PaginationHelper.createPaginationMeta(
        total,
        pagination.skip / pagination.take + 1,
        pagination.take
      );

      return ApiResponse.paginated(res, 'Friends retrieved', friends, meta);
    } catch (error) {
      next(error);
    }
  }

  // New: get combined incoming + outgoing requests (per API spec)
  async getFriendRequests(req, res, next) {
    try {
      const requests = await friendsService.getAllFriendRequests(req.user.id);
      return ApiResponse.success(res, 'Friend requests retrieved', requests);
    } catch (error) {
      next(error);
    }
  }

  async getPendingRequests(req, res, next) {
    try {
      const pagination = PaginationHelper.getPrismaPagination(req.query);
      const { requests, total } = await friendsService.getPendingRequests(req.user.id, pagination);

      const meta = PaginationHelper.createPaginationMeta(
        total,
        pagination.skip / pagination.take + 1,
        pagination.take
      );

      return ApiResponse.paginated(res, 'Pending requests retrieved', requests, meta);
    } catch (error) {
      next(error);
    }
  }

  async getSentRequests(req, res, next) {
    try {
      const pagination = PaginationHelper.getPrismaPagination(req.query);
      const { requests, total } = await friendsService.getSentRequests(req.user.id, pagination);

      const meta = PaginationHelper.createPaginationMeta(
        total,
        pagination.skip / pagination.take + 1,
        pagination.take
      );

      return ApiResponse.paginated(res, 'Sent requests retrieved', requests, meta);
    } catch (error) {
      next(error);
    }
  }

  // New: get balances with all friends (per API spec)
  async getFriendBalances(req, res, next) {
    try {
      const balances = await friendsService.getFriendBalances(req.user.id);
      return ApiResponse.success(res, 'Friend balances retrieved', balances);
    } catch (error) {
      next(error);
    }
  }

  // New: get single friend details (per API spec)
  async getFriendDetails(req, res, next) {
    try {
      const details = await friendsService.getFriendDetails(req.user.id, req.params.friendId);
      return ApiResponse.success(res, 'Friend details retrieved', details);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FriendsController();
