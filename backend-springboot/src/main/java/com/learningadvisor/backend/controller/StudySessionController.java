package com.learningadvisor.backend.controller;

import com.learningadvisor.backend.dto.studysession.*;
import com.learningadvisor.backend.service.StudySessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Study session controller handling session management and question flow
 * Implements weighted question selection with confidence-based learning
 */
@RestController
@RequestMapping("/api/study-sessions")
@RequiredArgsConstructor
@Slf4j
public class StudySessionController {

    private final StudySessionService studySessionService;

    /**
     * Extract user ID from security context
     */
    private Long getUserIdFromContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Long) {
            return (Long) authentication.getPrincipal();
        }
        throw new RuntimeException("Unauthorized");
    }

    /**
     * Start or resume a study session
     */
    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startSession(
            @Valid @RequestBody CreateStudySessionRequest request) {
        try {
            Long userId = getUserIdFromContext();
            StudySessionResponse session = studySessionService.startOrResumeSession(userId, request);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("session", session);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error starting study session", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to start study session");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Get session status for a question set
     */
    @GetMapping("/{questionSetId}/status")
    public ResponseEntity<Map<String, Object>> getSessionStatus(
            @PathVariable Long questionSetId) {
        try {
            Long userId = getUserIdFromContext();
            NextQuestionResponse result = studySessionService.getNextQuestion(userId, questionSetId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("hasActiveSession", !result.getSessionComplete());
            response.put("progress", result.getProgress());
            response.put("sessionComplete", result.getSessionComplete());

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (e.getMessage().equals("No active study session found")) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("hasActiveSession", false);
                response.put("progress", null);
                response.put("sessionComplete", false);
                return ResponseEntity.ok(response);
            }

            log.error("Error getting session status", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get session status");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Get next question in session
     */
    @GetMapping("/{questionSetId}/next-question")
    public ResponseEntity<Map<String, Object>> getNextQuestion(
            @PathVariable Long questionSetId) {
        try {
            Long userId = getUserIdFromContext();
            NextQuestionResponse result = studySessionService.getNextQuestion(userId, questionSetId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("question", result.getQuestion());
            response.put("questionNumber", result.getQuestionNumber());
            response.put("previousScore", result.getPreviousScore());
            response.put("sessionComplete", result.getSessionComplete());
            response.put("progress", result.getProgress());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting next question", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to get next question");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Submit answer with confidence rating
     */
    @PostMapping("/{questionSetId}/submit-answer")
    public ResponseEntity<Map<String, Object>> submitAnswer(
            @PathVariable Long questionSetId,
            @Valid @RequestBody SubmitAnswerRequest request) {
        try {
            Long userId = getUserIdFromContext();
            studySessionService.submitAnswer(userId, questionSetId, request);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Answer submitted successfully");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error submitting answer", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to submit answer");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Complete current session
     */
    @PostMapping("/{questionSetId}/complete")
    public ResponseEntity<Map<String, Object>> completeSession(
            @PathVariable Long questionSetId) {
        try {
            Long userId = getUserIdFromContext();
            studySessionService.completeSession(userId, questionSetId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Study session completed");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error completing study session", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to complete study session");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Restart session with new mode
     */
    @PostMapping("/{questionSetId}/restart")
    public ResponseEntity<Map<String, Object>> restartSession(
            @PathVariable Long questionSetId,
            @Valid @RequestBody CreateStudySessionRequest request) {
        try {
            Long userId = getUserIdFromContext();

            // Override questionSetId from path
            request.setQuestionSetId(questionSetId);

            StudySessionResponse session = studySessionService.restartSession(userId, request);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("session", session);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error restarting study session", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to restart study session");
            return ResponseEntity.status(500).body(error);
        }
    }
}
