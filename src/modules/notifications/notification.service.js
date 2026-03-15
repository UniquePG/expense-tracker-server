const prisma = require('../../config/database');
const logger = require('../../utils/logger');

class NotificationsService {
  async createNotification(userId, type, title, message, data = null) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null
      }
    });

    logger.info(`Notification created for user ${userId}: ${type}`);
    return notification;
  }

  async getUserNotifications(userId, pagination, unreadOnly = false) {
    const { skip, take } = pagination;

    const where = {
      userId,
      ...(unreadOnly && { isRead: false })
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false }
      })
    ]);

    return { notifications, total, unreadCount };
  }

  async markAsRead(userId, notificationIds = null) {
    if (notificationIds && notificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    } else {
      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    }

    logger.info(`Notifications marked as read for user ${userId}`);
  }

  async deleteNotification(notificationId, userId) {
    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId
      }
    });

    logger.info(`Notification deleted: ${notificationId}`);
  }

  async getUnreadCount(userId) {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });
  }

  async getSettings(userId) {
    // Default mock settings since schema doesn't have a settings model yet
    return {
      emailNotifications: true,
      pushNotifications: true,
      expenseUpdates: true,
      friendRequests: true,
      settlements: true
    };
  }

  async updateSettings(userId, settingsData) {
    // Mock update: return the merged data
    logger.info(`Notification settings updated for user ${userId}`);
    return {
      emailNotifications: true,
      pushNotifications: true,
      expenseUpdates: true,
      friendRequests: true,
      settlements: true,
      ...settingsData
    };
  }
}

module.exports = new NotificationsService();
