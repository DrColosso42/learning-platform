package com.learningadvisor.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for time-based statistics
 * Contains study time metrics over different periods
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeStatisticsDTO {
    private int totalStudyTimeMinutes;
    private int totalStudyTimeThisWeek;
    private int totalStudyTimeThisMonth;
    private int averageDailyStudyTime;
    private int longestStudyStreak;
}
