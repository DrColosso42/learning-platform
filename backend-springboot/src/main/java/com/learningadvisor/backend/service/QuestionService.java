package com.learningadvisor.backend.service;

import com.learningadvisor.backend.dto.questionset.BulkCreateQuestionsRequest;
import com.learningadvisor.backend.dto.questionset.CreateQuestionRequest;
import com.learningadvisor.backend.dto.questionset.QuestionDTO;
import com.learningadvisor.backend.entity.Question;
import com.learningadvisor.backend.entity.QuestionSet;
import com.learningadvisor.backend.repository.ProjectRepository;
import com.learningadvisor.backend.repository.QuestionRepository;
import com.learningadvisor.backend.repository.QuestionSetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service for managing individual questions
 * Handles creation, update, deletion and parsing of questions
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final QuestionSetRepository questionSetRepository;
    private final ProjectRepository projectRepository;

    /**
     * Create a single question
     */
    @Transactional
    public QuestionDTO createQuestion(Long userId, Long questionSetId, CreateQuestionRequest request) {
        log.info("Creating question for user {} in question set {}", userId, questionSetId);

        // Verify user owns the question set
        QuestionSet questionSet = verifyQuestionSetAccess(userId, questionSetId);

        Question question = Question.builder()
                .questionSetId(questionSetId)
                .questionText(request.getQuestionText())
                .answerText(request.getAnswerText())
                .difficulty(request.getDifficulty() != null ? request.getDifficulty() : 1)
                .build();

        Question saved = questionRepository.save(question);
        log.info("Created question with ID: {}", saved.getId());

        return convertToDTO(saved);
    }

    /**
     * Create multiple questions in bulk
     */
    @Transactional
    public List<QuestionDTO> createQuestionsBulk(Long userId, BulkCreateQuestionsRequest request) {
        log.info("Creating {} questions in bulk for user {}", request.getQuestions().size(), userId);

        // Verify user owns the question set
        QuestionSet questionSet = verifyQuestionSetAccess(userId, request.getQuestionSetId());

        List<Question> questions = new ArrayList<>();

        for (CreateQuestionRequest questionRequest : request.getQuestions()) {
            Question question = Question.builder()
                    .questionSetId(request.getQuestionSetId())
                    .questionText(questionRequest.getQuestionText())
                    .answerText(questionRequest.getAnswerText())
                    .difficulty(questionRequest.getDifficulty() != null ? questionRequest.getDifficulty() : 1)
                    .build();
            questions.add(question);
        }

        List<Question> saved = questionRepository.saveAll(questions);
        log.info("Created {} questions in bulk", saved.size());

        return saved.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Update a question
     */
    @Transactional
    public Optional<QuestionDTO> updateQuestion(Long userId, Long questionId, CreateQuestionRequest request) {
        log.info("Updating question {} for user {}", questionId, userId);

        Optional<Question> existingOpt = questionRepository.findById(questionId);

        if (existingOpt.isEmpty()) {
            return Optional.empty();
        }

        Question existing = existingOpt.get();

        // Verify user owns the question set
        verifyQuestionSetAccess(userId, existing.getQuestionSetId());

        if (request.getQuestionText() != null) {
            existing.setQuestionText(request.getQuestionText());
        }
        if (request.getAnswerText() != null) {
            existing.setAnswerText(request.getAnswerText());
        }
        if (request.getDifficulty() != null) {
            existing.setDifficulty(request.getDifficulty());
        }

        Question updated = questionRepository.save(existing);
        log.info("Updated question {}", questionId);

        return Optional.of(convertToDTO(updated));
    }

    /**
     * Delete a question
     */
    @Transactional
    public boolean deleteQuestion(Long userId, Long questionId) {
        log.info("Deleting question {} for user {}", questionId, userId);

        Optional<Question> question = questionRepository.findById(questionId);

        if (question.isEmpty()) {
            return false;
        }

        Question q = question.get();

        // Verify user owns the question set
        try {
            verifyQuestionSetAccess(userId, q.getQuestionSetId());
        } catch (RuntimeException e) {
            return false;
        }

        questionRepository.delete(q);
        log.info("Deleted question {}", questionId);

        return true;
    }

    /**
     * Parse CSV text into questions
     * Format: "Question","Answer" or Question,Answer or "Question","Answer",difficulty
     */
    public static List<CreateQuestionRequest> parseCSVText(String csvText) {
        List<CreateQuestionRequest> questions = new ArrayList<>();
        String[] lines = csvText.trim().split("\n");

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;

            // Split by comma, handling quoted strings
            String[] parts = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");

            if (parts.length >= 1) {
                String questionText = removeQuotes(parts[0].trim());
                String answerText = parts.length >= 2 ? removeQuotes(parts[1].trim()) : null;
                Integer difficulty = 1;

                if (parts.length >= 3) {
                    try {
                        difficulty = Integer.parseInt(parts[2].trim());
                        if (difficulty < 1) difficulty = 1;
                        if (difficulty > 5) difficulty = 5;
                    } catch (NumberFormatException e) {
                        difficulty = 1;
                    }
                }

                CreateQuestionRequest request = new CreateQuestionRequest();
                request.setQuestionText(questionText);
                request.setAnswerText(answerText);
                request.setDifficulty(difficulty);
                questions.add(request);
            }
        }

        return questions;
    }

    /**
     * Parse plain text lines into questions
     * Removes numbered prefixes like "1.", "2)", "a.", etc.
     */
    public static List<CreateQuestionRequest> parseTextLines(String text) {
        List<CreateQuestionRequest> questions = new ArrayList<>();
        String[] lines = text.trim().split("\n");

        // Pattern to match numbered prefixes: 1., 2), a., A), i., etc.
        Pattern prefixPattern = Pattern.compile("^(\\d+[.)\\s]+|[a-zA-Z][.)\\s]+|[ivxlcdm]+[.)\\s]+)", Pattern.CASE_INSENSITIVE);

        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;

            // Remove numbered prefix
            String cleanedLine = prefixPattern.matcher(line).replaceFirst("").trim();

            if (!cleanedLine.isEmpty()) {
                CreateQuestionRequest request = new CreateQuestionRequest();
                request.setQuestionText(cleanedLine);
                request.setAnswerText(null);
                request.setDifficulty(1);
                questions.add(request);
            }
        }

        return questions;
    }

    /**
     * Remove surrounding quotes from a string
     */
    private static String removeQuotes(String str) {
        if (str == null) return null;
        return str.replaceAll("^[\"']|[\"']$", "");
    }

    /**
     * Verify that the user has access to the question set
     */
    private QuestionSet verifyQuestionSetAccess(Long userId, Long questionSetId) {
        QuestionSet questionSet = questionSetRepository.findById(questionSetId)
                .orElseThrow(() -> new RuntimeException("Question set not found"));

        // Verify user owns the project
        projectRepository.findByIdAndOwnerId(questionSet.getProjectId(), userId)
                .orElseThrow(() -> new RuntimeException("Access denied"));

        return questionSet;
    }

    /**
     * Convert Question entity to DTO
     */
    private QuestionDTO convertToDTO(Question question) {
        return QuestionDTO.builder()
                .id(question.getId())
                .questionSetId(question.getQuestionSetId())
                .questionText(question.getQuestionText())
                .answerText(question.getAnswerText())
                .difficulty(question.getDifficulty())
                .createdAt(question.getCreatedAt())
                .updatedAt(question.getUpdatedAt())
                .build();
    }
}
