const express = require('express');
const authRoutes = require('./auth');
const projectRoutes = require('./projects');
const billingRoutes = require('./billing');

const router = express.Router();

// API Documentation endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Project Management API',
    version: '1.0.0',
    endpoints: {
      auth: {
        base: '/api/auth',
        endpoints: [
          'POST /signup - Register a new user',
          'POST /login - Login user',
          'POST /refresh - Refresh access token',
          'POST /logout - Logout user',
          'GET /profile - Get user profile (authenticated)',
          'PATCH /profile - Update user profile (authenticated)',
          'POST /change-password - Change password (authenticated)',
          'POST /logout-all - Logout from all devices (authenticated)'
        ]
      },
      projects: {
        base: '/api/projects',
        endpoints: [
          'POST / - Create project (admin only)',
          'GET / - Get projects (authenticated)',
          'GET /stats - Get project statistics (authenticated)',
          'GET /:id - Get project by ID (authenticated)',
          'PATCH /:id - Update project (admin only)',
          'DELETE /:id - Delete project (admin only)',
          'POST /:id/members - Add member to project (admin only)',
          'GET /:id/members - Get project members (admin only)',
          'DELETE /:id/members/:userId - Remove member (admin only)',
          'PATCH /:id/members/:userId - Update member role (admin only)'
        ]
      },
      billing: {
        base: '/api/billing',
        endpoints: [
          'GET /plans - Get available plans',
          'GET /status - Get billing status (authenticated)',
          'GET /history - Get payment history (authenticated)',
          'POST /upgrade - Create upgrade order (authenticated)',
          'POST /verify - Verify payment (authenticated)',
          'POST /failure - Handle payment failure (authenticated)',
          'POST /cancel/:orderId - Cancel payment (authenticated)',
          'POST /webhook - Razorpay webhook (public)',
          'GET /admin/stats - Get payment stats (admin only)',
          'GET /admin/payments - Get all payments (admin only)'
        ]
      }
    },
    documentation: {
      postman: 'Import the Postman collection for detailed API testing',
      swagger: 'OpenAPI specification available at /api/docs (if configured)'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/billing', billingRoutes);

module.exports = router;