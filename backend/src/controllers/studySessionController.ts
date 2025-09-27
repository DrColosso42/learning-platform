import { Request, Response } from 'express';
import { z } from 'zod';
import { StudySessionService } from '../services/studySessionService.js';

/**
 * Study session controller handling session management and question flow
 * Implements weighted question selection with confidence-based learning
 */
export class StudySessionController {
  private studySessionService = new StudySessionService();

  /**
   * Start or resume a study session
   */
  startSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const startSessionSchema = z.object({
        questionSetId: z.number(),
        mode: z.enum(['front-to-end', 'shuffle']),
      });

      const validatedData = startSessionSchema.parse(req.body);
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const session = await this.studySessionService.startOrResumeSession(userId, validatedData);

      res.json({
        success: true,
        session: {
          id: session.id,
          questionSetId: session.questionSetId,
          mode: session.mode,
          startedAt: session.startedAt,
          isResumed: session.sessionAnswers.length > 0,
        },
      });
    } catch (error) {
      console.error('Error starting study session:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to start study session' });
    }
  };

  /**
   * Get the next question in the study session
   */
  getNextQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
      const { questionSetId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const questionSetIdNum = parseInt(questionSetId);
      if (isNaN(questionSetIdNum)) {
        res.status(400).json({ error: 'Invalid question set ID' });
        return;
      }

      const result = await this.studySessionService.getNextQuestion(userId, questionSetIdNum);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error getting next question:', error);
      res.status(500).json({ error: 'Failed to get next question' });
    }
  };

  /**
   * Submit an answer with confidence rating
   */
  submitAnswer = async (req: Request, res: Response): Promise<void> => {
    try {
      const submitAnswerSchema = z.object({
        questionId: z.number(),
        confidenceRating: z.number().min(1).max(5),
      });

      const { questionSetId } = req.params;
      const validatedData = submitAnswerSchema.parse(req.body);
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const questionSetIdNum = parseInt(questionSetId);
      if (isNaN(questionSetIdNum)) {
        res.status(400).json({ error: 'Invalid question set ID' });
        return;
      }

      await this.studySessionService.submitAnswer(userId, questionSetIdNum, validatedData);

      res.json({
        success: true,
        message: 'Answer submitted successfully',
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to submit answer' });
    }
  };

  /**
   * Complete current study session
   */
  completeSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { questionSetId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const questionSetIdNum = parseInt(questionSetId);
      if (isNaN(questionSetIdNum)) {
        res.status(400).json({ error: 'Invalid question set ID' });
        return;
      }

      await this.studySessionService.completeSession(userId, questionSetIdNum);

      res.json({
        success: true,
        message: 'Study session completed',
      });
    } catch (error) {
      console.error('Error completing study session:', error);
      res.status(500).json({ error: 'Failed to complete study session' });
    }
  };

  /**
   * Restart study session (creates new session)
   */
  restartSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const restartSessionSchema = z.object({
        mode: z.enum(['front-to-end', 'shuffle']),
      });

      const { questionSetId } = req.params;
      const validatedData = restartSessionSchema.parse(req.body);
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const questionSetIdNum = parseInt(questionSetId);
      if (isNaN(questionSetIdNum)) {
        res.status(400).json({ error: 'Invalid question set ID' });
        return;
      }

      const session = await this.studySessionService.restartSession(userId, {
        questionSetId: questionSetIdNum,
        mode: validatedData.mode,
      });

      res.json({
        success: true,
        session: {
          id: session.id,
          questionSetId: session.questionSetId,
          mode: session.mode,
          startedAt: session.startedAt,
        },
      });
    } catch (error) {
      console.error('Error restarting study session:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to restart study session' });
    }
  };

  /**
   * Reset study session - complete deletion and fresh start
   */
  resetSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const resetSessionSchema = z.object({
        mode: z.enum(['front-to-end', 'shuffle']).optional().default('front-to-end'),
      });

      const { questionSetId } = req.params;
      const validatedData = resetSessionSchema.parse(req.body);
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const questionSetIdNum = parseInt(questionSetId);
      if (isNaN(questionSetIdNum)) {
        res.status(400).json({ error: 'Invalid questionSetId' });
        return;
      }

      console.log('🔄 StudySessionController: Resetting session for questionSet', questionSetIdNum, 'user', userId);

      const session = await this.studySessionService.resetSession(
        userId,
        questionSetIdNum,
        validatedData.mode
      );

      res.json({
        success: true,
        message: 'Session reset successfully',
        session: {
          id: session.id,
          questionSetId: session.questionSetId,
          mode: session.mode,
          startedAt: session.startedAt,
        },
      });
    } catch (error) {
      console.error('Error resetting study session:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to reset study session' });
    }
  };

  /**
   * Get current study session status
   */
  getSessionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { questionSetId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const questionSetIdNum = parseInt(questionSetId);
      if (isNaN(questionSetIdNum)) {
        res.status(400).json({ error: 'Invalid question set ID' });
        return;
      }

      // Get next question which includes progress information
      const result = await this.studySessionService.getNextQuestion(userId, questionSetIdNum);

      res.json({
        success: true,
        hasActiveSession: !result.sessionComplete,
        progress: result.progress,
        sessionComplete: result.sessionComplete,
      });
    } catch (error) {
      // If no active session, return appropriate response
      if (error instanceof Error && error.message === 'No active study session found') {
        res.json({
          success: true,
          hasActiveSession: false,
          progress: null,
          sessionComplete: false,
        });
        return;
      }

      console.error('Error getting session status:', error);
      res.status(500).json({ error: 'Failed to get session status' });
    }
  };
}