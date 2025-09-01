const JWTUtils = require('../utils/jwt');
const User = require('../models/User');

/**
 * Authentication middleware to verify JWT tokens
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 401,
          message: 'Access token is required'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token
    const decoded = JWTUtils.verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 401,
          message: 'User not found'
        }
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 401,
        message: error.message || 'Invalid token'
      }
    });
  }
};

/**
 * Authorization middleware to check user roles
 * @param {Array} roles - Array of allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 401,
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 403,
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = JWTUtils.verifyAccessToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Middleware to check if user is premium
 */
const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 401,
        message: 'Authentication required'
      }
    });
  }

  if (!req.user.isPremium) {
    return res.status(403).json({
      success: false,
      error: {
        code: 403,
        message: 'Premium subscription required'
      }
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  requirePremium
};