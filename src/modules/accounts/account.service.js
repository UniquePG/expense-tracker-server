const prisma = require('../../config/database');
const logger = require('../../utils/logger');

const toNumber = (value) => (value === null || value === undefined ? 0 : parseFloat(value));

class AccountService {
  async createAccount(userId, accountData) {
    const { name, type, currency = 'INR', balance = 0 } = accountData;

    const duplicate = await prisma.account.findFirst({
      where: {
        userId,
        isActive: true,
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });

    if (duplicate) {
      throw { statusCode: 409, message: 'Account with this name already exists' };
    }

    const openingBalance = toNumber(balance);

    const account = await prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: {
          userId,
          name,
          type,
          currency,
          balance: openingBalance,
          isActive: true
        }
      });

      if (openingBalance !== 0) {
        await tx.accountTransaction.create({
          data: {
            userId,
            accountId: created.id,
            type: openingBalance > 0 ? 'INCOME' : 'EXPENSE',
            amount: Math.abs(openingBalance),
            description: 'Opening balance',
            transactionDate: new Date()
          }
        });
      }

      return created;
    });

    logger.info(`Account created: ${account.id} for user ${userId}`);
    return account;
  }

  async getAccounts(userId) {
    return prisma.account.findMany({
      where: {
        userId,
        isActive: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getAccountById(accountId, userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        isActive: true
      }
    });

    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }

    const transactionWhere = {
      accountId
    };

    if (query.type) {
      transactionWhere.type = query.type;
    }

    if (query.startDate || query.endDate) {
      transactionWhere.transactionDate = {};
      if (query.startDate) {
        transactionWhere.transactionDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        transactionWhere.transactionDate.lte = new Date(query.endDate);
      }
    }

    const [transactions, totalTransactions] = await Promise.all([
      prisma.accountTransaction.findMany({
        where: transactionWhere,
        include: {
          category: true
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.accountTransaction.count({ where: transactionWhere })
    ]);

    return {
      ...account,
      transactions,
      transactionMeta: {
        page,
        limit,
        totalItems: totalTransactions,
        totalPages: Math.ceil(totalTransactions / limit)
      }
    };
  }

  async updateAccount(accountId, userId, updateData) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        isActive: true
      }
    });

    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }

    if (updateData.name && updateData.name !== account.name) {
      const duplicate = await prisma.account.findFirst({
        where: {
          userId,
          isActive: true,
          id: { not: accountId },
          name: {
            equals: updateData.name,
            mode: 'insensitive'
          }
        }
      });

      if (duplicate) {
        throw { statusCode: 409, message: 'Account with this name already exists' };
      }
    }

    const updated = await prisma.account.update({
      where: { id: accountId },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.type !== undefined && { type: updateData.type })
      }
    });

    logger.info(`Account updated: ${accountId}`);
    return updated;
  }

  async deleteAccount(accountId, userId, forceDelete = false) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        isActive: true
      }
    });

    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }

    const unsettledLinkedSplits = await prisma.expenseSplit.count({
      where: {
        isSettled: false,
        expense: {
          accountTransactions: {
            some: {
              accountId,
              type: 'EXPENSE'
            }
          }
        }
      }
    });

    if (unsettledLinkedSplits > 0) {
      throw {
        statusCode: 400,
        message: 'Cannot delete account linked to unsettled expense splits'
      };
    }

    if (toNumber(account.balance) !== 0 && !forceDelete) {
      throw {
        statusCode: 400,
        message: 'Account has non-zero balance. Re-submit with force=true to confirm deletion.'
      };
    }

    await prisma.account.update({
      where: { id: accountId },
      data: { isActive: false }
    });

    logger.info(`Account soft-deleted: ${accountId}`);
  }

  async getAccountBalance(accountId, userId) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        isActive: true
      }
    });

    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }

    return { accountId, balance: account.balance, currency: account.currency };
  }

  async getTotalBalance(userId) {
    const accounts = await prisma.account.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        balance: true,
        currency: true
      }
    });

    const byCurrency = accounts.reduce((acc, account) => {
      const key = account.currency;
      acc[key] = (acc[key] || 0) + toNumber(account.balance);
      return acc;
    }, {});

    const currencies = Object.keys(byCurrency);

    return {
      totalBalance: currencies.length === 1 ? byCurrency[currencies[0]] : null,
      totalsByCurrency: byCurrency,
      accountCount: accounts.length
    };
  }

  async adjustBalance(accountId, userId, newBalance, note) {
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
        isActive: true
      }
    });

    if (!account) {
      throw { statusCode: 404, message: 'Account not found' };
    }

    const targetBalance = toNumber(newBalance);
    const currentBalance = toNumber(account.balance);
    const difference = targetBalance - currentBalance;

    if (difference === 0) {
      return account;
    }

    await prisma.$transaction([
      prisma.accountTransaction.create({
        data: {
          userId,
          accountId,
          type: difference > 0 ? 'INCOME' : 'EXPENSE',
          amount: Math.abs(difference),
          description: note ? `Balance adjustment: ${note}` : 'Balance adjustment',
          transactionDate: new Date()
        }
      }),
      prisma.account.update({
        where: { id: accountId },
        data: {
          balance: targetBalance
        }
      })
    ]);

    const updated = await prisma.account.findUnique({ where: { id: accountId } });
    logger.info(`Account balance adjusted: ${accountId} => ${targetBalance}`);

    return updated;
  }
}

module.exports = new AccountService();
