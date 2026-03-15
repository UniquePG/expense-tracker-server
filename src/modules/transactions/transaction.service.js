const prisma = require('../../config/database');
const logger = require('../../utils/logger');

// We use the Expense model to represent Personal Transactions
class TransactionsService {
  async getTransactions(userId, filters, pagination) {
    const { skip, take } = pagination;
    const { type, categoryId, startDate, endDate } = filters;

    // Filter by personal expenses
    const where = {
      paidById: userId,
      expenseType: 'PERSONAL'
    };

    if (categoryId) where.categoryId = categoryId;
    if (startDate && endDate) {
      where.expenseDate = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { category: true },
        skip,
        take,
        orderBy: { expenseDate: 'desc' }
      }),
      prisma.expense.count({ where })
    ]);

    // Map to transaction shape
    const transactions = expenses.map(expense => {
      // For personal expenses, 'income' could be identified by a specific category or positive balance logic?
      // Since Schema doesn't support 'income' vs 'expense' naturally, we assume 'expense' unless notes say income.
      // Mocking type based on notes for exactly matching the schema.
      const isIncome = expense.notes && expense.notes.includes('income');

      return {
        id: expense.id,
        description: expense.description,
        amount: parseFloat(expense.amount),
        type: isIncome ? 'income' : 'expense',
        currency: expense.currency,
        category: expense.category,
        date: expense.expenseDate,
        notes: expense.notes,
        receipt: expense.image,
        createdAt: expense.createdAt
      };
    });

    if (type) {
      const filtered = transactions.filter(t => t.type === type);
      return { transactions: filtered, total: filtered.length };
    }

    return { transactions, total };
  }

  async createTransaction(userId, txnData) {
    console.log('txnData :',userId, txnData);
    const { description, amount, type, currency = 'USD', categoryId, date, notes } = txnData;

    // We store 'income' in notes to differentiate since DB lacks 'type'
    const finalNotes = type === 'income' ? `income|${notes || ''}` : notes;

    const expense = await prisma.expense.create({
      data: {
        description,
        amount,
        currency,
        expenseType: 'PERSONAL',
        expenseDate: date ? new Date(date) : new Date(),
        notes: finalNotes,
        categoryId,
        paidById: userId,
        splitType: 'EQUAL'
      },
      include: { category: true }
    });

    // Create a dummy split for the user since Prisma requires it in some logic
    await prisma.expenseSplit.create({
      data: {
        expenseId: expense.id,
        userId: userId,
        amount,
        percentage: 100,
        shares: 1,
        isSettled: true
      }
    });

    logger.info(`Transaction created: ${expense.id} by ${userId}`);

    return {
      id: expense.id,
      description: expense.description,
      amount: parseFloat(expense.amount),
      type: type || 'expense',
      currency: expense.currency,
      category: expense.category,
      date: expense.expenseDate,
      notes,
      createdAt: expense.createdAt
    };
  }

  async getTransactionById(transactionId, userId) {
    const expense = await prisma.expense.findFirst({
      where: { id: transactionId, paidById: userId, expenseType: 'PERSONAL' },
      include: { category: true }
    });

    if (!expense) throw { statusCode: 404, message: 'Transaction not found' };

    const isIncome = expense.notes && expense.notes.includes('income');
    const cleanNotes = expense.notes ? expense.notes.replace('income|', '') : null;

    return {
      id: expense.id,
      description: expense.description,
      amount: parseFloat(expense.amount),
      type: isIncome ? 'income' : 'expense',
      currency: expense.currency,
      category: expense.category,
      date: expense.expenseDate,
      notes: cleanNotes,
      receipt: expense.image,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt
    };
  }

  async updateTransaction(transactionId, userId, updateData) {
    const existing = await prisma.expense.findFirst({
      where: { id: transactionId, paidById: userId, expenseType: 'PERSONAL' }
    });

    if (!existing) throw { statusCode: 404, message: 'Transaction not found or unauthorized' };

    const { description, amount, categoryId, date, notes } = updateData;

    const updated = await prisma.expense.update({
      where: { id: transactionId },
      data: {
        ...(description && { description }),
        ...(amount && { amount }),
        ...(categoryId && { categoryId }),
        ...(date && { expenseDate: new Date(date) }),
        ...(notes !== undefined && { notes })
      },
      include: { category: true }
    });

    if (amount) {
      await prisma.expenseSplit.updateMany({
        where: { expenseId: transactionId, userId },
        data: { amount }
      });
    }

    const isIncome = updated.notes && updated.notes.includes('income');
    const cleanNotes = updated.notes ? updated.notes.replace('income|', '') : null;

    return {
      id: updated.id,
      description: updated.description,
      amount: parseFloat(updated.amount),
      type: isIncome ? 'income' : 'expense',
      currency: updated.currency,
      category: updated.category,
      date: updated.expenseDate,
      notes: cleanNotes,
      updatedAt: updated.updatedAt
    };
  }

  async deleteTransaction(transactionId, userId) {
    const existing = await prisma.expense.findFirst({
      where: { id: transactionId, paidById: userId, expenseType: 'PERSONAL' }
    });

    if (!existing) throw { statusCode: 404, message: 'Transaction not found or unauthorized' };

    await prisma.expense.delete({ where: { id: transactionId } });
    logger.info(`Transaction deleted: ${transactionId}`);
  }

  async getCategories(type) {
    // Return all categories
    return prisma.category.findMany();
  }
}

module.exports = new TransactionsService();
