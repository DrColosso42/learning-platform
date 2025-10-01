package com.learningadvisor.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for activity calendar data
 * Represents daily learning activity levels
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityDataDTO {
    private String date;  // YYYY-MM-DD format
    private int count;    // Points earned (sum of confidence ratings)
    private int level;    // 0-4 activity level for visualization
}
