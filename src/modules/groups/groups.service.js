const prisma = require('../../config/database');
const logger = require('../../utils/logger');

class GroupsService {
  async createGroup(userId, groupData) {
    const { name, description, image, memberIds = [] } = groupData;

    // Create group with creator as admin member
    const group = await prisma.group.create({
      data: {
        name,
        description,
        image,
        createdBy: userId,
        members: {
          create: [
            {
              userId,
              isAdmin: true
            },
            ...memberIds.filter(id => id !== userId).map(id => ({
              userId: id,
              isAdmin: false
            }))
          ]
        }
      },
      include: {
        members: {
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
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    logger.info(`Group created: ${group.id} by ${userId}`);
    return group;
  }

  async getGroupById(groupId, userId) {
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        members: {
          some: {
            userId
          }
        }
      },
      include: {
        members: {
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
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        expenses: {
          take: 5,
          orderBy: { createdAt: 'desc' },
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
                    lastName: true
                  }
                  }
                }
              }
            }
          }
        }
      }
    );

    if (!group) {
      throw { statusCode: 404, message: 'Group not found' };
    }

    return group;
  }

  async getUserGroups(userId, pagination) {
    const { skip, take } = pagination;

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where: {
          members: {
            some: {
              userId
            }
          }
        },
        include: {
          members: {
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
          },
          _count: {
            select: {
              members: true,
              expenses: true
            }
          }
        },
        skip,
        take,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.group.count({
        where: {
          members: {
            some: {
              userId
            }
          }
        }
      })
    ]);

    return { groups, total };
  }

  async updateGroup(groupId, userId, updateData) {
    // Check if user is admin
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        isAdmin: true
      }
    });

    if (!membership) {
      throw { statusCode: 403, message: 'Only admin can update group' };
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        members: {
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

    logger.info(`Group updated: ${groupId}`);
    return group;
  }

  async deleteGroup(groupId, userId) {
    // Check if user is creator
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        createdBy: userId
      }
    });

    if (!group) {
      throw { statusCode: 403, message: 'Only creator can delete group' };
    }

    await prisma.group.delete({
      where: { id: groupId }
    });

    logger.info(`Group deleted: ${groupId}`);
  }

  async addMember(groupId, adminId, userId) {
    // Check if admin
    const adminMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: adminId,
        isAdmin: true
      }
    });

    if (!adminMembership) {
      throw { statusCode: 403, message: 'Only admin can add members' };
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    // Check if already member
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId
      }
    });

    if (existingMember) {
      throw { statusCode: 409, message: 'User is already a member' };
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId,
        userId
      },
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
    });

    logger.info(`Member added to group ${groupId}: ${userId}`);
    return member;
  }

  async removeMember(groupId, adminId, userId) {
    // Check if admin
    const adminMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: adminId,
        isAdmin: true
      }
    });

    // Allow self-removal
    if (adminId !== userId && !adminMembership) {
      throw { statusCode: 403, message: 'Only admin can remove members' };
    }

    // Prevent removing creator
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (group.createdBy === userId) {
      throw { statusCode: 400, message: 'Cannot remove group creator' };
    }

    await prisma.groupMember.deleteMany({
      where: {
        groupId,
        userId
      }
    });

    logger.info(`Member removed from group ${groupId}: ${userId}`);
  }

  async getGroupBalances(groupId, userId) {
    // Check membership
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId
      }
    });

    if (!membership) {
      throw { statusCode: 403, message: 'Not a member of this group' };
    }

    // Get all expenses in group
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        paidBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
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

    // Calculate balances
    const balances = {};

    expenses.forEach(expense => {
      const payerId = expense.paidById;
      const amount = parseFloat(expense.amount);

      // Payer lent money
      if (!balances[payerId]) {
        balances[payerId] = { user: expense.paidBy, lent: 0, borrowed: 0 };
      }
      balances[payerId].lent += amount;

      // Splitters borrowed money
      expense.splits.forEach(split => {
        const splitUserId = split.userId;
        const splitAmount = parseFloat(split.amount);

        if (!balances[splitUserId]) {
          balances[splitUserId] = { user: split.user, lent: 0, borrowed: 0 };
        }
        balances[splitUserId].borrowed += splitAmount;
      });
    });

    // Calculate net balance
    const result = Object.values(balances).map(b => ({
      user: b.user,
      lent: b.lent,
      borrowed: b.borrowed,
      netBalance: b.lent - b.borrowed
    }));

    return result;
  }

  async getGroupMembers(groupId, userId) {
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      throw { statusCode: 403, message: 'Not a member of this group' };
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId },
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
    });

    return members;
  }

  async getGroupExpenses(groupId, userId, pagination) {
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId }
    });

    if (!membership) {
      throw { statusCode: 403, message: 'Not a member of this group' };
    }

    const { skip, take } = pagination;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId },
        include: {
          paidBy: {
            select: { id: true, firstName: true, lastName: true, avatar: true }
          },
          splits: {
            include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } }
          }
        },
        skip,
        take,
        orderBy: { date: 'desc' }
      }),
      prisma.expense.count({ where: { groupId } })
    ]);

    return { expenses, total };
  }

  async settleGroup(groupId, userId) {
    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId, isAdmin: true }
    });

    if (!membership) {
      throw { statusCode: 403, message: 'Only admin can settle group debts entirely' };
    }

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      select: { id: true }
    });

    const expenseIds = expenses.map(e => e.id);

    // Update all expense splits to settled
    await prisma.expenseSplit.updateMany({
      where: { expenseId: { in: expenseIds } },
      data: { isSettled: true }
    });

    logger.info(`Group settled by admin: ${groupId}`);
    return { success: true, message: 'All group debts marked as settled' };
  }
}

module.exports = new GroupsService();
