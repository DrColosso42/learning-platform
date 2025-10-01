package com.learningadvisor.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for time-based activity calendar data
 * Represents daily study time in minutes
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeActivityDataDTO {
    private String date;     // YYYY-MM-DD format
    private int minutes;     // Study time in minutes for that day
    private int level;       // 0-4 activity level for visualization
}
