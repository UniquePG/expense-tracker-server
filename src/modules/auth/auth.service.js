const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const config = require('../../config/env');
const logger = require('../../utils/logger');

class AuthService {
  /**
   * Generate JWT tokens
   */
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

    return { token: accessToken, refreshToken };
  }

  /**
   * Register new user
   */
  async register(userData) {
    const { email, password, firstName, lastName, phone, currency } = userData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw { statusCode: 409, message: 'Email already registered' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        currency: currency || 'USD'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        currency: true,
        createdAt: true
      }
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    logger.info(`New user registered: ${email}`);

    return {
      user,
      ...tokens
    };
  }

  /**
   * Login user
   */
  async login(email, password) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    if (!user.isActive) {
      throw { statusCode: 401, message: 'Account is deactivated' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`User logged in: ${email}`);

    return {
      user: userWithoutPassword,
      ...tokens
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      // Check if token exists in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        throw { statusCode: 401, message: 'Invalid or expired refresh token' };
      }

      // Generate new tokens
      const tokens = this.generateTokens(decoded.userId);

      // Delete old refresh token and save new one
      await prisma.$transaction([
        prisma.refreshToken.delete({
          where: { token: refreshToken }
        }),
        prisma.refreshToken.create({
          data: {
            token: tokens.refreshToken,
            userId: decoded.userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
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

  /**
   * Save refresh token to database
   */
  async saveRefreshToken(userId, token) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt
      }
    });
  }

  /**
   * Logout user
   */
  async logout(refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });

    logger.info('User logged out');
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });

    logger.info(`User ${userId} logged out from all devices`);
  }

  /**
   * Change password
   */
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

    // Remove all refresh tokens (logout from all devices)
    await this.logoutAll(userId);

    logger.info(`Password changed for user: ${userId}`);
  }

  /**
   * Forgot password - generate reset token
   */
  async forgotPassword(email) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      logger.info(`Forgot password attempted for non-existent email: ${email}`);
      return;
    }

    // Generate a secure reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: resetTokenExpiry
      }
    });

    // In production, send email. For now, log the token.
    logger.info(`Password reset token for ${email}: ${resetToken}`);
  }

  /**
   * Reset password using token
   */
  async resetPassword(token, newPassword) {
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() }
      }
    });

    if (!user) {
      throw { statusCode: 400, message: 'Invalid or expired reset token' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      }
    });

    // Revoke all refresh tokens
    await this.logoutAll(user.id);

    logger.info(`Password reset successful for user: ${user.id}`);
  }

  /**
   * Verify email address
   */
  async verifyEmail(token) {
    if (!token) {
      throw { statusCode: 400, message: 'Verification token is required' };
    }

    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: tokenHash
      }
    });

    if (!user) {
      throw { statusCode: 400, message: 'Invalid verification token' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null
      }
    });

    logger.info(`Email verified for user: ${user.id}`);
  }
}

module.exports = new AuthService();
