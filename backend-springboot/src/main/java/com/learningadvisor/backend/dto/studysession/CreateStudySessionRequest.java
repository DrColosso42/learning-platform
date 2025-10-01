package com.learningadvisor.backend.dto.studysession;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating or starting a study session
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateStudySessionRequest {

    @NotNull(message = "Question set ID is required")
    private Long questionSetId;

    @NotNull(message = "Mode is required")
    private String mode; // "front-to-end" or "shuffle"
}
