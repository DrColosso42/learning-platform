package com.learningadvisor.backend.dto.questionset;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for updating a question set
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateQuestionSetRequest {

    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;
}
