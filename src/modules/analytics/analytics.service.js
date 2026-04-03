const prisma = require('../../config/database');

const toNumber = (value) => (value === null || value === undefined ? 0 : parseFloat(value));

class AnalyticsService {
  getDateRange(query = {}) {
    const period = (query.period || 'MONTH').toUpperCase();
    const now = new Date();
    let startDate;
    let endDate = new Date(now);

    if (period === 'CUSTOM') {
      if (!query.startDate || !query.endDate) {
        throw { statusCode: 400, message: 'startDate and endDate are required for CUSTOM period' };
      }

      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      startDate = new Date(now);
      if (period === 'WEEK') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'YEAR') {
        startDate.setFullYear(now.getFullYear() - 1);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw { statusCode: 400, message: 'Invalid date range' };
    }

    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate, period };
  }

  async getDashboardData(userId) {
    const [income, expense] = await Promise.all([
      prisma.accountTransaction.aggregate({
        where: {
          userId,
          type: 'INCOME'
        },
        _sum: { amount: true }
      }),
      prisma.accountTransaction.aggregate({
        where: {
          userId,
          type: { in: ['EXPENSE', 'SETTLEMENT_OUT'] }
        },
        _sum: { amount: true }
      })
    ]);

    return {
      income: toNumber(income._sum.amount),
      expense: toNumber(expense._sum.amount),
      savings: toNumber(income._sum.amount) - toNumber(expense._sum.amount)
    };
  }

  async getIncomeVsExpense(userId, query = {}) {
    const { startDate, endDate, period } = this.getDateRange(query);

    const [income, expense] = await Promise.all([
      prisma.accountTransaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          transactionDate: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: { amount: true }
      }),
      prisma.accountTransaction.aggregate({
        where: {
          userId,
          type: { in: ['EXPENSE', 'SETTLEMENT_OUT'] },
          transactionDate: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: { amount: true }
      })
    ]);

    const totalIncome = toNumber(income._sum.amount);
    const totalExpense = toNumber(expense._sum.amount);
    const savings = totalIncome - totalExpense;

    return {
      period,
      startDate,
      endDate,
      income: totalIncome,
      expense: totalExpense,
      savings,
      savingsRate: totalIncome > 0 ? parseFloat(((savings / totalIncome) * 100).toFixed(2)) : 0
    };
  }

  async getSpendingByCategory(userId, query = {}) {
    const { startDate, endDate, period } = this.getDateRange(query);

    const [splitSpending, personalSpending, categories] = await Promise.all([
      prisma.expenseSplit.groupBy({
        by: ['expenseId'],
        where: {
          userId,
          expense: {
            isDeleted: false,
            expenseDate: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        _sum: { amount: true }
      }),
      prisma.accountTransaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: 'EXPENSE',
          transactionDate: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: { amount: true }
      }),
      prisma.category.findMany({
        where: {
          OR: [{ isSystem: true }, { userId }]
        }
      })
    ]);

    const expenseIds = splitSpending.map((item) => item.expenseId);
    const expenseCategoryMap = new Map();

    if (expenseIds.length > 0) {
      const expenses = await prisma.expense.findMany({
        where: { id: { in: expenseIds } },
        select: { id: true, categoryId: true }
      });

      expenses.forEach((expense) => {
        expenseCategoryMap.set(expense.id, expense.categoryId || 'uncategorized');
      });
    }

    const totalsByCategory = new Map();

    splitSpending.forEach((item) => {
      const categoryId = expenseCategoryMap.get(item.expenseId) || 'uncategorized';
      totalsByCategory.set(categoryId, (totalsByCategory.get(categoryId) || 0) + toNumber(item._sum.amount));
    });

    personalSpending.forEach((item) => {
      const categoryId = item.categoryId || 'uncategorized';
      totalsByCategory.set(categoryId, (totalsByCategory.get(categoryId) || 0) + toNumber(item._sum.amount));
    });

    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    const totalSpend = Array.from(totalsByCategory.values()).reduce((sum, value) => sum + value, 0);

    const breakdown = Array.from(totalsByCategory.entries())
      .map(([categoryId, totalAmount]) => ({
        categoryId: categoryId === 'uncategorized' ? null : categoryId,
        category: categoryId === 'uncategorized'
          ? { id: null, name: 'Uncategorized', icon: null, color: null }
          : categoryMap.get(categoryId) || { id: categoryId, name: 'Unknown', icon: null, color: null },
        totalAmount,
        percentage: totalSpend > 0 ? parseFloat(((totalAmount / totalSpend) * 100).toFixed(2)) : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      period,
      startDate,
      endDate,
      totalSpend,
      breakdown
    };
  }

  async getMonthlyTrends(userId, months = 6) {
    const safeMonths = Math.min(24, Math.max(1, parseInt(months, 10) || 6));
    const now = new Date();
    const trends = [];

    for (let i = safeMonths - 1; i >= 0; i -= 1) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const [income, expense] = await Promise.all([
        prisma.accountTransaction.aggregate({
          where: {
            userId,
            type: 'INCOME',
            transactionDate: {
              gte: monthStart,
              lte: monthEnd
            }
          },
          _sum: { amount: true }
        }),
        prisma.accountTransaction.aggregate({
          where: {
            userId,
            type: { in: ['EXPENSE', 'SETTLEMENT_OUT'] },
            transactionDate: {
              gte: monthStart,
              lte: monthEnd
            }
          },
          _sum: { amount: true }
        })
      ]);

      const incomeAmount = toNumber(income._sum.amount);
      const expenseAmount = toNumber(expense._sum.amount);

      trends.push({
        month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
        income: incomeAmount,
        expense: expenseAmount,
        savings: incomeAmount - expenseAmount
      });
    }

    return trends;
  }

  async getFriendBalances(userId) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        status: 'ACCEPTED'
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        addressee: { select: { id: true, firstName: true, lastName: true, avatar: true } }
      }
    });

    const balances = await Promise.all(friendships.map(async (friendship) => {
      const friend = friendship.requesterId === userId ? friendship.addressee : friendship.requester;

      const [iOwe, theyOwe] = await Promise.all([
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

      const borrowed = toNumber(iOwe._sum.amount);
      const lent = toNumber(theyOwe._sum.amount);

      return {
        friend,
        lent,
        borrowed,
        netBalance: lent - borrowed
      };
    }));

    return balances;
  }

  async getGroupAnalytics(groupId, userId) {
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        status: 'ACTIVE'
      }
    });

    if (!membership) {
      throw { statusCode: 403, message: 'Not a member of this group' };
    }

    const expenses = await prisma.expense.findMany({
      where: {
        groupId,
        isDeleted: false
      },
      include: {
        paidBy: { select: { id: true, firstName: true, lastName: true } },
        category: true,
        splits: true
      }
    });

    const totalExpense = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);

    const contributions = new Map();
    expenses.forEach((expense) => {
      const payer = expense.paidBy;
      const key = payer.id;
      contributions.set(key, {
        user: payer,
        paid: (contributions.get(key)?.paid || 0) + toNumber(expense.amount)
      });
    });

    const byCategory = new Map();
    expenses.forEach((expense) => {
      const key = expense.categoryId || 'uncategorized';
      byCategory.set(key, (byCategory.get(key) || 0) + toNumber(expense.amount));
    });

    return {
      groupId,
      totalExpense,
      expenseCount: expenses.length,
      contributions: Array.from(contributions.values()).sort((a, b) => b.paid - a.paid),
      categoryBreakdown: Array.from(byCategory.entries()).map(([categoryId, amount]) => ({
        categoryId: categoryId === 'uncategorized' ? null : categoryId,
        amount
      }))
    };
  }
}

module.exports = new AnalyticsService();
