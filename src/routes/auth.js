const express = require('express');
const AuthController = require('../controllers/authController');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { 
  authLimiter, 
  createAccountLimiter, 
  passwordResetLimiter 
} = require('../middleware/rateLimiter');
const {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema
} = require('../validators/auth');

const router = express.Router();

// Public routes
router.post('/signup', 
  createAccountLimiter,
  validate(signupSchema),
  AuthController.signup
);

router.post('/login',
  authLimiter,
  validate(loginSchema),
  AuthController.login
);

router.post('/refresh',
  authLimiter,
  validate(refreshTokenSchema),
  AuthController.refresh
);

router.post('/logout',
  AuthController.logout
);

// Protected routes (require authentication)
router.use(authenticate);

router.get('/profile',
  AuthController.getProfile
);

router.patch('/profile',
  validate(updateProfileSchema),
  AuthController.updateProfile
);

router.post('/change-password',
  passwordResetLimiter,
  validate(changePasswordSchema),
  AuthController.changePassword
);

router.post('/logout-all',
  AuthController.logoutAll
);

module.exports = router;