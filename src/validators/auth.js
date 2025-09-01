const { z } = require('zod');

// User registration validation schema
const signupSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .min(1, 'Email is required')
      .max(255, 'Email is too long'),
    
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password is too long')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, 
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name is too long')
      .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces'),
    
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name is too long')
      .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces'),
    
    role: z
      .enum(['admin', 'member'])
      .optional()
      .default('member')
  })
});

// User login validation schema
const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .email('Invalid email format')
      .min(1, 'Email is required'),
    
    password: z
      .string()
      .min(1, 'Password is required')
  })
});

// Refresh token validation schema
const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string()
      .min(1, 'Refresh token is required')
  })
});

// Change password validation schema
const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required'),
    
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(128, 'New password is too long')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, 
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  })
});

// Update profile validation schema
const updateProfileSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name is too long')
      .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces')
      .optional(),
    
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name is too long')
      .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces')
      .optional()
  })
});

module.exports = {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema
};