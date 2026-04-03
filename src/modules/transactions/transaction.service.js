const prisma = require('../../config/database');
const logger = require('../../utils/logger');
const budgetService = require('../budgets/budget.service');

const toNumber = (value) => (value === null || value === undefined ? 0 : parseFloat(value));

class TransactionsService {
  async validateUserAccount(accountId, userId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId, isActive: true }
    });

    if (!account) {
      throw { statusCode: 403, message: 'Account does not belong to current user' };
    }

    return account;
  }

  async validateCategory(categoryId, userId) {
    if (!categoryId) {
      return null;
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ isSystem: true }, { userId }]
      }
    });

    if (!category) {
      throw { statusCode: 404, message: 'Category not found' };
    }

    return category;
  }

  parseTransactionDate(transactionDate) {
    if (!transactionDate) {
      return new Date();
    }

    const parsed = new Date(transactionDate);
    if (Number.isNaN(parsed.getTime())) {
      throw { statusCode: 400, message: 'Invalid transactionDate' };
    }

    if (parsed > new Date()) {
      throw { statusCode: 400, message: 'transactionDate cannot be in the future' };
    }

    return parsed;
  }

  async createManualTransaction(userId, data) {
    const {
      accountId,
      amount,
      type,
      categoryId = null,
      description,
      incomeSource,
      transactionDate
    } = data;

    await this.validateUserAccount(accountId, userId);
    await this.validateCategory(categoryId, userId);

    const parsedAmount = toNumber(amount);
    const parsedDate = this.parseTransactionDate(transactionDate);

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.accountTransaction.create({
        data: {
          userId,
          accountId,
          type,
          amount: parsedAmount,
          categoryId,
          description: description || null,
          incomeSource: type === 'INCOME' ? incomeSource || null : null,
          transactionDate: parsedDate
        },
        include: {
          account: true,
          category: true
        }
      });

      await tx.account.update({
        where: { id: accountId },
        data: {
          balance: type === 'INCOME'
            ? { increment: parsedAmount }
            : { decrement: parsedAmount }
        }
      });

      return created;
    });

    if (type === 'EXPENSE' && typeof budgetService.checkBudgetAlertsForUsers === 'function') {
      // Async post-commit budget check.
      void budgetService.checkBudgetAlertsForUsers([userId], categoryId).catch((error) => {
        logger.warn(`Budget check failed after transaction expense: ${error.message}`);
      });
    }

    return transaction;
  }

  async addIncome(userId, incomeData) {
    return this.createManualTransaction(userId, {
      ...incomeData,
      type: 'INCOME'
    });
  }

  async addExpense(userId, expenseData) {
    return this.createManualTransaction(userId, {
      ...expenseData,
      type: 'EXPENSE'
    });
  }

  async transferBetweenAccounts(userId, transferData) {
    const { fromAccountId, toAccountId, amount, description, transactionDate } = transferData;

    if (fromAccountId === toAccountId) {
      throw { statusCode: 400, message: 'fromAccountId and toAccountId must be different' };
    }

    const [fromAccount, toAccount] = await Promise.all([
      this.validateUserAccount(fromAccountId, userId),
      this.validateUserAccount(toAccountId, userId)
    ]);

    const parsedAmount = toNumber(amount);
    if (toNumber(fromAccount.balance) < parsedAmount) {
      throw { statusCode: 400, message: 'Insufficient balance in source account' };
    }

    const parsedDate = this.parseTransactionDate(transactionDate);

    const [transferOut, transferIn] = await prisma.$transaction([
      prisma.accountTransaction.create({
        data: {
          userId,
          accountId: fromAccountId,
          type: 'TRANSFER',
          amount: parsedAmount,
          toAccountId,
          description: description ? `Transfer out: ${description}` : `Transfer out to ${toAccount.name}`,
          transactionDate: parsedDate
        },
        include: { account: true }
      }),
      prisma.accountTransaction.create({
        data: {
          userId,
          accountId: toAccountId,
          type: 'TRANSFER',
          amount: parsedAmount,
          toAccountId: fromAccountId,
          description: description ? `Transfer in: ${description}` : `Transfer in from ${fromAccount.name}`,
          transactionDate: parsedDate
        },
        include: { account: true }
      }),
      prisma.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: parsedAmount } }
      }),
      prisma.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: parsedAmount } }
      })
    ]);

    logger.info(`Transfer completed: ${transferOut.id} (${fromAccountId} -> ${toAccountId})`);

    return {
      transferOut,
      transferIn
    };
  }

  async getTransactions(userId, filters, pagination) {
    const { skip, take } = pagination;
    const { type, categoryId, startDate, endDate, accountId, search } = filters;

    if (categoryId) {
      await this.validateCategory(categoryId, userId);
    }

    const where = {
      userId,
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(accountId && { accountId }),
      ...(search && {
        description: {
          contains: search,
          mode: 'insensitive'
        }
      })
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        where.transactionDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDate.lte = new Date(endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.accountTransaction.findMany({
        where,
        include: {
          account: true,
          category: true
        },
        skip,
        take,
        orderBy: { transactionDate: 'desc' }
      }),
      prisma.accountTransaction.count({ where })
    ]);

    return { transactions, total };
  }

  async getTransactionById(transactionId, userId) {
    const transaction = await prisma.accountTransaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        account: true,
        category: true
      }
    });

    if (!transaction) {
      throw { statusCode: 404, message: 'Transaction not found' };
    }

    return transaction;
  }

  async updateTransaction(transactionId, userId, updateData) {
    const existing = await prisma.accountTransaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        account: true
      }
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Transaction not found' };
    }

    if (['TRANSFER', 'SETTLEMENT_IN', 'SETTLEMENT_OUT'].includes(existing.type) || existing.toAccountId || existing.settlementId) {
      throw { statusCode: 400, message: 'Only manual INCOME/EXPENSE transactions can be edited' };
    }

    if (updateData.categoryId !== undefined && updateData.categoryId !== null) {
      await this.validateCategory(updateData.categoryId, userId);
    }

    const parsedDate = updateData.transactionDate ? this.parseTransactionDate(updateData.transactionDate) : undefined;

    const currentAmount = toNumber(existing.amount);
    const nextAmount = updateData.amount !== undefined ? toNumber(updateData.amount) : currentAmount;
    const amountDelta = nextAmount - currentAmount;

    const updated = await prisma.$transaction(async (tx) => {
      if (amountDelta !== 0) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: {
            balance: existing.type === 'INCOME'
              ? { increment: amountDelta }
              : { decrement: amountDelta }
          }
        });
      }

      return tx.accountTransaction.update({
        where: { id: transactionId },
        data: {
          ...(updateData.description !== undefined && { description: updateData.description }),
          ...(updateData.categoryId !== undefined && { categoryId: updateData.categoryId }),
          ...(parsedDate && { transactionDate: parsedDate }),
          ...(updateData.incomeSource !== undefined && existing.type === 'INCOME' && { incomeSource: updateData.incomeSource }),
          ...(updateData.amount !== undefined && { amount: nextAmount })
        },
        include: {
          account: true,
          category: true
        }
      });
    });

    return updated;
  }

  async deleteTransaction(transactionId, userId) {
    const existing = await prisma.accountTransaction.findFirst({
      where: { id: transactionId, userId }
    });

    if (!existing) {
      throw { statusCode: 404, message: 'Transaction not found' };
    }

    if (['TRANSFER', 'SETTLEMENT_IN', 'SETTLEMENT_OUT'].includes(existing.type) || existing.toAccountId || existing.settlementId) {
      throw { statusCode: 400, message: 'System-generated transactions cannot be deleted' };
    }

    const amount = toNumber(existing.amount);

    await prisma.$transaction([
      prisma.account.update({
        where: { id: existing.accountId },
        data: {
          balance: existing.type === 'INCOME'
            ? { decrement: amount }
            : { increment: amount }
        }
      }),
      prisma.accountTransaction.delete({
        where: { id: transactionId }
      })
    ]);

    logger.info(`Transaction deleted: ${transactionId}`);
  }

  async getCategories(userId) {
    return prisma.category.findMany({
      where: {
        OR: [{ isSystem: true }, { userId }]
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }]
    });
  }
}

module.exports = new TransactionsService();
