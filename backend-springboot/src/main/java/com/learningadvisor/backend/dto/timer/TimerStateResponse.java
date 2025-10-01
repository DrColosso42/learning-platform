package com.learningadvisor.backend.dto.timer;

import com.learningadvisor.backend.entity.TimerSession;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for timer state
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimerStateResponse {
    private String currentPhase;        // "work", "rest", "paused", "completed"
    private LocalDateTime phaseStartedAt; // When current phase started
    private Integer cyclesCompleted;    // Number of work+rest cycles completed
    private Integer totalWorkTime;      // Total work time in seconds
    private Integer totalRestTime;      // Total rest time in seconds
    private Integer workDuration;       // Work duration setting in seconds
    private Integer restDuration;       // Rest duration setting in seconds
    private Boolean isInfinite;         // Whether timer runs indefinitely

    /**
     * Create response from TimerSession entity
     */
    public static TimerStateResponse fromEntity(TimerSession timerSession) {
        return TimerStateResponse.builder()
                .currentPhase(timerSession.getCurrentPhase())
                .phaseStartedAt(timerSession.getPhaseStartedAt())
                .cyclesCompleted(timerSession.getCyclesCompleted())
                .totalWorkTime(timerSession.getTotalWorkTime())
                .totalRestTime(timerSession.getTotalRestTime())
                .workDuration(timerSession.getWorkDuration())
                .restDuration(timerSession.getRestDuration())
                .isInfinite(timerSession.getIsInfinite())
                .build();
    }
}
