package com.learningadvisor.backend.repository;

import com.learningadvisor.backend.entity.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for StudySession entity data access
 */
@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {

    /**
     * Find active (incomplete) session for user and question set
     */
    Optional<StudySession> findFirstByUserIdAndQuestionSetIdAndCompletedAtIsNullOrderByStartedAtDesc(
            Long userId, Long questionSetId);

    /**
     * Find active session with answers loaded
     */
    @Query("SELECT s FROM StudySession s LEFT JOIN FETCH s.sessionAnswers WHERE s.userId = :userId AND s.questionSetId = :questionSetId AND s.completedAt IS NULL ORDER BY s.startedAt DESC")
    Optional<StudySession> findActiveSessionWithAnswers(Long userId, Long questionSetId);

    /**
     * Find recent completed sessions for a user
     */
    @Query("SELECT s FROM StudySession s WHERE s.userId = :userId AND s.completedAt IS NOT NULL ORDER BY s.completedAt DESC")
    List<StudySession> findRecentCompletedSessions(Long userId);

    /**
     * Count completed sessions for a user
     */
    long countByUserIdAndCompletedAtIsNotNull(Long userId);

    /**
     * Delete all sessions for a user and question set
     */
    void deleteByUserIdAndQuestionSetId(Long userId, Long questionSetId);
}
