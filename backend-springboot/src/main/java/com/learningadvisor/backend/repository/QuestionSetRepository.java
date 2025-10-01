package com.learningadvisor.backend.repository;

import com.learningadvisor.backend.entity.QuestionSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for QuestionSet entity data access
 */
@Repository
public interface QuestionSetRepository extends JpaRepository<QuestionSet, Long> {

    /**
     * Find all question sets for a project
     */
    List<QuestionSet> findByProjectIdOrderByCreatedAtDesc(Long projectId);

    /**
     * Find question set with questions loaded
     */
    @Query("SELECT qs FROM QuestionSet qs LEFT JOIN FETCH qs.questions WHERE qs.id = :id")
    Optional<QuestionSet> findByIdWithQuestions(Long id);

    /**
     * Find question sets by project ID with questions
     */
    @Query("SELECT DISTINCT qs FROM QuestionSet qs LEFT JOIN FETCH qs.questions WHERE qs.projectId = :projectId ORDER BY qs.createdAt DESC")
    List<QuestionSet> findByProjectIdWithQuestions(Long projectId);
}
