package com.learningadvisor.backend.dto.questionset;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for bulk creating questions
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkCreateQuestionsRequest {

    @NotEmpty(message = "At least one question is required")
    @Valid
    private List<CreateQuestionRequest> questions;

    @NotNull(message = "Question set ID is required")
    @Positive(message = "Question set ID must be positive")
    private Long questionSetId;
}
