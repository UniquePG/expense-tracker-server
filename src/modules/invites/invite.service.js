const prisma = require('../../config/database');
const logger = require('../../utils/logger');
const crypto = require('crypto');

class InvitesService {
  async createInvite(invitedById, inviteData) {
    const { email, phone, expenseId } = inviteData;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          phone ? { phone } : {}
        ]
      }
    });

    if (existingUser) {
      throw { statusCode: 409, message: 'User already registered' };
    }

    // Check for existing pending invite
    const existingInvite = await prisma.invite.findFirst({
      where: {
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    });

    if (existingInvite) {
      throw { statusCode: 409, message: 'Invite already pending' };
    }

    // Create invite token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invite = await prisma.invite.create({
      data: {
        email,
        phone,
        invitedById,
        token,
        expiresAt,
        ...(expenseId && {
          data: JSON.stringify({ expenseId })
        })
      }
    });

    // TODO: Send email/SMS invitation
    logger.info(`Invite created: ${invite.id} for ${email}`);
    return invite;
  }

  async getUserInvites(userId, pagination) {
    const { skip, take } = pagination;

    const [invites, total] = await Promise.all([
      prisma.invite.findMany({
        where: { invitedById: userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invite.count({ where: { invitedById: userId } })
    ]);

    return { invites, total };
  }

  async getPendingInvites(userId) {
    return prisma.invite.findMany({
      where: {
        invitedById: userId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    });
  }

  async processInviteOnRegistration(email, userId) {
    const invites = await prisma.invite.findMany({
      where: {
        email,
        status: 'PENDING'
      }
    });

    for (const invite of invites) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          registeredUserId: userId
        }
      });

      // If invite was for specific expense, link user
      if (invite.data) {
        try {
          const data = JSON.parse(invite.data);
          if (data.expenseId) {
            // Update expense splits to link to new user
            await prisma.expenseSplit.updateMany({
              where: {
                expenseId: data.expenseId,
                // Match by temporary identifier if stored
              },
              data: { userId }
            });
          }
        } catch (e) {
          logger.error('Error processing invite data:', e);
        }
      }
    }

    logger.info(`Processed ${invites.length} invites for ${email}`);
    return invites.length;
  }
}

module.exports = new InvitesService();
