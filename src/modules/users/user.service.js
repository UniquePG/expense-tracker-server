const prisma = require('../../config/database');
const logger = require('../../utils/logger');

class UserService {
  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        currency: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    return user;
  }

  async updateProfile(userId, updateData) {
  console.log('updateData :', updateData);
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        currency: true,
        updatedAt: true
      }
    });

    logger.info(`User profile updated: ${userId}`);
    return user;
  }

  async searchUsers(query, currentUserId, pagination) {
    const { skip, take } = pagination;

    const where = {
      AND: [
        {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } }
          ]
        },
        { id: { not: currentUserId } },
        { isActive: true }
      ]
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true
        },
        skip,
        take
      }),
      prisma.user.count({ where })
    ]);

    return { users, total };
  }

  async getUserStats(userId) {
    const [
      totalExpenses,
      totalSettlements,
      pendingSplits
    ] = await Promise.all([
      prisma.expense.count({
        where: { paidById: userId }
      }),
      prisma.settlement.count({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId }
          ]
        }
      }),
      prisma.expenseSplit.count({
        where: {
          userId,
          isSettled: false
        }
      })
    ]);

    return {
      totalExpenses,
      totalSettlements,
      pendingSplits
    };
  }
  async deleteAccount(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    logger.info(`Account deactivated: ${userId}`);
  }
}

module.exports = new UserService();
