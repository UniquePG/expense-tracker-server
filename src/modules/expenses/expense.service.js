const prisma = require('../../config/database');
const logger = require('../../utils/logger');

// Convert dollars to cents for precision
const toCents = (amount) => Math.round(parseFloat(amount) * 100);
const toDollars = (cents) => (cents / 100).toFixed(2);

class ExpensesService {
  /**
   * Calculate splits based on split type
   * Returns array of splits with calculated amounts in cents
   */
  calculateSplits(totalAmountCents, splits, splitType) {
    const numParticipants = splits.length;
    const calculatedSplits = [];

    switch (splitType) {
      case 'EQUAL':
        const equalShare = Math.floor(totalAmountCents / numParticipants);
        const remainder = totalAmountCents - (equalShare * numParticipants);

        splits.forEach((split, index) => {
          // First person gets the remainder to handle rounding
          const amount = index === 0 ? equalShare + remainder : equalShare;
          calculatedSplits.push({
            userId: split.userId,
            amount: amount,
            percentage: null,
            shares: null
          });
        });
        break;

      case 'PERCENTAGE':
        let percentageSum = 0;
        const percentageSplits = splits.map(split => {
          const percentage = split.percentage || 0;
          percentageSum += percentage;
          return {
            userId: split.userId,
            percentage,
            rawAmount: (totalAmountCents * percentage) / 100
          };
        });

        if (Math.abs(percentageSum - 100) > 0.01) {
          throw { statusCode: 400, message: 'Percentages must sum to 100' };
        }

        // Round and handle remainder
        let runningTotal = 0;
        percentageSplits.forEach((split, index) => {
          let amount = Math.round(split.rawAmount);
          if (index === percentageSplits.length - 1) {
            amount = totalAmountCents - runningTotal;
          }
          runningTotal += amount;
          calculatedSplits.push({
            userId: split.userId,
            amount,
            percentage: split.percentage,
            shares: null
          });
        });
        break;

      case 'EXACT':
        let exactSum = 0;
        splits.forEach(split => {
          const amount = toCents(split.amount);
          exactSum += amount;
          calculatedSplits.push({
            userId: split.userId,
            amount,
            percentage: null,
            shares: null
          });
        });

        if (exactSum !== totalAmountCents) {
          throw { 
            statusCode: 400, 
            message: `Exact amounts must sum to total. Expected: ${toDollars(totalAmountCents)}, Got: ${toDollars(exactSum)}` 
          };
        }
        break;

      case 'SHARES':
        const totalShares = splits.reduce((sum, s) => sum + (s.shares || 0), 0);
        if (totalShares === 0) {
          throw { statusCode: 400, message: 'Total shares cannot be zero' };
        }

        const shareValue = totalAmountCents / totalShares;
        let sharesRunningTotal = 0;

        splits.forEach((split, index) => {
          const rawAmount = shareValue * (split.shares || 0);
          let amount = Math.round(rawAmount);

          if (index === splits.length - 1) {
            amount = totalAmountCents - sharesRunningTotal;
          }
          sharesRunningTotal += amount;

          calculatedSplits.push({
            userId: split.userId,
            amount,
            percentage: null,
            shares: split.shares
          });
        });
        break;

      default:
        throw { statusCode: 400, message: 'Invalid split type' };
    }

    return calculatedSplits;
  }

  async createExpense(userId, expenseData) {
    const { 
      description, 
      amount, 
      currency = 'USD', 
      expenseDate, 
      notes, 
      image, 
      categoryId, 
      groupId, 
      paidById, 
      splitType, 
      splits 
    } = expenseData;

    // Convert amount to cents for calculation
    const amountCents = toCents(amount);

    // Calculate splits
    const calculatedSplits = this.calculateSplits(amountCents, splits, splitType);

    // Create expense with splits in transaction
    const expense = await prisma.$transaction(async (tx) => {
      // Create the expense
      const newExpense = await tx.expense.create({
        data: {
          description,
          amount: amountCents / 100, // Store as decimal in DB
          currency,
          expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
          notes,
          image,
          splitType,
          paidById,
          categoryId,
          groupId,
          expenseType: groupId ? 'GROUP' : 'PERSONAL'
        },
        include: {
          paidBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          category: true
        }
      });

      // Create splits
      await tx.expenseSplit.createMany({
        data: calculatedSplits.map(split => ({
          expenseId: newExpense.id,
          userId: split.userId,
          amount: split.amount / 100,
          percentage: split.percentage,
          shares: split.shares
        }))
      });

      // Return expense with splits
      return tx.expense.findUnique({
        where: { id: newExpense.id },
        include: {
          paidBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          category: true,
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
    });

    logger.info(`Expense created: ${expense.id} by ${userId}`);
    return expense;
  }

  async getExpenseById(expenseId, userId) {
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        OR: [
          { paidById: userId },
          { 
            splits: {
              some: {
                userId
              }
            }
          },
          {
            group: {
              members: {
                some: {
                  userId
                }
              }
            }
          }
        ]
      },
      include: {
        paidBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        category: true,
        group: {
          select: {
            id: true,
            name: true
          }
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
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

    return expense;
  }

  async getUserExpenses(userId, filters = {}, pagination) {
    const { skip, take } = pagination;
    const { groupId, categoryId, startDate, endDate } = filters;

    const where = {
      OR: [
        { paidById: userId },
        { splits: { some: { userId } } }
      ],
      ...(groupId && { groupId }),
      ...(categoryId && { categoryId }),
      ...(startDate && endDate && {
        expenseDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          paidBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          category: true,
          group: {
            select: {
              id: true,
              name: true
            }
          },
          splits: {
            where: { userId },
            select: {
              id: true,
              amount: true,
              isSettled: true
            }
          },
          _count: {
            select: { splits: true }
          }
        },
        skip,
        take,
        orderBy: { expenseDate: 'desc' }
      }),
      prisma.expense.count({ where })
    ]);

    return { expenses, total };
  }

  async updateExpense(expenseId, userId, updateData) {
    // Check if user is the payer
    const existing = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        paidById: userId
      }
    });

