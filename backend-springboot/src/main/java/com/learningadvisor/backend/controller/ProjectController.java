package com.learningadvisor.backend.controller;

import com.learningadvisor.backend.dto.ApiResponse;
import com.learningadvisor.backend.dto.CreateProjectRequest;
import com.learningadvisor.backend.dto.ProjectDTO;
import com.learningadvisor.backend.dto.UpdateProjectRequest;
import com.learningadvisor.backend.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * REST controller for project management endpoints
 * Handles CRUD operations for user projects
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {
    private final ProjectService projectService;

    /**
     * Get all projects for the authenticated user
     * GET /api/projects
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getUserProjects(Authentication authentication) {
        Long userId = extractUserId(authentication);
        List<ProjectDTO> projects = projectService.getUserProjects(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("projects", projects);
        response.put("total", projects.size());

        return ResponseEntity.ok(response);
    }

    /**
     * Get a single project by ID
     * GET /api/projects/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getProject(@PathVariable Long id, Authentication authentication) {
        Long userId = extractUserId(authentication);
        Optional<ProjectDTO> project = projectService.getProjectById(id, userId);

        if (project.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Project not found"));
        }

        return ResponseEntity.ok(Map.of("project", project.get()));
    }

    /**
     * Create a new project
     * POST /api/projects
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        ProjectDTO project = projectService.createProject(userId, request);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Project created successfully");
        response.put("project", project);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Update a project
     * PUT /api/projects/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateProject(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProjectRequest request,
            Authentication authentication) {
        Long userId = extractUserId(authentication);
        Optional<ProjectDTO> updatedProject = projectService.updateProject(id, userId, request);

        if (updatedProject.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Project not found"));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Project updated successfully");
        response.put("project", updatedProject.get());

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a project
     * DELETE /api/projects/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable Long id, Authentication authentication) {
        Long userId = extractUserId(authentication);
        boolean deleted = projectService.deleteProject(id, userId);

        if (!deleted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Project not found"));
        }

        return ResponseEntity.ok(Map.of("message", "Project deleted successfully"));
    }

    /**
     * Get public projects for discovery
     * GET /api/projects/public
     */
    @GetMapping("/public")
    public ResponseEntity<Map<String, Object>> getPublicProjects(
            @RequestParam(defaultValue = "20") int limit) {
        List<ProjectDTO> projects = projectService.getPublicProjects(limit);

        Map<String, Object> response = new HashMap<>();
        response.put("projects", projects);
        response.put("total", projects.size());

        return ResponseEntity.ok(response);
    }

    /**
     * Extract user ID from authentication
     */
    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }
}
