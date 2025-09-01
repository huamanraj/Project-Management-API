const Project = require('../models/Project');
const User = require('../models/User');

class ProjectService {
  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @param {String} creatorId - ID of the user creating the project
   * @returns {Object} Created project
   */
  static async createProject(projectData, creatorId) {
    const project = new Project({
      ...projectData,
      createdBy: creatorId
    });

    await project.save();
    
    return await Project.findById(project._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');
  }

  /**
   * Get projects based on user role and filters
   * @param {Object} user - Current user
   * @param {Object} filters - Query filters
   * @returns {Object} Projects with pagination
   */
  static async getProjects(user, filters = {}) {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc', ...queryFilters } = filters;
    
    let query = {};
    
    // Role-based filtering
    if (user.role === 'admin') {
      // Admin can see all projects
      if (queryFilters.status) query.status = queryFilters.status;
      if (queryFilters.priority) query.priority = queryFilters.priority;
      if (queryFilters.isArchived !== undefined) query.isArchived = queryFilters.isArchived;
    } else {
      // Members can only see projects they're assigned to
      query = {
        $or: [
          { createdBy: user._id },
          { 'members.user': user._id }
        ]
      };
      
      if (queryFilters.status) query.status = queryFilters.status;
      if (queryFilters.priority) query.priority = queryFilters.priority;
      if (queryFilters.isArchived !== undefined) query.isArchived = queryFilters.isArchived;
    }

    // Search functionality
    if (queryFilters.search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: queryFilters.search, $options: 'i' } },
          { description: { $regex: queryFilters.search, $options: 'i' } }
        ]
      });
    }

    // Tags filtering
    if (queryFilters.tags && queryFilters.tags.length > 0) {
      query.tags = { $in: queryFilters.tags };
    }

    // Pagination
    const skip = (page - 1) * limit;
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sort]: sortOrder };

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('members.user', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Project.countDocuments(query)
    ]);

    return {
      projects,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get a single project by ID
   * @param {String} projectId - Project ID
   * @param {Object} user - Current user
   * @returns {Object} Project details
   */
  static async getProjectById(projectId, user) {
    const project = await Project.findById(projectId)
      .populate('createdBy', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permissions
    if (user.role !== 'admin' && !project.isMember(user._id) && project.createdBy._id.toString() !== user._id.toString()) {
      throw new Error('Access denied');
    }

    return project;
  }

  /**
   * Update a project
   * @param {String} projectId - Project ID
   * @param {Object} updateData - Data to update
   * @param {Object} user - Current user
   * @returns {Object} Updated project
   */
  static async updateProject(projectId, updateData, user) {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permissions (only admin or project creator can update)
    if (user.role !== 'admin' && project.createdBy.toString() !== user._id.toString()) {
      throw new Error('Access denied');
    }

    // Update project
    Object.assign(project, updateData);
    await project.save();

    return await Project.findById(project._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');
  }

  /**
   * Delete a project
   * @param {String} projectId - Project ID
   * @param {Object} user - Current user
   * @returns {Boolean} Success status
   */
  static async deleteProject(projectId, user) {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permissions (only admin or project creator can delete)
    if (user.role !== 'admin' && project.createdBy.toString() !== user._id.toString()) {
      throw new Error('Access denied');
    }

    await Project.findByIdAndDelete(projectId);
    return true;
  }

  /**
   * Add member to project
   * @param {String} projectId - Project ID
   * @param {String} userId - User ID to add
   * @param {String} role - Member role
   * @param {Object} currentUser - Current user
   * @returns {Object} Updated project
   */
  static async addMember(projectId, userId, role, currentUser) {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permissions (only admin or project creator can add members)
    if (currentUser.role !== 'admin' && project.createdBy.toString() !== currentUser._id.toString()) {
      throw new Error('Access denied');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is already a member
    if (project.isMember(userId)) {
      throw new Error('User is already a member of this project');
    }

    // Add member
    await project.addMember(userId, role);

    return await Project.findById(project._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');
  }

  /**
   * Remove member from project
   * @param {String} projectId - Project ID
   * @param {String} userId - User ID to remove
   * @param {Object} currentUser - Current user
   * @returns {Object} Updated project
   */
  static async removeMember(projectId, userId, currentUser) {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permissions (only admin or project creator can remove members)
    if (currentUser.role !== 'admin' && project.createdBy.toString() !== currentUser._id.toString()) {
      throw new Error('Access denied');
    }

    // Cannot remove project creator
    if (project.createdBy.toString() === userId) {
      throw new Error('Cannot remove project creator');
    }

    // Check if user is a member
    if (!project.isMember(userId)) {
      throw new Error('User is not a member of this project');
    }

    // Remove member
    await project.removeMember(userId);

    return await Project.findById(project._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');
  }

  /**
   * Get project members
   * @param {String} projectId - Project ID
   * @param {Object} user - Current user
   * @returns {Array} Project members
   */
  static async getProjectMembers(projectId, user) {
    const project = await Project.findById(projectId)
      .populate('members.user', 'firstName lastName email role');

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permissions (only admin or project members can view members)
    if (user.role !== 'admin' && !project.isMember(user._id) && project.createdBy.toString() !== user._id.toString()) {
      throw new Error('Access denied');
    }

    return project.members;
  }

  /**
   * Update member role
   * @param {String} projectId - Project ID
   * @param {String} userId - User ID
   * @param {String} newRole - New role
   * @param {Object} currentUser - Current user
   * @returns {Object} Updated project
   */
  static async updateMemberRole(projectId, userId, newRole, currentUser) {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Check permissions (only admin or project creator can update roles)
    if (currentUser.role !== 'admin' && project.createdBy.toString() !== currentUser._id.toString()) {
      throw new Error('Access denied');
    }

    // Cannot change creator's role
    if (project.createdBy.toString() === userId) {
      throw new Error('Cannot change project creator role');
    }

    // Update member role
    await project.updateMemberRole(userId, newRole);

    return await Project.findById(project._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');
  }

  /**
   * Get project statistics
   * @param {Object} user - Current user
   * @returns {Object} Project statistics
   */
  static async getProjectStats(user) {
    let matchQuery = {};

    if (user.role !== 'admin') {
      matchQuery = {
        $or: [
          { createdBy: user._id },
          { 'members.user': user._id }
        ]
      };
    }

    const stats = await Project.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          activeProjects: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedProjects: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          archivedProjects: {
            $sum: { $cond: [{ $eq: ['$isArchived', true] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      archivedProjects: 0
    };
  }
}

module.exports = ProjectService;