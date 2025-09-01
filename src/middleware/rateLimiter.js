const rateLimit = require('express-rate-limit');
const config = require('../config');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, 
  max: config.rateLimit.maxRequests, 
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.authMaxRequests, // 5 requests per windowMs
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Too many authentication attempts, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
  skip: () => process.env.NODE_ENV === 'test', // Skip rate limiting in tests
});

// Very strict rate limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: config.rateLimit.paymentMaxRequests, // 3 requests per hour
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Too many payment attempts, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Create account limiter (very strict)
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 account creation attempts per hour per IP
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Too many account creation attempts, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test', // Skip rate limiting in tests
});

// Password reset limiter
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 password reset attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 429,
      message: 'Too many password reset attempts, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  createAccountLimiter,
  passwordResetLimiter
};