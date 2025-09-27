"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudySessionService = void 0;
const database_js_1 = require("../config/database.js");
/**
 * Study session service implementing weighted question selection algorithm
 * Supports front-to-end and shuffle modes with confidence-based weighting
 */
class StudySessionService {
    /**
     * Start or resume a study session for a question set
     */
    async startOrResumeSession(userId, sessionData) {
        // Check if there's an existing incomplete session
        const existingSession = await database_js_1.prisma.studySession.findFirst({
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
        const newSession = await database_js_1.prisma.studySession.create({
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
    async getNextQuestion(userId, questionSetId) {
        // Get current session
        const session = await database_js_1.prisma.studySession.findFirst({
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
        const allQuestions = await database_js_1.prisma.question.findMany({
            where: { questionSetId },
            orderBy: { createdAt: 'asc' },
        });
        // Calculate progress
        const progress = this.calculateProgress(allQuestions, session.sessionAnswers);
        // Check if session is complete (all questions have rating 5)
        if (progress.masteredQuestions === progress.totalQuestions) {
            await database_js_1.prisma.studySession.update({
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
        let questionNumber = null;
        let previousScore = null;
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
    async submitAnswer(userId, questionSetId, answerData) {
        // Get current session
        const session = await database_js_1.prisma.studySession.findFirst({
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
        // Calculate attempt order (position in session) - keeping for future use
        // const attemptOrder = session.sessionAnswers.length + 1;
        // Record the answer
        await database_js_1.prisma.sessionAnswer.create({
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
    calculateProgress(allQuestions, sessionAnswers) {
        const totalQuestions = allQuestions.length;
        const latestRatings = new Map();
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
    attachLastAttempts(questions, sessionAnswers) {
        const latestAttempts = new Map();
        // Sort answers by time to get proper chronological order
        const sortedAnswers = [...sessionAnswers].sort((a, b) => a.answeredAt.getTime() - b.answeredAt.getTime());
        // Find latest attempt for each question and track chronological order
        sortedAnswers.forEach((answer, index) => {
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
     * Recently answered questions get recency penalties but are never excluded
     */
    selectNextQuestion(questions, mode) {
        // Filter eligible questions (unseen or rating < 5)
        const eligibleQuestions = questions.filter(q => !q.lastAttempt || q.lastAttempt.userRating < 5);
        if (eligibleQuestions.length === 0) {
            return null;
        }
        // Get answer sequence for recency penalties
        const answerSequence = this.getAnswerSequence(questions);
        // Apply mode-specific filtering
        let finalCandidates;
        if (mode === 'front-to-end') {
            // Find first unseen question by creation order (from the original ordered list)
            const firstUnseenByOrder = questions.find(q => !q.lastAttempt && eligibleQuestions.includes(q));
            if (firstUnseenByOrder) {
                // Include first unseen (by creation order) + all seen questions with rating < 5
                const seenEligible = eligibleQuestions.filter(q => q.lastAttempt);
                finalCandidates = [firstUnseenByOrder, ...seenEligible];
            }
            else {
                // No unseen questions, use all eligible candidates
                finalCandidates = eligibleQuestions;
            }
        }
        else {
            // Shuffle mode: all eligible questions
            finalCandidates = eligibleQuestions;
        }
        // Calculate weights for each candidate
        const weightedQuestions = finalCandidates.map(question => ({
            question,
            weight: this.calculateQuestionWeight(question, answerSequence),
        }));
        // Select question using weighted random selection
        return this.weightedRandomSelection(weightedQuestions);
    }
    /**
     * Get the answer sequence in chronological order for recency penalty calculation
     * Returns array of question IDs in the order they were answered
     */
    getAnswerSequence(questions) {
        // Get all questions that have been attempted, sorted by answer time (oldest first)
        const attemptedQuestions = questions
            .filter(q => q.lastAttempt)
            .sort((a, b) => {
            const timeA = a.lastAttempt?.answeredAt.getTime() || 0;
            const timeB = b.lastAttempt?.answeredAt.getTime() || 0;
            return timeA - timeB;
        });
        return attemptedQuestions.map(q => q.id);
    }
    /**
     * Calculate weight for a question based on confidence rating and recency
     */
    calculateQuestionWeight(question, answerSequence) {
        let baseWeight;
        if (!question.lastAttempt) {
            // New question gets medium-high priority
            baseWeight = 100;
        }
        else {
            // Weight based on confidence rating (lower rating = higher weight)
            const rating = question.lastAttempt.userRating;
            const ratingWeights = {
                1: 200, // Highest priority
                2: 80,
                3: 60,
                4: 40, // Lowest priority (rating 5 is filtered out)
            };
            baseWeight = ratingWeights[rating] || 50;
        }
        // Apply recency penalty based on position in answer sequence
        const questionIndex = answerSequence.indexOf(question.id);
        if (questionIndex !== -1) {
            // Calculate how many steps back this question was answered
            const stepsBack = answerSequence.length - questionIndex;
            // Apply penalty based on recency (most recent = heaviest penalty)
            let recencyMultiplier;
            if (stepsBack === 1) {
                // Just answered - cannot appear (0% chance)
                recencyMultiplier = 0;
            }
            else if (stepsBack === 2) {
                // 2nd most recent - heavy penalty (50% reduction)
                recencyMultiplier = 0.5;
            }
            else if (stepsBack === 3) {
                // 3rd most recent - medium penalty (70% of original weight)
                recencyMultiplier = 0.7;
            }
            else if (stepsBack === 4) {
                // 4th most recent - light penalty (85% of original weight)
                recencyMultiplier = 0.85;
            }
            else if (stepsBack === 5) {
                // 5th most recent - very light penalty (95% of original weight)
                recencyMultiplier = 0.95;
            }
            else {
                // 6+ steps back - no penalty
                recencyMultiplier = 1.0;
            }
            baseWeight *= recencyMultiplier;
        }
        return Math.max(1, baseWeight); // Ensure minimum weight of 1
    }
    /**
     * Weighted random selection from array of weighted questions
     */
    weightedRandomSelection(weightedQuestions) {
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
    async completeSession(userId, questionSetId) {
        await database_js_1.prisma.studySession.updateMany({
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
    async restartSession(userId, sessionData) {
        // Complete any existing session
        await this.completeSession(userId, sessionData.questionSetId);
        // Create new session
        return this.startOrResumeSession(userId, sessionData);
    }
    /**
     * Reset session - delete all progress and timer data, start fresh
     * This provides a complete reset unlike restart which preserves completed sessions
     */
    async resetSession(userId, questionSetId, mode = 'front-to-end') {
        console.log('🔄 StudySessionService: Resetting session for user', userId, 'questionSet', questionSetId);
        // Find the active session to get its ID
        const activeSession = await database_js_1.prisma.studySession.findFirst({
            where: {
                userId,
                questionSetId,
                completedAt: null,
            },
            select: { id: true }
        });
        if (activeSession) {
            console.log('🗑️ StudySessionService: Deleting session', activeSession.id, 'and all associated data');
            // Delete all timer sessions and their events for this deck session
            // This cascades to timer events due to schema relations
            await database_js_1.prisma.timerSession.deleteMany({
                where: {
                    deckSessionId: activeSession.id
                }
            });
            // Delete all session answers
            await database_js_1.prisma.sessionAnswer.deleteMany({
                where: {
                    sessionId: activeSession.id
                }
            });
            // Delete the study session itself
            await database_js_1.prisma.studySession.delete({
                where: {
                    id: activeSession.id
                }
            });
            console.log('✅ StudySessionService: Session and all data deleted successfully');
        }
        else {
            console.log('ℹ️ StudySessionService: No active session found to reset');
        }
        // Create a fresh new session
        console.log('🆕 StudySessionService: Creating fresh session');
        return this.startOrResumeSession(userId, {
            questionSetId,
            mode,
        });
    }
}
exports.StudySessionService = StudySessionService;
