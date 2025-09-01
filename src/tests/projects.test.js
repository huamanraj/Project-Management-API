const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Project = require('../models/Project');

describe('Project Management System', () => {
  let adminUser, memberUser;
  let adminToken, memberToken;
  let testProject;

  beforeEach(async () => {
    // Create admin user
    adminUser = new User({
      email: 'admin@example.com',
      password: 'AdminPassword@123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });
    await adminUser.save();

    // Create member user
    memberUser = new User({
      email: 'member@example.com',
      password: 'MemberPassword@123!',
      firstName: 'Member',
      lastName: 'User',
      role: 'member'
    });
    await memberUser.save();

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
        email: 'member@example.com',
        password: 'MemberPassword@123!'
      });
    memberToken = memberLogin.body.data.tokens.accessToken;

    // Create test project
    testProject = new Project({
      name: 'Test Project',
      description: 'A test project for testing',
      createdBy: adminUser._id,
      status: 'active',
      priority: 'medium'
    });
    await testProject.save();
  });

  describe('POST /api/projects', () => {
    it('should allow admin to create a project', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A new project for testing',
        priority: 'high',
        tags: ['test', 'api']
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe(projectData.name);
      expect(response.body.data.project.description).toBe(projectData.description);
      expect(response.body.data.project.priority).toBe(projectData.priority);
      expect(response.body.data.project.createdBy._id).toBe(adminUser._id.toString());
      expect(response.body.data.project.members).toHaveLength(1); // Creator is automatically added
    });

    it('should deny member access to create projects', async () => {
      const projectData = {
        name: 'Unauthorized Project',
        description: 'This should not be created'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .send(projectData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });

    it('should validate required fields', async () => {
      const projectData = {
        description: 'Missing name field'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });

    it('should validate project name length', async () => {
      const projectData = {
        name: 'AB', // Too short
        description: 'Valid description'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(projectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Validation failed');
    });
  });

  describe('GET /api/projects', () => {
    beforeEach(async () => {
      // Add member to test project
      await testProject.addMember(memberUser._id, 'member');
    });

    it('should allow admin to get all projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.projects)).toBe(true);
      expect(response.body.data.projects.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should allow member to get only assigned projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.projects)).toBe(true);

      // Member should only see projects they're assigned to
      const projectIds = response.body.data.projects.map(p => p._id);
      expect(projectIds).toContain(testProject._id.toString());
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/projects?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.itemsPerPage).toBe(5);
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/projects?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.projects.forEach(project => {
        expect(project.status).toBe('active');
      });
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should allow admin to get any project', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project._id).toBe(testProject._id.toString());
      expect(response.body.data.project.name).toBe(testProject.name);
    });

    it('should allow assigned member to get project', async () => {
      // Add member to project using the API (more realistic test)
      const addMemberResponse = await request(app)
        .post(`/api/projects/${testProject._id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: memberUser._id.toString(),
          role: 'member'
        })
        .expect(200);

      // Verify member was added
      expect(addMemberResponse.body.success).toBe(true);

      const response = await request(app)
        .get(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project._id).toBe(testProject._id.toString());
    });

    it('should deny unassigned member access to project', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Access denied');
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Project not found');
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('should allow admin to update project', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description',
        status: 'completed'
      };

      const response = await request(app)
        .patch(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe(updateData.name);
      expect(response.body.data.project.description).toBe(updateData.description);
      expect(response.body.data.project.status).toBe(updateData.status);
    });

    it('should deny member access to update project', async () => {
      const updateData = {
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .patch(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should allow admin to delete project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify project is deleted
      const deletedProject = await Project.findById(testProject._id);
      expect(deletedProject).toBeNull();
    });

    it('should deny member access to delete project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProject._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });
  });

  describe('POST /api/projects/:id/members', () => {
    it('should allow admin to add member to project', async () => {
      const memberData = {
        userId: memberUser._id.toString(),
        role: 'member'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject._id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(memberData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Member added successfully');

      // Check if member was added
      const memberIds = response.body.data.project.members.map(m => m.user._id);
      expect(memberIds).toContain(memberUser._id.toString());
    });

    it('should prevent adding duplicate members', async () => {
      // Add member first
      await testProject.addMember(memberUser._id, 'member');

      const memberData = {
        userId: memberUser._id.toString(),
        role: 'member'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject._id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(memberData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already a member');
    });

    it('should deny member access to add members', async () => {
      const memberData = {
        userId: memberUser._id.toString(),
        role: 'member'
      };

      const response = await request(app)
        .post(`/api/projects/${testProject._id}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(memberData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });
  });

  describe('GET /api/projects/:id/members', () => {
    beforeEach(async () => {
      await testProject.addMember(memberUser._id, 'member');
    });

    it('should allow admin to get project members', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject._id}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.members)).toBe(true);
      expect(response.body.data.members.length).toBeGreaterThanOrEqual(2); // Creator + added member
    });

    it('should deny member access to get all members', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject._id}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });
  });

  describe('GET /api/projects/stats', () => {
    it('should return project statistics for admin', async () => {
      const response = await request(app)
        .get('/api/projects/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toHaveProperty('totalProjects');
      expect(response.body.data.stats).toHaveProperty('activeProjects');
      expect(response.body.data.stats).toHaveProperty('completedProjects');
    });

    it('should return project statistics for member (only their projects)', async () => {
      // Add member to project
      await testProject.addMember(memberUser._id, 'member');

      const response = await request(app)
        .get('/api/projects/stats')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toHaveProperty('totalProjects');
    });
  });

  describe('Project Model Methods', () => {
    it('should check if user is a member', () => {
      const isMember = testProject.isMember(adminUser._id);
      expect(isMember).toBe(true); // Creator is automatically a member
    });

    it('should get user role in project', () => {
      const role = testProject.getUserRole(adminUser._id);
      expect(role).toBe('owner'); // Creator has owner role
    });

    it('should add member to project', async () => {
      await testProject.addMember(memberUser._id, 'member');
      const isMember = testProject.isMember(memberUser._id);
      expect(isMember).toBe(true);
    });

    it('should remove member from project', async () => {
      await testProject.addMember(memberUser._id, 'member');
      await testProject.removeMember(memberUser._id);
      const isMember = testProject.isMember(memberUser._id);
      expect(isMember).toBe(false);
    });

    it('should update member role', async () => {
      await testProject.addMember(memberUser._id, 'member');
      await testProject.updateMemberRole(memberUser._id, 'admin');
      const role = testProject.getUserRole(memberUser._id);
      expect(role).toBe('admin');
    });
  });
});