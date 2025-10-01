package com.learningadvisor.backend.service;

import com.learningadvisor.backend.dto.CreateProjectRequest;
import com.learningadvisor.backend.dto.ProjectDTO;
import com.learningadvisor.backend.dto.UpdateProjectRequest;
import com.learningadvisor.backend.entity.Project;
import com.learningadvisor.backend.entity.SessionAnswer;
import com.learningadvisor.backend.entity.StudySession;
import com.learningadvisor.backend.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service layer for project management operations
 * Handles CRUD operations and statistics calculation
 */
@Service
@RequiredArgsConstructor
public class ProjectService {
    private final ProjectRepository projectRepository;

    /**
     * Create a new project for a user
     */
    @Transactional
    public ProjectDTO createProject(Long userId, CreateProjectRequest request) {
        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setIsPublic(request.getIsPublic() != null ? request.getIsPublic() : false);
        project.setOwnerId(userId);

        Project savedProject = projectRepository.save(project);
        return convertToDTO(savedProject);
    }

    /**
     * Get all projects for a user with statistics
     */
    @Transactional(readOnly = true)
    public List<ProjectDTO> getUserProjects(Long userId) {
        List<Project> projects = projectRepository.findByOwnerIdOrderByCreatedAtDesc(userId);
        return projects.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get a single project by ID with ownership check
     */
    @Transactional(readOnly = true)
    public Optional<ProjectDTO> getProjectById(Long projectId, Long userId) {
        return projectRepository.findByIdAndOwnerId(projectId, userId)
                .map(this::convertToDTO);
    }

    /**
     * Update a project
     */
    @Transactional
    public Optional<ProjectDTO> updateProject(Long projectId, Long userId, UpdateProjectRequest request) {
        Optional<Project> projectOpt = projectRepository.findByIdAndOwnerId(projectId, userId);

        if (projectOpt.isEmpty()) {
            return Optional.empty();
        }

        Project project = projectOpt.get();

        if (request.getName() != null) {
            project.setName(request.getName());
        }
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }
        if (request.getIsPublic() != null) {
            project.setIsPublic(request.getIsPublic());
        }

        Project updatedProject = projectRepository.save(project);
        return Optional.of(convertToDTO(updatedProject));
    }

    /**
     * Delete a project
     */
    @Transactional
    public boolean deleteProject(Long projectId, Long userId) {
        Optional<Project> projectOpt = projectRepository.findByIdAndOwnerId(projectId, userId);

        if (projectOpt.isEmpty()) {
            return false;
        }

        projectRepository.delete(projectOpt.get());
        return true;
    }

    /**
     * Get public projects for discovery
     */
    @Transactional(readOnly = true)
    public List<ProjectDTO> getPublicProjects(int limit) {
        List<Project> projects = projectRepository.findByIsPublicTrueOrderByCreatedAtDesc();
        return projects.stream()
                .limit(limit)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Convert Project entity to DTO with statistics
     */
    private ProjectDTO convertToDTO(Project project) {
        // Calculate statistics
        int totalQuestions = project.getQuestionSets().stream()
                .mapToInt(qs -> qs.getQuestions().size())
                .sum();

        // Get unique answered questions across all sessions
        Set<Long> answeredQuestionIds = new HashSet<>();
        LocalDateTime lastStudied = null;

        for (var questionSet : project.getQuestionSets()) {
            for (StudySession session : questionSet.getStudySessions()) {
                for (SessionAnswer answer : session.getSessionAnswers()) {
                    answeredQuestionIds.add(answer.getQuestionId());
                }

                // Find the most recent study session
                if (session.getCompletedAt() != null) {
                    if (lastStudied == null || session.getCompletedAt().isAfter(lastStudied)) {
                        lastStudied = session.getCompletedAt();
                    }
                }
            }
        }

        int questionsAnswered = answeredQuestionIds.size();
        double completionRatio = totalQuestions > 0 ? (double) questionsAnswered / totalQuestions : 0.0;

        return ProjectDTO.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .isPublic(project.getIsPublic())
                .ownerId(project.getOwnerId())
                .totalQuestions(totalQuestions)
                .questionsAnswered(questionsAnswered)
                .completionRatio(completionRatio)
                .lastStudied(lastStudied)
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
