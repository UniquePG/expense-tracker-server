const notificationsService = require('./notification.service');
const ApiResponse = require('../../utils/response');
const PaginationHelper = require('../../utils/pagination');

class NotificationsController {
  async getUserNotifications(req, res, next) {
    try {
      const pagination = PaginationHelper.getPrismaPagination(req.query);
      const unreadOnly = req.query.unread === 'true';

      const { notifications, total, unreadCount } = await notificationsService.getUserNotifications(
        req.user.id,
        pagination,
        unreadOnly
      );

      const meta = PaginationHelper.createPaginationMeta(
        total,
        pagination.skip / pagination.take + 1,
        pagination.take
      );

      return ApiResponse.paginated(res, 'Notifications retrieved', notifications, {
        ...meta,
        unreadCount
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { notificationIds } = req.validatedBody || {};
      await notificationsService.markAsRead(req.user.id, notificationIds);
      return ApiResponse.success(res, 'Notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      await notificationsService.deleteNotification(req.params.id, req.user.id);
      return ApiResponse.success(res, 'Notification deleted');
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const count = await notificationsService.getUnreadCount(req.user.id);
      return ApiResponse.success(res, 'Unread count retrieved', { count });
    } catch (error) {
      next(error);
    }
  }

  async markSingleAsRead(req, res, next) {
    try {
      await notificationsService.markAsRead(req.user.id, [req.params.id]);
      return ApiResponse.success(res, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      await notificationsService.markAsRead(req.user.id, null);
      return ApiResponse.success(res, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  async getSettings(req, res, next) {
    try {
      const settings = await notificationsService.getSettings(req.user.id);
      return ApiResponse.success(res, 'Notification settings retrieved', { settings });
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const settings = await notificationsService.updateSettings(req.user.id, req.body);
      return ApiResponse.success(res, 'Notification settings updated', { settings });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationsController();
