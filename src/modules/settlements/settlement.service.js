const prisma = require('../../config/database');
const logger = require('../../utils/logger');

const toCents = (amount) => Math.round(parseFloat(amount) * 100);

class SettlementsService {
  async createSettlement(fromUserId, settlementData) {
    const { toUserId, amount, currency = 'USD', notes, splitIds = [] } = settlementData;

    if (fromUserId === toUserId) {
      throw { statusCode: 400, message: 'Cannot settle with yourself' };
    }

    const amountCents = toCents(amount);

    // Verify there are actual debts between these users
    const userOwes = await prisma.expenseSplit.findMany({
      where: {
        userId: fromUserId,
        expense: { paidById: toUserId },
        isSettled: false
      }
    });

    const theyOwe = await prisma.expenseSplit.findMany({
      where: {
        userId: toUserId,
        expense: { paidById: fromUserId },
        isSettled: false
      }
    });

    const totalUserOwes = userOwes.reduce((sum, s) => sum + toCents(s.amount), 0);
    const totalTheyOwe = theyOwe.reduce((sum, s) => sum + toCents(s.amount), 0);
    const netBalance = totalTheyOwe - totalUserOwes;

    if (netBalance <= 0) {
      throw { statusCode: 400, message: 'No outstanding balance to settle' };
    }

    if (amountCents > netBalance) {
      throw { 
        statusCode: 400, 
        message: `Settlement amount exceeds outstanding balance. Max: $${(netBalance / 100).toFixed(2)}` 
      };
    }

    // Create settlement in transaction
    const settlement = await prisma.$transaction(async (tx) => {
      // Create settlement record
      const newSettlement = await tx.settlement.create({
        data: {
          fromUserId,
          toUserId,
          amount: amountCents / 100,
          currency,
          notes
        }
      });

      // If specific splits provided, mark them as settled
      if (splitIds.length > 0) {
        let remainingToSettle = amountCents;

        for (const splitId of splitIds) {
          if (remainingToSettle <= 0) break;

          const split = await tx.expenseSplit.findFirst({
            where: {
              id: splitId,
              userId: fromUserId,
              expense: { paidById: toUserId },
              isSettled: false
            }
          });

          if (split) {
            const splitAmountCents = toCents(split.amount);
            const settleAmount = Math.min(remainingToSettle, splitAmountCents);

            await tx.expenseSplit.update({
              where: { id: splitId },
              data: { 
                isSettled: settleAmount >= splitAmountCents,
                settledAt: settleAmount >= splitAmountCents ? new Date() : null
              }
            });

            await tx.settlementSplit.create({
              data: {
                settlementId: newSettlement.id,
                expenseSplitId: splitId,
                amount: settleAmount / 100
              }
            });

            remainingToSettle -= settleAmount;
          }
        }
      } else {
        // Auto-settle oldest splits first
        let remainingToSettle = amountCents;
        const splits = await tx.expenseSplit.findMany({
          where: {
            userId: fromUserId,
            expense: { paidById: toUserId },
            isSettled: false
          },
          orderBy: { createdAt: 'asc' }
        });

        for (const split of splits) {
          if (remainingToSettle <= 0) break;

          const splitAmountCents = toCents(split.amount);
          const settleAmount = Math.min(remainingToSettle, splitAmountCents);

          await tx.expenseSplit.update({
            where: { id: split.id },
            data: { 
              isSettled: settleAmount >= splitAmountCents,
              settledAt: settleAmount >= splitAmountCents ? new Date() : null
            }
          });

          await tx.settlementSplit.create({
            data: {
              settlementId: newSettlement.id,
              expenseSplitId: split.id,
              amount: settleAmount / 100
            }
          });

          remainingToSettle -= settleAmount;
        }
      }

      return tx.settlement.findUnique({
        where: { id: newSettlement.id },
        include: {
          fromUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          toUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          settledSplits: {
            include: {
              expenseSplit: {
                include: {
                  expense: {
                    select: {
                      description: true
                    }
                  }
                }
              }
            }
          }
        }
      });
    });

    logger.info(`Settlement created: ${settlement.id} from ${fromUserId} to ${toUserId}`);
    return settlement;
  }

  async getUserSettlements(userId, pagination) {
    const { skip, take } = pagination;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId }
          ]
        },
        include: {
          fromUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          toUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          settledSplits: {
            include: {
              expenseSplit: {
                include: {
                  expense: {
                    select: {
                      description: true,
                      amount: true
                    }
                  }
                }
              }
            }
          }
        },
        skip,
        take,
        orderBy: { settlementDate: 'desc' }
      }),
      prisma.settlement.count({
        where: {
          OR: [
            { fromUserId: userId },
            { toUserId: userId }
          ]
        }
      })
    ]);

    return { settlements, total };
  }

  async getSettlementById(settlementId, userId) {
    const settlement = await prisma.settlement.findFirst({
      where: {
        id: settlementId,
        OR: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      },
      include: {
        fromUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        toUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        settledSplits: {
          include: {
            expenseSplit: {
              include: {
                expense: true
              }
            }
          }
        }
      }
    });

    if (!settlement) {
      throw { statusCode: 404, message: 'Settlement not found' };
    }

    return settlement;
  }

  async updateSettlement(settlementId, userId, data) {
    const settlement = await prisma.settlement.findFirst({
      where: {
        id: settlementId,
        fromUserId: userId
      }
    });

    if (!settlement) {
      throw { statusCode: 404, message: 'Settlement not found or unauthorized' };
    }

    if (settlement.status !== 'PENDING') {
      throw { statusCode: 400, message: 'Only pending settlements can be updated' };
    }

    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        notes: data.notes
      }
    });

    logger.info(`Settlement updated: ${settlementId}`);
    return updated;
  }

  async deleteSettlement(settlementId, userId) {
    const settlement = await prisma.settlement.findFirst({
      where: {
        id: settlementId,
        fromUserId: userId
      }
    });

    if (!settlement) {
      throw { statusCode: 404, message: 'Settlement not found or unauthorized' };
    }

    if (settlement.status !== 'PENDING') {
      throw { statusCode: 400, message: 'Cannot delete a confirmed settlement' };
    }

    // Revert splits tied to this settlement
    await prisma.$transaction(async (tx) => {
      const splits = await tx.settlementSplit.findMany({
        where: { settlementId }
      });

      for (const split of splits) {
        await tx.expenseSplit.update({
          where: { id: split.expenseSplitId },
          data: { isSettled: false, settledAt: null }
        });
      }

      await tx.settlementSplit.deleteMany({ where: { settlementId } });
      await tx.settlement.delete({ where: { id: settlementId } });
    });

    logger.info(`Settlement deleted: ${settlementId}`);
  }

  async confirmSettlement(settlementId, userId) {
    // Only the receiver can confirm the settlement
    const settlement = await prisma.settlement.findFirst({
      where: {
        id: settlementId,
        toUserId: userId
      }
    });

    if (!settlement) {
      throw { statusCode: 404, message: 'Settlement not found or unauthorized to confirm' };
    }

    if (settlement.status === 'COMPLETED') {
      throw { statusCode: 400, message: 'Settlement is already confirmed' };
    }

    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'COMPLETED' }
    });

    logger.info(`Settlement confirmed: ${settlementId}`);
    return updated;
  }
}

module.exports = new SettlementsService();
