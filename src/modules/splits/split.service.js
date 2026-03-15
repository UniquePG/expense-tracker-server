const prisma = require('../../config/database');
const logger = require('../../utils/logger');

// Convert dollars to cents for precision
const toCents = (amount) => Math.round(parseFloat(amount) * 100);
const toDollars = (cents) => (cents / 100).toFixed(2);

class SplitsService {
  /**
   * Get all balances for a user - who owes them and who they owe
   */
  async getUserBalances(userId) {
    // Get all unsettled splits where user is the payer (others owe user)
    const owedToUser = await prisma.expenseSplit.findMany({
      where: {
        expense: { paidById: userId },
        userId: { not: userId },
        isSettled: false
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        expense: {
          select: {
            id: true,
            description: true,
            amount: true,
            expenseDate: true
          }
        }
      }
    });

    // Get all unsettled splits where user owes others
    const userOwes = await prisma.expenseSplit.findMany({
      where: {
        userId,
        isSettled: false,
        expense: {
          paidById: { not: userId }
        }
      },
      include: {
        expense: {
          include: {
            paidBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    // Aggregate by person - OTHERS OWE USER
    const balancesOwedToUser = {};
    owedToUser.forEach(split => {
      const otherUserId = split.userId;
      if (!balancesOwedToUser[otherUserId]) {
        balancesOwedToUser[otherUserId] = {
          user: split.user,
          totalAmount: 0,
          splits: []
        };
      }
      balancesOwedToUser[otherUserId].totalAmount += parseFloat(split.amount);
      balancesOwedToUser[otherUserId].splits.push({
        splitId: split.id,
        amount: split.amount,
        expense: split.expense
      });
    });

    // Aggregate by person - USER OWES OTHERS
    const balancesUserOwes = {};
    userOwes.forEach(split => {
      const otherUserId = split.expense.paidById;
      if (!balancesUserOwes[otherUserId]) {
        balancesUserOwes[otherUserId] = {
          user: split.expense.paidBy,
          totalAmount: 0,
          splits: []
        };
      }
      balancesUserOwes[otherUserId].totalAmount += parseFloat(split.amount);
      balancesUserOwes[otherUserId].splits.push({
        splitId: split.id,
        amount: split.amount,
        expense: {
          id: split.expense.id,
          description: split.expense.description,
          amount: split.expense.amount,
          expenseDate: split.expense.expenseDate
        }
      });
    });

    // Calculate net balances
    const netBalances = {};

    // Process what others owe user
    Object.values(balancesOwedToUser).forEach(balance => {
      const otherId = balance.user.id;
      netBalances[otherId] = {
        user: balance.user,
        netAmount: balance.totalAmount,
        details: {
          theyOwe: balance.totalAmount,
          youOwe: 0,
          splits: balance.splits
        }
      };
    });

    // Process what user owes others
    Object.values(balancesUserOwes).forEach(balance => {
      const otherId = balance.user.id;
      if (netBalances[otherId]) {
        // They owe each other - calculate net
        const theyOwe = netBalances[otherId].details.theyOwe;
        const youOwe = balance.totalAmount;
        const net = theyOwe - youOwe;

        netBalances[otherId].netAmount = net;
        netBalances[otherId].details.youOwe = youOwe;

        // If net is negative, user owes them
        if (net < 0) {
          netBalances[otherId].netAmount = Math.abs(net);
        }
      } else {
        netBalances[otherId] = {
          user: balance.user,
          netAmount: -balance.totalAmount,
          details: {
            theyOwe: 0,
            youOwe: balance.totalAmount,
            splits: balance.splits
          }
        };
      }
    });

    // Convert to array and categorize
    const result = Object.values(netBalances);
    const youOwe = result.filter(b => b.netAmount < 0).map(b => ({
      ...b,
      netAmount: Math.abs(b.netAmount)
    }));
    const theyOweYou = result.filter(b => b.netAmount > 0);
    const settled = result.filter(b => b.netAmount === 0);

    // Calculate totals
    const totalYouOwe = youOwe.reduce((sum, b) => sum + b.netAmount, 0);
    const totalTheyOweYou = theyOweYou.reduce((sum, b) => sum + b.netAmount, 0);

    return {
      summary: {
        totalYouOwe,
        totalTheyOweYou,
        netBalance: totalTheyOweYou - totalYouOwe
      },
      youOwe,
      theyOweYou,
      settled
    };
  }

  /**
   * Get simplified debts using greedy algorithm
   * Minimizes number of transactions while preserving net amounts
   */
  async getSimplifiedBalances(userId) {
    const balances = await this.getUserBalances(userId);

    // Separate into givers (positive balance - they are owed) and receivers (negative - they owe)
    const givers = balances.theyOweYou.map(b => ({
      userId: b.user.id,
      name: `${b.user.firstName} ${b.user.lastName}`,
      amount: toCents(b.netAmount)
    }));

    const receivers = balances.youOwe.map(b => ({
      userId: b.user.id,
      name: `${b.user.firstName} ${b.user.lastName}`,
      amount: toCents(b.netAmount)
    }));

    // Sort by amount descending
    givers.sort((a, b) => b.amount - a.amount);
    receivers.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0, j = 0;

    // Greedy matching - match largest giver with largest receiver
    while (i < givers.length && j < receivers.length) {
      const giver = givers[i];
      const receiver = receivers[j];

      const amount = Math.min(giver.amount, receiver.amount);

      if (amount > 0) {
        transactions.push({
          from: {
            userId: receiver.userId,
            name: receiver.name
          },
          to: {
            userId: giver.userId,
            name: giver.name
          },
          amount: parseFloat(toDollars(amount))
        });
      }

      giver.amount -= amount;
      receiver.amount -= amount;

      if (giver.amount === 0) i++;
      if (receiver.amount === 0) j++;
    }

    return {
      originalBalances: balances,
      simplifiedTransactions: transactions,
      transactionCount: transactions.length,
      originalTransactionCount: balances.youOwe.length + balances.theyOweYou.length
    };
  }

  /**
   * Get balances for a specific group
   */
  async getGroupBalances(groupId, userId) {
    // Verify user is member
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      throw { statusCode: 403, message: 'Not a member of this group' };
    }

    // Get all expenses in group with splits
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    // Calculate net balance for each member
    const memberBalances = {};

    expenses.forEach(expense => {
      const payerId = expense.paidById;
      const amount = parseFloat(expense.amount);

      // Payer lent money
      if (!memberBalances[payerId]) {
        memberBalances[payerId] = {
          user: expense.paidBy,
          paid: 0,
          owed: 0,
          netBalance: 0
        };
      }
      memberBalances[payerId].paid += amount;
      memberBalances[payerId].netBalance += amount;

      // Splitters owe money
      expense.splits.forEach(split => {
        const splitUserId = split.userId;
        const splitAmount = parseFloat(split.amount);

        if (!memberBalances[splitUserId]) {
          memberBalances[splitUserId] = {
            user: split.user,
            paid: 0,
            owed: 0,
            netBalance: 0
          };
        }
        memberBalances[splitUserId].owed += splitAmount;
        memberBalances[splitUserId].netBalance -= splitAmount;
      });
    });

    return Object.values(memberBalances);
  }

  /**
   * Get detailed splits for an expense
   */
  async getExpenseSplits(expenseId, userId) {
    // Verify user has access to expense
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        OR: [
          { paidById: userId },
          { splits: { some: { userId } } },
          {
            group: {
              members: { some: { userId } }
            }
          }
        ]
      },
      include: {
        splits: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    if (!expense) {
      throw { statusCode: 404, message: 'Expense not found' };
    }

    return expense.splits;
  }
}

module.exports = new SplitsService();
