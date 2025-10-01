package com.learningadvisor.backend.repository;

import com.learningadvisor.backend.entity.SessionAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for SessionAnswer entity data access
 */
@Repository
public interface SessionAnswerRepository extends JpaRepository<SessionAnswer, Long> {

    /**
     * Find all answers for a session ordered by answered time
     */
    List<SessionAnswer> findBySessionIdOrderByAnsweredAtAsc(Long sessionId);

    /**
     * Find last answer for a specific question in a session
     */
    Optional<SessionAnswer> findFirstBySessionIdAndQuestionIdOrderByAnsweredAtDesc(
            Long sessionId, Long questionId);

    /**
     * Count answers for a session
     */
    long countBySessionId(Long sessionId);

    /**
     * Count answers with rating 5 (mastered) for a session
     */
    long countBySessionIdAndUserRating(Long sessionId, Integer userRating);

    /**
     * Get total answers count for a user within a time period
     */
    @Query("SELECT COUNT(sa) FROM SessionAnswer sa JOIN sa.session s WHERE s.userId = :userId AND sa.answeredAt >= :since")
    long countAnswersByUserSince(Long userId, LocalDateTime since);

    /**
     * Delete all answers for a session
     */
    void deleteBySessionId(Long sessionId);
}
