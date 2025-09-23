import express from 'express';
import { StudySessionController } from '../controllers/studySessionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

/**
 * Study session routes for managing learning sessions
 * Handles session creation, question flow, and progress tracking
 */
export function createStudySessionRoutes(): express.Router {
  const router = express.Router();
  const studySessionController = new StudySessionController();

  // Apply authentication to all routes
  router.use(authenticateToken);

  // Start or resume a study session
  router.post('/start', studySessionController.startSession);

  // Get session status for a question set
  router.get('/:questionSetId/status', studySessionController.getSessionStatus);

  // Get next question in session
  router.get('/:questionSetId/next-question', studySessionController.getNextQuestion);

  // Submit answer with confidence rating
  router.post('/:questionSetId/submit-answer', studySessionController.submitAnswer);

  // Complete current session
  router.post('/:questionSetId/complete', studySessionController.completeSession);

  // Restart session with new mode
  router.post('/:questionSetId/restart', studySessionController.restartSession);

  return router;
}