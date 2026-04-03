const prisma = require('../../config/database');
const logger = require('../../utils/logger');

const toNumber = (value) => (value === null || value === undefined ? 0 : parseFloat(value));

class DashboardService {
  async getDashboardSummary(userId, filters = {}) {
    const { startDate, endDate, groupId } = filters;

    const expenseDateFilter = {};
    if (startDate) {
      expenseDateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      expenseDateFilter.lte = new Date(endDate);
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      user,
      totalBalanceAgg,
      totalExpensesAgg,
      totalIncomeAgg,
      recentTransactions,
      groups,
      pendingSettlements,
      unreadNotifications,
      friendBalances
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          currency: true,
          accounts: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              type: true,
              balance: true,
              currency: true
            }
          }
        }
      }),
      prisma.account.aggregate({
        where: {
          userId,
          isActive: true
        },
        _sum: { balance: true }
      }),
      prisma.accountTransaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          ...(Object.keys(expenseDateFilter).length > 0 ? { transactionDate: expenseDateFilter } : {})
        },
        _sum: { amount: true }
      }),
      prisma.accountTransaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          ...(Object.keys(expenseDateFilter).length > 0 ? { transactionDate: expenseDateFilter } : {})
        },
        _sum: { amount: true }
      }),
      prisma.accountTransaction.findMany({
        where: { userId },
        orderBy: { transactionDate: 'desc' },
        take: 10,
        include: {
          account: {
            select: {
              id: true,
              name: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true
            }
          }
        }
      }),
      prisma.group.findMany({
        where: {
          ...(groupId ? { id: groupId } : {}),
          status: { not: 'DELETED' },
          members: {
            some: {
              userId,
              status: 'ACTIVE'
            }
          }
        },
        include: {
          members: {
            where: { status: 'ACTIVE' },
            select: { id: true }
          },
          expenses: {
            where: {
              isDeleted: false,
              ...(Object.keys(expenseDateFilter).length > 0 ? { expenseDate: expenseDateFilter } : {})
            },
            select: { amount: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      }),
      prisma.settlement.count({
        where: {
          toUserId: userId,
          status: 'PENDING'
        }
      }),
      prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      }),
      this.getFriendBalances(userId)
    ]);

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const monthStats = await Promise.all([
      prisma.accountTransaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          transactionDate: { gte: startOfMonth }
        },
        _sum: { amount: true }
      }),
      prisma.accountTransaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          transactionDate: { gte: startOfMonth }
        },
        _sum: { amount: true }
      })
    ]);

    const [monthIncomeAgg, monthExpenseAgg] = monthStats;

    const summary = {
      overview: {
        totalBalance: toNumber(totalBalanceAgg._sum.balance).toFixed(2),
        totalExpenses: toNumber(totalExpensesAgg._sum.amount).toFixed(2),
        totalIncome: toNumber(totalIncomeAgg._sum.amount).toFixed(2),
        currency: user.currency || 'INR'
      },
      accounts: {
        count: user.accounts.length,
        list: user.accounts.map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          balance: toNumber(account.balance).toFixed(2),
          currency: account.currency
        }))
      },
      groups: {
        count: groups.length,
        list: groups.map((group) => ({
          id: group.id,
          name: group.name,
          memberCount: group.members.length,
          totalExpenses: group.expenses
            .reduce((sum, expense) => sum + toNumber(expense.amount), 0)
            .toFixed(2)
        }))
      },
      friendBalances,
      recentTransactions: recentTransactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: toNumber(transaction.amount).toFixed(2),
        account: transaction.account?.name || null,
        category: transaction.category || null,
        description: transaction.description,
        date: transaction.transactionDate
      })),
      pendingSettlements,
      unreadNotifications,
      currentMonthStats: {
        income: toNumber(monthIncomeAgg._sum.amount).toFixed(2),
        expense: toNumber(monthExpenseAgg._sum.amount).toFixed(2)
      }
    };

    logger.info(`Dashboard summary retrieved for user ${userId}`);
    return summary;
  }

  async getFriendBalances(userId) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        status: 'ACCEPTED'
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        addressee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    const balances = await Promise.all(friendships.map(async (friendship) => {
      const friend = friendship.requesterId === userId ? friendship.addressee : friendship.requester;

      const [iOweAgg, theyOweAgg] = await Promise.all([
        prisma.expenseSplit.aggregate({
          where: {
            userId,
            isSettled: false,
            expense: {
              paidById: friend.id,
              isDeleted: false
            }
          },
          _sum: { amount: true }
        }),
        prisma.expenseSplit.aggregate({
          where: {
            userId: friend.id,
            isSettled: false,
            expense: {
              paidById: userId,
              isDeleted: false
            }
          },
          _sum: { amount: true }
        })
      ]);

      const iOwe = toNumber(iOweAgg._sum.amount);
      const theyOwe = toNumber(theyOweAgg._sum.amount);
      const net = theyOwe - iOwe;

      return {
        friendId: friend.id,
        friend,
        amount: Math.abs(net).toFixed(2),
        youOwe: net < 0
      };
    }));

    return balances.filter((balance) => parseFloat(balance.amount) > 0);
  }

  async getDashboardStats(userId) {
    const stats = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            accounts: {
              where: { isActive: true }
            },
            groupMemberships: {
              where: { status: 'ACTIVE' }
            },
            expenses: {
              where: { isDeleted: false }
            }
          }
        }
      }
    });

    if (!stats) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const friendCount = await prisma.friendship.count({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        status: 'ACCEPTED'
      }
    });

    return {
      accountCount: stats._count.accounts,
      groupCount: stats._count.groupMemberships,
      expenseCount: stats._count.expenses,
      friendCount
    };
  }

  async getSpendingTrends(userId, months = 6) {
    const safeMonths = Math.min(24, Math.max(1, parseInt(months, 10) || 6));
    const trends = [];
    const now = new Date();

    for (let i = safeMonths - 1; i >= 0; i -= 1) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const monthExpenses = await prisma.accountTransaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          transactionDate: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: { amount: true }
      });

      trends.push({
        month: startDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
        total: toNumber(monthExpenses._sum.amount).toFixed(2)
      });
    }

    return trends;
  }
}

module.exports = new DashboardService();
