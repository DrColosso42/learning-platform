import { Request, Response } from 'express';
import { ProjectService } from '../services/projectService.js';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  isPublic: z.boolean().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  isPublic: z.boolean().optional(),
});

/**
 * Project controller handles project management endpoints
 * Provides CRUD operations with proper authentication
 */
export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  /**
   * Get all projects for the authenticated user
   * GET /api/projects
   */
  getUserProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const projects = await this.projectService.getUserProjects(req.user.userId);

      res.json({
        projects,
        total: projects.length,
      });
    } catch (error) {
      console.error('Get user projects error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get a single project by ID
   * GET /api/projects/:id
   */
  getProject = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      const project = await this.projectService.getProjectById(projectId, req.user.userId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json({ project });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Create a new project
   * POST /api/projects
   */
  createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const validatedData = createProjectSchema.parse(req.body);

      const project = await this.projectService.createProject(req.user.userId, validatedData);

      res.status(201).json({
        message: 'Project created successfully',
        project,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      console.error('Create project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Update a project
   * PUT /api/projects/:id
   */
  updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      const validatedData = updateProjectSchema.parse(req.body);

      const updatedProject = await this.projectService.updateProject(
        projectId,
        req.user.userId,
        validatedData
      );

      if (!updatedProject) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json({
        message: 'Project updated successfully',
        project: updatedProject,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      console.error('Update project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Delete a project
   * DELETE /api/projects/:id
   */
  deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      const deleted = await this.projectService.deleteProject(projectId, req.user.userId);

      if (!deleted) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get public projects for discovery
   * GET /api/projects/public
   */
  getPublicProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      const projects = await this.projectService.getPublicProjects(limit);

      res.json({
        projects,
        total: projects.length,
      });
    } catch (error) {
      console.error('Get public projects error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}