package com.learningadvisor.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Data Transfer Object for Project with statistics
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDTO {
    private Long id;
    private String name;
    private String description;
    private Boolean isPublic;
    private Long ownerId;
    private Integer totalQuestions;
    private Integer questionsAnswered;
    private Double completionRatio;
    private LocalDateTime lastStudied;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
