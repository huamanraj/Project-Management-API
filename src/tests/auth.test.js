const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const JWTUtils = require('../utils/jwt');

describe('Authentication System', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create a test user
    testUser = new User({
      email: 'test@example.com',
      password: 'TestPassword@123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'member'
    });
    await testUser.save();
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'NewPassword@123!',
        firstName: 'New',
        lastName: 'User',
        role: 'member'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.user.lastName).toBe(userData.lastName);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      // Verify user was created in database
      const createdUser = await User.findOne({ email: userData.email });
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: testUser.email,
        password: 'AnotherPassword@123!',
        firstName: 'Another',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });

    it('should reject weak passwords', async () => {
      const userData = {
        email: 'weakpass@example.com',
        password: 'weak',
        firstName: 'Weak',
        lastName: 'Password'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('should validate required fields', async () => {
      const userData = {
        email: 'incomplete@example.com',
        password: 'ValidPassword@123!'
        // Missing firstName and lastName
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword@123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      authToken = response.body.data.tokens.accessToken;
    });

    it('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword@123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword@123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email or password');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword@123!'
        });

      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.tokens.refreshToken).toBeDefined(); // Should have new refresh token
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid or expired refresh token');
    });
  });

  describe('Authentication Middleware', () => {
    beforeEach(async () => {
      // Get auth token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword@123!'
        });

      authToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Access token is required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid or expired access token');
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Access token is required');
    });
  });

  describe('Role-based Authorization', () => {
    let adminToken;
    let memberToken;

    beforeEach(async () => {
      // Create admin user
      const adminUser = new User({
        email: 'admin@example.com',
        password: 'AdminPassword@123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      });
      await adminUser.save();

      // Get admin token
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword@123!'
        });
      adminToken = adminLogin.body.data.tokens.accessToken;

      // Get member token
      const memberLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'TestPassword123!'
        });
      memberToken = memberLogin.body.data.tokens.accessToken;
    });

    it('should allow admin access to admin-only endpoints', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Project',
          description: 'A test project'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should deny member access to admin-only endpoints', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Test Project',
          description: 'A test project'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });
  });

  describe('JWT Utilities', () => {
    it('should generate valid access token', () => {
      const payload = {
        userId: testUser._id,
        email: testUser.email,
        role: testUser.role
      };

      const token = JWTUtils.generateAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify valid access token', () => {
      const payload = {
        userId: testUser._id,
        email: testUser.email,
        role: testUser.role
      };

      const token = JWTUtils.generateAccessToken(payload);
      const decoded = JWTUtils.verifyAccessToken(token);

      expect(decoded.userId.toString()).toBe(payload.userId.toString());
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should reject invalid access token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('invalid-token');
      }).toThrow('Invalid or expired access token');
    });

    it('should generate token pair', () => {
      const tokens = JWTUtils.generateTokenPair(testUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });
  });
});