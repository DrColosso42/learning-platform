import { QuestionSet, Question } from '@prisma/client';
import { prisma } from '../config/database.js';

export interface CreateQuestionSetInput {
  name: string;
  description?: string;
  projectId: number;
}

export interface CreateQuestionInput {
  questionText: string;
  answerText?: string;
  difficulty?: number;
}

export interface BulkCreateQuestionsInput {
  questions: CreateQuestionInput[];
  questionSetId: number;
}

export interface QuestionSetWithQuestions extends QuestionSet {
  questions: Question[];
  questionCount: number;
}

/**
 * Question service handles question sets and individual questions
 * Supports various import methods: manual, CSV, bulk text
 */
export class QuestionService {
  /**
   * Create a new question set within a project
   */
  async createQuestionSet(
    userId: number,
    questionSetData: CreateQuestionSetInput
  ): Promise<QuestionSet> {
    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: { id: questionSetData.projectId, ownerId: userId },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    const newQuestionSet = await prisma.questionSet.create({
      data: {
        name: questionSetData.name,
        description: questionSetData.description || null,
        projectId: questionSetData.projectId,
      },
      include: {
        questions: true,
      },
    });

    return {
      ...newQuestionSet,
      questionCount: newQuestionSet.questions.length,
    };
  }

  /**
   * Get all question sets for a project
   */
  async getQuestionSetsByProject(
    userId: number,
    projectId: number
  ): Promise<QuestionSetWithQuestions[]> {
    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      throw new Error('Project not found or access denied');
    }

    const questionSets = await prisma.questionSet.findMany({
      where: { projectId },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return questionSets.map(qs => ({
      ...qs,
      questionCount: qs.questions.length,
    }));
  }

  /**
   * Get a single question set with questions
   */
  async getQuestionSet(
    userId: number,
    questionSetId: number
  ): Promise<QuestionSetWithQuestions | null> {
    const questionSet = await prisma.questionSet.findFirst({
      where: {
        id: questionSetId,
        project: { ownerId: userId },
      },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!questionSet) {
      return null;
    }

    return {
      ...questionSet,
      questionCount: questionSet.questions.length,
    };
  }

  /**
   * Create a single question
   */
  async createQuestion(
    userId: number,
    questionSetId: number,
    questionData: CreateQuestionInput
  ): Promise<Question> {
    // Verify user owns the question set
    const questionSet = await prisma.questionSet.findFirst({
      where: {
        id: questionSetId,
        project: { ownerId: userId },
      },
    });

    if (!questionSet) {
      throw new Error('Question set not found or access denied');
    }

    return prisma.question.create({
      data: {
        questionSetId,
        questionText: questionData.questionText,
        answerText: questionData.answerText || null,
        difficulty: questionData.difficulty || 1,
      },
    });
  }

  /**
   * Create multiple questions in bulk
   */
  async createQuestionsBulk(
    userId: number,
    bulkData: BulkCreateQuestionsInput
  ): Promise<Question[]> {
    // Verify user owns the question set
    const questionSet = await prisma.questionSet.findFirst({
      where: {
        id: bulkData.questionSetId,
        project: { ownerId: userId },
      },
    });

    if (!questionSet) {
      throw new Error('Question set not found or access denied');
    }

    const questions = await prisma.$transaction(
      bulkData.questions.map(q =>
        prisma.question.create({
          data: {
            questionSetId: bulkData.questionSetId,
            questionText: q.questionText,
            answerText: q.answerText || null,
            difficulty: q.difficulty || 1,
          },
        })
      )
    );

    return questions;
  }

  /**
   * Update a question
   */
  async updateQuestion(
    userId: number,
    questionId: number,
    updateData: Partial<CreateQuestionInput>
  ): Promise<Question | null> {
    // Verify user owns the question
    const existingQuestion = await prisma.question.findFirst({
      where: {
        id: questionId,
        questionSet: {
          project: { ownerId: userId },
        },
      },
    });

    if (!existingQuestion) {
      return null;
    }

    return prisma.question.update({
      where: { id: questionId },
      data: updateData,
    });
  }

  /**
   * Delete a question
   */
  async deleteQuestion(userId: number, questionId: number): Promise<boolean> {
    try {
      const deletedQuestion = await prisma.question.deleteMany({
        where: {
          id: questionId,
          questionSet: {
            project: { ownerId: userId },
          },
        },
      });

      return deletedQuestion.count > 0;
    } catch (error) {
      console.error('Error deleting question:', error);
      return false;
    }
  }

  /**
   * Delete a question set and all its questions
   */
  async deleteQuestionSet(userId: number, questionSetId: number): Promise<boolean> {
    try {
      const deletedQuestionSet = await prisma.questionSet.deleteMany({
        where: {
          id: questionSetId,
          project: { ownerId: userId },
        },
      });

      return deletedQuestionSet.count > 0;
    } catch (error) {
      console.error('Error deleting question set:', error);
      return false;
    }
  }

  /**
   * Parse CSV text and return questions
   */
  static parseCSVText(csvText: string): CreateQuestionInput[] {
    const lines = csvText.trim().split('\n');
    const questions: CreateQuestionInput[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // Support multiple CSV formats:
      // 1. "Question","Answer"
      // 2. Question,Answer
      // 3. "Question","Answer",difficulty
      const parts = line.split(',').map(part =>
        part.trim().replace(/^["']|["']$/g, '') // Remove quotes
      );

      if (parts.length >= 1) {
        const question: CreateQuestionInput = {
          questionText: parts[0],
          answerText: parts[1] || undefined,
          difficulty: parts[2] ? parseInt(parts[2]) || 1 : 1,
        };
        questions.push(question);
      }
    }

    return questions;
  }

  /**
   * Parse plain text (one question per line) and return questions
   * Automatically removes numbered prefixes like "1.", "2)", "a.", etc.
   */
  static parseTextLines(text: string): CreateQuestionInput[] {
    const lines = text.trim().split('\n');
    const questions: CreateQuestionInput[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Remove numbered prefixes like "1.", "2)", "a.", "A)", "i.", etc.
      const cleanedLine = trimmedLine.replace(/^(\d+[.)]\s*|[a-zA-Z][.)]\s*|[ivxlcdm]+[.)]\s*)/i, '');

      if (cleanedLine.trim()) {
        questions.push({
          questionText: cleanedLine.trim(),
          answerText: undefined,
          difficulty: 1,
        });
      }
    }

    return questions;
  }

  /**
   * Update question set details
   */
  async updateQuestionSet(
    userId: number,
    questionSetId: number,
    updateData: { name?: string; description?: string }
  ): Promise<QuestionSet | null> {
    // Verify user owns the question set
    const existingQuestionSet = await prisma.questionSet.findFirst({
      where: {
        id: questionSetId,
        project: { ownerId: userId },
      },
    });

    if (!existingQuestionSet) {
      return null;
    }

    return prisma.questionSet.update({
      where: { id: questionSetId },
      data: updateData,
    });
  }
}