package com.learningadvisor.backend.dto.studysession;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for submitting an answer with confidence rating
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubmitAnswerRequest {

    @NotNull(message = "Question ID is required")
    private Long questionId;

    @NotNull(message = "Confidence rating is required")
    @Min(value = 1, message = "Confidence rating must be between 1 and 5")
    @Max(value = 5, message = "Confidence rating must be between 1 and 5")
    private Integer confidenceRating;
}
