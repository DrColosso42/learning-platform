import express from 'express';
import { StudySessionController } from '../controllers/studySessionController.js';
import { TimerController } from '../controllers/timerController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

/**
 * Study session routes for managing learning sessions
 * Handles session creation, question flow, and progress tracking
 */
export function createStudySessionRoutes(): express.Router {
  const router = express.Router();
  const studySessionController = new StudySessionController();
  const timerController = new TimerController();

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

  // Reset session - complete deletion and fresh start
  router.post('/:questionSetId/reset', studySessionController.resetSession);

  // Get questions with selection probabilities for sidebar
  router.get('/:questionSetId/questions-probabilities', studySessionController.getQuestionsWithProbabilities);

  // Select a specific question for study
  router.post('/:questionSetId/select-question', studySessionController.selectQuestion);

  // Get hypothetical probabilities for live updates
  router.post('/:questionSetId/hypothetical-probabilities', studySessionController.getQuestionsWithHypotheticalProbabilities);

  // === TIMER ROUTES ===

  // Start or resume timer for a session
  router.post('/:questionSetId/timer/start', timerController.startTimer);

  // Pause timer for a session
  router.post('/:questionSetId/timer/pause', timerController.pauseTimer);

  // Advance to next phase (work -> rest -> work)
  router.post('/:questionSetId/timer/advance', timerController.advancePhase);

  // Stop timer and complete session
  router.post('/:questionSetId/timer/stop', timerController.stopTimer);

  // Get current timer state
  router.get('/:questionSetId/timer', timerController.getTimerState);

  // Get timer statistics for a session
  router.get('/:questionSetId/timer/stats', timerController.getTimerStats);

  // Update timer configuration
  router.put('/:questionSetId/timer/config', timerController.updateConfig);

  return router;
}