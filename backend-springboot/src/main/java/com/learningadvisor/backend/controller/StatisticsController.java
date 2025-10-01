package com.learningadvisor.backend.controller;

import com.learningadvisor.backend.dto.*;
import com.learningadvisor.backend.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST controller for statistics and analytics endpoints
 * Provides user progress tracking, activity data, and dashboard metrics
 */
@RestController
@RequestMapping("/api/statistics")
@RequiredArgsConstructor
@Slf4j
public class StatisticsController {

    private final StatisticsService statisticsService;

    /**
     * Get comprehensive user statistics
     * GET /api/statistics/overview
     */
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getUserStatistics(Authentication authentication) {
        Long userId = extractUserId(authentication);
        log.info("Getting statistics for user ID: {}", userId);

        UserStatisticsDTO statistics = statisticsService.getUserStatistics(userId);
        log.info("Returning statistics: {}", statistics);

        Map<String, Object> response = new HashMap<>();
        response.put("statistics", statistics);

        return ResponseEntity.ok(response);
    }

    /**
     * Get recent study sessions
     * GET /api/statistics/recent-sessions
     */
    @GetMapping("/recent-sessions")
    public ResponseEntity<Map<String, Object>> getRecentSessions(
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        log.info("Getting recent sessions for user ID: {}, limit: {}", userId, limit);

        List<RecentStudySessionDTO> sessions = statisticsService.getRecentStudySessions(userId, limit);

        Map<String, Object> response = new HashMap<>();
        response.put("sessions", sessions);

        return ResponseEntity.ok(response);
    }

    /**
     * Get activity data for calendar
     * GET /api/statistics/activity
     */
    @GetMapping("/activity")
    public ResponseEntity<Map<String, Object>> getActivityData(
            @RequestParam(defaultValue = "365") int days,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        log.info("Getting activity data for user ID: {}, days: {}", userId, days);

        List<ActivityDataDTO> activityData = statisticsService.getActivityData(userId, days);

        log.info("Sending activity data response: {} days, non-zero days: {}",
                activityData.size(),
                activityData.stream().filter(d -> d.getCount() > 0).count());

        Map<String, Object> response = new HashMap<>();
        response.put("activityData", activityData);
        response.put("totalDays", days);

        return ResponseEntity.ok(response);
    }

    /**
     * Get dashboard data (combined endpoint for efficiency)
     * GET /api/statistics/dashboard
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData(Authentication authentication) {
        Long userId = extractUserId(authentication);
        log.info("Getting dashboard data for user ID: {}", userId);

        UserStatisticsDTO statistics = statisticsService.getUserStatistics(userId);
        List<RecentStudySessionDTO> recentSessions = statisticsService.getRecentStudySessions(userId, 5);
        List<ActivityDataDTO> activityData = statisticsService.getActivityData(userId, 365);

        Map<String, Object> response = new HashMap<>();
        response.put("statistics", statistics);
        response.put("recentSessions", recentSessions);
        response.put("activityData", activityData);

        return ResponseEntity.ok(response);
    }

    /**
     * Get time-based statistics
     * GET /api/statistics/time-stats
     */
    @GetMapping("/time-stats")
    public ResponseEntity<Map<String, Object>> getTimeStatistics(Authentication authentication) {
        Long userId = extractUserId(authentication);
        log.info("Getting time statistics for user ID: {}", userId);

        TimeStatisticsDTO timeStats = statisticsService.getTimeStatistics(userId);
        log.info("Returning time statistics: {}", timeStats);

        Map<String, Object> response = new HashMap<>();
        response.put("timeStats", timeStats);

        return ResponseEntity.ok(response);
    }

    /**
     * Get time-based activity data for calendar and graph
     * GET /api/statistics/time-activity
     */
    @GetMapping("/time-activity")
    public ResponseEntity<Map<String, Object>> getTimeActivityData(
            @RequestParam(defaultValue = "365") int days,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        log.info("Getting time activity data for user ID: {}, days: {}", userId, days);

        List<TimeActivityDataDTO> timeActivityData = statisticsService.getTimeActivityData(userId, days);

        log.info("Sending time activity data response: {} days, non-zero days: {}",
                timeActivityData.size(),
                timeActivityData.stream().filter(d -> d.getMinutes() > 0).count());

        Map<String, Object> response = new HashMap<>();
        response.put("timeActivityData", timeActivityData);
        response.put("totalDays", days);

        return ResponseEntity.ok(response);
    }

    /**
     * Get enhanced dashboard data with time tracking (combined endpoint)
     * GET /api/statistics/enhanced-dashboard
     */
    @GetMapping("/enhanced-dashboard")
    public ResponseEntity<Map<String, Object>> getEnhancedDashboardData(Authentication authentication) {
        Long userId = extractUserId(authentication);
        log.info("Getting enhanced dashboard data for user ID: {}", userId);

        UserStatisticsDTO statistics = statisticsService.getUserStatistics(userId);
        List<RecentStudySessionDTO> recentSessions = statisticsService.getRecentStudySessions(userId, 5);
        List<ActivityDataDTO> activityData = statisticsService.getActivityData(userId, 365);
        TimeStatisticsDTO timeStats = statisticsService.getTimeStatistics(userId);
        List<TimeActivityDataDTO> timeActivityData = statisticsService.getTimeActivityData(userId, 365);

        Map<String, Object> response = new HashMap<>();
        response.put("statistics", statistics);
        response.put("recentSessions", recentSessions);
        response.put("activityData", activityData);
        response.put("timeStats", timeStats);
        response.put("timeActivityData", timeActivityData);

        return ResponseEntity.ok(response);
    }

    /**
     * Extract user ID from authentication
     */
    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }
}
