package com.learningadvisor.backend.service;

import com.learningadvisor.backend.entity.StudySession;
import com.learningadvisor.backend.entity.TimerEvent;
import com.learningadvisor.backend.entity.TimerSession;
import com.learningadvisor.backend.repository.StudySessionRepository;
import com.learningadvisor.backend.repository.TimerEventRepository;
import com.learningadvisor.backend.repository.TimerSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Service for managing Pomodoro-style study timers
 * Handles timer state transitions, phase tracking, and event logging
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TimerService {

    private final TimerSessionRepository timerSessionRepository;
    private final TimerEventRepository timerEventRepository;
    private final StudySessionRepository studySessionRepository;

    /**
     * Start or resume a timer for a question set
     * Creates a new timer session or resumes a paused one
     */
    @Transactional
    public TimerSession startTimer(Long userId, Long questionSetId, Integer workDuration, Integer restDuration, Boolean isInfinite) {
        log.info("⏰ Starting timer for user {} questionSet {}", userId, questionSetId);

        // Find the active study session for this user and question set
        StudySession studySession = studySessionRepository
                .findFirstByUserIdAndQuestionSetIdAndCompletedAtIsNullOrderByStartedAtDesc(userId, questionSetId)
                .orElseThrow(() -> new RuntimeException("No active study session found"));

        // Check if there's an existing active timer session
        TimerSession timerSession = timerSessionRepository
                .findFirstByDeckSessionIdAndCompletedAtIsNullOrderByStartedAtDesc(studySession.getId())
                .orElse(null);

        LocalDateTime now = LocalDateTime.now();

        if (timerSession != null && "paused".equals(timerSession.getCurrentPhase())) {
            // Resume from paused state
            log.info("⏸️ Resuming paused timer session {}", timerSession.getId());

            String previousPhase = timerSession.getPreviousPhase() != null ? timerSession.getPreviousPhase() : "work";
            Integer elapsedTime = timerSession.getElapsedTimeInPhase() != null ? timerSession.getElapsedTimeInPhase() : 0;

            // Calculate adjusted start time to account for elapsed time
            LocalDateTime adjustedStartTime = now.minusSeconds(elapsedTime);

            timerSession.setCurrentPhase(previousPhase);
            timerSession.setPhaseStartedAt(adjustedStartTime);
            timerSession.setPreviousPhase(null);
            timerSession.setElapsedTimeInPhase(0);

            timerSession = timerSessionRepository.save(timerSession);

            // Log resume event
            logTimerEvent(timerSession.getId(), "resume", "paused", previousPhase, null);

        } else if (timerSession == null) {
            // Create new timer session
            log.info("📝 Creating new timer session for study session {}", studySession.getId());

            timerSession = TimerSession.builder()
                    .deckSessionId(studySession.getId())
                    .userId(userId)
                    .workDuration(workDuration != null ? workDuration : 1500)
                    .restDuration(restDuration != null ? restDuration : 300)
                    .isInfinite(isInfinite != null ? isInfinite : false)
                    .currentPhase("work")
                    .phaseStartedAt(now)
                    .totalWorkTime(0)
                    .totalRestTime(0)
                    .cyclesCompleted(0)
                    .startedAt(now)
                    .build();

            timerSession = timerSessionRepository.save(timerSession);

            // Log start event
            logTimerEvent(timerSession.getId(), "start", null, "work", null);

        } else {
            // Timer is already running, just update config if provided
            if (workDuration != null) {
                timerSession.setWorkDuration(workDuration);
            }
            if (restDuration != null) {
                timerSession.setRestDuration(restDuration);
            }
            if (isInfinite != null) {
                timerSession.setIsInfinite(isInfinite);
            }

            timerSession = timerSessionRepository.save(timerSession);
        }

        return timerSession;
    }

    /**
     * Pause the timer
     */
    @Transactional
    public TimerSession pauseTimer(Long userId, Long questionSetId) {
        log.info("⏸️ Pausing timer for user {} questionSet {}", userId, questionSetId);

        TimerSession timerSession = getActiveTimerSession(userId, questionSetId);

        // Calculate time spent in current phase
        int timeSpentInPhase = 0;
        if (timerSession.getPhaseStartedAt() != null) {
            timeSpentInPhase = (int) ChronoUnit.SECONDS.between(timerSession.getPhaseStartedAt(), LocalDateTime.now());
        }

        // Update total time based on current phase
        if ("work".equals(timerSession.getCurrentPhase())) {
            timerSession.setTotalWorkTime(timerSession.getTotalWorkTime() + timeSpentInPhase);
        } else if ("rest".equals(timerSession.getCurrentPhase())) {
            timerSession.setTotalRestTime(timerSession.getTotalRestTime() + timeSpentInPhase);
        }

        String previousPhase = timerSession.getCurrentPhase();
        timerSession.setCurrentPhase("paused");
        timerSession.setPreviousPhase(previousPhase);
        timerSession.setElapsedTimeInPhase(timeSpentInPhase);
        timerSession.setPhaseStartedAt(null);

        timerSession = timerSessionRepository.save(timerSession);

        // Log pause event
        logTimerEvent(timerSession.getId(), "pause", previousPhase, "paused", timeSpentInPhase);

        return timerSession;
    }

    /**
     * Advance to the next phase (work -> rest -> work)
     */
    @Transactional
    public TimerSession advancePhase(Long userId, Long questionSetId) {
        log.info("➡️ Advancing phase for user {} questionSet {}", userId, questionSetId);

        TimerSession timerSession = getActiveTimerSession(userId, questionSetId);

        LocalDateTime now = LocalDateTime.now();

        // Calculate time spent in current phase
        int timeSpentInPhase = 0;
        if (timerSession.getPhaseStartedAt() != null) {
            timeSpentInPhase = (int) ChronoUnit.SECONDS.between(timerSession.getPhaseStartedAt(), now);
        }

        String currentPhase = timerSession.getCurrentPhase();
        String nextPhase = "work";
        int cyclesCompleted = timerSession.getCyclesCompleted();

        // Determine next phase
        if ("work".equals(currentPhase)) {
            nextPhase = "rest";
            timerSession.setTotalWorkTime(timerSession.getTotalWorkTime() + timeSpentInPhase);
        } else if ("rest".equals(currentPhase)) {
            nextPhase = "work";
            cyclesCompleted++;
            timerSession.setTotalRestTime(timerSession.getTotalRestTime() + timeSpentInPhase);

            // Log cycle completion
            logTimerEvent(timerSession.getId(), "cycle_complete", "rest", "work", null);
        }

        timerSession.setCurrentPhase(nextPhase);
        timerSession.setPhaseStartedAt(now);
        timerSession.setCyclesCompleted(cyclesCompleted);

        timerSession = timerSessionRepository.save(timerSession);

        // Log phase change event
        logTimerEvent(timerSession.getId(), "phase_change", currentPhase, nextPhase, timeSpentInPhase);

        return timerSession;
    }

    /**
     * Stop the timer and complete the session
     */
    @Transactional
    public TimerSession stopTimer(Long userId, Long questionSetId) {
        log.info("⏹️ Stopping timer for user {} questionSet {}", userId, questionSetId);

        TimerSession timerSession = getActiveTimerSession(userId, questionSetId);

        LocalDateTime now = LocalDateTime.now();

        // Calculate time spent in current phase
        int timeSpentInPhase = 0;
        if (timerSession.getPhaseStartedAt() != null) {
            timeSpentInPhase = (int) ChronoUnit.SECONDS.between(timerSession.getPhaseStartedAt(), now);
        }

        // Update total time based on current phase
        if ("work".equals(timerSession.getCurrentPhase())) {
            timerSession.setTotalWorkTime(timerSession.getTotalWorkTime() + timeSpentInPhase);
        } else if ("rest".equals(timerSession.getCurrentPhase())) {
            timerSession.setTotalRestTime(timerSession.getTotalRestTime() + timeSpentInPhase);
        }

        String previousPhase = timerSession.getCurrentPhase();
        timerSession.setCurrentPhase("completed");
        timerSession.setPhaseStartedAt(null);
        timerSession.setCompletedAt(now);

        timerSession = timerSessionRepository.save(timerSession);

        // Log stop event
        logTimerEvent(timerSession.getId(), "stop", previousPhase, "completed", timeSpentInPhase);

        return timerSession;
    }

    /**
     * Get current timer state for a question set
     */
    @Transactional(readOnly = true)
    public TimerSession getTimerState(Long userId, Long questionSetId) {
        return getActiveTimerSession(userId, questionSetId);
    }

    /**
     * Update timer configuration
     * When switching between infinite and timed modes, reset the phase start time
     * to prevent issues with elapsed time calculations
     */
    @Transactional
    public TimerSession updateConfig(Long userId, Long questionSetId, Integer workDuration, Integer restDuration, Boolean isInfinite) {
        log.info("⚙️ Updating timer config for user {} questionSet {}", userId, questionSetId);

        TimerSession timerSession = getActiveTimerSession(userId, questionSetId);

        // Check if mode is changing from infinite to timed or vice versa
        boolean modeChanging = isInfinite != null && !isInfinite.equals(timerSession.getIsInfinite());

        // Update duration settings
        if (workDuration != null) {
            timerSession.setWorkDuration(workDuration);
        }
        if (restDuration != null) {
            timerSession.setRestDuration(restDuration);
        }
        if (isInfinite != null) {
            timerSession.setIsInfinite(isInfinite);
        }

        // Reset phase start time when switching modes to prevent instant transitions
        // This ensures that in timed mode, the user gets the full duration from the moment of switch
        if (modeChanging && timerSession.getCurrentPhase() != null &&
            !timerSession.getCurrentPhase().equals("paused") &&
            !timerSession.getCurrentPhase().equals("completed")) {

            LocalDateTime now = LocalDateTime.now();
            timerSession.setPhaseStartedAt(now);

            log.info("🔄 Mode switched from {} to {} - reset phase start time",
                    timerSession.getIsInfinite() ? "timed" : "infinite",
                    isInfinite ? "infinite" : "timed");
        }

        TimerSession saved = timerSessionRepository.save(timerSession);

        log.info("⚙️ Updated timer config - isInfinite: {}, workDuration: {}, restDuration: {}, phaseStartedAt: {}",
                saved.getIsInfinite(), saved.getWorkDuration(), saved.getRestDuration(), saved.getPhaseStartedAt());

        return saved;
    }

    /**
     * Get timer statistics including events
     */
    @Transactional(readOnly = true)
    public TimerSessionStats getTimerStats(Long userId, Long questionSetId) {
        TimerSession timerSession = getActiveTimerSession(userId, questionSetId);

        List<TimerEvent> events = timerEventRepository.findByTimerSessionIdOrderByTimestampDesc(timerSession.getId());

        int totalTime = timerSession.getTotalWorkTime() + timerSession.getTotalRestTime();
        int workPercentage = totalTime > 0 ? (timerSession.getTotalWorkTime() * 100 / totalTime) : 0;

        return TimerSessionStats.builder()
                .totalWorkTime(timerSession.getTotalWorkTime())
                .totalRestTime(timerSession.getTotalRestTime())
                .totalTime(totalTime)
                .cyclesCompleted(timerSession.getCyclesCompleted())
                .workPercentage(workPercentage)
                .currentPhase(timerSession.getCurrentPhase())
                .events(events)
                .build();
    }

    /**
     * Get active timer session for a user's question set
     */
    private TimerSession getActiveTimerSession(Long userId, Long questionSetId) {
        // Find the active study session
        StudySession studySession = studySessionRepository
                .findFirstByUserIdAndQuestionSetIdAndCompletedAtIsNullOrderByStartedAtDesc(userId, questionSetId)
                .orElseThrow(() -> new RuntimeException("No active study session found"));

        // Find the active timer session
        return timerSessionRepository
                .findFirstByDeckSessionIdAndCompletedAtIsNullOrderByStartedAtDesc(studySession.getId())
                .orElseThrow(() -> new RuntimeException("No active timer session found"));
    }

    /**
     * Log a timer event
     */
    private void logTimerEvent(Long timerSessionId, String eventType, String fromPhase, String toPhase, Integer duration) {
        TimerEvent event = TimerEvent.builder()
                .timerSessionId(timerSessionId)
                .eventType(eventType)
                .fromPhase(fromPhase)
                .toPhase(toPhase)
                .duration(duration != null ? duration : 0)
                .timestamp(LocalDateTime.now())
                .build();

        timerEventRepository.save(event);

        log.info("📝 TimerEvent logged: {} ({} → {}) for session {}", eventType, fromPhase, toPhase, timerSessionId);
    }

    /**
     * Inner class for timer statistics response
     */
    @lombok.Data
    @lombok.Builder
    public static class TimerSessionStats {
        private Integer totalWorkTime;
        private Integer totalRestTime;
        private Integer totalTime;
        private Integer cyclesCompleted;
        private Integer workPercentage;
        private String currentPhase;
        private List<TimerEvent> events;
    }
}
