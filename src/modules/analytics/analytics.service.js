const prisma = require('../../config/database');
const { getUserById } = require('../users/user.service');

class AnalyticsService {
  async getDashboardData(userId) {
    const [totalLent, totalBorrowed] = await Promise.all([
      prisma.expenseSplit.aggregate({
        where: {
          expense: { paidById: userId },
          userId: { not: userId },
          isSettled: false
        },
        _sum: { amount: true }
      }),
      prisma.expenseSplit.aggregate({
        where: {
          userId,
          expense: { paidById: { not: userId } },
          isSettled: false
        },
        _sum: { amount: true }
      })
    ]);

    const lentAmount = totalLent._sum.amount ? parseFloat(totalLent._sum.amount) : 0;
    const borrowedAmount = totalBorrowed._sum.amount ? parseFloat(totalBorrowed._sum.amount) : 0;

    const user = await getUserById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    return {
      totalBalance: lentAmount - borrowedAmount,
      totalLent: lentAmount,
      totalBorrowed: borrowedAmount,
      currency: user.currency
    };
  }

  async getSpendingByCategory(userId) {
    const categoryBreakdown = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: { paidById: userId },
      _sum: { amount: true },
      _count: { id: true }
    });

    const categoryIds = categoryBreakdown.map(c => c.categoryId).filter(Boolean);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } }
    });

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    return categoryBreakdown.map(item => ({
      category: categoryMap.get(item.categoryId) || { name: 'Uncategorized', icon: '?', color: '#999' },
      totalAmount: item._sum.amount || 0,
      count: item._count.id
    }));
  }

  async getIncomeVsExpense(userId) {
    // "Income" here can be mapped to what others paid you (settlements received) or what you lent.
    // Let's use total expenses paid by user vs total expenses user owes to others this month.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const expensesPaids = await prisma.expense.aggregate({
      where: { paidById: userId, expenseDate: { gte: startOfMonth } },
      _sum: { amount: true }
    });

    const expensesOwed = await prisma.expenseSplit.aggregate({
      where: { userId, expense: { expenseDate: { gte: startOfMonth } } },
      _sum: { amount: true }
    });

    return {
      month: startOfMonth.toISOString().substring(0, 7),
      totalPaidOut: expensesPaids._sum.amount || 0,
      yourShare: expensesOwed._sum.amount || 0
    };
  }

  async getMonthlyTrends(userId) {
    const expenses = await prisma.expenseSplit.findMany({
      where: { userId },
      include: { expense: true }
    });

    const monthlyMap = {};

    expenses.forEach(split => {
      const month = split.expense.expenseDate.toISOString().substring(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = 0;
      monthlyMap[month] += parseFloat(split.amount);
    });

    return Object.entries(monthlyMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, totalAmount]) => ({ month, totalAmount }));
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

    const balances = await Promise.all(friendships.map(async f => {
      const isRequester = f.requesterId === userId;
      const friend = isRequester ? f.addressee : f.requester;
      
      const iOwe = await prisma.expenseSplit.aggregate({
        where: { userId, expense: { paidById: friend.id }, isSettled: false },
        _sum: { amount: true }
      });

      const theyOwe = await prisma.expenseSplit.aggregate({
        where: { userId: friend.id, expense: { paidById: userId }, isSettled: false },
        _sum: { amount: true }
      });

      const iOweAmount = iOwe._sum.amount ? parseFloat(iOwe._sum.amount) : 0;
      const theyOweAmount = theyOwe._sum.amount ? parseFloat(theyOwe._sum.amount) : 0;
      const net = theyOweAmount - iOweAmount;

      return {
        friend,
        lent: theyOweAmount,
        borrowed: iOweAmount,
        netBalance: net
      };
    }));

    return balances.filter(b => b.netBalance !== 0);
  }
}

module.exports = new AnalyticsService();
