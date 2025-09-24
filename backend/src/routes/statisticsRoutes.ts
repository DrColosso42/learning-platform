import { Router } from 'express';
import { StatisticsController } from '../controllers/statisticsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

/**
 * Statistics routes for user analytics
 * All routes require authentication
 */
export const createStatisticsRoutes = (): Router => {
  const router = Router();
  const statisticsController = new StatisticsController();

  // All statistics routes require authentication
  router.use(authenticateToken);

  router.get('/overview', statisticsController.getUserStatistics);
  router.get('/recent-sessions', statisticsController.getRecentSessions);
  router.get('/activity', statisticsController.getActivityData);
  router.get('/dashboard', statisticsController.getDashboardData);

  // Time-based statistics endpoints
  router.get('/time-stats', statisticsController.getTimeStatistics);
  router.get('/time-activity', statisticsController.getTimeActivityData);
  router.get('/enhanced-dashboard', statisticsController.getEnhancedDashboardData);

  return router;
};