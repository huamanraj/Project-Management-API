const express = require('express');
const BillingController = require('../controllers/billingController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { paymentLimiter, apiLimiter } = require('../middleware/rateLimiter');
const {
  createUpgradeOrderSchema,
  verifyPaymentSchema,
  handlePaymentFailureSchema,
  paymentHistoryQuerySchema,
  cancelPaymentSchema,
  webhookSchema,
  adminPaymentQuerySchema
} = require('../validators/billing');

const router = express.Router();

// Public routes (no authentication required)
router.post('/webhook',
  express.raw({ type: 'application/json' }), // Raw body for webhook signature verification
  BillingController.handleWebhook
);

// Apply authentication to all other routes
router.use(authenticate);

// Public authenticated routes
router.get('/plans',
  apiLimiter,
  BillingController.getAvailablePlans
);

router.get('/status',
  apiLimiter,
  BillingController.getBillingStatus
);

router.get('/history',
  apiLimiter,
  validate(paymentHistoryQuerySchema),
  BillingController.getPaymentHistory
);

// Payment routes with strict rate limiting
router.post('/upgrade',
  paymentLimiter,
  validate(createUpgradeOrderSchema),
  BillingController.createUpgradeOrder
);

router.post('/verify',
  paymentLimiter,
  validate(verifyPaymentSchema),
  BillingController.verifyPayment
);

router.post('/failure',
  paymentLimiter,
  validate(handlePaymentFailureSchema),
  BillingController.handlePaymentFailure
);

router.post('/cancel/:orderId',
  paymentLimiter,
  validate(cancelPaymentSchema),
  BillingController.cancelPayment
);

// Admin only routes
router.get('/admin/stats',
  authorize('admin'),
  apiLimiter,
  BillingController.getPaymentStats
);

router.get('/admin/payments',
  authorize('admin'),
  apiLimiter,
  validate(adminPaymentQuerySchema),
  BillingController.getAllPayments
);

module.exports = router;