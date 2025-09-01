const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const config = require('../config');

class PaymentService {
  constructor() {
   
    this.keyId = (config?.razorpay?.keyId) || process.env.RAZORPAY_KEY_ID;
    this.keySecret = (config?.razorpay?.keySecret) || process.env.RAZORPAY_KEY_SECRET;

    // Initialize SDK 
    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });

    // Premium plan configurations
    this.plans = {
      premium_monthly: {
        amount: 99900, // ₹999 in paise
        currency: 'INR',
        description: 'Premium Monthly Subscription',
        duration: 30 // days
      },
      premium_yearly: {
        amount: 999900, // ₹9999 in paise
        currency: 'INR',
        description: 'Premium Yearly Subscription',
        duration: 365 // days
      }
    };
  }

  // Normalize unknown SDK error shapes into a usable string
  formatError(error) {
    try {
      return (
        error?.message ||
        error?.error?.description ||
        error?.description ||
        (typeof error === 'string' ? error : JSON.stringify(error))
      );
    } catch {
      return 'Unknown error';
    }
  }

  // Generate a compact, unique receipt <= 40 chars
  generateReceipt(userId) {
    const uid = String(userId || '').slice(-8); // last 8 of ObjectId
    const ts = Date.now().toString(36);         // compact timestamp
    let receipt = `r_${uid}_${ts}`;
    if (receipt.length > 40) receipt = receipt.slice(0, 40);
    return receipt;
  }

  /**
   * Create Razorpay order for premium upgrade
   * @param {String} userId - User ID
   * @param {String} planType - Plan type (premium_monthly/premium_yearly)
   * @returns {Object} Order details
   */
  async createOrder(userId, planType) {
    try {
      // Ensure credentials are present
      if (!this.keyId || !this.keySecret) {
        throw new Error('Razorpay credentials are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
      }

      // Validate plan type
      if (!this.plans[planType]) {
        throw new Error('Invalid plan type');
      }

      const plan = this.plans[planType];
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is already premium
      if (user.isPremium) {
        throw new Error('User is already premium');
      }

      // Create Razorpay order
      const orderOptions = {
        amount: plan.amount,
        currency: plan.currency,
        receipt: this.generateReceipt(userId), // ensure <= 40 chars
        notes: {
          userId: String(userId),
          planType: String(planType),
          userEmail: String(user.email || ''),
          userName: String(`${user.firstName} ${user.lastName}`.trim()),
        }
      };

      const razorpayOrder = await this.razorpay.orders.create(orderOptions);

      // Save payment record
      const payment = new Payment({
        userId: userId,
        razorpayOrderId: razorpayOrder.id,
        amount: plan.amount,
        currency: plan.currency,
        planType: planType,
        description: plan.description,
        status: 'pending',
        notes: orderOptions.notes
      });

      await payment.save();

      return {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        planType: planType,
        description: plan.description,
        keyId: this.keyId, // return resolved key id
        user: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        }
      };
    } catch (error) {
      throw new Error(`Failed to create order: ${this.formatError(error)}`);
    }
  }

  /**
   * Verify payment signature and update user status
   * @param {Object} paymentData - Payment verification data
   * @returns {Object} Verification result
   */
  async verifyPayment(paymentData) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

      // Find payment record
      const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Verify signature
      const isSignatureValid = this.verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isSignatureValid) {
        await payment.markFailed('Invalid payment signature');
        throw new Error('Payment verification failed');
      }

      // Update payment status
      await payment.markCompleted(razorpay_payment_id, razorpay_signature);

      // Update user premium status
      const user = await User.findById(payment.userId);
      if (user) {
        user.isPremium = true;
        await user.save();
      }

      return {
        success: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        planType: payment.planType,
        amount: payment.amount,
        currency: payment.currency
      };
    } catch (error) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Verify Razorpay signature
   * @param {String} orderId - Razorpay order ID
   * @param {String} paymentId - Razorpay payment ID
   * @param {String} signature - Razorpay signature
   * @returns {Boolean} Verification result
   */
  verifySignature(orderId, paymentId, signature) {
    try {
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret) // use resolved secret
        .update(body.toString())
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle payment failure
   * @param {String} orderId - Razorpay order ID
   * @param {String} reason - Failure reason
   * @returns {Object} Updated payment record
   */
  async handlePaymentFailure(orderId, reason) {
    try {
      const payment = await Payment.findOne({ razorpayOrderId: orderId });

      if (!payment) {
        throw new Error('Payment record not found');
      }

      await payment.markFailed(reason);
      return payment;
    } catch (error) {
      throw new Error(`Failed to handle payment failure: ${error.message}`);
    }
  }

  /**
   * Get user's payment history
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Payment history
   */
  async getPaymentHistory(userId, options = {}) {
    try {
      const { page = 1, limit = 10, status, planType, startDate, endDate, minAmount, maxAmount } = options;
      const skip = (page - 1) * limit;

      // Build query dynamically
      const query = {};
      if (userId) query.userId = userId;
      if (status) query.status = status;
      if (planType) query.planType = planType;

      // Date range on createdAt
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Amount range (in paise)
      if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) query.amount.$gte = Number(minAmount);
        if (maxAmount) query.amount.$lte = Number(maxAmount);
      }

      const [payments, total] = await Promise.all([
        Payment.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email'),
        Payment.countDocuments(query)
      ]);

      return {
        payments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };
    } catch (error) {
      throw new Error(`Failed to get payment history: ${error.message}`);
    }
  }

  /**
   * Get payment statistics
   * @param {String} userId - User ID (optional, for admin stats)
   * @returns {Object} Payment statistics
   */
  async getPaymentStats(userId = null) {
    try {
      const stats = await Payment.getStats(userId);
      return stats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        completedPayments: 0,
        completedAmount: 0,
        failedPayments: 0,
        pendingPayments: 0
      };
    } catch (error) {
      throw new Error(`Failed to get payment stats: ${error.message}`);
    }
  }

  /**
   * Cancel pending payment
   * @param {String} orderId - Razorpay order ID
   * @param {String} userId - User ID
   * @returns {Object} Updated payment record
   */
  async cancelPayment(orderId, userId) {
    try {
      const payment = await Payment.findOne({ 
        razorpayOrderId: orderId, 
        userId: userId,
        status: 'pending'
      });

      if (!payment) {
        throw new Error('Pending payment not found');
      }

      await payment.markCancelled();
      return payment;
    } catch (error) {
      throw new Error(`Failed to cancel payment: ${error.message}`);
    }
  }

  /**
   * Get available plans
   * @returns {Object} Available premium plans
   */
  getAvailablePlans() {
    return Object.keys(this.plans).map(planType => ({
      type: planType,
      ...this.plans[planType],
      formattedAmount: `₹${(this.plans[planType].amount / 100).toFixed(2)}`
    }));
  }

  /**
   * Webhook handler for Razorpay events
   * @param {Object} event - Webhook event data
   * @param {String} signature - Webhook signature
   * @returns {Object} Processing result
   */
  async handleWebhook(event, signature) {
    try {
      // Verify webhook signature (if configured)
      // const isValid = this.verifyWebhookSignature(event, signature);
      // if (!isValid) {
      //   throw new Error('Invalid webhook signature');
      // }

      const { event: eventType, payload } = event;

      switch (eventType) {
        case 'payment.captured':
          return await this.handlePaymentCaptured(payload.payment.entity);
        
        case 'payment.failed':
          return await this.handlePaymentFailedWebhook(payload.payment.entity);
        
        case 'order.paid':
          return await this.handleOrderPaid(payload.order.entity);
        
        default:
          console.log(`Unhandled webhook event: ${eventType}`);
          return { processed: false, event: eventType };
      }
    } catch (error) {
      throw new Error(`Webhook processing failed: ${error.message}`);
    }
  }

  /**
   * Handle payment captured webhook
   * @param {Object} paymentEntity - Payment entity from webhook
   * @returns {Object} Processing result
   */
  async handlePaymentCaptured(paymentEntity) {
    try {
      const payment = await Payment.findOne({ 
        razorpayOrderId: paymentEntity.order_id 
      });

      if (payment && payment.status === 'pending') {
        await payment.markCompleted(paymentEntity.id, null);
        
        // Update user premium status
        const user = await User.findById(payment.userId);
        if (user && !user.isPremium) {
          user.isPremium = true;
          await user.save();
        }
      }

      return { processed: true, paymentId: paymentEntity.id };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle payment failed webhook
   * @param {Object} paymentEntity - Payment entity from webhook
   * @returns {Object} Processing result
   */
  async handlePaymentFailedWebhook(paymentEntity) {
    try {
      const payment = await Payment.findOne({ 
        razorpayOrderId: paymentEntity.order_id 
      });

      if (payment && payment.status === 'pending') {
        await payment.markFailed(paymentEntity.error_description || 'Payment failed');
      }

      return { processed: true, paymentId: paymentEntity.id };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle order paid webhook
   * @param {Object} orderEntity - Order entity from webhook
   * @returns {Object} Processing result
   */
  async handleOrderPaid(orderEntity) {
    try {
      const payment = await Payment.findOne({ 
        razorpayOrderId: orderEntity.id 
      });

      if (payment) {
        payment.webhookEventId = orderEntity.id;
        await payment.save();
      }

      return { processed: true, orderId: orderEntity.id };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PaymentService();