package com.learningadvisor.backend.service;

import com.learningadvisor.backend.dto.studysession.*;
import com.learningadvisor.backend.entity.Question;
import com.learningadvisor.backend.entity.QuestionSet;
import com.learningadvisor.backend.entity.SessionAnswer;
import com.learningadvisor.backend.entity.StudySession;
import com.learningadvisor.backend.repository.QuestionRepository;
import com.learningadvisor.backend.repository.QuestionSetRepository;
import com.learningadvisor.backend.repository.SessionAnswerRepository;
import com.learningadvisor.backend.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Study session service implementing weighted question selection algorithm
 * Supports front-to-end and shuffle modes with confidence-based weighting
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StudySessionService {

    private final StudySessionRepository studySessionRepository;
    private final SessionAnswerRepository sessionAnswerRepository;
    private final QuestionRepository questionRepository;
    private final QuestionSetRepository questionSetRepository;

    /**
     * Verify that the user has access to the question set
     * User must own the project containing the question set
     */
    private void verifyQuestionSetAccess(Long userId, Long questionSetId) {
        QuestionSet questionSet = questionSetRepository.findById(questionSetId)
                .orElseThrow(() -> new RuntimeException("Question set not found"));

        // For now, we'll allow access if the question set exists
        // In a production system, you would check:
        // 1. If user owns the project
        // 2. If the project is public
        // 3. If the user has been granted access
        // This requires loading the project and checking ownership
    }

    /**
     * Start or resume a study session for a question set
     */
    @Transactional
    public StudySessionResponse startOrResumeSession(Long userId, CreateStudySessionRequest request) {
        // Verify user has access to this question set
        verifyQuestionSetAccess(userId, request.getQuestionSetId());

        // Check if there's an existing incomplete session
        Optional<StudySession> existingSession = studySessionRepository
                .findFirstByUserIdAndQuestionSetIdAndCompletedAtIsNullOrderByStartedAtDesc(
                        userId, request.getQuestionSetId());

        if (existingSession.isPresent()) {
            StudySession session = existingSession.get();
            List<SessionAnswer> answers = sessionAnswerRepository.findBySessionIdOrderByAnsweredAtAsc(session.getId());

            return StudySessionResponse.builder()
                    .id(session.getId())
                    .questionSetId(session.getQuestionSetId())
                    .mode(session.getMode())
                    .startedAt(session.getStartedAt())
                    .isResumed(!answers.isEmpty())
                    .build();
        }

        // Create new session
        StudySession newSession = StudySession.builder()
                .userId(userId)
                .questionSetId(request.getQuestionSetId())
                .mode(request.getMode())
                .startedAt(LocalDateTime.now())
                .build();

        newSession = studySessionRepository.save(newSession);

        return StudySessionResponse.builder()
                .id(newSession.getId())
                .questionSetId(newSession.getQuestionSetId())
                .mode(newSession.getMode())
                .startedAt(newSession.getStartedAt())
                .isResumed(false)
                .build();
    }

    /**
     * Get the next question using weighted selection algorithm
     */
    @Transactional(readOnly = true)
    public NextQuestionResponse getNextQuestion(Long userId, Long questionSetId) {
        // Get current session
        StudySession session = studySessionRepository
                .findFirstByUserIdAndQuestionSetIdAndCompletedAtIsNullOrderByStartedAtDesc(
                        userId, questionSetId)
                .orElseThrow(() -> new RuntimeException("No active study session found"));

        // Get all questions in the question set (ordered by creation)
        List<Question> allQuestions = questionRepository.findByQuestionSetIdOrderByCreatedAtAsc(questionSetId);

        // Get session answers
        List<SessionAnswer> sessionAnswers = sessionAnswerRepository.findBySessionIdOrderByAnsweredAtAsc(session.getId());

        // Calculate progress
        SessionProgressDTO progress = calculateProgress(allQuestions, sessionAnswers);

        // Check if session is complete (all questions have rating 5)
        if (progress.getMasteredQuestions().equals(progress.getTotalQuestions())) {
            return NextQuestionResponse.builder()
                    .question(null)
                    .questionNumber(null)
                    .previousScore(null)
                    .sessionComplete(true)
                    .progress(progress)
                    .build();
        }

        // Get questions with their last attempts
        Map<Long, SessionAnswer> lastAttempts = getLastAttempts(sessionAnswers);

        // Select next question using weighted algorithm
        Question nextQuestion = selectNextQuestion(allQuestions, lastAttempts, session.getMode(), sessionAnswers);

        // Calculate question number (1-based position in original question set)
        Integer questionNumber = null;
        Integer previousScore = null;

        if (nextQuestion != null) {
            questionNumber = allQuestions.indexOf(nextQuestion) + 1;
            SessionAnswer lastAttempt = lastAttempts.get(nextQuestion.getId());
            previousScore = lastAttempt != null ? lastAttempt.getUserRating() : null;
        }

        // Convert to DTO to avoid lazy loading issues
        QuestionDTO questionDTO = null;
        if (nextQuestion != null) {
            questionDTO = QuestionDTO.fromEntity(nextQuestion);
        }

        return NextQuestionResponse.builder()
                .question(questionDTO)
                .questionNumber(questionNumber)
                .previousScore(previousScore)
                .sessionComplete(false)
                .progress(progress)
                .build();
    }

    /**
     * Submit an answer and record confidence rating
     */
    @Transactional
    public void submitAnswer(Long userId, Long questionSetId, SubmitAnswerRequest request) {
        // Get current session
        StudySession session = studySessionRepository
                .findFirstByUserIdAndQuestionSetIdAndCompletedAtIsNullOrderByStartedAtDesc(
                        userId, questionSetId)
                .orElseThrow(() -> new RuntimeException("No active study session found"));

        // Record the answer
        SessionAnswer answer = SessionAnswer.builder()
                .sessionId(session.getId())
                .questionId(request.getQuestionId())
                .userRating(request.getConfidenceRating())
                .answeredAt(LocalDateTime.now())
                .build();

        sessionAnswerRepository.save(answer);
    }

    /**
     * Complete current study session
     */
    @Transactional
    public void completeSession(Long userId, Long questionSetId) {
        List<StudySession> sessions = studySessionRepository.findByUserId(userId).stream()
                .filter(s -> s.getQuestionSetId().equals(questionSetId) && s.getCompletedAt() == null)
                .collect(Collectors.toList());

        for (StudySession session : sessions) {
            session.setCompletedAt(LocalDateTime.now());
            studySessionRepository.save(session);
        }
    }

    /**
     * Restart study session (creates new session)
     */
    @Transactional
    public StudySessionResponse restartSession(Long userId, CreateStudySessionRequest request) {
        // Complete any existing session
        completeSession(userId, request.getQuestionSetId());

        // Create new session
        return startOrResumeSession(userId, request);
    }

    /**
     * Calculate session progress
     */
    private SessionProgressDTO calculateProgress(List<Question> allQuestions, List<SessionAnswer> sessionAnswers) {
        int totalQuestions = allQuestions.size();
        Map<Long, Integer> latestRatings = new HashMap<>();

        // Get the latest rating for each question
        for (SessionAnswer answer : sessionAnswers) {
            latestRatings.put(answer.getQuestionId(), answer.getUserRating());
        }

        int answeredQuestions = latestRatings.size();
        long masteredQuestions = latestRatings.values().stream()
                .filter(rating -> rating == 5)
                .count();

        // Calculate points: sum of all confidence ratings
        int currentPoints = latestRatings.values().stream()
                .mapToInt(Integer::intValue)
                .sum();
        int maxPoints = totalQuestions * 5;

        return SessionProgressDTO.builder()
                .totalQuestions(totalQuestions)
                .answeredQuestions(answeredQuestions)
                .masteredQuestions((int) masteredQuestions)
                .currentPoints(currentPoints)
                .maxPoints(maxPoints)
                .build();
    }

    /**
     * Get last attempt for each question
     */
    private Map<Long, SessionAnswer> getLastAttempts(List<SessionAnswer> sessionAnswers) {
        Map<Long, SessionAnswer> lastAttempts = new HashMap<>();

        // Sort by answered time to ensure we get the latest
        List<SessionAnswer> sortedAnswers = new ArrayList<>(sessionAnswers);
        sortedAnswers.sort(Comparator.comparing(SessionAnswer::getAnsweredAt));

        for (SessionAnswer answer : sortedAnswers) {
            lastAttempts.put(answer.getQuestionId(), answer);
        }

        return lastAttempts;
    }

    /**
     * Weighted question selection algorithm
     * Weights: Rating 1 > New Question > Rating 2 > Rating 3 > Rating 4
     * Recently answered questions get recency penalties
     */
    private Question selectNextQuestion(
            List<Question> allQuestions,
            Map<Long, SessionAnswer> lastAttempts,
            String mode,
            List<SessionAnswer> sessionAnswers) {

        // Filter eligible questions (unseen or rating < 5)
        List<Question> eligibleQuestions = allQuestions.stream()
                .filter(q -> {
                    SessionAnswer lastAttempt = lastAttempts.get(q.getId());
                    return lastAttempt == null || lastAttempt.getUserRating() < 5;
                })
                .collect(Collectors.toList());

        if (eligibleQuestions.isEmpty()) {
            return null;
        }

        // Get answer sequence for recency penalties
        List<Long> answerSequence = getAnswerSequence(sessionAnswers);

        // Apply mode-specific filtering
        List<Question> finalCandidates;

        if ("front-to-end".equals(mode)) {
            // Find first unseen question by creation order
            Question firstUnseen = allQuestions.stream()
                    .filter(q -> !lastAttempts.containsKey(q.getId()) && eligibleQuestions.contains(q))
                    .findFirst()
                    .orElse(null);

            if (firstUnseen != null) {
                // Include first unseen + all seen questions with rating < 5
                finalCandidates = new ArrayList<>();
                finalCandidates.add(firstUnseen);
                finalCandidates.addAll(eligibleQuestions.stream()
                        .filter(q -> lastAttempts.containsKey(q.getId()))
                        .collect(Collectors.toList()));
            } else {
                // No unseen questions, use all eligible candidates
                finalCandidates = eligibleQuestions;
            }
        } else {
            // Shuffle mode: all eligible questions
            finalCandidates = eligibleQuestions;
        }

        // Calculate weights for each candidate
        Map<Question, Double> weights = new HashMap<>();
        for (Question question : finalCandidates) {
            double weight = calculateQuestionWeight(question, lastAttempts.get(question.getId()), answerSequence);
            weights.put(question, weight);
        }

        // Select question using weighted random selection
        return weightedRandomSelection(weights);
    }

    /**
     * Get the answer sequence in chronological order for recency penalty calculation
     */
    private List<Long> getAnswerSequence(List<SessionAnswer> sessionAnswers) {
        return sessionAnswers.stream()
                .sorted(Comparator.comparing(SessionAnswer::getAnsweredAt))
                .map(SessionAnswer::getQuestionId)
                .distinct() // Keep only the most recent occurrence
                .collect(Collectors.toList());
    }

    /**
     * Calculate weight for a question based on confidence rating and recency
     */
    private double calculateQuestionWeight(Question question, SessionAnswer lastAttempt, List<Long> answerSequence) {
        double baseWeight;

        if (lastAttempt == null) {
            // New question gets priority between shaky (rating 2) and okay (rating 3)
            baseWeight = 80.0;
        } else {
            // Weight based on confidence rating (lower rating = higher weight)
            int rating = lastAttempt.getUserRating();
            switch (rating) {
                case 1:
                    baseWeight = 200.0; // Highest priority - Don't know at all
                    break;
                case 2:
                    baseWeight = 120.0; // High priority - Shaky, needs review
                    break;
                case 3:
                    baseWeight = 60.0;  // Medium priority - Okay
                    break;
                case 4:
                    baseWeight = 30.0;  // Low priority - Confident
                    break;
                default:
                    baseWeight = 50.0;
            }
        }

        // Apply recency penalty based on position in answer sequence
        int questionIndex = answerSequence.indexOf(question.getId());
        if (questionIndex != -1) {
            // Calculate how many steps back this question was answered
            int stepsBack = answerSequence.size() - questionIndex;

            // Apply penalty based on recency
            double recencyMultiplier;
            if (stepsBack == 1) {
                // Just answered - cannot appear (0% chance)
                recencyMultiplier = 0.0;
            } else if (stepsBack == 2) {
                // 2nd most recent - heavy penalty (50% reduction)
                recencyMultiplier = 0.5;
            } else if (stepsBack == 3) {
                // 3rd most recent - medium penalty (70% of original weight)
                recencyMultiplier = 0.7;
            } else if (stepsBack == 4) {
                // 4th most recent - light penalty (85% of original weight)
                recencyMultiplier = 0.85;
            } else if (stepsBack == 5) {
                // 5th most recent - very light penalty (95% of original weight)
                recencyMultiplier = 0.95;
            } else {
                // 6+ steps back - no penalty
                recencyMultiplier = 1.0;
            }

            baseWeight *= recencyMultiplier;
        }

        return baseWeight;
    }

    /**
     * Weighted random selection from map of weighted questions
     */
    private Question weightedRandomSelection(Map<Question, Double> weights) {
        if (weights.isEmpty()) {
            return null;
        }

        double totalWeight = weights.values().stream().mapToDouble(Double::doubleValue).sum();

        if (totalWeight == 0) {
            // If all weights are 0, return first question
            return weights.keySet().iterator().next();
        }

        double randomValue = Math.random() * totalWeight;

        double currentWeight = 0;
        for (Map.Entry<Question, Double> entry : weights.entrySet()) {
            currentWeight += entry.getValue();
            if (randomValue <= currentWeight) {
                return entry.getKey();
            }
        }

        // Fallback to first question if something goes wrong
        return weights.keySet().iterator().next();
    }

    /**
     * Reset session - delete all progress and timer data, start fresh
     */
    @Transactional
    public StudySessionResponse resetSession(Long userId, Long questionSetId, String mode) {
        log.info("Resetting ALL sessions for user {} questionSet {}", userId, questionSetId);

        // Find ALL sessions for this user and questionSet (both active and completed)
        List<StudySession> allSessions = studySessionRepository.findByUserId(userId).stream()
                .filter(s -> s.getQuestionSetId().equals(questionSetId))
                .collect(Collectors.toList());

        if (!allSessions.isEmpty()) {
            log.info("Deleting {} sessions and all associated data", allSessions.size());

            // Delete all session answers for these sessions
            for (StudySession session : allSessions) {
                sessionAnswerRepository.deleteBySessionId(session.getId());
            }

            // Delete all study sessions
            studySessionRepository.deleteAll(allSessions);

            log.info("All sessions and data deleted successfully");
        } else {
            log.info("No sessions found to reset");
        }

        // Create a fresh new session
        log.info("Creating fresh session");
        CreateStudySessionRequest request = CreateStudySessionRequest.builder()
                .questionSetId(questionSetId)
                .mode(mode != null ? mode : "front-to-end")
                .build();

        return startOrResumeSession(userId, request);
    }

    /**
     * Get all questions with their selection probabilities for sidebar visualization
     */
    @Transactional(readOnly = true)
    public QuestionProbabilitiesResponse getQuestionsWithProbabilities(Long userId, Long questionSetId) {
        // Get current session
        StudySession session = studySessionRepository
                .findFirstByUserIdAndQuestionSetIdAndCompletedAtIsNullOrderByStartedAtDesc(
                        userId, questionSetId)
                .orElseThrow(() -> new RuntimeException("No active session found"));

        // Get all questions for this question set
        List<Question> allQuestions = questionRepository.findByQuestionSetIdOrderByIdAsc(questionSetId);

        // Get session answers
        List<SessionAnswer> sessionAnswers = sessionAnswerRepository.findBySessionIdOrderByAnsweredAtAsc(session.getId());

        // Get questions with their last attempts
        Map<Long, SessionAnswer> lastAttempts = getLastAttempts(sessionAnswers);

        // Filter eligible questions (unseen or rating < 5)
        List<Question> eligibleQuestions = allQuestions.stream()
                .filter(q -> {
                    SessionAnswer lastAttempt = lastAttempts.get(q.getId());
                    return lastAttempt == null || lastAttempt.getUserRating() < 5;
                })
                .collect(Collectors.toList());

        // Get answer sequence for recency calculation
        List<Long> answerSequence = getAnswerSequence(sessionAnswers);

        // Apply mode-specific filtering (same logic as selectNextQuestion)
        List<Question> finalCandidates;

        if ("front-to-end".equals(session.getMode())) {
            // Find first unseen question by creation order
            Question firstUnseen = allQuestions.stream()
                    .filter(q -> !lastAttempts.containsKey(q.getId()) && eligibleQuestions.contains(q))
                    .findFirst()
                    .orElse(null);

            if (firstUnseen != null) {
                // Include first unseen + all seen questions with rating < 5
                finalCandidates = new ArrayList<>();
                finalCandidates.add(firstUnseen);
                finalCandidates.addAll(eligibleQuestions.stream()
                        .filter(q -> lastAttempts.containsKey(q.getId()))
                        .collect(Collectors.toList()));
            } else {
                // No unseen questions, use all eligible candidates
                finalCandidates = eligibleQuestions;
            }
        } else {
            // Shuffle mode: all eligible questions are candidates
            finalCandidates = eligibleQuestions;
        }

        // Calculate weights for ALL questions (including ineligible ones)
        List<QuestionProbabilityDTO> questionsWithWeights = new ArrayList<>();
        for (int i = 0; i < allQuestions.size(); i++) {
            Question question = allQuestions.get(i);
            boolean isCandidate = finalCandidates.stream().anyMatch(fc -> fc.getId().equals(question.getId()));
            double weight = isCandidate ? calculateQuestionWeight(question, lastAttempts.get(question.getId()), answerSequence) : 0.0;

            // Allow selection of mastered questions (rating 5) even though they have 0% algorithm chance
            SessionAnswer lastAttempt = lastAttempts.get(question.getId());
            boolean isMastered = lastAttempt != null && lastAttempt.getUserRating() == 5;
            boolean isSelectable = weight > 0 || isMastered;

            QuestionProbabilityDTO.LastAttemptDTO lastAttemptDTO = null;
            if (lastAttempt != null) {
                lastAttemptDTO = QuestionProbabilityDTO.LastAttemptDTO.builder()
                        .userRating(lastAttempt.getUserRating())
                        .build();
            }

            questionsWithWeights.add(QuestionProbabilityDTO.builder()
                    .id(question.getId())
                    .questionText(question.getQuestionText())
                    .questionNumber(i + 1)
                    .lastAttempt(lastAttemptDTO)
                    .weight(weight)
                    .isSelectable(isSelectable)
                    .build());
        }

        // Calculate total weight of eligible questions
        double totalWeight = questionsWithWeights.stream()
                .mapToDouble(QuestionProbabilityDTO::getWeight)
                .sum();

        // Calculate probabilities
        List<QuestionProbabilityDTO> questionsWithProbabilities = questionsWithWeights.stream()
                .map(q -> {
                    double probability = totalWeight > 0 ? (q.getWeight() / totalWeight) * 100 : 0.0;
                    q.setSelectionProbability(probability);
                    return q;
                })
                .collect(Collectors.toList());

        // Get current question ID from last session answer or null if starting
        Long currentQuestionId = !sessionAnswers.isEmpty()
                ? sessionAnswers.get(sessionAnswers.size() - 1).getQuestionId()
                : null;

        return QuestionProbabilitiesResponse.builder()
                .questions(questionsWithProbabilities)
                .totalWeight(totalWeight)
                .currentQuestionId(currentQuestionId)
                .build();
    }

    /**
     * Select a specific question for study (if eligible)
     */
    @Transactional(readOnly = true)
    public NextQuestionResponse selectQuestion(Long userId, Long questionSetId, Long questionId) {
        // Get current session
        StudySession session = studySessionRepository
                .findFirstByUserIdAndQuestionSetIdAndCompletedAtIsNullOrderByStartedAtDesc(
                        userId, questionSetId)
                .orElseThrow(() -> new RuntimeException("No active session found"));

        // Get all questions for this question set
        List<Question> allQuestions = questionRepository.findByQuestionSetIdOrderByIdAsc(questionSetId);

        // Find the requested question
        Question requestedQuestion = allQuestions.stream()
                .filter(q -> q.getId().equals(questionId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Question not found"));

        // Get session answers
        List<SessionAnswer> sessionAnswers = sessionAnswerRepository.findBySessionIdOrderByAnsweredAtAsc(session.getId());

        // Get questions with their last attempts
        Map<Long, SessionAnswer> lastAttempts = getLastAttempts(sessionAnswers);

        // Check if question is selectable
        SessionAnswer lastAttempt = lastAttempts.get(questionId);
        boolean isEligible = lastAttempt == null || lastAttempt.getUserRating() < 5;
        boolean isMastered = lastAttempt != null && lastAttempt.getUserRating() == 5;

        // Get answer sequence for recency calculation
        List<Long> answerSequence = getAnswerSequence(sessionAnswers);

        // Calculate weight
        double weight = isEligible ? calculateQuestionWeight(requestedQuestion, lastAttempt, answerSequence) : 0.0;

        // Allow selection if either has weight > 0 OR is mastered (rating 5)
        boolean isSelectable = weight > 0 || isMastered;

        if (!isSelectable) {
            throw new RuntimeException("Question is not currently selectable due to recency penalty");
        }

        // Calculate question number (1-based position in original question set)
        int questionNumber = allQuestions.indexOf(requestedQuestion) + 1;

        // Find previous score for this question
        Integer previousScore = lastAttempt != null ? lastAttempt.getUserRating() : null;

        // Calculate progress
        SessionProgressDTO progress = calculateProgress(allQuestions, sessionAnswers);

        return NextQuestionResponse.builder()
                .question(QuestionDTO.fromEntity(requestedQuestion))
                .questionNumber(questionNumber)
                .previousScore(previousScore)
                .sessionComplete(false) // Never complete when manually selecting
                .progress(progress)
                .build();
    }

    /**
     * Get probabilities with a hypothetical answer (for live updates)
     */
    @Transactional(readOnly = true)
    public QuestionProbabilitiesResponse getQuestionsWithHypotheticalProbabilities(
            Long userId,
            Long questionSetId,
            Long questionId,
            Integer hypotheticalRating) {

        // Get current session
        StudySession session = studySessionRepository
                .findFirstByUserIdAndQuestionSetIdAndCompletedAtIsNullOrderByStartedAtDesc(
                        userId, questionSetId)
                .orElseThrow(() -> new RuntimeException("No active session found"));

        // Get all questions for this question set
        List<Question> allQuestions = questionRepository.findByQuestionSetIdOrderByIdAsc(questionSetId);

        // Get session answers
        List<SessionAnswer> sessionAnswers = new ArrayList<>(
                sessionAnswerRepository.findBySessionIdOrderByAnsweredAtAsc(session.getId()));

        // Create a hypothetical answer for the current question
        SessionAnswer hypotheticalAnswer = SessionAnswer.builder()
                .sessionId(session.getId())
                .questionId(questionId)
                .userRating(hypotheticalRating)
                .answeredAt(LocalDateTime.now())
                .build();

        // Add the hypothetical answer to the session answers (without saving to DB)
        sessionAnswers.add(hypotheticalAnswer);

        // Get questions with their last attempts (including hypothetical)
        Map<Long, SessionAnswer> lastAttempts = getLastAttempts(sessionAnswers);

        // Filter eligible questions (unseen or rating < 5)
        List<Question> eligibleQuestions = allQuestions.stream()
                .filter(q -> {
                    SessionAnswer lastAttempt = lastAttempts.get(q.getId());
                    return lastAttempt == null || lastAttempt.getUserRating() < 5;
                })
                .collect(Collectors.toList());

        // Get answer sequence for recency calculation (including hypothetical)
        List<Long> answerSequence = getAnswerSequence(sessionAnswers);

        // Apply mode-specific filtering (same logic as getQuestionsWithProbabilities)
        List<Question> finalCandidates;

        if ("front-to-end".equals(session.getMode())) {
            Question firstUnseen = allQuestions.stream()
                    .filter(q -> !lastAttempts.containsKey(q.getId()) && eligibleQuestions.contains(q))
                    .findFirst()
                    .orElse(null);

            if (firstUnseen != null) {
                finalCandidates = new ArrayList<>();
                finalCandidates.add(firstUnseen);
                finalCandidates.addAll(eligibleQuestions.stream()
                        .filter(q -> lastAttempts.containsKey(q.getId()))
                        .collect(Collectors.toList()));
            } else {
                finalCandidates = eligibleQuestions;
            }
        } else {
            finalCandidates = eligibleQuestions;
        }

        // Calculate weights for ALL questions (including ineligible ones)
        List<QuestionProbabilityDTO> questionsWithWeights = new ArrayList<>();
        for (int i = 0; i < allQuestions.size(); i++) {
            Question question = allQuestions.get(i);
            boolean isCandidate = finalCandidates.stream().anyMatch(fc -> fc.getId().equals(question.getId()));
            double weight = isCandidate ? calculateQuestionWeight(question, lastAttempts.get(question.getId()), answerSequence) : 0.0;

            // Allow selection of mastered questions (rating 5) even though they have 0% algorithm chance
            SessionAnswer lastAttempt = lastAttempts.get(question.getId());
            boolean isMastered = lastAttempt != null && lastAttempt.getUserRating() == 5;
            boolean isSelectable = weight > 0 || isMastered;

            QuestionProbabilityDTO.LastAttemptDTO lastAttemptDTO = null;
            if (lastAttempt != null) {
                lastAttemptDTO = QuestionProbabilityDTO.LastAttemptDTO.builder()
                        .userRating(lastAttempt.getUserRating())
                        .build();
            }

            questionsWithWeights.add(QuestionProbabilityDTO.builder()
                    .id(question.getId())
                    .questionText(question.getQuestionText())
                    .questionNumber(i + 1)
                    .lastAttempt(lastAttemptDTO)
                    .weight(weight)
                    .isSelectable(isSelectable)
                    .build());
        }

        // Calculate total weight of eligible questions
        double totalWeight = questionsWithWeights.stream()
                .mapToDouble(QuestionProbabilityDTO::getWeight)
                .sum();

        // Calculate probabilities
        List<QuestionProbabilityDTO> questionsWithProbabilities = questionsWithWeights.stream()
                .map(q -> {
                    double probability = totalWeight > 0 ? (q.getWeight() / totalWeight) * 100 : 0.0;
                    q.setSelectionProbability(probability);
                    return q;
                })
                .collect(Collectors.toList());

        return QuestionProbabilitiesResponse.builder()
                .questions(questionsWithProbabilities)
                .totalWeight(totalWeight)
                .currentQuestionId(questionId) // The question being rated
                .build();
    }
}
