package com.learningadvisor.backend.controller;

import com.learningadvisor.backend.dto.questionset.*;
import com.learningadvisor.backend.service.QuestionService;
import com.learningadvisor.backend.service.QuestionSetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * REST controller for question set (deck) and question management
 * Provides endpoints for CRUD operations on question sets and questions
 */
@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionSetController {

    private final QuestionSetService questionSetService;
    private final QuestionService questionService;

    // ==================== Question Set Endpoints ====================

    /**
     * Create a new question set
     * POST /api/questions/sets
     */
    @PostMapping("/sets")
    public ResponseEntity<Map<String, Object>> createQuestionSet(
            @Valid @RequestBody CreateQuestionSetRequest request,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        QuestionSetDTO questionSet = questionSetService.createQuestionSet(userId, request);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Question set created successfully");
        response.put("questionSet", questionSet);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get question sets for a project
     * GET /api/questions/sets/project/{projectId}
     */
    @GetMapping("/sets/project/{projectId}")
    public ResponseEntity<Map<String, Object>> getQuestionSetsByProject(
            @PathVariable Long projectId,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        List<QuestionSetDTO> questionSets = questionSetService.getQuestionSetsByProject(userId, projectId);

        Map<String, Object> response = new HashMap<>();
        response.put("questionSets", questionSets);

        return ResponseEntity.ok(response);
    }

    /**
     * Get a single question set with questions
     * GET /api/questions/sets/{id}
     */
    @GetMapping("/sets/{id}")
    public ResponseEntity<?> getQuestionSet(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        Optional<QuestionSetDTO> questionSet = questionSetService.getQuestionSet(userId, id);

        if (questionSet.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Question set not found"));
        }

        return ResponseEntity.ok(Map.of("questionSet", questionSet.get()));
    }

    /**
     * Update a question set
     * PUT /api/questions/sets/{id}
     */
    @PutMapping("/sets/{id}")
    public ResponseEntity<?> updateQuestionSet(
            @PathVariable Long id,
            @Valid @RequestBody UpdateQuestionSetRequest request,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        Optional<QuestionSetDTO> updated = questionSetService.updateQuestionSet(userId, id, request);

        if (updated.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Question set not found"));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Question set updated successfully");
        response.put("questionSet", updated.get());

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a question set
     * DELETE /api/questions/sets/{id}
     */
    @DeleteMapping("/sets/{id}")
    public ResponseEntity<?> deleteQuestionSet(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        boolean deleted = questionSetService.deleteQuestionSet(userId, id);

        if (!deleted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Question set not found"));
        }

        return ResponseEntity.ok(Map.of("message", "Question set deleted successfully"));
    }

    // ==================== Question Endpoints ====================

    /**
     * Create a single question
     * POST /api/questions/sets/{id}/questions
     */
    @PostMapping("/sets/{id}/questions")
    public ResponseEntity<Map<String, Object>> createQuestion(
            @PathVariable Long id,
            @Valid @RequestBody CreateQuestionRequest request,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        QuestionDTO question = questionService.createQuestion(userId, id, request);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Question created successfully");
        response.put("question", question);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Create multiple questions in bulk
     * POST /api/questions/bulk
     */
    @PostMapping("/bulk")
    public ResponseEntity<Map<String, Object>> createQuestionsBulk(
            @Valid @RequestBody BulkCreateQuestionsRequest request,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        List<QuestionDTO> questions = questionService.createQuestionsBulk(userId, request);

        Map<String, Object> response = new HashMap<>();
        response.put("message", questions.size() + " questions created successfully");
        response.put("questions", questions);
        response.put("count", questions.size());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Update a question
     * PUT /api/questions/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateQuestion(
            @PathVariable Long id,
            @Valid @RequestBody CreateQuestionRequest request,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        Optional<QuestionDTO> updated = questionService.updateQuestion(userId, id, request);

        if (updated.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Question not found"));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Question updated successfully");
        response.put("question", updated.get());

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a question
     * DELETE /api/questions/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteQuestion(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        boolean deleted = questionService.deleteQuestion(userId, id);

        if (!deleted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Question not found"));
        }

        return ResponseEntity.ok(Map.of("message", "Question deleted successfully"));
    }

    /**
     * Parse text (CSV or lines) and return parsed questions for preview
     * POST /api/questions/parse
     */
    @PostMapping("/parse")
    public ResponseEntity<Map<String, Object>> parseText(
            @Valid @RequestBody ParseTextRequest request,
            Authentication authentication) {
        List<CreateQuestionRequest> questions;

        if ("csv".equals(request.getFormat())) {
            questions = QuestionService.parseCSVText(request.getText());
        } else {
            questions = QuestionService.parseTextLines(request.getText());
        }

        Map<String, Object> response = new HashMap<>();
        response.put("questions", questions);
        response.put("count", questions.size());
        response.put("format", request.getFormat());

        return ResponseEntity.ok(response);
    }

    /**
     * Extract user ID from authentication
     */
    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }
}
