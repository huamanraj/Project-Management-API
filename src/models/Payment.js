const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  razorpayOrderId: {
    type: String,
    required: [true, 'Razorpay order ID is required'],
    unique: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true // Allow null values but ensure uniqueness when present
  },
  razorpaySignature: {
    type: String
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
    uppercase: true
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'completed', 'failed', 'cancelled'],
      message: 'Status must be one of: pending, completed, failed, cancelled'
    },
    default: 'pending'
  },
  planType: {
    type: String,
    enum: {
      values: ['premium_monthly', 'premium_yearly'],
      message: 'Plan type must be one of: premium_monthly, premium_yearly'
    },
    required: [true, 'Plan type is required']
  },
  description: {
    type: String,
    trim: true
  },
  notes: {
    type: Map,
    of: String
  },
  failureReason: {
    type: String,
    trim: true
  },
  refundId: {
    type: String
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative']
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'processed', 'failed']
  },
  webhookEventId: {
    type: String
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for better query performance (razorpayOrderId index is automatic due to unique: true)
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Compound indexes
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `${this.currency} ${(this.amount / 100).toFixed(2)}`;
});

// Instance method to mark payment as completed
paymentSchema.methods.markCompleted = function(paymentId, signature) {
  this.status = 'completed';
  this.razorpayPaymentId = paymentId;
  this.razorpaySignature = signature;
  return this.save();
};

// Instance method to mark payment as failed
paymentSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

// Instance method to mark payment as cancelled
paymentSchema.methods.markCancelled = function() {
  this.status = 'cancelled';
  return this.save();
};

// Static method to find payments by user
paymentSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.planType) {
    query.planType = options.planType;
  }
  
  return this.find(query)
    .populate('userId', 'firstName lastName email')
    .sort(options.sort || { createdAt: -1 });
};

// Static method to get payment statistics
paymentSchema.statics.getStats = function(userId = null) {
  const matchQuery = userId ? { userId } : {};
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Pre-save middleware
paymentSchema.pre('save', function(next) {
  // Convert amount to smallest currency unit (paise for INR)
  if (this.isModified('amount') && this.amount > 0 && this.amount < 1) {
    this.amount = Math.round(this.amount * 100);
  }
  
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);