package com.learningadvisor.backend.dto.studysession;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for getting hypothetical probabilities
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HypotheticalProbabilitiesRequest {
    @NotNull(message = "Question ID is required")
    private Long questionId;

    @NotNull(message = "Hypothetical rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer hypotheticalRating;
}
