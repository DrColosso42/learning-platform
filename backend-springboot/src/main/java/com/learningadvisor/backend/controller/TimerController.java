package com.learningadvisor.backend.controller;

import com.learningadvisor.backend.dto.timer.TimerConfigRequest;
import com.learningadvisor.backend.dto.timer.TimerStateResponse;
import com.learningadvisor.backend.dto.timer.TimerStatsResponse;
import com.learningadvisor.backend.entity.TimerSession;
import com.learningadvisor.backend.service.TimerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for timer operations
 * Provides endpoints for Pomodoro-style study timers
 */
@RestController
@RequestMapping("/api/study-sessions/{questionSetId}/timer")
@RequiredArgsConstructor
@Slf4j
public class TimerController {

    private final TimerService timerService;

    /**
     * Start or resume timer for a study session
     * POST /api/study-sessions/{questionSetId}/timer/start
     */
    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startTimer(
            @PathVariable Long questionSetId,
            @RequestBody(required = false) TimerConfigRequest config,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            // Get user ID from username
            Long userId = Long.parseLong(userDetails.getUsername());

            log.info("Starting timer for user {} questionSet {}", userId, questionSetId);

            // Extract config values
            Integer workDuration = config != null ? config.getWorkDuration() : null;
            Integer restDuration = config != null ? config.getRestDuration() : null;
            Boolean isInfinite = config != null ? config.getIsInfinite() : null;

            TimerSession timerSession = timerService.startTimer(userId, questionSetId, workDuration, restDuration, isInfinite);
            TimerStateResponse response = TimerStateResponse.fromEntity(timerSession);

            Map<String, Object> result = new HashMap<>();
            result.put("timer", response);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to start timer", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Pause timer for a study session
     * POST /api/study-sessions/{questionSetId}/timer/pause
     */
    @PostMapping("/pause")
    public ResponseEntity<Map<String, Object>> pauseTimer(
            @PathVariable Long questionSetId,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            Long userId = Long.parseLong(userDetails.getUsername());

            log.info("Pausing timer for user {} questionSet {}", userId, questionSetId);

            TimerSession timerSession = timerService.pauseTimer(userId, questionSetId);
            TimerStateResponse response = TimerStateResponse.fromEntity(timerSession);

            Map<String, Object> result = new HashMap<>();
            result.put("timer", response);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to pause timer", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Advance to next phase (work -> rest -> work)
     * POST /api/study-sessions/{questionSetId}/timer/advance
     */
    @PostMapping("/advance")
    public ResponseEntity<Map<String, Object>> advancePhase(
            @PathVariable Long questionSetId,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            Long userId = Long.parseLong(userDetails.getUsername());

            log.info("Advancing timer phase for user {} questionSet {}", userId, questionSetId);

            TimerSession timerSession = timerService.advancePhase(userId, questionSetId);
            TimerStateResponse response = TimerStateResponse.fromEntity(timerSession);

            Map<String, Object> result = new HashMap<>();
            result.put("timer", response);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to advance timer phase", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Stop timer and complete session
     * POST /api/study-sessions/{questionSetId}/timer/stop
     */
    @PostMapping("/stop")
    public ResponseEntity<Map<String, Object>> stopTimer(
            @PathVariable Long questionSetId,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            Long userId = Long.parseLong(userDetails.getUsername());

            log.info("Stopping timer for user {} questionSet {}", userId, questionSetId);

            TimerSession timerSession = timerService.stopTimer(userId, questionSetId);
            TimerStateResponse response = TimerStateResponse.fromEntity(timerSession);

            Map<String, Object> result = new HashMap<>();
            result.put("timer", response);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to stop timer", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get current timer state
     * GET /api/study-sessions/{questionSetId}/timer
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getTimerState(
            @PathVariable Long questionSetId,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            Long userId = Long.parseLong(userDetails.getUsername());

            log.info("Getting timer state for user {} questionSet {}", userId, questionSetId);

            TimerSession timerSession = timerService.getTimerState(userId, questionSetId);
            TimerStateResponse response = TimerStateResponse.fromEntity(timerSession);

            Map<String, Object> result = new HashMap<>();
            result.put("timer", response);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to get timer state", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Update timer configuration
     * PUT /api/study-sessions/{questionSetId}/timer/config
     */
    @PutMapping("/config")
    public ResponseEntity<Map<String, Object>> updateConfig(
            @PathVariable Long questionSetId,
            @RequestBody TimerConfigRequest config,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            Long userId = Long.parseLong(userDetails.getUsername());

            log.info("Updating timer config for user {} questionSet {}", userId, questionSetId);

            TimerSession timerSession = timerService.updateConfig(
                    userId,
                    questionSetId,
                    config.getWorkDuration(),
                    config.getRestDuration(),
                    config.getIsInfinite()
            );

            TimerStateResponse response = TimerStateResponse.fromEntity(timerSession);

            Map<String, Object> result = new HashMap<>();
            result.put("timer", response);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to update timer config", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get timer statistics including event history
     * GET /api/study-sessions/{questionSetId}/timer/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getTimerStats(
            @PathVariable Long questionSetId,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            Long userId = Long.parseLong(userDetails.getUsername());

            log.info("Getting timer stats for user {} questionSet {}", userId, questionSetId);

            TimerService.TimerSessionStats stats = timerService.getTimerStats(userId, questionSetId);

            TimerStatsResponse response = TimerStatsResponse.builder()
                    .totalWorkTime(stats.getTotalWorkTime())
                    .totalRestTime(stats.getTotalRestTime())
                    .totalTime(stats.getTotalTime())
                    .cyclesCompleted(stats.getCyclesCompleted())
                    .workPercentage(stats.getWorkPercentage())
                    .currentPhase(stats.getCurrentPhase())
                    .events(stats.getEvents())
                    .build();

            Map<String, Object> result = new HashMap<>();
            result.put("stats", response);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to get timer stats", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
