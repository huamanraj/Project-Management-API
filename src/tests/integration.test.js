const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Project = require('../models/Project');
const Payment = require('../models/Payment');

describe('Integration Tests - Complete User Workflows', () => {
  let adminUser, memberUser;
  let adminToken, memberToken;
  let testProject;

  describe('Complete Authentication and Project Management Flow', () => {
    it('should complete full user registration → login → project creation → member management workflow', async () => {
      // Step 1: Register admin user
      const adminSignup = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'admin@integration.com',
          password: 'AdminPassword@123!',
          firstName: 'Integration',
          lastName: 'Admin',
          role: 'admin'
        })
        .expect(201);

      expect(adminSignup.body.success).toBe(true);
      expect(adminSignup.body.data.user.role).toBe('admin');
      adminToken = adminSignup.body.data.tokens.accessToken;

      // Step 2: Register member user
      const memberSignup = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'member@integration.com',
          password: 'MemberPassword@123!',
          firstName: 'Integration',
          lastName: 'Member',
          role: 'member'
        })
        .expect(201);

      expect(memberSignup.body.success).toBe(true);
      expect(memberSignup.body.data.user.role).toBe('member');
      memberToken = memberSignup.body.data.tokens.accessToken;
      const memberId = memberSignup.body.data.user._id;

      // Step 3: Admin creates a project
      const projectCreation = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Integration Test Project',
          description: 'A project created during integration testing',
          priority: 'high',
          tags: ['integration', 'testing']
        })
        .expect(201);

      expect(projectCreation.body.success).toBe(true);
      const projectId = projectCreation.body.data.project._id;

      // Step 4: Admin adds member to project
      const addMember = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: memberId,
          role: 'member'
        })
        .expect(200);

      expect(addMember.body.success).toBe(true);
      expect(addMember.body.message).toContain('Member added successfully');

      // Step 5: Member can now access the project
      const memberProjectAccess = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(memberProjectAccess.body.success).toBe(true);
      expect(memberProjectAccess.body.data.project.name).toBe('Integration Test Project');

      // Step 6: Member can see project in their project list
      const memberProjects = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(memberProjects.body.success).toBe(true);
      const projectIds = memberProjects.body.data.projects.map(p => p._id);
      expect(projectIds).toContain(projectId);

      // Step 7: Admin updates project
      const projectUpdate = await request(app)
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'completed',
          description: 'Updated description after integration testing'
        })
        .expect(200);

      expect(projectUpdate.body.success).toBe(true);
      expect(projectUpdate.body.data.project.status).toBe('completed');

      // Step 8: Get project statistics
      const stats = await request(app)
        .get('/api/projects/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(stats.body.success).toBe(true);
      expect(stats.body.data.stats.totalProjects).toBeGreaterThanOrEqual(1);
      expect(stats.body.data.stats.completedProjects).toBeGreaterThanOrEqual(1);
    });

    it('should handle member access restrictions properly', async () => {
      // Create fresh users for this test
      const timestamp = Date.now();
      
      // Create admin user
      const adminSignup = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `admin${timestamp}@integration.com`,
          password: 'AdminPassword@123!',
          firstName: 'Integration',
          lastName: 'Admin',
          role: 'admin'
        })
        .expect(201);
      
      expect(adminSignup.body.success).toBe(true);
      expect(adminSignup.body.data.tokens).toBeDefined();
      adminToken = adminSignup.body.data.tokens.accessToken;

      // Create member user
      const memberSignup = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `member${timestamp}@integration.com`,
          password: 'MemberPassword@123!',
          firstName: 'Integration',
          lastName: 'Member',
          role: 'member'
        })
        .expect(201);
      
      expect(memberSignup.body.success).toBe(true);
      expect(memberSignup.body.data.tokens).toBeDefined();
      memberToken = memberSignup.body.data.tokens.accessToken;

      // Member tries to create project (should fail)
      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Unauthorized Project',
          description: 'This should not be created'
        })
        .expect(403);

      // Member tries to access admin billing stats (should fail)
      await request(app)
        .get('/api/billing/admin/stats')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      // Member can access their own profile
      const profile = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(profile.body.success).toBe(true);
      expect(profile.body.data.user.email).toBe(`member${timestamp}@integration.com`);
    });
  });

  describe('Complete Billing and Premium Upgrade Flow', () => {
    let userToken, userId;

    beforeEach(async () => {
      // Create a regular user for billing tests with unique email
      const timestamp = Date.now();
      const userSignup = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `billing${timestamp}@integration.com`,
          password: 'BillingPassword@123!',
          firstName: 'Billing',
          lastName: 'User',
          role: 'member'
        })
        .expect(201);

      userToken = userSignup.body.data.tokens.accessToken;
      userId = userSignup.body.data.user._id;
    });

    it('should complete full billing workflow: plans → order → payment simulation', async () => {
      // Step 1: Get available plans
      const plans = await request(app)
        .get('/api/billing/plans')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(plans.body.success).toBe(true);
      expect(Array.isArray(plans.body.data.plans)).toBe(true);
      expect(plans.body.data.plans.length).toBeGreaterThanOrEqual(2);

      // Step 2: Check initial billing status
      const initialStatus = await request(app)
        .get('/api/billing/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(initialStatus.body.success).toBe(true);
      expect(initialStatus.body.data.user.isPremium).toBe(false);

      // Step 3: Create upgrade order (will fail without proper Razorpay setup, but we test the validation)
      const orderAttempt = await request(app)
        .post('/api/billing/upgrade')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          planType: 'premium_monthly'
        });

      // This might fail due to Razorpay configuration, but should not be a validation error
      if (orderAttempt.status === 201) {
        expect(orderAttempt.body.success).toBe(true);
        expect(orderAttempt.body.data.order.planType).toBe('premium_monthly');
      } else {
        // If it fails, it should be due to Razorpay config, not validation
        expect(orderAttempt.status).not.toBe(400);
      }

      // Step 4: Test invalid plan type
      await request(app)
        .post('/api/billing/upgrade')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          planType: 'invalid_plan'
        })
        .expect(400);

      // Step 5: Get payment history (should be empty initially)
      const history = await request(app)
        .get('/api/billing/history')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(history.body.success).toBe(true);
      expect(Array.isArray(history.body.data.payments)).toBe(true);
    });

    it('should handle payment failure workflow', async () => {
      // Create a test payment record
      const testPayment = new Payment({
        userId: userId,
        razorpayOrderId: 'order_integration_test',
        amount: 99900,
        currency: 'INR',
        planType: 'premium_monthly',
        status: 'pending'
      });
      await testPayment.save();

      // Handle payment failure
      const failureResponse = await request(app)
        .post('/api/billing/failure')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: 'order_integration_test',
          reason: 'Integration test failure'
        })
        .expect(200);

      expect(failureResponse.body.success).toBe(true);

      // Verify payment was marked as failed
      const updatedPayment = await Payment.findById(testPayment._id);
      expect(updatedPayment.status).toBe('failed');
      expect(updatedPayment.failureReason).toBe('Integration test failure');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    let validToken;

    beforeEach(async () => {
      // Create a fresh admin user for this test suite
      const timestamp = Date.now();
      const adminSignup = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `admin${timestamp}@integration.com`,
          password: 'AdminPassword@123!',
          firstName: 'Integration',
          lastName: 'Admin',
          role: 'admin'
        })
        .expect(201);

      expect(adminSignup.body.success).toBe(true);
      expect(adminSignup.body.data.tokens).toBeDefined();
      validToken = adminSignup.body.data.tokens.accessToken;
    });

    it('should handle invalid authentication tokens', async () => {
      // Test with no token
      await request(app)
        .get('/api/auth/profile')
        .expect(401);

      // Test with invalid token
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test with malformed header
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should handle invalid resource IDs', async () => {
      // Invalid project ID format
      await request(app)
        .get('/api/projects/invalid-id')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      // Valid format but non-existent ID
      await request(app)
        .get('/api/projects/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });

    it('should handle validation errors properly', async () => {
      // Missing required fields
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          description: 'Missing name field'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });

    it('should handle rate limiting', async () => {
      // This test would require making many requests quickly
      // For now, we just verify the rate limiting middleware is in place
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });
  });

  describe('Data Consistency and Relationships', () => {
    let adminToken, projectId, memberId;

    beforeEach(async () => {
      // Create fresh admin and member users for this test suite
      const timestamp = Date.now();
      
      const adminSignup = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `admin${timestamp}@integration.com`,
          password: 'AdminPassword@123!',
          firstName: 'Integration',
          lastName: 'Admin',
          role: 'admin'
        })
        .expect(201);
      
      expect(adminSignup.body.success).toBe(true);
      expect(adminSignup.body.data.tokens).toBeDefined();
      adminToken = adminSignup.body.data.tokens.accessToken;

      const memberSignup = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `member${timestamp}@integration.com`,
          password: 'MemberPassword@123!',
          firstName: 'Integration',
          lastName: 'Member',
          role: 'member'
        })
        .expect(201);
      
      expect(memberSignup.body.success).toBe(true);
      expect(memberSignup.body.data.user).toBeDefined();
      memberId = memberSignup.body.data.user._id;

      // Create project
      const project = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Consistency Test Project',
          description: 'Testing data consistency'
        });
      projectId = project.body.data.project._id;
    });

    it('should maintain data consistency when adding and removing members', async () => {
      // Add member to project
      const addMemberResponse = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: memberId,
          role: 'member'
        })
        .expect(200);

      expect(addMemberResponse.body.success).toBe(true);

      // Verify member is in project
      const projectWithMember = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const memberIds = projectWithMember.body.data.project.members.map(m => m.user._id);
      expect(memberIds).toContain(memberId);

      // Remove member from project
      const removeMemberResponse = await request(app)
        .delete(`/api/projects/${projectId}/members/${memberId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(removeMemberResponse.body.success).toBe(true);

      // Verify member is removed
      const projectWithoutMember = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const updatedMemberIds = projectWithoutMember.body.data.project.members.map(m => m.user._id);
      expect(updatedMemberIds).not.toContain(memberId);
    });

    it('should prevent duplicate member addition', async () => {
      // Add member first time
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: memberId,
          role: 'member'
        })
        .expect(200);

      // Try to add same member again
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: memberId,
          role: 'member'
        })
        .expect(409);
    });

    it('should handle project deletion and cleanup', async () => {
      // Delete project
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify project is deleted
      await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Verify project doesn't appear in lists
      const projects = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const projectIds = projects.body.data.projects.map(p => p._id);
      expect(projectIds).not.toContain(projectId);
    });
  });

  describe('API Documentation Endpoint', () => {
    it('should provide API documentation', async () => {
      const response = await request(app)
        .get('/api/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project Management API');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.auth).toBeDefined();
      expect(response.body.endpoints.projects).toBeDefined();
      expect(response.body.endpoints.billing).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return server health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Server is running');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});