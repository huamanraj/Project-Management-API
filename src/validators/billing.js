const { z } = require('zod');

// Create upgrade order validation schema
const createUpgradeOrderSchema = z.object({
  body: z.object({
    planType: z
      .enum(['premium_monthly', 'premium_yearly'], {
        errorMap: () => ({ message: 'Plan type must be either premium_monthly or premium_yearly' })
      })
  })
});

// Verify payment validation schema
const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z
      .string()
      .min(1, 'Razorpay order ID is required'),
    
    razorpay_payment_id: z
      .string()
      .min(1, 'Razorpay payment ID is required'),
    
    razorpay_signature: z
      .string()
      .min(1, 'Razorpay signature is required')
  })
});

// Handle payment failure validation schema
const handlePaymentFailureSchema = z.object({
  body: z.object({
    orderId: z
      .string()
      .min(1, 'Order ID is required'),
    
    reason: z
      .string()
      .min(1, 'Failure reason is required')
      .max(500, 'Failure reason cannot exceed 500 characters')
  })
});

// Payment history query validation schema
const paymentHistoryQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a positive number')
      .transform((val) => parseInt(val))
      .optional()
      .default('1'),
    
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive number')
      .transform((val) => Math.min(parseInt(val), 50)) // Max 50 items per page
      .optional()
      .default('10'),
    
    status: z
      .enum(['pending', 'completed', 'failed', 'cancelled'])
      .optional(),
    
    userId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
      .optional() // Only for admin queries
  })
});

// Cancel payment validation schema
const cancelPaymentSchema = z.object({
  params: z.object({
    orderId: z
      .string()
      .min(1, 'Order ID is required')
  })
});

// Webhook validation schema
const webhookSchema = z.object({
  body: z.object({
    event: z.string().min(1, 'Event type is required'),
    payload: z.object({}).passthrough(), // Allow any payload structure
    created_at: z.number().optional(),
    contains: z.array(z.string()).optional(),
    account_id: z.string().optional()
  })
});

// Admin payment query validation schema
const adminPaymentQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a positive number')
      .transform((val) => parseInt(val))
      .optional()
      .default('1'),
    
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive number')
      .transform((val) => Math.min(parseInt(val), 100)) // Max 100 items per page for admin
      .optional()
      .default('20'),
    
    status: z
      .enum(['pending', 'completed', 'failed', 'cancelled'])
      .optional(),
    
    userId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
      .optional(),
    
    planType: z
      .enum(['premium_monthly', 'premium_yearly'])
      .optional(),
    
    startDate: z
      .string()
      .datetime()
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    
    endDate: z
      .string()
      .datetime()
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    
    minAmount: z
      .string()
      .regex(/^\d+$/, 'Minimum amount must be a number')
      .transform((val) => parseInt(val))
      .optional(),
    
    maxAmount: z
      .string()
      .regex(/^\d+$/, 'Maximum amount must be a number')
      .transform((val) => parseInt(val))
      .optional()
  }).refine((data) => {
    if (data.startDate && data.endDate) {
      return data.endDate > data.startDate;
    }
    return true;
  }, {
    message: 'End date must be after start date',
    path: ['endDate']
  }).refine((data) => {
    if (data.minAmount && data.maxAmount) {
      return data.maxAmount > data.minAmount;
    }
    return true;
  }, {
    message: 'Maximum amount must be greater than minimum amount',
    path: ['maxAmount']
  })
});

module.exports = {
  createUpgradeOrderSchema,
  verifyPaymentSchema,
  handlePaymentFailureSchema,
  paymentHistoryQuerySchema,
  cancelPaymentSchema,
  webhookSchema,
  adminPaymentQuerySchema
};