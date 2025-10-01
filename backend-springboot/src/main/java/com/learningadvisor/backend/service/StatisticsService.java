package com.learningadvisor.backend.service;

import com.learningadvisor.backend.dto.*;
import com.learningadvisor.backend.entity.*;
import com.learningadvisor.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Statistics service for user analytics and progress tracking
 * Aggregates data from study sessions, timer sessions, and projects
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StatisticsService {

    private final StudySessionRepository studySessionRepository;
    private final ProjectRepository projectRepository;
    private final SessionAnswerRepository sessionAnswerRepository;
    private final TimerSessionRepository timerSessionRepository;

    /**
     * Get comprehensive user statistics
     */
    public UserStatisticsDTO getUserStatistics(Long userId) {
        log.info("Getting statistics for user {}", userId);

        // Get all study sessions for the user
        List<StudySession> userSessions = studySessionRepository.findByUserId(userId);

        // Filter sessions that have answers (both completed and ongoing)
        List<StudySession> sessionsWithAnswers = userSessions.stream()
                .filter(session -> !session.getSessionAnswers().isEmpty())
                .collect(Collectors.toList());

        log.info("Found {} sessions with answers out of {} total sessions",
                sessionsWithAnswers.size(), userSessions.size());

        // Get user's projects
        List<Project> userProjects = projectRepository.findByOwnerId(userId);

        // Calculate basic stats
        int totalSessions = sessionsWithAnswers.size();

        // Calculate total points earned (sum of confidence ratings for unique questions)
        int totalPoints = sessionsWithAnswers.stream()
                .mapToInt(this::calculateSessionPoints)
                .sum();

        // Calculate average rating
        double averageRating = sessionsWithAnswers.stream()
                .flatMap(session -> session.getSessionAnswers().stream())
                .mapToInt(SessionAnswer::getUserRating)
                .average()
                .orElse(0.0);

        // Calculate projects completion
        int totalProjects = userProjects.size();
        int projectsCompleted = (int) userProjects.stream()
                .filter(project -> project.getQuestionSets().stream()
                        .anyMatch(qs -> !qs.getQuestions().isEmpty()))
                .count();

        // Calculate streaks
        Map<String, Integer> streaks = calculateStreaks(userId);
        int currentStreak = streaks.get("current");
        int longestStreak = streaks.get("longest");

        // Calculate study time
        int totalStudyTime = calculateTotalStudyTime(userId);

        return UserStatisticsDTO.builder()
                .totalSessions(totalSessions)
                .totalQuestions(totalPoints)
                .averageRating(averageRating)
                .currentStreak(currentStreak)
                .longestStreak(longestStreak)
                .totalStudyTime(totalStudyTime)
                .projectsCompleted(projectsCompleted)
                .totalProjects(totalProjects)
                .build();
    }

    /**
     * Get recent study sessions for the user
     */
    public List<RecentStudySessionDTO> getRecentStudySessions(Long userId, int limit) {
        List<StudySession> sessions = studySessionRepository.findByUserIdOrderByStartedAtDesc(userId);

        return sessions.stream()
                .filter(session -> !session.getSessionAnswers().isEmpty())
                .limit(limit)
                .map(this::mapToRecentSessionDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get activity data for calendar visualization
     */
    public List<ActivityDataDTO> getActivityData(Long userId, int days) {
        log.info("Getting activity data for user {} for {} days", userId, days);

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);

        // Get sessions with answers in the date range
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.plusDays(1).atStartOfDay();

        List<StudySession> sessions = studySessionRepository.findByUserIdAndStartedAtBetween(
                userId, startDateTime, endDateTime);

        log.info("Found {} sessions in date range", sessions.size());

        // Group points by date using delta calculation
        // Need to get previous scores from before the date range for accurate delta calculation
        Map<LocalDate, Integer> pointsByDate = new HashMap<>();

        // Get ALL user sessions to build complete score history
        List<StudySession> allUserSessions = studySessionRepository.findByUserId(userId);

        // Collect all answers across all sessions (including those before date range) and sort by timestamp
        List<SessionAnswer> allAnswers = new ArrayList<>();
        for (StudySession session : allUserSessions) {
            allAnswers.addAll(session.getSessionAnswers());
        }
        allAnswers.sort(Comparator.comparing(SessionAnswer::getAnsweredAt));

        // Track previous scores per question and calculate deltas only for answers in date range
        Map<Long, Integer> previousScoreByQuestion = new HashMap<>();

        for (SessionAnswer answer : allAnswers) {
            LocalDate answerDate = answer.getAnsweredAt().toLocalDate();
            Long questionId = answer.getQuestionId();
            int currentScore = answer.getUserRating();

            // Calculate delta: new score - previous score (0 if first attempt)
            int previousScore = previousScoreByQuestion.getOrDefault(questionId, 0);
            int delta = currentScore - previousScore;

            // Only add delta if answer is within the date range
            if (!answerDate.isBefore(startDate) && !answerDate.isAfter(endDate)) {
                pointsByDate.merge(answerDate, delta, Integer::sum);
            }

            // Always update previous score for this question (even for answers outside date range)
            previousScoreByQuestion.put(questionId, currentScore);
        }

        log.info("Points by date: {}", pointsByDate);

        // Generate activity data for all days
        List<ActivityDataDTO> activityData = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate date = startDate.plusDays(i);
            int points = pointsByDate.getOrDefault(date, 0);
            int level = calculateActivityLevel(points);

            activityData.add(ActivityDataDTO.builder()
                    .date(date.toString())
                    .count(points)
                    .level(level)
                    .build());
        }

        log.info("Generated {} days of activity data, non-zero days: {}",
                activityData.size(),
                activityData.stream().filter(d -> d.getCount() > 0).count());

        return activityData;
    }

    /**
     * Get time-based activity data for calendar and graph
     */
    public List<TimeActivityDataDTO> getTimeActivityData(Long userId, int days) {
        log.info("Getting time activity data for user {} for {} days", userId, days);

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);

        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.plusDays(1).atStartOfDay();

        List<StudySession> sessions = studySessionRepository.findByUserIdAndStartedAtBetween(
                userId, startDateTime, endDateTime);

        log.info("Found {} deck sessions in date range", sessions.size());

        // Group study time by date
        Map<LocalDate, Integer> timeByDate = new HashMap<>();
        for (StudySession session : sessions) {
            LocalDate sessionDate = session.getStartedAt().toLocalDate();
            int sessionMinutes = calculateSessionMinutes(session);
            timeByDate.merge(sessionDate, sessionMinutes, Integer::sum);
        }

        log.info("Time by date: {}", timeByDate);

        // Generate time activity data for all days
        List<TimeActivityDataDTO> timeActivityData = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate date = startDate.plusDays(i);
            int minutes = timeByDate.getOrDefault(date, 0);
            int level = calculateTimeLevel(minutes);

            timeActivityData.add(TimeActivityDataDTO.builder()
                    .date(date.toString())
                    .minutes(minutes)
                    .level(level)
                    .build());
        }

        log.info("Generated {} days of time activity data, non-zero days: {}",
                timeActivityData.size(),
                timeActivityData.stream().filter(d -> d.getMinutes() > 0).count());

        return timeActivityData;
    }

    /**
     * Get time-based statistics
     */
    public TimeStatisticsDTO getTimeStatistics(Long userId) {
        log.info("Getting time statistics for user {}", userId);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfWeek = now.toLocalDate().atStartOfDay().minusDays(now.getDayOfWeek().getValue());
        LocalDateTime startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay();
        LocalDateTime thirtyDaysAgo = now.minusDays(30);

        List<StudySession> allSessions = studySessionRepository.findByUserId(userId);
        List<StudySession> weekSessions = studySessionRepository.findByUserIdAndStartedAtAfter(userId, startOfWeek);
        List<StudySession> monthSessions = studySessionRepository.findByUserIdAndStartedAtAfter(userId, startOfMonth);
        List<StudySession> recentSessions = studySessionRepository.findByUserIdAndStartedAtAfter(userId, thirtyDaysAgo);

        int totalStudyTimeMinutes = calculateSessionListTime(allSessions);
        int totalStudyTimeThisWeek = calculateSessionListTime(weekSessions);
        int totalStudyTimeThisMonth = calculateSessionListTime(monthSessions);
        int averageDailyStudyTime = calculateSessionListTime(recentSessions) / 30;

        log.info("Total study time: {} minutes, this week: {}, this month: {}, daily avg: {}",
                totalStudyTimeMinutes, totalStudyTimeThisWeek, totalStudyTimeThisMonth, averageDailyStudyTime);

        return TimeStatisticsDTO.builder()
                .totalStudyTimeMinutes(totalStudyTimeMinutes)
                .totalStudyTimeThisWeek(totalStudyTimeThisWeek)
                .totalStudyTimeThisMonth(totalStudyTimeThisMonth)
                .averageDailyStudyTime(averageDailyStudyTime)
                .longestStudyStreak(0)  // TODO: Implement time-based streak
                .build();
    }

    // ==================== HELPER METHODS ====================

    /**
     * Calculate points for a session (sum of latest rating for each unique question)
     */
    private int calculateSessionPoints(StudySession session) {
        Map<Long, Integer> latestRatings = new HashMap<>();
        for (SessionAnswer answer : session.getSessionAnswers()) {
            latestRatings.put(answer.getQuestionId(), answer.getUserRating());
        }
        return latestRatings.values().stream().mapToInt(Integer::intValue).sum();
    }

    /**
     * Calculate streaks based on study sessions
     */
    private Map<String, Integer> calculateStreaks(Long userId) {
        List<StudySession> completedSessions = studySessionRepository.findByUserIdAndCompletedAtNotNullOrderByCompletedAtDesc(userId);

        if (completedSessions.isEmpty()) {
            return Map.of("current", 0, "longest", 0);
        }

        // Get unique dates
        Set<LocalDate> uniqueDates = completedSessions.stream()
                .map(session -> session.getCompletedAt().toLocalDate())
                .collect(Collectors.toCollection(TreeSet::new));

        List<LocalDate> sortedDates = new ArrayList<>(uniqueDates);
        Collections.reverse(sortedDates);

        // Calculate current streak
        int currentStreak = 0;
        LocalDate checkDate = LocalDate.now();

        for (LocalDate sessionDate : sortedDates) {
            if (sessionDate.equals(checkDate)) {
                currentStreak++;
                checkDate = checkDate.minusDays(1);
            } else {
                break;
            }
        }

        // Calculate longest streak
        int longestStreak = 0;
        int tempStreak = 1;

        for (int i = 1; i < sortedDates.size(); i++) {
            long dayDiff = ChronoUnit.DAYS.between(sortedDates.get(i), sortedDates.get(i - 1));
            if (dayDiff == 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        return Map.of("current", currentStreak, "longest", longestStreak);
    }

    /**
     * Calculate total study time for user
     */
    private int calculateTotalStudyTime(Long userId) {
        List<StudySession> sessions = studySessionRepository.findByUserId(userId);
        return calculateSessionListTime(sessions);
    }

    /**
     * Calculate total time for a list of sessions
     */
    private int calculateSessionListTime(List<StudySession> sessions) {
        return sessions.stream()
                .mapToInt(this::calculateSessionMinutes)
                .sum();
    }

    /**
     * Calculate minutes for a single session
     */
    private int calculateSessionMinutes(StudySession session) {
        // Load timer sessions separately to avoid lazy loading issues
        List<TimerSession> timerSessions = timerSessionRepository.findByDeckSessionId(session.getId());

        // Check if session has timer sessions
        if (!timerSessions.isEmpty()) {
            return timerSessions.stream()
                    .mapToInt(this::calculateTimerSessionMinutes)
                    .sum();
        }

        // Fall back to session duration
        if (session.getCompletedAt() != null) {
            long seconds = ChronoUnit.SECONDS.between(session.getStartedAt(), session.getCompletedAt());
            return (int) (seconds / 60);
        }

        // For active sessions without timer
        long seconds = ChronoUnit.SECONDS.between(session.getStartedAt(), LocalDateTime.now());
        return (int) (seconds / 60);
    }

    /**
     * Calculate minutes for a timer session
     */
    private int calculateTimerSessionMinutes(TimerSession timerSession) {
        int minutes = (timerSession.getTotalWorkTime() + timerSession.getTotalRestTime()) / 60;

        // Add current phase time for active timers
        if (!"completed".equals(timerSession.getCurrentPhase()) &&
            !"paused".equals(timerSession.getCurrentPhase()) &&
            timerSession.getPhaseStartedAt() != null) {
            long currentPhaseSeconds = ChronoUnit.SECONDS.between(
                    timerSession.getPhaseStartedAt(), LocalDateTime.now());
            minutes += (int) (currentPhaseSeconds / 60);
        }

        return minutes;
    }

    /**
     * Convert points to activity level (0-4)
     */
    private int calculateActivityLevel(int points) {
        if (points >= 20) return 4;
        if (points >= 15) return 3;
        if (points >= 10) return 2;
        if (points >= 5) return 1;
        return 0;
    }

    /**
     * Convert minutes to time activity level (0-4)
     */
    private int calculateTimeLevel(int minutes) {
        if (minutes >= 120) return 4;  // 2+ hours
        if (minutes >= 60) return 3;   // 1-2 hours
        if (minutes >= 30) return 2;   // 30-60 minutes
        if (minutes >= 10) return 1;   // 10-30 minutes
        return 0;
    }

    /**
     * Map study session to recent session DTO
     */
    private RecentStudySessionDTO mapToRecentSessionDTO(StudySession session) {
        // Calculate unique questions answered
        Set<Long> uniqueQuestions = session.getSessionAnswers().stream()
                .map(SessionAnswer::getQuestionId)
                .collect(Collectors.toSet());

        // Calculate average rating for unique questions
        Map<Long, Integer> latestRatings = new HashMap<>();
        for (SessionAnswer answer : session.getSessionAnswers()) {
            latestRatings.put(answer.getQuestionId(), answer.getUserRating());
        }

        double averageRating = latestRatings.values().stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0);

        QuestionSet questionSet = session.getQuestionSet();
        String completedAt = (session.getCompletedAt() != null ?
                session.getCompletedAt() : session.getStartedAt()).toString();

        return RecentStudySessionDTO.builder()
                .id(session.getId())
                .questionSetId(session.getQuestionSetId())
                .projectName(questionSet.getProject().getName())
                .questionSetName(questionSet.getName())
                .questionsAnswered(uniqueQuestions.size())
                .totalQuestions(questionSet.getQuestions().size())
                .averageRating(averageRating)
                .completedAt(completedAt)
                .build();
    }
}
