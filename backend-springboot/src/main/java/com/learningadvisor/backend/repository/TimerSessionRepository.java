package com.learningadvisor.backend.repository;

import com.learningadvisor.backend.entity.TimerSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Repository for TimerSession entity data access
 */
@Repository
public interface TimerSessionRepository extends JpaRepository<TimerSession, Long> {

    /**
     * Find active timer session for a deck session (most recent first)
     */
    Optional<TimerSession> findFirstByDeckSessionIdAndCompletedAtIsNullOrderByStartedAtDesc(Long deckSessionId);

    /**
     * Find active timer session for a deck session
     */
    Optional<TimerSession> findFirstByDeckSessionIdAndCompletedAtIsNull(Long deckSessionId);

    /**
     * Find all timer sessions for a deck session
     */
    java.util.List<TimerSession> findByDeckSessionId(Long deckSessionId);

    /**
     * Find all timer sessions for a user
     */
    @Query("SELECT ts FROM TimerSession ts WHERE ts.userId = :userId ORDER BY ts.startedAt DESC")
    java.util.List<TimerSession> findByUserId(Long userId);

    /**
     * Sum total work time for a user
     */
    @Query("SELECT COALESCE(SUM(ts.totalWorkTime), 0) FROM TimerSession ts WHERE ts.userId = :userId")
    Long sumTotalWorkTimeByUserId(Long userId);

    /**
     * Sum total work time for a user since a specific date
     */
    @Query("SELECT COALESCE(SUM(ts.totalWorkTime), 0) FROM TimerSession ts WHERE ts.userId = :userId AND ts.startedAt >= :since")
    Long sumTotalWorkTimeByUserIdSince(Long userId, LocalDateTime since);

    /**
     * Count completed timer sessions for a user
     */
    long countByUserIdAndCompletedAtIsNotNull(Long userId);
}
