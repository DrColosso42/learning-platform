package com.learningadvisor.backend.service;

import com.learningadvisor.backend.dto.questionset.*;
import com.learningadvisor.backend.entity.Project;
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
import java.util.stream.Collectors;

/**
 * Service for managing question sets (decks)
 * Handles creation, retrieval, update, and deletion of question sets
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionSetService {

    private final QuestionSetRepository questionSetRepository;
    private final ProjectRepository projectRepository;
    private final QuestionRepository questionRepository;

    /**
     * Create a new question set
     */
    @Transactional
    public QuestionSetDTO createQuestionSet(Long userId, CreateQuestionSetRequest request) {
        log.info("Creating question set for user {} in project {}", userId, request.getProjectId());

        // Verify user owns the project
        Project project = projectRepository.findByIdAndOwnerId(request.getProjectId(), userId)
                .orElseThrow(() -> new RuntimeException("Project not found or access denied"));

        QuestionSet questionSet = QuestionSet.builder()
                .projectId(request.getProjectId())
                .name(request.getName())
                .description(request.getDescription())
                .questions(new ArrayList<>())
                .build();

        QuestionSet saved = questionSetRepository.save(questionSet);
        log.info("Created question set with ID: {}", saved.getId());

        return convertToDTO(saved);
    }

    /**
     * Get all question sets for a project
     */
    @Transactional(readOnly = true)
    public List<QuestionSetDTO> getQuestionSetsByProject(Long userId, Long projectId) {
        log.info("Getting question sets for user {} and project {}", userId, projectId);

        // Verify user owns the project
        projectRepository.findByIdAndOwnerId(projectId, userId)
                .orElseThrow(() -> new RuntimeException("Project not found or access denied"));

        List<QuestionSet> questionSets = questionSetRepository.findByProjectIdWithQuestions(projectId);

        return questionSets.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get a single question set with questions
     */
    @Transactional(readOnly = true)
    public Optional<QuestionSetDTO> getQuestionSet(Long userId, Long questionSetId) {
        log.info("Getting question set {} for user {}", questionSetId, userId);

        Optional<QuestionSet> questionSet = questionSetRepository.findByIdWithQuestions(questionSetId);

        if (questionSet.isEmpty()) {
            return Optional.empty();
        }

        // Verify user owns the project that contains this question set
        QuestionSet qs = questionSet.get();
        projectRepository.findByIdAndOwnerId(qs.getProjectId(), userId)
                .orElseThrow(() -> new RuntimeException("Access denied"));

        return Optional.of(convertToDTO(qs));
    }

    /**
     * Update a question set
     */
    @Transactional
    public Optional<QuestionSetDTO> updateQuestionSet(Long userId, Long questionSetId,
                                                       UpdateQuestionSetRequest request) {
        log.info("Updating question set {} for user {}", questionSetId, userId);

        Optional<QuestionSet> existingOpt = questionSetRepository.findById(questionSetId);

        if (existingOpt.isEmpty()) {
            return Optional.empty();
        }

        QuestionSet existing = existingOpt.get();

        // Verify user owns the project
        projectRepository.findByIdAndOwnerId(existing.getProjectId(), userId)
                .orElseThrow(() -> new RuntimeException("Access denied"));

        if (request.getName() != null) {
            existing.setName(request.getName());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription());
        }

        QuestionSet updated = questionSetRepository.save(existing);
        log.info("Updated question set {}", questionSetId);

        return Optional.of(convertToDTO(updated));
    }

    /**
     * Delete a question set
     */
    @Transactional
    public boolean deleteQuestionSet(Long userId, Long questionSetId) {
        log.info("Deleting question set {} for user {}", questionSetId, userId);

        Optional<QuestionSet> questionSet = questionSetRepository.findById(questionSetId);

        if (questionSet.isEmpty()) {
            return false;
        }

        QuestionSet qs = questionSet.get();

        // Verify user owns the project
        Optional<Project> project = projectRepository.findByIdAndOwnerId(qs.getProjectId(), userId);
        if (project.isEmpty()) {
            return false;
        }

        questionSetRepository.delete(qs);
        log.info("Deleted question set {}", questionSetId);

        return true;
    }

    /**
     * Convert QuestionSet entity to DTO
     */
    private QuestionSetDTO convertToDTO(QuestionSet questionSet) {
        List<QuestionDTO> questionDTOs = new ArrayList<>();

        if (questionSet.getQuestions() != null) {
            questionDTOs = questionSet.getQuestions().stream()
                    .map(this::convertQuestionToDTO)
                    .collect(Collectors.toList());
        }

        return QuestionSetDTO.builder()
                .id(questionSet.getId())
                .projectId(questionSet.getProjectId())
                .name(questionSet.getName())
                .description(questionSet.getDescription())
                .createdAt(questionSet.getCreatedAt())
                .updatedAt(questionSet.getUpdatedAt())
                .questions(questionDTOs)
                .questionCount(questionDTOs.size())
                .build();
    }

    /**
     * Convert Question entity to DTO
     */
    private QuestionDTO convertQuestionToDTO(Question question) {
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
