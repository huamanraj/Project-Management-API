const { z } = require('zod');

// Project creation validation schema
const createProjectSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, 'Project name must be at least 3 characters long')
      .max(100, 'Project name cannot exceed 100 characters')
      .trim(),
    
    description: z
      .string()
      .max(1000, 'Project description cannot exceed 1000 characters')
      .trim()
      .optional(),
    
    status: z
      .enum(['active', 'completed', 'archived', 'on-hold'])
      .optional()
      .default('active'),
    
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'])
      .optional()
      .default('medium'),
    
    startDate: z
      .string()
      .datetime()
      .optional()
      .transform((val) => val ? new Date(val) : new Date()),
    
    endDate: z
      .string()
      .datetime()
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    
    budget: z.object({
      amount: z
        .number()
        .min(0, 'Budget amount cannot be negative')
        .optional(),
      currency: z
        .string()
        .length(3, 'Currency code must be 3 characters')
        .optional()
        .default('USD')
    }).optional(),
    
    tags: z
      .array(z.string().max(30, 'Tag cannot exceed 30 characters'))
      .max(10, 'Cannot have more than 10 tags')
      .optional()
  }).refine((data) => {
    if (data.endDate && data.startDate) {
      return data.endDate > data.startDate;
    }
    return true;
  }, {
    message: 'End date must be after start date',
    path: ['endDate']
  })
});

// Project update validation schema
const updateProjectSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, 'Project name must be at least 3 characters long')
      .max(100, 'Project name cannot exceed 100 characters')
      .trim()
      .optional(),
    
    description: z
      .string()
      .max(1000, 'Project description cannot exceed 1000 characters')
      .trim()
      .optional(),
    
    status: z
      .enum(['active', 'completed', 'archived', 'on-hold'])
      .optional(),
    
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'])
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
    
    budget: z.object({
      amount: z
        .number()
        .min(0, 'Budget amount cannot be negative')
        .optional(),
      currency: z
        .string()
        .length(3, 'Currency code must be 3 characters')
        .optional()
    }).optional(),
    
    tags: z
      .array(z.string().max(30, 'Tag cannot exceed 30 characters'))
      .max(10, 'Cannot have more than 10 tags')
      .optional(),
    
    isArchived: z
      .boolean()
      .optional()
  })
});

// Project query validation schema
const projectQuerySchema = z.object({
  query: z.object({
    status: z
      .enum(['active', 'completed', 'archived', 'on-hold'])
      .optional(),
    
    priority: z
      .enum(['low', 'medium', 'high', 'urgent'])
      .optional(),
    
    isArchived: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    
    tags: z
      .string()
      .optional()
      .transform((val) => val ? val.split(',').map(tag => tag.trim()) : undefined),
    
    search: z
      .string()
      .max(100, 'Search query cannot exceed 100 characters')
      .optional(),
    
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a positive number')
      .transform((val) => parseInt(val))
      .optional()
      .default('1'),
    
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive number')
      .transform((val) => Math.min(parseInt(val), 100)) // Max 100 items per page
      .optional()
      .default('10'),
    
    sort: z
      .enum(['name', 'createdAt', 'updatedAt', 'priority', 'status'])
      .optional()
      .default('createdAt'),
    
    order: z
      .enum(['asc', 'desc'])
      .optional()
      .default('desc')
  })
});

// Add member validation schema
const addMemberSchema = z.object({
  body: z.object({
    userId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
    
    role: z
      .enum(['admin', 'member', 'viewer'])
      .optional()
      .default('member')
  }),
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID format')
  })
});

// Update member role validation schema
const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z
      .enum(['admin', 'member', 'viewer'])
  }),
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID format'),
    userId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
  })
});

// Project ID parameter validation
const projectParamsSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID format')
  })
});

// Project and User ID parameter validation
const projectMemberParamsSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid project ID format'),
    userId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
  })
});

module.exports = {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  addMemberSchema,
  updateMemberRoleSchema,
  projectParamsSchema,
  projectMemberParamsSchema
};