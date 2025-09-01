const User = require('../models/User');
const JWTUtils = require('../utils/jwt');
const PasswordUtils = require('../utils/password');

class AuthController {
  /**
   * Register a new user
   */
  static async signup(req, res, next) {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 409,
            message: 'User with this email already exists'
          }
        });
      }

      // Validate password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Password does not meet requirements',
            details: passwordValidation.errors
          }
        });
      }

      // Create new user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        role: role || 'member'
      });

      await user.save();

      // Generate tokens
      const tokens = JWTUtils.generateTokenPair(user);

      // Save refresh token
      await user.addRefreshToken(tokens.refreshToken);

      res.status(201).json({
        success: true,
        data: {
          user: user.toJSON(),
          tokens
        },
        message: 'User registered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Find user and include password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 401,
            message: 'Invalid email or password'
          }
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 401,
            message: 'Invalid email or password'
          }
        });
      }

      // Generate tokens
      const tokens = JWTUtils.generateTokenPair(user);

      // Save refresh token
      await user.addRefreshToken(tokens.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          user: user.toJSON(),
          tokens
        },
        message: 'Login successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  static async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      let decoded;
      try {
        decoded = JWTUtils.verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: {
            code: 401,
            message: 'Invalid or expired refresh token'
          }
        });
      }

      // Find user and check if refresh token exists
      const user = await User.findById(decoded.userId);
      if (!user || !user.refreshTokens.includes(refreshToken)) {
        return res.status(401).json({
          success: false,
          error: {
            code: 401,
            message: 'Invalid refresh token'
          }
        });
      }

      // Remove old refresh token
      await user.removeRefreshToken(refreshToken);

      // Generate new tokens
      const tokens = JWTUtils.generateTokenPair(user);

      // Save new refresh token
      await user.addRefreshToken(tokens.refreshToken);

      res.status(200).json({
        success: true,
        data: {
          tokens
        },
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  static async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Verify and remove specific refresh token
        try {
          const decoded = JWTUtils.verifyRefreshToken(refreshToken);
          const user = await User.findById(decoded.userId);
          if (user) {
            await user.removeRefreshToken(refreshToken);
          }
        } catch (error) {
          // Token might be invalid, but we still want to logout
        }
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(req, res, next) {
    try {
      const user = req.user;
      await user.removeAllRefreshTokens();

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: req.user.toJSON()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res, next) {
    try {
      const { firstName, lastName } = req.body;
      const user = req.user;

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;

      await user.save();

      res.status(200).json({
        success: true,
        data: {
          user: user.toJSON()
        },
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id).select('+password');

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Current password is incorrect'
          }
        });
      }

      // Validate new password strength
      const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'New password does not meet requirements',
            details: passwordValidation.errors
          }
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Logout from all devices for security
      await user.removeAllRefreshTokens();

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;