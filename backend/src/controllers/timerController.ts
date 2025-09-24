import { Request, Response } from 'express';
import { TimerSessionService, TimerConfig } from '../services/timerSessionService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Controller for study session timer operations
 */
export class TimerController {
  private timerSessionService: TimerSessionService;

  constructor() {
    this.timerSessionService = new TimerSessionService();
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

      // Find the active DECK session for this user and question set (this won't be modified)
      const deckSessionId = await this.getActiveDeckSessionId(userId, questionSetId);

      // Use TimerSessionService to handle timer independently
      const timerState = await this.timerSessionService.startTimer(deckSessionId, userId, config);

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

      const deckSessionId = await this.getActiveDeckSessionId(userId, questionSetId);
      const timerState = await this.timerSessionService.pauseTimer(deckSessionId);

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

      const deckSessionId = await this.getActiveDeckSessionId(userId, questionSetId);
      const timerState = await this.timerSessionService.advancePhase(deckSessionId);

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

      const deckSessionId = await this.getActiveDeckSessionId(userId, questionSetId);
      const timerState = await this.timerSessionService.stopTimer(deckSessionId);

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

      const deckSessionId = await this.getActiveDeckSessionId(userId, questionSetId);
      const timerState = await this.timerSessionService.getTimerStateByDeckSession(deckSessionId);

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

      const deckSessionId = await this.getActiveDeckSessionId(userId, questionSetId);
      const stats = await this.timerSessionService.getTimerStats(deckSessionId);

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

      const deckSessionId = await this.getActiveDeckSessionId(userId, questionSetId);
      const timerState = await this.timerSessionService.updateConfig(deckSessionId, config);

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
   * Helper method to get active deck session ID for a user and question set
   * Creates a new deck session if none exists (for deck studying only)
   * This method is CRITICAL - it only handles deck progress, never timer data
   */
  private async getActiveDeckSessionId(userId: number, questionSetId: number): Promise<number> {
    // First try to find an existing active deck session
    let deckSession = await prisma.studySession.findFirst({
      where: {
        userId,
        questionSetId,
        completedAt: null,
      },
      select: { id: true }
    });

    // If no active deck session exists, create a new one
    if (!deckSession) {
      console.log('📚 TimerController: Creating new DECK session for questionSet', questionSetId, 'user', userId);

      const newDeckSession = await prisma.studySession.create({
        data: {
          userId,
          questionSetId,
          mode: 'front-to-end', // Default mode for deck studying
        },
        select: { id: true }
      });

      deckSession = newDeckSession;
    }

    console.log('✅ TimerController: Using deckSessionId', deckSession.id, '- deck progress will be preserved');
    return deckSession.id;
  }
}