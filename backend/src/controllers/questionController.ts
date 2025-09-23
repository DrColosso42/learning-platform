import { Request, Response } from 'express';
import { QuestionService } from '../services/questionService.js';
import { z } from 'zod';

const createQuestionSetSchema = z.object({
  name: z.string().min(1, 'Question set name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  projectId: z.number().int().positive(),
});

const createQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required').max(1000, 'Question too long'),
  answerText: z.string().max(1000, 'Answer too long').optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
});

const bulkCreateQuestionsSchema = z.object({
  questions: z.array(createQuestionSchema).min(1, 'At least one question required'),
  questionSetId: z.number().int().positive(),
});

const parseTextSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  format: z.enum(['csv', 'lines']),
});

/**
 * Question controller handles question sets and questions management
 * Supports multiple input methods and bulk operations
 */
export class QuestionController {
  private questionService: QuestionService;

  constructor() {
    this.questionService = new QuestionService();
  }

  /**
   * Create a new question set
   * POST /api/questions/sets
   */
  createQuestionSet = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const validatedData = createQuestionSetSchema.parse(req.body);

      const questionSet = await this.questionService.createQuestionSet(
        req.user.userId,
        validatedData
      );

      res.status(201).json({
        message: 'Question set created successfully',
        questionSet,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      console.error('Create question set error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get question sets for a project
   * GET /api/questions/sets/project/:projectId
   */
  getQuestionSetsByProject = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project ID' });
        return;
      }

      const questionSets = await this.questionService.getQuestionSetsByProject(
        req.user.userId,
        projectId
      );

      res.json({ questionSets });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      console.error('Get question sets error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get a single question set with questions
   * GET /api/questions/sets/:id
   */
  getQuestionSet = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionSetId = parseInt(req.params.id);
      if (isNaN(questionSetId)) {
        res.status(400).json({ error: 'Invalid question set ID' });
        return;
      }

      const questionSet = await this.questionService.getQuestionSet(
        req.user.userId,
        questionSetId
      );

      if (!questionSet) {
        res.status(404).json({ error: 'Question set not found' });
        return;
      }

      res.json({ questionSet });
    } catch (error) {
      console.error('Get question set error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Create a single question
   * POST /api/questions/sets/:id/questions
   */
  createQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionSetId = parseInt(req.params.id);
      if (isNaN(questionSetId)) {
        res.status(400).json({ error: 'Invalid question set ID' });
        return;
      }

      const validatedData = createQuestionSchema.parse(req.body);

      const question = await this.questionService.createQuestion(
        req.user.userId,
        questionSetId,
        validatedData
      );

      res.status(201).json({
        message: 'Question created successfully',
        question,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      console.error('Create question error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Create multiple questions in bulk
   * POST /api/questions/bulk
   */
  createQuestionsBulk = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const validatedData = bulkCreateQuestionsSchema.parse(req.body);

      const questions = await this.questionService.createQuestionsBulk(
        req.user.userId,
        validatedData
      );

      res.status(201).json({
        message: `${questions.length} questions created successfully`,
        questions,
        count: questions.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      console.error('Create questions bulk error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Parse text (CSV or lines) and return parsed questions for preview
   * POST /api/questions/parse
   */
  parseText = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const validatedData = parseTextSchema.parse(req.body);

      let questions;
      if (validatedData.format === 'csv') {
        questions = QuestionService.parseCSVText(validatedData.text);
      } else {
        questions = QuestionService.parseTextLines(validatedData.text);
      }

      res.json({
        questions,
        count: questions.length,
        format: validatedData.format,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      console.error('Parse text error:', error);
      res.status(500).json({ error: 'Failed to parse text' });
    }
  };

  /**
   * Update a question
   * PUT /api/questions/:id
   */
  updateQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionId = parseInt(req.params.id);
      if (isNaN(questionId)) {
        res.status(400).json({ error: 'Invalid question ID' });
        return;
      }

      const validatedData = createQuestionSchema.partial().parse(req.body);

      const updatedQuestion = await this.questionService.updateQuestion(
        req.user.userId,
        questionId,
        validatedData
      );

      if (!updatedQuestion) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      res.json({
        message: 'Question updated successfully',
        question: updatedQuestion,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }

      console.error('Update question error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Delete a question
   * DELETE /api/questions/:id
   */
  deleteQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionId = parseInt(req.params.id);
      if (isNaN(questionId)) {
        res.status(400).json({ error: 'Invalid question ID' });
        return;
      }

      const deleted = await this.questionService.deleteQuestion(req.user.userId, questionId);

      if (!deleted) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      res.json({ message: 'Question deleted successfully' });
    } catch (error) {
      console.error('Delete question error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Delete a question set
   * DELETE /api/questions/sets/:id
   */
  deleteQuestionSet = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const questionSetId = parseInt(req.params.id);
      if (isNaN(questionSetId)) {
        res.status(400).json({ error: 'Invalid question set ID' });
        return;
      }

      const deleted = await this.questionService.deleteQuestionSet(req.user.userId, questionSetId);

      if (!deleted) {
        res.status(404).json({ error: 'Question set not found' });
        return;
      }

      res.json({ message: 'Question set deleted successfully' });
    } catch (error) {
      console.error('Delete question set error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}