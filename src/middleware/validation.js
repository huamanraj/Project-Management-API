const { z } = require('zod');

/**
 * Validation middleware factory
 * @param {Object} schema - Zod validation schema
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate the request against the schema
      const validatedData = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Replace request data with validated data
      req.body = validatedData.body || req.body;
      req.query = validatedData.query || req.query;
      req.params = validatedData.params || req.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Validation failed',
            details: errors
          }
        });
      }

      // Handle other validation errors
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: 'Invalid request data'
        }
      });
    }
  };
};

/**
 * Sanitize input data
 */
const sanitize = (req, res, next) => {
  // Recursively sanitize object
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Basic XSS prevention
        sanitized[key] = value
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;')
          .trim();
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  
  next();
};

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: `Invalid ${paramName} format`
        }
      });
    }
    
    next();
  };
};

module.exports = {
  validate,
  sanitize,
  validateObjectId
};