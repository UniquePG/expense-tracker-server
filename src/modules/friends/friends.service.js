const prisma = require('../../config/database');
const logger = require('../../utils/logger');

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatar: true
};

class FriendsService {
  async sendFriendRequest(requesterId, addresseeId) {
    if (requesterId === addresseeId) {
      throw { statusCode: 400, message: 'Cannot send friend request to yourself' };
    }

    const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });
    if (!addressee) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId }
        ]
      }
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'ACCEPTED') {
        throw { statusCode: 409, message: 'Already friends with this user' };
      }
      if (existingFriendship.status === 'PENDING') {
        throw { statusCode: 409, message: 'Friend request already pending' };
      }
    }

    const friendship = await prisma.friendship.create({
      data: { requesterId, addresseeId, status: 'PENDING' },
      include: {
        requester: { select: userSelect },
        addressee: { select: userSelect }
      }
    });

    logger.info(`Friend request sent: ${requesterId} -> ${addresseeId}`);
    return friendship;
  }

  async sendFriendRequestByEmail(requesterId, email) {
    const addressee = await prisma.user.findUnique({ where: { email } });
    if (!addressee) {
      throw { statusCode: 404, message: 'User not found with this email' };
    }

    if (requesterId === addressee.id) {
      throw { statusCode: 400, message: 'Cannot send friend request to yourself' };
    }

    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: addressee.id },
          { requesterId: addressee.id, addresseeId: requesterId }
        ]
      }
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'ACCEPTED') {
        throw { statusCode: 409, message: 'Friend request already pending or users are already friends' };
      }
      if (existingFriendship.status === 'PENDING') {
        throw { statusCode: 409, message: 'Friend request already pending or users are already friends' };
      }
    }

    const friendship = await prisma.friendship.create({
      data: { requesterId, addresseeId: addressee.id, status: 'PENDING' },
      include: {
        requester: { select: userSelect },
        addressee: { select: userSelect }
      }
    });

    logger.info(`Friend request sent by email: ${requesterId} -> ${addressee.id}`);
    return {
      id: friendship.id,
      status: friendship.status,
      createdAt: friendship.createdAt
    };
  }

  async respondToRequest(friendshipId, addresseeId, action) {
    const friendship = await prisma.friendship.findFirst({
      where: { id: friendshipId, addresseeId, status: 'PENDING' }
    });

    if (!friendship) {
      throw { statusCode: 404, message: 'Friend request not found' };
    }

    const newStatus = action === 'accept' ? 'ACCEPTED' : 'REJECTED';

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: newStatus },
      include: {
        requester: { select: userSelect },
        addressee: { select: userSelect }
      }
    });

    logger.info(`Friend request ${action}ed: ${friendshipId}`);
    return updated;
  }

  async removeFriend(userId, friendId) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId }
        ],
        status: 'ACCEPTED'
      }
    });

    if (!friendship) {
      throw { statusCode: 404, message: 'Friendship not found' };
    }

    await prisma.friendship.delete({ where: { id: friendship.id } });
    logger.info(`Friendship removed: ${userId} <-> ${friendId}`);
  }

  async getFriends(userId, pagination) {
    const { skip, take } = pagination;

    const [friendships, total] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          OR: [{ requesterId: userId }, { addresseeId: userId }],
          status: 'ACCEPTED'
        },
        include: {
          requester: { select: userSelect },
          addressee: { select: userSelect }
        },
        skip,
        take,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.friendship.count({
        where: {
          OR: [{ requesterId: userId }, { addresseeId: userId }],
          status: 'ACCEPTED'
        }
      })
    ]);

    const friends = friendships.map(f => {
      const isRequester = f.requesterId === userId;
      const friend = isRequester ? f.addressee : f.requester;
      return {
        ...friend,
        friendSince: f.updatedAt
      };
    });

    return { friends, total };
  }

  async getAllFriendRequests(userId) {
    const requests = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'PENDING' },
          { addresseeId: userId, status: 'PENDING' }
        ]
      },
      include: {
        requester: { select: userSelect },
        addressee: { select: userSelect }
      },
      orderBy: { createdAt: 'desc' }
    });

    return requests.map(r => ({
      id: r.id,
      fromUser: r.requester,
      toUser: r.addressee,
      status: r.status.toLowerCase(),
      direction: r.requesterId === userId ? 'outgoing' : 'incoming',
      createdAt: r.createdAt
    }));
  }

  async getPendingRequests(userId, pagination) {
    const { skip, take } = pagination;

    const [requests, total] = await Promise.all([
      prisma.friendship.findMany({
        where: { addresseeId: userId, status: 'PENDING' },
        include: { requester: { select: userSelect } },
        skip,
        take
      }),
      prisma.friendship.count({ where: { addresseeId: userId, status: 'PENDING' } })
    ]);

    return { requests, total };
  }

  async getSentRequests(userId, pagination) {
    const { skip, take } = pagination;

    const [requests, total] = await Promise.all([
      prisma.friendship.findMany({
        where: { requesterId: userId, status: 'PENDING' },
        include: { addressee: { select: userSelect } },
        skip,
        take
      }),
      prisma.friendship.count({ where: { requesterId: userId, status: 'PENDING' } })
    ]);

    return { requests, total };
  }

  async getFriendBalances(userId) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        status: 'ACCEPTED'
      },
      include: {
        requester: { select: userSelect },
        addressee: { select: userSelect }
      }
    });

    const balances = await Promise.all(friendships.map(async f => {
      const isRequester = f.requesterId === userId;
      const friend = isRequester ? f.addressee : f.requester;
      const friendId = friend.id;

      // What I owe friend
      const iOwe = await prisma.expenseSplit.aggregate({
        where: {
          userId,
          expense: { paidById: friendId },
          isSettled: false
        },
        _sum: { amount: true }
      });

      // What friend owes me
      const theyOwe = await prisma.expenseSplit.aggregate({
        where: {
          userId: friendId,
          expense: { paidById: userId },
          isSettled: false
        },
        _sum: { amount: true }
      });

      const iOweAmount = iOwe._sum.amount || 0;
      const theyOweAmount = theyOwe._sum.amount || 0;
      const net = theyOweAmount - iOweAmount;

      return {
        friendId,
        friend,
        amount: Math.abs(net),
        currency: 'USD',
        youOwe: net < 0,
        lastActivity: f.updatedAt
      };
    }));

    return balances;
  }

  async getFriendDetails(userId, friendId) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId }
        ],
        status: 'ACCEPTED'
      }
    });

    if (!friendship) {
      throw { statusCode: 404, message: 'Friend not found' };
    }

    const friend = await prisma.user.findUnique({
      where: { id: friendId },
      select: userSelect
    });

    if (!friend) {
      throw { statusCode: 404, message: 'User not found' };
    }

    // Expenses together
    const expenseCount = await prisma.expense.count({
      where: {
        OR: [
          { paidById: userId, splits: { some: { userId: friendId } } },
          { paidById: friendId, splits: { some: { userId } } }
        ]
      }
    });

    // Balance
    const iOwe = await prisma.expenseSplit.aggregate({
      where: { userId, expense: { paidById: friendId }, isSettled: false },
      _sum: { amount: true }
    });
    const theyOwe = await prisma.expenseSplit.aggregate({
      where: { userId: friendId, expense: { paidById: userId }, isSettled: false },
      _sum: { amount: true }
    });

    const iOweAmount = iOwe._sum.amount || 0;
    const theyOweAmount = theyOwe._sum.amount || 0;
    const net = theyOweAmount - iOweAmount;

    return {
      ...friend,
      friendSince: friendship.updatedAt,
      totalExpensesTogether: expenseCount,
      balance: {
        amount: Math.abs(net),
        currency: 'USD',
        youOwe: net < 0
      }
    };
  }
}

module.exports = new FriendsService();
