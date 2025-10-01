package com.learningadvisor.backend.dto.studysession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for study session information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudySessionResponse {
    private Long id;
    private Long questionSetId;
    private String mode;
    private LocalDateTime startedAt;
    private Boolean isResumed;
}
