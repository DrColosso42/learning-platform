import { Router } from 'express';
import { ProjectController } from '../controllers/projectController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

/**
 * Project routes for CRUD operations
 * All routes require authentication except public projects
 */
export const createProjectRoutes = (): Router => {
  const router = Router();
  const projectController = new ProjectController();

  // Public routes
  router.get('/public', projectController.getPublicProjects);

  // Protected routes (require authentication)
  router.use(authenticateToken);

  router.get('/', projectController.getUserProjects);
  router.get('/:id', projectController.getProject);
  router.post('/', projectController.createProject);
  router.put('/:id', projectController.updateProject);
  router.delete('/:id', projectController.deleteProject);

  return router;
};