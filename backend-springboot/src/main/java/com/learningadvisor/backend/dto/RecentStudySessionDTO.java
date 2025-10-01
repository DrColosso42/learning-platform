package com.learningadvisor.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for recent study session information
 * Used in dashboard to show recent learning activity
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentStudySessionDTO {
    private Long id;
    private Long questionSetId;
    private String projectName;
    private String questionSetName;
    private int questionsAnswered;
    private int totalQuestions;
    private double averageRating;
    private String completedAt;  // ISO 8601 format
}
