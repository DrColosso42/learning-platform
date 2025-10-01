package com.learningadvisor.backend.dto.questionset;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a new question set (deck)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuestionSetRequest {

    @NotBlank(message = "Question set name is required")
    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @NotNull(message = "Project ID is required")
    @Positive(message = "Project ID must be positive")
    private Long projectId;
}
