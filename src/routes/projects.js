const express = require('express');
const ProjectController = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
  addMemberSchema,
  updateMemberRoleSchema,
  projectParamsSchema,
  projectMemberParamsSchema
} = require('../validators/project');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply general API rate limiting
router.use(apiLimiter);

// Project CRUD routes
router.post('/',
  authorize('admin'), // Only admins can create projects
  validate(createProjectSchema),
  ProjectController.createProject
);

router.get('/',
  validate(projectQuerySchema),
  ProjectController.getProjects
);

router.get('/stats',
  ProjectController.getProjectStats
);

router.get('/:id',
  validate(projectParamsSchema),
  ProjectController.getProject
);

router.patch('/:id',
  authorize('admin'), // Only admins can update projects
  validate(updateProjectSchema),
  validate(projectParamsSchema),
  ProjectController.updateProject
);

router.delete('/:id',
  authorize('admin'), // Only admins can delete projects
  validate(projectParamsSchema),
  ProjectController.deleteProject
);

// Team member management routes
router.post('/:id/members',
  authorize('admin'), // Only admins can add members
  validate(addMemberSchema),
  ProjectController.addMember
);

router.get('/:id/members',
  authorize('admin'), // Only admins can view all members
  validate(projectParamsSchema),
  ProjectController.getProjectMembers
);

router.delete('/:id/members/:userId',
  authorize('admin'), // Only admins can remove members
  validate(projectMemberParamsSchema),
  ProjectController.removeMember
);

router.patch('/:id/members/:userId',
  authorize('admin'), // Only admins can update member roles
  validate(projectMemberParamsSchema),
  validate(updateMemberRoleSchema),
  ProjectController.updateMemberRole
);

module.exports = router;