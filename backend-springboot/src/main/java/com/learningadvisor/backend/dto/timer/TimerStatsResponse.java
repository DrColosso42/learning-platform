package com.learningadvisor.backend.dto.timer;

import com.learningadvisor.backend.entity.TimerEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for timer statistics
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimerStatsResponse {
    private Integer totalWorkTime;      // Total work time in seconds
    private Integer totalRestTime;      // Total rest time in seconds
    private Integer totalTime;          // Total time (work + rest) in seconds
    private Integer cyclesCompleted;    // Number of work+rest cycles completed
    private Integer workPercentage;     // Percentage of time spent working
    private String currentPhase;        // Current timer phase
    private List<TimerEvent> events;    // Timer event history
}
