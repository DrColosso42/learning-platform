package com.learningadvisor.backend.dto.timer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for timer configuration
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimerConfigRequest {
    private Integer workDuration;   // Work duration in seconds
    private Integer restDuration;   // Rest duration in seconds
    private Boolean isInfinite;     // Whether timer runs indefinitely
}