    if (!existing) {
      throw { statusCode: 403, message: 'Only the payer can update this expense' };
    }

    // Don't allow updating splits here - use separate endpoint
    const { splits, splitType, amount, ...allowedUpdates } = updateData;

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: allowedUpdates,
      include: {
        paidBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        category: true,
        splits: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    logger.info(`Expense updated: ${expenseId}`);
    return expense;
  }

  async deleteExpense(expenseId, userId) {
    // Check if user is the payer
    const existing = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        paidById: userId
      }
    });

    if (!existing) {
      throw { statusCode: 403, message: 'Only the payer can delete this expense' };
    }

    // Check if any splits are settled
    const settledSplits = await prisma.expenseSplit.count({
      where: {
        expenseId,
        isSettled: true
      }
    });

    if (settledSplits > 0) {
      throw { statusCode: 400, message: 'Cannot delete expense with settled splits' };
    }

    await prisma.expense.delete({
      where: { id: expenseId }
    });

    logger.info(`Expense deleted: ${expenseId}`);
  }

  async getExpenseSummary(userId) {
    // Total paid by user
    const paidByUser = await prisma.expense.aggregate({
      where: { paidById: userId },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Total owed to user (splits where user is payer and split is not settled)
    const owedToUser = await prisma.expenseSplit.aggregate({
      where: {
        expense: { paidById: userId },
        isSettled: false,
        userId: { not: userId }
      },
      _sum: { amount: true }
    });

    // Total user owes (splits where user is not payer and split is not settled)
    const userOwes = await prisma.expenseSplit.aggregate({
      where: {
        userId,
        isSettled: false,
        expense: { paidById: { not: userId } }
      },
      _sum: { amount: true }
    });

    return {
      totalPaid: paidByUser._sum.amount || 0,
      totalExpenses: paidByUser._count.id,
      totalOwedToUser: owedToUser._sum.amount || 0,
      totalUserOwes: userOwes._sum.amount || 0,
      netBalance: (owedToUser._sum.amount || 0) - (userOwes._sum.amount || 0)
    };
  }

  async uploadReceipt(expenseId, userId, uploadData) {
    // In a real app, you'd use AWS S3/Cloudinary. Mocking the URL response.
    const mockUrl = `https://cdn.example.com/receipts/${expenseId}.jpg`;
    await prisma.expense.update({
      where: { id: expenseId },
      data: { image: mockUrl }
    });
    return mockUrl;
  }

  async updateSplit(expenseId, userId, splitData) {
    // Check if user is payer
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, paidById: userId }
    });

    if (!existing) {
      throw { statusCode: 403, message: 'Only the payer can update the split' };
    }

    const { type, participants } = splitData;
    const amountCents = toCents(existing.amount.toString());
    const calculatedSplits = this.calculateSplits(amountCents, participants.map(p => ({
      userId: p.userId,
      amount: p.amount,
      percentage: p.percentage,
      shares: p.shares
    })), type.toUpperCase());

    const result = await prisma.$transaction(async (tx) => {
      // Delete old splits
      await tx.expenseSplit.deleteMany({ where: { expenseId } });

      // Create new splits
      await tx.expenseSplit.createMany({
        data: calculatedSplits.map(split => ({
          expenseId,
          userId: split.userId,
          amount: split.amount / 100,
          percentage: split.percentage,
          shares: split.shares
        }))
      });

      // Update splitType
      await tx.expense.update({
        where: { id: expenseId },
        data: { splitType: type.toUpperCase() }
      });

      return tx.expense.findFirst({
        where: { id: expenseId },
        include: { splits: true }
      });
    });

    return result;
  }

  async getComments(expenseId, userId) {
    // Mock comments since schema doesn't have it
    // Returns empty array
    return [];
  }

  async addComment(expenseId, userId, commentData) {
    // Mock comment response
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, firstName: true, lastName: true, avatar: true } });
    return {
      id: `comment-${Date.now()}`,
      user,
      text: commentData.text,
      createdAt: new Date()
    };
  }
}

module.exports = new ExpensesService();
