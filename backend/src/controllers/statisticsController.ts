import { Request, Response } from 'express';
import { StatisticsService } from '../services/statisticsService.js';

/**
 * Statistics controller for user analytics endpoints
 * Provides data for dashboard widgets and charts
 */
export class StatisticsController {
  private statisticsService: StatisticsService;

  constructor() {
    this.statisticsService = new StatisticsService();
  }

  /**
   * Get comprehensive user statistics
   * GET /api/statistics/overview
   */
  getUserStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      console.log('🔍 StatisticsController: Getting statistics for user ID:', req.user.userId);
      const statistics = await this.statisticsService.getUserStatistics(req.user.userId);
      console.log('📊 StatisticsController: Returning statistics:', statistics);

      res.json({ statistics });
    } catch (error) {
      console.error('Get user statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get recent study sessions
   * GET /api/statistics/recent-sessions
   */
  getRecentSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const sessions = await this.statisticsService.getRecentStudySessions(req.user.userId, limit);

      res.json({ sessions });
    } catch (error) {
      console.error('Get recent sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get activity data for calendar
   * GET /api/statistics/activity
   */
  getActivityData = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const days = parseInt(req.query.days as string) || 365;
      const activityData = await this.statisticsService.getActivityData(req.user.userId, days);

      console.log('📤 StatisticsController: Sending activity data response:', {
        activityDataLength: activityData.length,
        totalDays: days,
        sampleData: activityData.slice(0, 3),
        nonZeroDays: activityData.filter(d => d.count > 0)
      });

      res.json({
        activityData,
        totalDays: days
      });
    } catch (error) {
      console.error('Get activity data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get dashboard data (combined endpoint for efficiency)
   * GET /api/statistics/dashboard
   */
  getDashboardData = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const [statistics, recentSessions, activityData] = await Promise.all([
        this.statisticsService.getUserStatistics(req.user.userId),
        this.statisticsService.getRecentStudySessions(req.user.userId, 5),
        this.statisticsService.getActivityData(req.user.userId, 365),
      ]);

      res.json({
        statistics,
        recentSessions,
        activityData,
      });
    } catch (error) {
      console.error('Get dashboard data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get time-based statistics
   * GET /api/statistics/time-stats
   */
  getTimeStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      console.log('⏰ StatisticsController: Getting time statistics for user ID:', req.user.userId);
      const timeStats = await this.statisticsService.getTimeStatistics(req.user.userId);
      console.log('📊 StatisticsController: Returning time statistics:', timeStats);

      res.json({ timeStats });
    } catch (error) {
      console.error('Get time statistics error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get time-based activity data for calendar and graph
   * GET /api/statistics/time-activity
   */
  getTimeActivityData = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const days = parseInt(req.query.days as string) || 365;
      const timeActivityData = await this.statisticsService.getTimeActivityData(req.user.userId, days);

      console.log('📤 StatisticsController: Sending time activity data response:', {
        timeActivityDataLength: timeActivityData.length,
        totalDays: days,
        sampleData: timeActivityData.slice(0, 3),
        nonZeroTimeDays: timeActivityData.filter(d => d.minutes > 0)
      });

      res.json({
        timeActivityData,
        totalDays: days
      });
    } catch (error) {
      console.error('Get time activity data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get enhanced dashboard data with time tracking
   * GET /api/statistics/enhanced-dashboard
   */
  getEnhancedDashboardData = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const [statistics, recentSessions, activityData, timeStats, timeActivityData] = await Promise.all([
        this.statisticsService.getUserStatistics(req.user.userId),
        this.statisticsService.getRecentStudySessions(req.user.userId, 5),
        this.statisticsService.getActivityData(req.user.userId, 365),
        this.statisticsService.getTimeStatistics(req.user.userId),
        this.statisticsService.getTimeActivityData(req.user.userId, 365),
      ]);

      res.json({
        statistics,
        recentSessions,
        activityData,
        timeStats,
        timeActivityData,
      });
    } catch (error) {
      console.error('Get enhanced dashboard data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}