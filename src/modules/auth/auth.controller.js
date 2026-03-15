const authService = require('./auth.service');
const ApiResponse = require('../../utils/response');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.validatedBody);
      return ApiResponse.success(res, 'User registered successfully', result, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.validatedBody;
      const result = await authService.login(email, password);
      return ApiResponse.success(res, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.validatedBody;
      const result = await authService.refreshToken(refreshToken);
      return ApiResponse.success(res, 'Token refreshed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      return ApiResponse.success(res, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req, res, next) {
    try {
      await authService.logoutAll(req.user.id);
      return ApiResponse.success(res, 'Logged out from all devices');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.validatedBody;
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      return ApiResponse.success(res, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      return ApiResponse.success(res, 'User profile retrieved', { user: req.user });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.validatedBody;
      await authService.forgotPassword(email);
      return ApiResponse.success(res, 'Password reset link sent to your email');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.validatedBody;
      await authService.resetPassword(token, password);
      return ApiResponse.success(res, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;
      await authService.verifyEmail(token);
      return ApiResponse.success(res, 'Email verified successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
