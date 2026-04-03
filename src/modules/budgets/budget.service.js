const prisma = require('../../config/database');
const logger = require('../../utils/logger');

const toNumber = (value) => (value === null || value === undefined ? 0 : parseFloat(value));

class BudgetService {
  async createBudget(userId, budgetData) {
    const { name, amount, categoryId, periodType, startDate, alertAt50, alertAt80, alertAt100, currency } = budgetData;

    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          OR: [{ isSystem: true }, { userId }]
        }
      });

      if (!category) {
        throw { statusCode: 404, message: 'Category not found' };
      }
    }

    const parsedStartDate = new Date(startDate);
    if (Number.isNaN(parsedStartDate.getTime())) {
      throw { statusCode: 400, message: 'Invalid startDate' };
    }

    const overlapping = await prisma.budget.findFirst({
      where: {
        userId,
        isActive: true,
        periodType,
        categoryId: categoryId || null,
        startDate: parsedStartDate
      }
    });

    if (overlapping) {
      throw { statusCode: 409, message: 'An active budget already exists for this category and period' };
    }

    const budget = await prisma.budget.create({
      data: {
        userId,
        name,
        amount: toNumber(amount),
        categoryId: categoryId || null,
        periodType,
        startDate: parsedStartDate,
        currency: currency || 'INR',
        alertAt50: alertAt50 !== false,
        alertAt80: alertAt80 !== false,
        alertAt100: alertAt100 !== false,
        isActive: true
      },
      include: {
        category: true
      }
    });

    logger.info(`Budget created: ${budget.id} for user ${userId}`);
    return budget;
  }

  async getBudgets(userId) {
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        category: true
      },
      orderBy: { startDate: 'desc' }
    });

    return Promise.all(
      budgets.map(async (budget) => ({
        ...budget,
        progress: await this.calculateBudgetProgress(budget)
      }))
    );
  }

  async getBudgetProgress(budgetId, userId) {
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId
      },
      include: { category: true }
    });

    if (!budget) {
      throw { statusCode: 404, message: 'Budget not found' };
    }

    const progress = await this.calculateBudgetProgress(budget);

    return {
      ...budget,
      ...progress
    };
  }

  async calculateBudgetProgress(budget) {
    const { startDate, endDate } = this.getPeriodDates(budget.startDate, budget.periodType);

    const categoryFilter = budget.categoryId ? { categoryId: budget.categoryId } : {};
    const expenseCategoryFilter = budget.categoryId ? { expense: { categoryId: budget.categoryId } } : {};

    const [splitExpenseSpend, personalTransactionSpend] = await Promise.all([
      prisma.expenseSplit.aggregate({
        where: {
          userId: budget.userId,
          isSettled: false,
          ...expenseCategoryFilter,
          expense: {
            ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
            isDeleted: false,
            expenseDate: {
              gte: startDate,
              lte: endDate
            }
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.accountTransaction.aggregate({
        where: {
          userId: budget.userId,
          type: 'EXPENSE',
          ...categoryFilter,
          transactionDate: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        }
      })
    ]);

    const splitSpend = toNumber(splitExpenseSpend._sum.amount);
    const personalSpend = toNumber(personalTransactionSpend._sum.amount);
    const spent = splitSpend + personalSpend;

    const amount = toNumber(budget.amount);
    const percentUsed = amount > 0 ? (spent / amount) * 100 : 0;
    const remaining = amount - spent;

    return {
      spent,
      spentBySource: {
        splitExpenses: splitSpend,
        personalTransactions: personalSpend
      },
      remaining,
      percentUsed: parseFloat(percentUsed.toFixed(2)),
      period: {
        startDate,
        endDate
      }
    };
  }

  getPeriodDates(startDate, periodType) {
    const start = new Date(startDate);
    let end;

    switch (periodType) {
      case 'WEEKLY':
        end = new Date(start);
        end.setDate(end.getDate() + 7);
        break;
      case 'MONTHLY':
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        break;
      case 'YEARLY':
        end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
    }

    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  async updateBudget(budgetId, userId, updateData) {
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId
      }
    });

    if (!budget) {
      throw { statusCode: 404, message: 'Budget not found' };
    }

    const updated = await prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.amount !== undefined && { amount: toNumber(updateData.amount) }),
        ...(updateData.periodType !== undefined && { periodType: updateData.periodType }),
        ...(updateData.alertAt50 !== undefined && { alertAt50: updateData.alertAt50 }),
        ...(updateData.alertAt80 !== undefined && { alertAt80: updateData.alertAt80 }),
        ...(updateData.alertAt100 !== undefined && { alertAt100: updateData.alertAt100 }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive })
      },
      include: { category: true }
    });

    logger.info(`Budget updated: ${budgetId}`);
    return updated;
  }

  async deleteBudget(budgetId, userId) {
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId
      }
    });

    if (!budget) {
      throw { statusCode: 404, message: 'Budget not found' };
    }

    await prisma.budget.delete({
      where: { id: budgetId }
    });

    logger.info(`Budget deleted: ${budgetId}`);
  }

  async checkBudgetAlertsForUsers(userIds, categoryId) {
    const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return;
    }

    for (const userId of uniqueUserIds) {
      const budgets = await prisma.budget.findMany({
        where: {
          userId,
          isActive: true,
          ...(categoryId ? { OR: [{ categoryId: null }, { categoryId }] } : {})
        }
      });

      for (const budget of budgets) {
        const progress = await this.calculateBudgetProgress(budget);

        const thresholds = [
          { limit: 100, enabled: budget.alertAt100, type: 'BUDGET_ALERT_100', label: '100%' },
          { limit: 80, enabled: budget.alertAt80, type: 'BUDGET_ALERT_80', label: '80%' },
          { limit: 50, enabled: budget.alertAt50, type: 'BUDGET_ALERT_50', label: '50%' }
        ];

        for (const threshold of thresholds) {
          if (!threshold.enabled || progress.percentUsed < threshold.limit) {
            continue;
          }

          const existingAlert = await prisma.notification.findFirst({
            where: {
              userId,
              type: threshold.type,
              entityType: 'budget',
              entityId: budget.id,
              createdAt: {
                gte: progress.period.startDate,
                lte: progress.period.endDate
              }
            }
          });

          if (existingAlert) {
            continue;
          }

          await prisma.notification.create({
            data: {
              userId,
              type: threshold.type,
              title: `${budget.name} budget alert`,
              message: `Your budget '${budget.name}' has crossed ${threshold.label} usage.`,
              entityType: 'budget',
              entityId: budget.id,
              metadata: {
                percentUsed: progress.percentUsed,
                spent: progress.spent,
                limit: toNumber(budget.amount)
              }
            }
          });

          break;
        }
      }
    }
  }
}

module.exports = new BudgetService();
