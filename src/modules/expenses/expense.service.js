const prisma = require('../../config/database');
const logger = require('../../utils/logger');
const budgetService = require('../budgets/budget.service');

const toCents = (amount) => Math.round(parseFloat(amount) * 100);
const fromCents = (cents) => parseFloat((cents / 100).toFixed(2));

class ExpensesService {
  participantKey(participant) {
    return participant.userId ? `user:${participant.userId}` : `contact:${participant.contactId}`;
  }

  findPayerKey(participants, paidById) {
    const payer = participants.find((participant) => participant.userId === paidById);
    if (!payer) {
      return null;
    }

    return this.participantKey(payer);
  }

  parseExpenseDate(expenseDate) {
    if (!expenseDate) {
      return new Date();
    }

    const parsed = new Date(expenseDate);
    if (Number.isNaN(parsed.getTime())) {
      throw { statusCode: 400, message: 'Invalid expenseDate' };
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (parsed < oneYearAgo) {
      throw { statusCode: 400, message: 'expenseDate cannot be more than 1 year in the past' };
    }

    if (parsed > new Date()) {
      throw { statusCode: 400, message: 'expenseDate cannot be in the future' };
    }

    return parsed;
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

  async validatePayer(currentUserId, paidById) {
    if (currentUserId === paidById) {
      return;
    }

    const payer = await prisma.user.findUnique({ where: { id: paidById } });
    if (!payer) {
      throw { statusCode: 404, message: 'Payer not found' };
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUserId, addresseeId: paidById },
          { requesterId: paidById, addresseeId: currentUserId }
        ],
        status: 'ACCEPTED'
      }
    });

    if (!friendship) {
      throw { statusCode: 403, message: 'paidById must be an accepted friend or the current user' };
    }
  }

  async validateGroupParticipants(groupId, currentUserId, participants) {
    if (!groupId) {
      return;
    }

    const requesterMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: currentUserId,
        status: 'ACTIVE'
      }
    });

    if (!requesterMembership) {
      throw { statusCode: 403, message: 'Current user is not an active member of this group' };
    }

    const participantChecks = await Promise.all(participants.map(async (participant) => {
      if (participant.userId) {
        const member = await prisma.groupMember.findFirst({
          where: {
            groupId,
            userId: participant.userId,
            status: 'ACTIVE'
          }
        });

        if (!member) {
          throw { statusCode: 403, message: 'A participant is not an active group member' };
        }
      }

      if (participant.contactId) {
        const member = await prisma.groupMember.findFirst({
          where: {
            groupId,
            contactId: participant.contactId,
            status: 'ACTIVE'
          }
        });

        if (!member) {
          throw { statusCode: 403, message: 'A contact participant is not an active group member' };
        }
      }
    }));

    return participantChecks;
  }

  async validateParticipants(currentUserId, participants) {
    const seen = new Set();

    participants.forEach((participant) => {
      const key = this.participantKey(participant);
      if (seen.has(key)) {
        throw { statusCode: 422, message: 'Duplicate participant detected' };
      }
      seen.add(key);
    });

    const userIds = participants
      .map((participant) => participant.userId)
      .filter(Boolean);

    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          isActive: true
        },
        select: { id: true }
      });

      if (users.length !== userIds.length) {
        throw { statusCode: 404, message: 'One or more participant users were not found' };
      }
    }

    const contactIds = participants
      .map((participant) => participant.contactId)
      .filter(Boolean);

    if (contactIds.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: {
          id: { in: contactIds },
          ownerId: currentUserId
        },
        select: { id: true }
      });

      if (contacts.length !== contactIds.length) {
        throw { statusCode: 404, message: 'One or more contact participants were not found' };
      }
    }
  }

  calculateSplits(totalAmountCents, participants, splitType, payerKey) {
    const splits = [];

    if (participants.length === 0) {
      throw { statusCode: 400, message: 'At least one participant is required' };
    }

    const payerIndex = participants.findIndex((participant) => this.participantKey(participant) === payerKey);
    const remainderReceiverIndex = payerIndex >= 0 ? payerIndex : participants.length - 1;

    if (splitType === 'EQUAL') {
      const baseShare = Math.floor(totalAmountCents / participants.length);
      const remainder = totalAmountCents - (baseShare * participants.length);

      participants.forEach((participant, index) => {
        splits.push({
          userId: participant.userId || null,
          contactId: participant.contactId || null,
          amountCents: baseShare + (index === remainderReceiverIndex ? remainder : 0),
          percentage: null,
          shares: null
        });
      });

      return splits;
    }

    if (splitType === 'PERCENTAGE') {
      const totalPercentage = participants.reduce((sum, participant) => sum + (participant.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw { statusCode: 422, message: 'Percentages must sum to 100' };
      }

      let running = 0;
      participants.forEach((participant, index) => {
        let amount = Math.round((totalAmountCents * participant.percentage) / 100);
        if (index === remainderReceiverIndex) {
          amount = totalAmountCents - running;
        }
        running += amount;

        splits.push({
          userId: participant.userId || null,
          contactId: participant.contactId || null,
          amountCents: amount,
          percentage: participant.percentage,
          shares: null
        });
      });

      return splits;
    }

    if (splitType === 'EXACT') {
      const sum = participants.reduce((running, participant) => running + toCents(participant.amount || 0), 0);
      if (sum !== totalAmountCents) {
        throw { statusCode: 422, message: 'Exact split amounts must equal the total expense amount' };
      }

      participants.forEach((participant) => {
        splits.push({
          userId: participant.userId || null,
          contactId: participant.contactId || null,
          amountCents: toCents(participant.amount),
          percentage: null,
          shares: null
        });
      });

      return splits;
    }

    if (splitType === 'SHARES') {
      const totalShares = participants.reduce((running, participant) => running + (participant.shares || 0), 0);
      if (totalShares <= 0) {
        throw { statusCode: 422, message: 'Total shares must be greater than zero' };
      }

      let running = 0;
      participants.forEach((participant, index) => {
        let amount = Math.round((totalAmountCents * participant.shares) / totalShares);
        if (index === remainderReceiverIndex) {
          amount = totalAmountCents - running;
        }
        running += amount;

        splits.push({
          userId: participant.userId || null,
          contactId: participant.contactId || null,
          amountCents: amount,
          percentage: null,
          shares: participant.shares
        });
      });

      return splits;
    }

    throw { statusCode: 400, message: 'Invalid splitType' };
  }

  async getExpenseWithRelations(expenseId) {
    return prisma.expense.findUnique({
      where: { id: expenseId },
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
            name: true,
            status: true
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
            },
            contact: true
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async assertExpenseAccess(expenseId, userId) {
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        isDeleted: false,
        OR: [
          { paidById: userId },
          { splits: { some: { userId } } },
          { group: { members: { some: { userId, status: 'ACTIVE' } } } }
        ]
      },
      select: { id: true }
    });

    if (!expense) {
      throw { statusCode: 404, message: 'Expense not found' };
    }
  }

  async createExpense(currentUserId, expenseData) {
    const {
      description,
      amount,
      currency = 'INR',
      expenseDate,
      notes,
      image,
      categoryId,
      groupId,
      accountId,
      splitType,
      participants
    } = expenseData;

    const paidById = expenseData.paidById || currentUserId;

    await this.validateCategory(categoryId, currentUserId);
    await this.validatePayer(currentUserId, paidById);
    await this.validateParticipants(currentUserId, participants);
    await this.validateGroupParticipants(groupId, currentUserId, participants);

    const payerKey = this.findPayerKey(participants, paidById);
    if (!payerKey) {
      throw { statusCode: 422, message: 'paidById must be present in participants' };
    }

    if (accountId && paidById !== currentUserId) {
      throw { statusCode: 403, message: 'accountId can only be used when paidById is the authenticated user' };
    }

    let account = null;
    if (accountId) {
      account = await prisma.account.findFirst({
        where: {
          id: accountId,
          userId: currentUserId,
          isActive: true
        }
      });

      if (!account) {
        throw { statusCode: 403, message: 'accountId does not belong to current user' };
      }
    }

    const amountCents = toCents(amount);
    const calculatedSplits = this.calculateSplits(amountCents, participants, splitType, payerKey);
    const parsedDate = this.parseExpenseDate(expenseDate);

    const resolvedExpenseType = expenseData.expenseType || (groupId ? 'GROUP' : 'PERSONAL');

    const createdExpense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          description,
          amount: fromCents(amountCents),
          currency,
          expenseDate: parsedDate,
          notes,
          image,
          splitType,
          expenseType: resolvedExpenseType,
          paidById,
          categoryId: categoryId || null,
          groupId: groupId || null
        }
      });

      await tx.expenseSplit.createMany({
        data: calculatedSplits.map((split) => {
          const key = split.userId ? `user:${split.userId}` : `contact:${split.contactId}`;
          const isPayer = key === payerKey;

          return {
            expenseId: newExpense.id,
            userId: split.userId,
            contactId: split.contactId,
            amount: fromCents(split.amountCents),
            percentage: split.percentage,
            shares: split.shares,
            isPayer,
            isSettled: isPayer,
            settledAt: isPayer ? new Date() : null
          };
        })
      });

      if (accountId) {
        await tx.accountTransaction.create({
          data: {
            userId: currentUserId,
            accountId,
            type: 'EXPENSE',
            amount: fromCents(amountCents),
            description: description || null,
            categoryId: categoryId || null,
            expenseId: newExpense.id,
            transactionDate: parsedDate
          }
        });

        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              decrement: fromCents(amountCents)
            }
          }
        });
      }

      return newExpense;
    });

    const participantUserIds = participants
      .map((participant) => participant.userId)
      .filter(Boolean);

    if (typeof budgetService.checkBudgetAlertsForUsers === 'function') {
      void budgetService
        .checkBudgetAlertsForUsers(participantUserIds, categoryId)
        .catch((error) => logger.warn(`Budget check failed after expense creation: ${error.message}`));
    }

    logger.info(`Expense created: ${createdExpense.id} by ${currentUserId}`);
    return this.getExpenseWithRelations(createdExpense.id);
  }

  async getExpenseById(expenseId, userId) {
    await this.assertExpenseAccess(expenseId, userId);

    const expense = await this.getExpenseWithRelations(expenseId);
    if (!expense || expense.isDeleted) {
      throw { statusCode: 404, message: 'Expense not found' };
    }

    return expense;
  }

  async getUserExpenses(userId, filters = {}, pagination) {
    const { skip, take } = pagination;
    const { groupId, categoryId, startDate, endDate, expenseType, paidByMe, owedByMe, search } = filters;

    const where = {
      isDeleted: false,
      OR: [
        { paidById: userId },
        { splits: { some: { userId } } }
      ],
      ...(groupId && { groupId }),
      ...(categoryId && { categoryId }),
      ...(expenseType && { expenseType }),
      ...(search && {
        description: {
          contains: search,
          mode: 'insensitive'
        }
      })
    };

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.expenseDate.lte = new Date(endDate);
      }
    }

    if (paidByMe === true || paidByMe === 'true') {
      where.paidById = userId;
    }

    if (owedByMe === true || owedByMe === 'true') {
      where.splits = {
        some: {
          userId,
          isSettled: false
        }
      };
      where.paidById = { not: userId };
    }

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
              isSettled: true,
              isPayer: true
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
    const existing = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        paidById: userId,
        isDeleted: false
      },
      include: {
        splits: true,
        accountTransactions: {
          where: {
            type: 'EXPENSE'
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!existing) {
      throw { statusCode: 403, message: 'Only the payer can update this expense' };
    }

    if (updateData.categoryId !== undefined && updateData.categoryId !== null) {
      await this.validateCategory(updateData.categoryId, userId);
    }

    const nextAmountCents = updateData.amount !== undefined ? toCents(updateData.amount) : toCents(existing.amount);
    const currentAmountCents = toCents(existing.amount);

    const nextSplitType = updateData.splitType || existing.splitType;

    const participants = updateData.participants || existing.splits.map((split) => ({
      userId: split.userId || undefined,
      contactId: split.contactId || undefined,
      amount: split.amount ? parseFloat(split.amount) : undefined,
      percentage: split.percentage ? parseFloat(split.percentage) : undefined,
      shares: split.shares || undefined
    }));

    if (updateData.participants) {
      await this.validateParticipants(userId, updateData.participants);

      const payerKey = this.findPayerKey(updateData.participants, existing.paidById);
      if (!payerKey) {
        throw { statusCode: 422, message: 'paidById must be present in participants' };
      }
    }

    const recalculationNeeded = updateData.amount !== undefined || updateData.participants || updateData.splitType;

    const payerKey = this.findPayerKey(participants, existing.paidById);

    let calculatedSplits = null;
    if (recalculationNeeded) {
      if (!payerKey) {
        throw { statusCode: 422, message: 'paidById must remain in participants' };
      }
      calculatedSplits = this.calculateSplits(nextAmountCents, participants, nextSplitType, payerKey);
    }

    const parsedExpenseDate = updateData.expenseDate ? this.parseExpenseDate(updateData.expenseDate) : undefined;

    const accountTransaction = existing.accountTransactions[0] || null;

    const updatedExpense = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          ...(updateData.description !== undefined && { description: updateData.description }),
          ...(updateData.amount !== undefined && { amount: fromCents(nextAmountCents) }),
          ...(updateData.currency !== undefined && { currency: updateData.currency }),
          ...(parsedExpenseDate && { expenseDate: parsedExpenseDate }),
          ...(updateData.notes !== undefined && { notes: updateData.notes }),
          ...(updateData.image !== undefined && { image: updateData.image }),
          ...(updateData.categoryId !== undefined && { categoryId: updateData.categoryId }),
          ...(updateData.splitType !== undefined && { splitType: nextSplitType })
        }
      });

      if (calculatedSplits) {
        await tx.expenseSplit.deleteMany({ where: { expenseId } });

        await tx.expenseSplit.createMany({
          data: calculatedSplits.map((split) => {
            const key = split.userId ? `user:${split.userId}` : `contact:${split.contactId}`;
            const isPayer = key === payerKey;

            return {
              expenseId,
              userId: split.userId,
              contactId: split.contactId,
              amount: fromCents(split.amountCents),
              percentage: split.percentage,
              shares: split.shares,
              isPayer,
              isSettled: isPayer,
              settledAt: isPayer ? new Date() : null
            };
          })
        });
      }

      if (accountTransaction) {
        const diff = nextAmountCents - currentAmountCents;

        if (diff > 0) {
          await tx.account.update({
            where: { id: accountTransaction.accountId },
            data: { balance: { decrement: fromCents(diff) } }
          });
        } else if (diff < 0) {
          await tx.account.update({
            where: { id: accountTransaction.accountId },
            data: { balance: { increment: fromCents(Math.abs(diff)) } }
          });
        }

        await tx.accountTransaction.update({
          where: { id: accountTransaction.id },
          data: {
            ...(updateData.amount !== undefined && { amount: fromCents(nextAmountCents) }),
            ...(updateData.description !== undefined && { description: updateData.description }),
            ...(updateData.categoryId !== undefined && { categoryId: updateData.categoryId }),
            ...(parsedExpenseDate && { transactionDate: parsedExpenseDate })
          }
        });
      }

      return expense;
    });

    if (typeof budgetService.checkBudgetAlertsForUsers === 'function') {
      const participantUserIds = (updateData.participants || participants)
        .map((participant) => participant.userId)
        .filter(Boolean);

      void budgetService
        .checkBudgetAlertsForUsers(participantUserIds, updateData.categoryId !== undefined ? updateData.categoryId : existing.categoryId)
        .catch((error) => logger.warn(`Budget check failed after expense update: ${error.message}`));
    }

    logger.info(`Expense updated: ${updatedExpense.id}`);
    return this.getExpenseWithRelations(expenseId);
  }

  async deleteExpense(expenseId, userId) {
    const existing = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        paidById: userId,
        isDeleted: false
      },
      include: {
        accountTransactions: {
          where: { type: 'EXPENSE' }
        }
      }
    });

    if (!existing) {
      throw { statusCode: 403, message: 'Only the payer can delete this expense' };
    }

    const settledNonPayerSplits = await prisma.expenseSplit.count({
      where: {
        expenseId,
        isPayer: false,
        isSettled: true
      }
    });

    if (settledNonPayerSplits > 0) {
      throw { statusCode: 400, message: 'Cannot delete expense with settled participant splits' };
    }

    const accountTransaction = existing.accountTransactions[0] || null;

    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expenseId },
        data: { isDeleted: true }
      });

      if (accountTransaction) {
        await tx.account.update({
          where: { id: accountTransaction.accountId },
          data: {
            balance: {
              increment: parseFloat(accountTransaction.amount)
            }
          }
        });

        await tx.accountTransaction.deleteMany({
          where: {
            expenseId,
            accountId: accountTransaction.accountId,
            type: 'EXPENSE'
          }
        });
      }
    });

    logger.info(`Expense soft-deleted: ${expenseId}`);
  }

  async getExpenseSummary(userId) {
    const paidByUser = await prisma.expense.aggregate({
      where: {
        paidById: userId,
        isDeleted: false
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    const owedToUser = await prisma.expenseSplit.aggregate({
      where: {
        expense: {
          paidById: userId,
          isDeleted: false
        },
        isSettled: false,
        userId: { not: userId }
      },
      _sum: { amount: true }
    });

    const userOwes = await prisma.expenseSplit.aggregate({
      where: {
        userId,
        isSettled: false,
        expense: {
          paidById: { not: userId },
          isDeleted: false
        }
      },
      _sum: { amount: true }
    });

    return {
      totalPaid: parseFloat(paidByUser._sum.amount || 0),
      totalExpenses: paidByUser._count.id || 0,
      totalOwedToUser: parseFloat(owedToUser._sum.amount || 0),
      totalUserOwes: parseFloat(userOwes._sum.amount || 0),
      netBalance: parseFloat(owedToUser._sum.amount || 0) - parseFloat(userOwes._sum.amount || 0)
    };
  }

  async uploadReceipt(expenseId, userId) {
    await this.assertExpenseAccess(expenseId, userId);
    throw { statusCode: 400, message: 'Use uploadReceipt controller endpoint with multipart file upload' };
  }

  async updateExpenseImage(expenseId, userId, imageUrl) {
    await this.assertExpenseAccess(expenseId, userId);

    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: { image: imageUrl },
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
        group: true,
        splits: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            },
            contact: true
          }
        }
      }
    });

    logger.info(`Expense image updated: ${expenseId}`);
    return updatedExpense;
  }

  async updateSplit(expenseId, userId, splitData) {
    const splitType = splitData.type ? splitData.type.toUpperCase() : splitData.splitType;

    if (!splitType || !splitData.participants) {
      throw { statusCode: 400, message: 'splitType and participants are required' };
    }

    return this.updateExpense(expenseId, userId, {
      splitType,
      participants: splitData.participants
    });
  }

  async getComments(expenseId, userId) {
    await this.assertExpenseAccess(expenseId, userId);

    return prisma.expenseComment.findMany({
      where: { expenseId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async addComment(expenseId, userId, commentData) {
    await this.assertExpenseAccess(expenseId, userId);

    const text = (commentData.text || '').trim();
    if (!text) {
      throw { statusCode: 400, message: 'Comment text is required' };
    }

    if (text.length > 500) {
      throw { statusCode: 400, message: 'Comment text cannot exceed 500 characters' };
    }

    return prisma.expenseComment.create({
      data: {
        expenseId,
        userId,
        text
      },
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
    });
  }
}

module.exports = new ExpensesService();
