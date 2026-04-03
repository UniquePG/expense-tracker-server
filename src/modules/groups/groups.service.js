const prisma = require('../../config/database');
const logger = require('../../utils/logger');

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatar: true
};

class GroupsService {
  async ensureActiveMembership(groupId, userId) {
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        status: 'ACTIVE'
      }
    });

    if (!membership) {
      throw { statusCode: 403, message: 'Not a member of this group' };
    }

    return membership;
  }

  async ensureAdmin(groupId, userId) {
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        status: 'ACTIVE',
        isAdmin: true
      }
    });

    if (!membership) {
      throw { statusCode: 403, message: 'Only group admins can perform this action' };
    }

    return membership;
  }

  async createGroup(userId, groupData) {
    const { name, description, image, memberIds = [] } = groupData;

    const uniqueMemberIds = [...new Set(memberIds.filter((id) => id !== userId))];

    const group = await prisma.group.create({
      data: {
        name,
        description,
        image,
        createdBy: userId,
        status: 'ACTIVE',
        members: {
          create: [
            {
              userId,
              isAdmin: true,
              status: 'ACTIVE'
            },
            ...uniqueMemberIds.map((memberId) => ({
              userId: memberId,
              isAdmin: false,
              status: 'ACTIVE'
            }))
          ]
        }
      },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: userSelect },
            contact: true
          }
        },
        creator: { select: userSelect }
      }
    });

    logger.info(`Group created: ${group.id} by ${userId}`);
    return group;
  }

  async getGroupById(groupId, userId) {
    await this.ensureActiveMembership(groupId, userId);

    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        status: { not: 'DELETED' }
      },
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: userSelect },
            contact: true
          }
        },
        creator: { select: userSelect },
        expenses: {
          where: { isDeleted: false },
          take: 10,
          orderBy: { expenseDate: 'desc' },
          include: {
            paidBy: { select: userSelect },
            category: true,
            splits: {
              include: {
                user: { select: userSelect },
                contact: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      throw { statusCode: 404, message: 'Group not found' };
    }

    return group;
  }

  async getUserGroups(userId, pagination) {
    const { skip, take } = pagination;

    const where = {
      status: { not: 'DELETED' },
      members: {
        some: {
          userId,
          status: 'ACTIVE'
        }
      }
    };

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        include: {
          members: {
            where: { status: 'ACTIVE' },
            include: {
              user: { select: userSelect },
              contact: true
            }
          },
          _count: {
            select: {
              members: true,
              expenses: true
            }
          },
          expenses: {
            where: { isDeleted: false },
            select: {
              amount: true,
              paidById: true,
              expenseDate: true,
              splits: {
                select: {
                  userId: true,
                  amount: true,
                  isSettled: true
                }
              }
            }
          }
        },
        skip,
        take,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.group.count({ where })
    ]);

    const enrichedGroups = groups.map((group) => {
      const expenses = group.expenses || [];
      const totalPaidByUser = expenses.reduce((sum, expense) => {
        if (expense.paidById === userId) {
          return sum + parseFloat(expense.amount);
        }
        return sum;
      }, 0);

      const totalOwedByUser = expenses.reduce((sum, expense) => {
        const ownSplit = (expense.splits || []).find(
          (split) => split.userId === userId && !split.isSettled
        );
        return sum + (ownSplit ? parseFloat(ownSplit.amount) : 0);
      }, 0);

      const latestExpenseDate = expenses
        .map((expense) => expense.expenseDate)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0];

      return {
        ...group,
        memberCount: group._count?.members || group.members?.length || 0,
        expenseCount: group._count?.expenses || 0,
        myBalance: parseFloat((totalPaidByUser - totalOwedByUser).toFixed(2)),
        lastActivityAt: latestExpenseDate || group.updatedAt
      };
    });

    return { groups: enrichedGroups, total };
  }

  async updateGroup(groupId, userId, updateData) {
    await this.ensureAdmin(groupId, userId);

    const group = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: {
        members: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: userSelect },
            contact: true
          }
        }
      }
    });

    logger.info(`Group updated: ${groupId}`);
    return group;
  }

  async deleteGroup(groupId, userId) {
    await this.ensureAdmin(groupId, userId);

    const unsettledCount = await prisma.expenseSplit.count({
      where: {
        isSettled: false,
        expense: {
          groupId,
          isDeleted: false
        }
      }
    });

    if (unsettledCount > 0) {
      throw { statusCode: 400, message: 'Cannot delete group with unsettled splits' };
    }

    await prisma.group.update({
      where: { id: groupId },
      data: { status: 'DELETED' }
    });

    logger.info(`Group soft-deleted: ${groupId}`);
  }

  async addMember(groupId, actorUserId, memberData) {
    await this.ensureActiveMembership(groupId, actorUserId);

    const { userId, contactId } = memberData;
    if (!userId && !contactId) {
      throw { statusCode: 400, message: 'Either userId or contactId is required' };
    }

    if (userId && contactId) {
      throw { statusCode: 400, message: 'Provide either userId or contactId, not both' };
    }

    if (userId) {
      if (userId === actorUserId) {
        throw { statusCode: 400, message: 'User is already in the group' };
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw { statusCode: 404, message: 'User not found' };
      }

      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: actorUserId, addresseeId: userId },
            { requesterId: userId, addresseeId: actorUserId }
          ],
          status: 'ACCEPTED'
        }
      });

      if (!friendship) {
        throw { statusCode: 403, message: 'Only accepted friends can be added to group' };
      }
    }

    if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: {
          id: contactId,
          ownerId: actorUserId
        }
      });

      if (!contact) {
        throw { statusCode: 404, message: 'Contact not found' };
      }
    }

    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        ...(userId ? { userId } : {}),
        ...(contactId ? { contactId } : {}),
        status: 'ACTIVE'
      }
    });

    if (existingMember) {
      throw { statusCode: 409, message: 'Member is already active in this group' };
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId,
        userId: userId || null,
        contactId: contactId || null,
        status: 'ACTIVE'
      },
      include: {
        user: { select: userSelect },
        contact: true
      }
    });

    logger.info(`Member added to group ${groupId}: ${userId || contactId}`);
    return member;
  }

  async removeMember(groupId, actorUserId, memberIdentifier) {
    const actorMembership = await this.ensureActiveMembership(groupId, actorUserId);
    const numericIdentifier = Number(memberIdentifier);
    const normalizedIdentifier = Number.isNaN(numericIdentifier)
      ? memberIdentifier
      : numericIdentifier;

    const targetMembership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        status: 'ACTIVE',
        OR: [
          { id: normalizedIdentifier },
          { userId: normalizedIdentifier },
          { contactId: normalizedIdentifier }
        ]
      }
    });

    if (!targetMembership) {
      throw { statusCode: 404, message: 'Member not found in group' };
    }

    const isSelfRemoval = targetMembership.userId === actorUserId;

    if (!isSelfRemoval && !actorMembership.isAdmin) {
      throw { statusCode: 403, message: 'Only admins can remove other members' };
    }

    if (targetMembership.isAdmin && !isSelfRemoval) {
      const activeAdmins = await prisma.groupMember.count({
        where: {
          groupId,
          status: 'ACTIVE',
          isAdmin: true
        }
      });

      if (activeAdmins <= 1) {
        throw { statusCode: 400, message: 'Cannot remove the only admin in the group' };
      }
    }

    await prisma.groupMember.update({
      where: { id: targetMembership.id },
      data: {
        status: isSelfRemoval ? 'LEFT' : 'REMOVED',
        leftAt: new Date()
      }
    });

    logger.info(`Member removed from group ${groupId}: ${memberIdentifier}`);
  }

  async toggleMemberAdmin(groupId, adminUserId, memberId, isAdmin) {
    await this.ensureAdmin(groupId, adminUserId);

    const targetMembership = await prisma.groupMember.findFirst({
      where: {
        id: memberId,
        groupId,
        status: 'ACTIVE'
      }
    });

    if (!targetMembership) {
      throw { statusCode: 404, message: 'Member not found' };
    }

    if (!isAdmin && targetMembership.userId === adminUserId) {
      const activeAdmins = await prisma.groupMember.count({
        where: {
          groupId,
          status: 'ACTIVE',
          isAdmin: true
        }
      });

      if (activeAdmins <= 1) {
        throw { statusCode: 400, message: 'Cannot remove own admin role as the only admin' };
      }
    }

    const updated = await prisma.groupMember.update({
      where: { id: targetMembership.id },
      data: { isAdmin },
      include: {
        user: { select: userSelect },
        contact: true
      }
    });

    logger.info(`Member admin toggled in group ${groupId}: ${memberId} => ${isAdmin}`);
    return updated;
  }

  async getGroupMembers(groupId, userId) {
    await this.ensureActiveMembership(groupId, userId);

    return prisma.groupMember.findMany({
      where: {
        groupId,
        status: 'ACTIVE'
      },
      include: {
        user: { select: userSelect },
        contact: true
      },
      orderBy: { joinedAt: 'asc' }
    });
  }

  async getGroupExpenses(groupId, userId, pagination) {
    await this.ensureActiveMembership(groupId, userId);

    const { skip, take } = pagination;

    const where = {
      groupId,
      isDeleted: false
    };

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          paidBy: { select: userSelect },
          category: true,
          splits: {
            include: {
              user: { select: userSelect },
              contact: true
            }
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

  async getGroupBalances(groupId, userId) {
    await this.ensureActiveMembership(groupId, userId);

    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
        status: 'ACTIVE'
      },
      include: {
        user: { select: userSelect },
        contact: true
      }
    });

    const memberMap = new Map();
    members.forEach((member) => {
      const key = member.userId || member.contactId;
      memberMap.set(key, {
        memberId: member.id,
        user: member.user,
        contact: member.contact,
        isAdmin: member.isAdmin,
        totalPaid: 0,
        totalOwes: 0
      });
    });

    const expenses = await prisma.expense.findMany({
      where: {
        groupId,
        isDeleted: false
      },
      include: {
        splits: true
      }
    });

    expenses.forEach((expense) => {
      const payerKey = expense.paidById;
      if (memberMap.has(payerKey)) {
        memberMap.get(payerKey).totalPaid += parseFloat(expense.amount);
      }

      expense.splits.forEach((split) => {
        const splitKey = split.userId || split.contactId;
        if (splitKey && memberMap.has(splitKey) && !split.isSettled) {
          memberMap.get(splitKey).totalOwes += parseFloat(split.amount);
        }
      });
    });

    return Array.from(memberMap.values()).map((member) => ({
      ...member,
      balance: parseFloat((member.totalPaid - member.totalOwes).toFixed(2))
    }));
  }

  async settleGroup(groupId, userId) {
    await this.ensureAdmin(groupId, userId);

    const expenses = await prisma.expense.findMany({
      where: {
        groupId,
        isDeleted: false
      },
      select: { id: true }
    });

    const expenseIds = expenses.map((expense) => expense.id);

    if (expenseIds.length === 0) {
      return { success: true, message: 'No unsettled group splits found' };
    }

    await prisma.expenseSplit.updateMany({
      where: {
        expenseId: { in: expenseIds },
        isSettled: false
      },
      data: {
        isSettled: true,
        settledAt: new Date()
      }
    });

    logger.info(`Group settled by admin: ${groupId}`);
    return { success: true, message: 'All group debts marked as settled' };
  }
}

module.exports = new GroupsService();
