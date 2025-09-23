import { Router } from 'express';
import { QuestionController } from '../controllers/questionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

/**
 * Question routes for question sets and individual questions
 * All routes require authentication
 */
export const createQuestionRoutes = (): Router => {
  const router = Router();
  const questionController = new QuestionController();

  // All question routes require authentication
  router.use(authenticateToken);

  // Question Set routes
  router.post('/sets', questionController.createQuestionSet);
  router.get('/sets/project/:projectId', questionController.getQuestionSetsByProject);
  router.get('/sets/:id', questionController.getQuestionSet);
  router.delete('/sets/:id', questionController.deleteQuestionSet);

  // Individual Question routes
  router.post('/sets/:id/questions', questionController.createQuestion);
  router.put('/:id', questionController.updateQuestion);
  router.delete('/:id', questionController.deleteQuestion);

  // Bulk operations
  router.post('/bulk', questionController.createQuestionsBulk);
  router.post('/parse', questionController.parseText);

  return router;
};