import { Request, Response } from 'express';
import { TimerService, TimerConfig } from '../services/timerService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Controller for study session timer operations
 */
export class TimerController {
  private timerService: TimerService;

  constructor() {
    this.timerService = new TimerService();
  }

  /**
   * Start or resume timer for a session
   * POST /api/sessions/:questionSetId/timer/start
   */
  startTimer = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionSetId = parseInt(req.params.questionSetId);
      const userId = req.user.userId;
      const config: Partial<TimerConfig> = req.body;

      console.log('🎯 TimerController: Starting timer for questionSet', questionSetId, 'user', userId);

      // Find the active session for this user and question set
      const sessionId = await this.getActiveSessionId(userId, questionSetId);

      const timerState = await this.timerService.startTimer(sessionId, config);

      res.json({
        success: true,
        timer: timerState
      });
    } catch (error) {
      console.error('Start timer error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Pause timer for a session
   * POST /api/sessions/:questionSetId/timer/pause
   */
  pauseTimer = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionSetId = parseInt(req.params.questionSetId);
      const userId = req.user.userId;

      console.log('⏸️ TimerController: Pausing timer for questionSet', questionSetId);

      const sessionId = await this.getActiveSessionId(userId, questionSetId);
      const timerState = await this.timerService.pauseTimer(sessionId);

      res.json({
        success: true,
        timer: timerState
      });
    } catch (error) {
      console.error('Pause timer error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Advance to next phase (work -> rest -> work)
   * POST /api/sessions/:questionSetId/timer/advance
   */
  advancePhase = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionSetId = parseInt(req.params.questionSetId);
      const userId = req.user.userId;

      console.log('➡️ TimerController: Advancing phase for questionSet', questionSetId);

      const sessionId = await this.getActiveSessionId(userId, questionSetId);
      const timerState = await this.timerService.advancePhase(sessionId);

      res.json({
        success: true,
        timer: timerState
      });
    } catch (error) {
      console.error('Advance phase error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Stop timer and complete session
   * POST /api/sessions/:questionSetId/timer/stop
   */
  stopTimer = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionSetId = parseInt(req.params.questionSetId);
      const userId = req.user.userId;

      console.log('⏹️ TimerController: Stopping timer for questionSet', questionSetId);

      const sessionId = await this.getActiveSessionId(userId, questionSetId);
      const timerState = await this.timerService.stopTimer(sessionId);

      res.json({
        success: true,
        timer: timerState
      });
    } catch (error) {
      console.error('Stop timer error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get current timer state
   * GET /api/sessions/:questionSetId/timer
   */
  getTimerState = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionSetId = parseInt(req.params.questionSetId);
      const userId = req.user.userId;

      const sessionId = await this.getActiveSessionId(userId, questionSetId);
      const timerState = await this.timerService.getTimerState(sessionId);

      res.json({
        success: true,
        timer: timerState
      });
    } catch (error) {
      console.error('Get timer state error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get timer statistics for a session
   * GET /api/sessions/:questionSetId/timer/stats
   */
  getTimerStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionSetId = parseInt(req.params.questionSetId);
      const userId = req.user.userId;

      const sessionId = await this.getActiveSessionId(userId, questionSetId);
      const stats = await this.timerService.getTimerStats(sessionId);

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Get timer stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Update timer configuration
   * PUT /api/sessions/:questionSetId/timer/config
   */
  updateConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionSetId = parseInt(req.params.questionSetId);
      const userId = req.user.userId;
      const config: Partial<TimerConfig> = req.body;

      console.log('⚙️ TimerController: Updating config for questionSet', questionSetId, 'with:', config);

      const sessionId = await this.getActiveSessionId(userId, questionSetId);
      const timerState = await this.timerService.updateConfig(sessionId, config);

      res.json({
        success: true,
        timer: timerState
      });
    } catch (error) {
      console.error('Update timer config error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Helper method to get active session ID for a user and question set
   * Creates a new session if none exists
   */
  private async getActiveSessionId(userId: number, questionSetId: number): Promise<number> {
    // First try to find an existing active session
    let session = await prisma.studySession.findFirst({
      where: {
        userId,
        questionSetId,
        completedAt: null,
      },
      select: { id: true }
    });

    // If no active session exists, create a new one
    if (!session) {
      console.log('⚡ TimerController: Creating new session for questionSet', questionSetId, 'user', userId);

      const newSession = await prisma.studySession.create({
        data: {
          userId,
          questionSetId,
          mode: 'front-to-end', // Default mode for timer-initiated sessions
        },
        select: { id: true }
      });

      session = newSession;
    }

    return session.id;
  }
}