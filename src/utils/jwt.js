const jwt = require('jsonwebtoken');
const config = require('../config');

class JWTUtils {
  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @returns {String} JWT token
   */
  static generateAccessToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'project-management-api',
      audience: 'project-management-client'
    });
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {String} JWT refresh token
   */
  static generateRefreshToken(payload) {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'project-management-api',
      audience: 'project-management-client'
    });
  }

  /**
   * Verify access token
   * @param {String} token - JWT token
   * @returns {Object} Decoded token payload
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'project-management-api',
        audience: 'project-management-client'
      });
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   * @param {String} token - JWT refresh token
   * @returns {Object} Decoded token payload
   */
  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'project-management-api',
        audience: 'project-management-client'
      });
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Generate token pair (access + refresh)
   * @param {Object} user - User object
   * @returns {Object} Token pair
   */
  static generateTokenPair(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      isPremium: user.isPremium
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({ userId: user._id });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn
    };
  }

  /**
   * Decode token without verification (for debugging)
   * @param {String} token - JWT token
   * @returns {Object} Decoded token
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = JWTUtils;