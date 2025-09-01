const ProjectService = require('../services/projectService');

class ProjectController {
  /**
   * Create a new project
   */
  static async createProject(req, res, next) {
    try {
      const project = await ProjectService.createProject(req.body, req.user._id);

      res.status(201).json({
        success: true,
        data: {
          project
        },
        message: 'Project created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all projects (with filtering and pagination)
   */
  static async getProjects(req, res, next) {
    try {
      const result = await ProjectService.getProjects(req.user, req.query);

      res.status(200).json({
        success: true,
        data: {
          projects: result.projects,
          pagination: result.pagination
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single project by ID
   */
  static async getProject(req, res, next) {
    try {
      const project = await ProjectService.getProjectById(req.params.id, req.user);

      res.status(200).json({
        success: true,
        data: {
          project
        }
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 404,
            message: 'Project not found'
          }
        });
      }

      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 403,
            message: 'Access denied'
          }
        });
      }

      next(error);
    }
  }

  /**
   * Update a project
   */
  static async updateProject(req, res, next) {
    try {
      const project = await ProjectService.updateProject(req.params.id, req.body, req.user);

      res.status(200).json({
        success: true,
        data: {
          project
        },
        message: 'Project updated successfully'
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 404,
            message: 'Project not found'
          }
        });
      }

      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 403,
            message: 'Access denied'
          }
        });
      }

      next(error);
    }
  }

  /**
   * Delete a project
   */
  static async deleteProject(req, res, next) {
    try {
      await ProjectService.deleteProject(req.params.id, req.user);

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 404,
            message: 'Project not found'
          }
        });
      }

      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 403,
            message: 'Access denied'
          }
        });
      }

      next(error);
    }
  }

  /**
   * Add member to project
   */
  static async addMember(req, res, next) {
    try {
      const { userId, role } = req.body;
      const project = await ProjectService.addMember(req.params.id, userId, role, req.user);

      res.status(200).json({
        success: true,
        data: {
          project
        },
        message: 'Member added successfully'
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 404,
            message: 'Project not found'
          }
        });
      }

      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 404,
            message: 'User not found'
          }
        });
      }

      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 403,
            message: 'Access denied'
          }
        });
      }

      if (error.message === 'User is already a member of this project') {
        return res.status(409).json({
          success: false,
          error: {
            code: 409,
            message: 'User is already a member of this project'
          }
        });
      }

      next(error);
    }
  }

  /**
   * Remove member from project
   */
  static async removeMember(req, res, next) {
    try {
      const project = await ProjectService.removeMember(req.params.id, req.params.userId, req.user);

      res.status(200).json({
        success: true,
        data: {
          project
        },
        message: 'Member removed successfully'
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 404,
            message: 'Project not found'
          }
        });
      }

      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 403,
            message: 'Access denied'
          }
        });
      }

      if (error.message === 'Cannot remove project creator' || error.message === 'User is not a member of this project') {
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: error.message
          }
        });
      }

      next(error);
    }
  }

  /**
   * Get project members
   */
  static async getProjectMembers(req, res, next) {
    try {
      const members = await ProjectService.getProjectMembers(req.params.id, req.user);

      res.status(200).json({
        success: true,
        data: {
          members
        }
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 404,
            message: 'Project not found'
          }
        });
      }

      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 403,
            message: 'Access denied'
          }
        });
      }

      next(error);
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(req, res, next) {
    try {
      const { role } = req.body;
      const project = await ProjectService.updateMemberRole(req.params.id, req.params.userId, role, req.user);

      res.status(200).json({
        success: true,
        data: {
          project
        },
        message: 'Member role updated successfully'
      });
    } catch (error) {
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 404,
            message: 'Project not found'
          }
        });
      }

      if (error.message === 'Access denied') {
        return res.status(403).json({
          success: false,
          error: {
            code: 403,
            message: 'Access denied'
          }
        });
      }

      if (error.message === 'Cannot change project creator role') {
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: 'Cannot change project creator role'
          }
        });
      }

      next(error);
    }
  }

  /**
   * Get project statistics
   */
  static async getProjectStats(req, res, next) {
    try {
      const stats = await ProjectService.getProjectStats(req.user);

      res.status(200).json({
        success: true,
        data: {
          stats
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProjectController;