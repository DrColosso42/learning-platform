import { prisma } from '../config/database.js';
import { Question, StudySession, SessionAnswer } from '@prisma/client';

export interface StudySessionWithAnswers extends StudySession {
  sessionAnswers: SessionAnswer[];
}

export interface QuestionWithLastAttempt extends Question {
  lastAttempt?: SessionAnswer;
  attemptOrder?: number; // Position in session when last attempted
}

export interface WeightedQuestion {
  question: QuestionWithLastAttempt;
  weight: number;
}

export interface CreateStudySessionInput {
  questionSetId: number;
  mode: 'front-to-end' | 'shuffle';
}

export interface SubmitAnswerInput {
  questionId: number;
  confidenceRating: number; // 1-5
}

export interface NextQuestionResponse {
  question: Question | null;
  questionNumber: number | null; // Position in question set (1-based)
  previousScore: number | null; // Previous confidence rating for this question
  sessionComplete: boolean;
  progress: {
    totalQuestions: number;
    answeredQuestions: number;
    masteredQuestions: number; // Questions with rating 5
    currentPoints: number; // Sum of confidence ratings
    maxPoints: number; // totalQuestions * 5
  };
}

/**
 * Study session service implementing weighted question selection algorithm
 * Supports front-to-end and shuffle modes with confidence-based weighting
 */
export class StudySessionService {
  /**
   * Start or resume a study session for a question set
   */
  async startOrResumeSession(
    userId: number,
    sessionData: CreateStudySessionInput
  ): Promise<StudySessionWithAnswers> {
    // Check if there's an existing incomplete session
    const existingSession = await prisma.studySession.findFirst({
      where: {
        userId,
        questionSetId: sessionData.questionSetId,
        completedAt: null,
      },
      include: {
        sessionAnswers: {
          orderBy: { answeredAt: 'asc' },
        },
      },
    });

    if (existingSession) {
      return existingSession;
    }

    // Create new session
    const newSession = await prisma.studySession.create({
      data: {
        userId,
        questionSetId: sessionData.questionSetId,
        mode: sessionData.mode,
      },
      include: {
        sessionAnswers: true,
      },
    });

    return newSession;
  }

