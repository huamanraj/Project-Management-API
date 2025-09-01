const PaymentService = require('../services/paymentService');

class BillingController {
  /**
   * Create order for premium upgrade
   */
  static async createUpgradeOrder(req, res, next) {
    try {
      const { planType } = req.body;
      const userId = req.user._id;

      const orderDetails = await PaymentService.createOrder(userId, planType);

      res.status(201).json({
        success: true,
        data: {
          order: orderDetails
        },
        message: 'Order created successfully'
      });
    } catch (error) {
      if (error.message.includes('Invalid plan type')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Invalid plan type'
          }
        });
      }

      if (error.message.includes('User is already premium')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 409,
            message: 'User is already premium'
          }
        });
      }

      next(error);
    }
  }

  /**
   * Verify payment and upgrade user
   */
  static async verifyPayment(req, res, next) {
    try {
      const paymentData = req.body;
      const result = await PaymentService.verifyPayment(paymentData);

      res.status(200).json({
        success: true,
        data: {
          payment: result
        },
        message: 'Payment verified successfully. Premium features activated!'
      });
    } catch (error) {
      if (error.message.includes('Payment verification failed') || 
          error.message.includes('Payment record not found')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: error.message
          }
        });
      }

      next(error);
    }
  }

  /**
   * Handle payment failure
   */
  static async handlePaymentFailure(req, res, next) {
    try {
      const { orderId, reason } = req.body;
      
      const payment = await PaymentService.handlePaymentFailure(orderId, reason);

      res.status(200).json({
        success: true,
        data: {
          payment
        },
        message: 'Payment failure recorded'
      });
    } catch (error) {
      if (error.message.includes('Payment record not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 404,
            message: 'Payment record not found'
          }
        });
      }

      next(error);
    }
  }

  /**
   * Get user's billing status
   */
  static async getBillingStatus(req, res, next) {
    try {
      const user = req.user;
      
      // Get user's payment history
      const paymentHistory = await PaymentService.getPaymentHistory(user._id, {
        page: 1,
        limit: 5
      });

      // Get payment statistics
      const stats = await PaymentService.getPaymentStats(user._id);

      res.status(200).json({
        success: true,
        data: {
          user: {
            isPremium: user.isPremium,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`
          },
          recentPayments: paymentHistory.payments,
          stats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(req, res, next) {
    try {
      const userId = req.user._id;
      const { page, limit, status } = req.query;

      const result = await PaymentService.getPaymentHistory(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status
      });

      res.status(200).json({
        success: true,
        data: {
          payments: result.payments,
          pagination: result.pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available plans
   */
  static async getAvailablePlans(req, res, next) {
    try {
      const plans = PaymentService.getAvailablePlans();

      res.status(200).json({
        success: true,
        data: {
          plans
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel pending payment
   */
  static async cancelPayment(req, res, next) {
    try {
      const { orderId } = req.params;
      const userId = req.user._id;

      const payment = await PaymentService.cancelPayment(orderId, userId);

      res.status(200).json({
        success: true,
        data: {
          payment
        },
        message: 'Payment cancelled successfully'
      });
    } catch (error) {
      if (error.message.includes('Pending payment not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 404,
            message: 'Pending payment not found'
          }
        });
      }

      next(error);
    }
  }

  /**
   * Webhook handler for Razorpay events
   */
  static async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const event = req.body;

      const result = await PaymentService.handleWebhook(event, signature);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
      
      // Return 200 to acknowledge webhook receipt even if processing fails
      res.status(200).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get payment statistics (Admin only)
   */
  static async getPaymentStats(req, res, next) {
    try {
      const stats = await PaymentService.getPaymentStats();

      res.status(200).json({
        success: true,
        data: {
          stats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all payments (Admin only)
   */
  static async getAllPayments(req, res, next) {
    try {
      const { page, limit, status, userId, planType, startDate, endDate, minAmount, maxAmount } = req.query;

      // For admin, list specific user when provided, else all users
      const targetUserId = userId || undefined;
      
      const result = await PaymentService.getPaymentHistory(targetUserId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        status,
        planType,
        startDate,
        endDate,
        minAmount,
        maxAmount
      });

      res.status(200).json({
        success: true,
        data: {
          payments: result.payments,
          pagination: result.pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BillingController;