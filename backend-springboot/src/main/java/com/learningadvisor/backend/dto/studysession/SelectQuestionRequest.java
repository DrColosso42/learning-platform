package com.learningadvisor.backend.dto.studysession;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for selecting a specific question
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SelectQuestionRequest {
    @NotNull(message = "Question ID is required")
    private Long questionId;
}