  /**
   * Get the next question using weighted selection algorithm
   */
  async getNextQuestion(
    userId: number,
    questionSetId: number
  ): Promise<NextQuestionResponse> {
    // Get current session
    const session = await prisma.studySession.findFirst({
      where: {
        userId,
        questionSetId,
        completedAt: null,
      },
      include: {
        sessionAnswers: {
          orderBy: { answeredAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new Error('No active study session found');
    }

    // Get all questions in the question set (ordered by creation)
    const allQuestions = await prisma.question.findMany({
      where: { questionSetId },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate progress
    const progress = this.calculateProgress(allQuestions, session.sessionAnswers);

    // Check if session is complete (all questions have rating 5)
    if (progress.masteredQuestions === progress.totalQuestions) {
      await prisma.studySession.update({
        where: { id: session.id },
        data: { completedAt: new Date() },
      });

      return {
        question: null,
        questionNumber: null,
        previousScore: null,
        sessionComplete: true,
        progress,
      };
    }

    // Get questions with their last attempts
    const questionsWithAttempts = this.attachLastAttempts(allQuestions, session.sessionAnswers);

    // Select next question using weighted algorithm
    const nextQuestion = this.selectNextQuestion(questionsWithAttempts, session.mode);

    // Calculate question number (1-based position in original question set)
    let questionNumber: number | null = null;
    let previousScore: number | null = null;

    if (nextQuestion) {
      questionNumber = allQuestions.findIndex(q => q.id === nextQuestion.id) + 1;

      // Find previous score for this question
      const questionWithAttempt = questionsWithAttempts.find(q => q.id === nextQuestion.id);
      previousScore = questionWithAttempt?.lastAttempt?.userRating || null;
    }

    return {
      question: nextQuestion,
      questionNumber,
      previousScore,
      sessionComplete: false,
      progress,
    };
  }

  /**
   * Submit an answer and record confidence rating
   */
  async submitAnswer(
    userId: number,
    questionSetId: number,
    answerData: SubmitAnswerInput
  ): Promise<void> {
    // Get current session
    const session = await prisma.studySession.findFirst({
      where: {
        userId,
        questionSetId,
        completedAt: null,
      },
      include: {
        sessionAnswers: true,
      },
    });

    if (!session) {
      throw new Error('No active study session found');
    }

    // Calculate attempt order (position in session)
    const attemptOrder = session.sessionAnswers.length + 1;

    // Record the answer
    await prisma.sessionAnswer.create({
      data: {
        sessionId: session.id,
        questionId: answerData.questionId,
        userRating: answerData.confidenceRating,
        // attemptOrder is calculated above for ordering
      },
    });
  }

  /**
   * Calculate session progress
   */
  private calculateProgress(
    allQuestions: Question[],
    sessionAnswers: SessionAnswer[]
  ): NextQuestionResponse['progress'] {
    const totalQuestions = allQuestions.length;
    const latestRatings = new Map<number, number>();

    // Get the latest rating for each question
    sessionAnswers.forEach(answer => {
      latestRatings.set(answer.questionId, answer.userRating);
    });

    const answeredQuestions = latestRatings.size;
    const masteredQuestions = Array.from(latestRatings.values()).filter(rating => rating === 5).length;

    // Calculate points: sum of all confidence ratings
    const currentPoints = Array.from(latestRatings.values()).reduce((sum, rating) => sum + rating, 0);
    const maxPoints = totalQuestions * 5;

    return {
      totalQuestions,
      answeredQuestions,
      masteredQuestions,
      currentPoints,
      maxPoints,
    };
  }

  /**
   * Attach last attempt data to questions
   */
  private attachLastAttempts(
    questions: Question[],
    sessionAnswers: SessionAnswer[]
  ): QuestionWithLastAttempt[] {
    const latestAttempts = new Map<number, { attempt: SessionAnswer; order: number }>();

    // Find latest attempt for each question
    sessionAnswers.forEach((answer, index) => {
      const existing = latestAttempts.get(answer.questionId);
      if (!existing || answer.answeredAt > existing.attempt.answeredAt) {
        latestAttempts.set(answer.questionId, { attempt: answer, order: index + 1 });
      }
    });

    return questions.map(question => ({
      ...question,
      lastAttempt: latestAttempts.get(question.id)?.attempt,
      attemptOrder: latestAttempts.get(question.id)?.order,
    }));
  }

  /**
   * Weighted question selection algorithm
   * Weights: Rating 1 > New Question > Rating 2 > Rating 3 > Rating 4
   */
  private selectNextQuestion(
    questions: QuestionWithLastAttempt[],
    mode: 'front-to-end' | 'shuffle'
  ): Question | null {
    // Filter eligible questions (unseen or rating < 5)
    const eligibleQuestions = questions.filter(q =>
      !q.lastAttempt || q.lastAttempt.userRating < 5
    );

    if (eligibleQuestions.length === 0) {
      return null;
    }

    // Apply mode-specific filtering
    let candidateQuestions: QuestionWithLastAttempt[];

    if (mode === 'front-to-end') {
      // Find first unseen question by creation order (from the original ordered list)
      const firstUnseenByOrder = questions.find(q => !q.lastAttempt);

      if (firstUnseenByOrder) {
        // Include first unseen (by creation order) + all seen questions with rating < 5
        const seenEligible = eligibleQuestions.filter(q => q.lastAttempt);
        candidateQuestions = [firstUnseenByOrder, ...seenEligible];
      } else {
        // No unseen questions, use all eligible (seen questions with rating < 5)
        candidateQuestions = eligibleQuestions;
      }
    } else {
      // Shuffle mode: all eligible questions
      candidateQuestions = eligibleQuestions;
    }

    // Calculate weights for each candidate
    const weightedQuestions: WeightedQuestion[] = candidateQuestions.map(question => ({
      question,
      weight: this.calculateQuestionWeight(question, candidateQuestions.length),
    }));

    // Select question using weighted random selection
    return this.weightedRandomSelection(weightedQuestions);
  }

  /**
   * Calculate weight for a question based on confidence rating and recency
   */
  private calculateQuestionWeight(
    question: QuestionWithLastAttempt,
    totalCandidates: number
  ): number {
    let baseWeight: number;

    if (!question.lastAttempt) {
      // New question gets medium-high priority
      baseWeight = 100;
    } else {
      // Weight based on confidence rating (lower rating = higher weight)
      const rating = question.lastAttempt.userRating;
      const ratingWeights = {
        1: 200, // Highest priority
        2: 80,
        3: 60,
        4: 40,  // Lowest priority (rating 5 is filtered out)
      };
      baseWeight = ratingWeights[rating as keyof typeof ratingWeights] || 50;
    }

    // Apply recency penalty (reduce weight based on how recently it was shown)
    if (question.attemptOrder) {
      const maxOrder = totalCandidates;
      const recencyPenalty = Math.max(0.3, 1 - (maxOrder - question.attemptOrder) / maxOrder);
      baseWeight *= recencyPenalty;
    }

    return Math.max(1, baseWeight); // Ensure minimum weight of 1
  }

  /**
   * Weighted random selection from array of weighted questions
   */
  private weightedRandomSelection(weightedQuestions: WeightedQuestion[]): Question | null {
    if (weightedQuestions.length === 0) {
      return null;
    }

    const totalWeight = weightedQuestions.reduce((sum, wq) => sum + wq.weight, 0);
    const randomValue = Math.random() * totalWeight;

    let currentWeight = 0;
    for (const weightedQuestion of weightedQuestions) {
      currentWeight += weightedQuestion.weight;
      if (randomValue <= currentWeight) {
        return weightedQuestion.question;
      }
    }

    // Fallback to first question if something goes wrong
    return weightedQuestions[0].question;
  }

  /**
   * Complete a study session manually
   */
  async completeSession(userId: number, questionSetId: number): Promise<void> {
    await prisma.studySession.updateMany({
      where: {
        userId,
        questionSetId,
        completedAt: null,
      },
      data: {
        completedAt: new Date(),
      },
    });
  }

  /**
   * Reset/restart a study session (creates new session)
   */
  async restartSession(
    userId: number,
    sessionData: CreateStudySessionInput
  ): Promise<StudySessionWithAnswers> {
    // Complete any existing session
    await this.completeSession(userId, sessionData.questionSetId);

    // Create new session
    return this.startOrResumeSession(userId, sessionData);
  }
}