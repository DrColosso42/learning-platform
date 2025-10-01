package com.learningadvisor.backend.repository;

import com.learningadvisor.backend.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Question entity data access
 */
@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {

    /**
     * Find all questions for a question set ordered by creation time
     */
    List<Question> findByQuestionSetIdOrderByCreatedAtAsc(Long questionSetId);

    /**
     * Count questions in a question set
     */
    long countByQuestionSetId(Long questionSetId);
}
