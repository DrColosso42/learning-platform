package com.learningadvisor.backend.dto.questionset;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for creating a single question
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuestionRequest {

    @NotBlank(message = "Question text is required")
    @Size(min = 1, max = 1000, message = "Question text must be between 1 and 1000 characters")
    private String questionText;

    @Size(max = 1000, message = "Answer text must not exceed 1000 characters")
    private String answerText;

    @Min(value = 1, message = "Difficulty must be at least 1")
    @Max(value = 5, message = "Difficulty must not exceed 5")
    private Integer difficulty = 1;
}
