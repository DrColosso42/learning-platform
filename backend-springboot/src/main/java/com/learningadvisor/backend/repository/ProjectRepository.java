package com.learningadvisor.backend.repository;

import com.learningadvisor.backend.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Project entity data access
 */
@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    /**
     * Find all projects owned by a user
     */
    List<Project> findByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    /**
     * Find all projects owned by a user with question sets loaded
     */
    @Query("SELECT DISTINCT p FROM Project p LEFT JOIN FETCH p.questionSets WHERE p.ownerId = :ownerId")
    List<Project> findByOwnerId(Long ownerId);

    /**
     * Find all public projects
     */
    List<Project> findByIsPublicTrueOrderByCreatedAtDesc();

    /**
     * Find project by ID and owner
     */
    Optional<Project> findByIdAndOwnerId(Long id, Long ownerId);
}
