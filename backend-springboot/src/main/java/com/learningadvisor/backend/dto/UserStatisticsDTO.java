package com.learningadvisor.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for user statistics overview
 * Contains comprehensive metrics about user's learning progress
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatisticsDTO {
    private int totalSessions;
    private int totalQuestions;  // Sum of confidence ratings (points earned)
    private double averageRating;
    private int currentStreak;
    private int longestStreak;
    private int totalStudyTime;  // in minutes
    private int projectsCompleted;
    private int totalProjects;
}
