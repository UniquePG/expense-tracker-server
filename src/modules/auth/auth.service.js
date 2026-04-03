const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../config/database');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const { emailVerificationTemplate } = require('../../mailing/emailTemplates');
const { sendMail } = require('../../mailing/mailer');

class AuthService {
  generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return {
      accessToken,
      token: accessToken,
      refreshToken
    };
  }

  buildExpiry(days) {
    return new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
  }

  createVerificationToken() {
    return {
      token: crypto.randomBytes(32).toString('hex')
    };
  }

  async register(userData) {
    const { email, password, firstName, lastName, phone, currency } = userData;

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      throw { statusCode: 409, message: 'Email already registered' };
    }

    if (phone) {
      const existingByPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingByPhone) {
        throw { statusCode: 409, message: 'Phone number already registered' };
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        currency: currency || 'INR',
        isEmailVerified: false,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        currency: true,
        isEmailVerified: true,
        createdAt: true
      }
    });

    const tokens = this.generateTokens(user.id);

    const token = this.createVerificationToken().token 

    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: this.buildExpiry(30)
        }
      }),
      prisma.emailVerification.create({
        data: {
          userId: user.id,
          token: token,
          expiresAt: this.buildExpiry(1)
        }
      })
    ]);

    await sendMail({
      to: email,
      subject: 'Verify your email',
      body: emailVerificationTemplate({
        name: firstName,
        verificationLink: `${config.server_url}/api/v1/auth/verify-email?token=${token}`
      })
    });

    logger.info(`New user registered: ${email}`);

    return {
      user,
      ...tokens
    };
  }

  async login(email, password, pushToken) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    if (!user.isActive) {
      throw { statusCode: 403, message: 'Account is deactivated' };
    }

    if (!user.isEmailVerified) {
      throw { statusCode: 401, message: 'Account is not verified' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const tokens = this.generateTokens(user.id);

    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: this.buildExpiry(30)
        }
      }),
      ...(pushToken ? [
        prisma.user.update({
          where: { id: user.id },
          data: { pushToken }
        })
      ] : [])
    ]);

    const { password: _, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${email}`);

    return {
      user: userWithoutPassword,
      ...tokens
    };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw { statusCode: 401, message: 'Invalid or expired refresh token' };
      }

      const tokens = this.generateTokens(decoded.userId);

      await prisma.$transaction([
        prisma.refreshToken.delete({ where: { token: refreshToken } }),
        prisma.refreshToken.create({
          data: {
            token: tokens.refreshToken,
            userId: decoded.userId,
            expiresAt: this.buildExpiry(30)
          }
        })
      ]);

      return tokens;
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw { statusCode: 401, message: 'Invalid or expired refresh token' };
      }

      throw error;
    }
  }

  async saveRefreshToken(userId, token) {
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt: this.buildExpiry(30)
      }
    });
  }

  async logout(refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });

    logger.info('User logged out');
  }

  async logoutAll(userId) {
    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: { pushToken: null }
      })
    ]);

    logger.info(`User ${userId} logged out from all devices`);
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      throw { statusCode: 401, message: 'Current password is incorrect' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    await this.logoutAll(userId);

    logger.info(`Password changed for user: ${userId}`);
  }

  async forgotPassword(email) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      logger.info(`Forgot password attempted for non-existent email: ${email}`);
      return;
    }

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: this.createVerificationToken().token,
        expiresAt: this.buildExpiry(1 / 24)
      }
    });

    logger.info(`Password reset token generated for: ${email}`);
  }

  async resetPassword(token, newPassword) {
    const verification = await prisma.emailVerification.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verification) {
      throw { statusCode: 400, message: 'Invalid or expired reset token' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verification.userId },
        data: { password: hashedPassword }
      }),
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() }
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: verification.userId }
      })
    ]);

    logger.info(`Password reset successful for user: ${verification.userId}`);
  }

  async verifyEmail(token) {
    if (!token) {
      throw { statusCode: 400, message: 'Verification token is required' };
    }

    const emailVerification = await prisma.emailVerification.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!emailVerification) {
      throw { statusCode: 400, message: 'Invalid or expired verification token' };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: emailVerification.userId },
        data: { isEmailVerified: true }
      }),
      prisma.emailVerification.update({
        where: { id: emailVerification.id },
        data: { usedAt: new Date() }
      })
    ]);

    logger.info(`Email verified for user: ${emailVerification.userId}`);
  }

  async resendVerificationEmail(email) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }

    if (user.isEmailVerified) {
      throw { statusCode: 400, message: 'Email is already verified' };
    }

    await prisma.$transaction([
      prisma.emailVerification.deleteMany({
        where: {
          userId: user.id,
          usedAt: null
        }
      }),
      prisma.emailVerification.create({
        data: {
          userId: user.id,
          token: this.createVerificationToken().token,
          expiresAt: this.buildExpiry(1)
        }
      })
    ]);

    logger.info(`Verification email resent to: ${email}`);
  }
}

module.exports = new AuthService();
