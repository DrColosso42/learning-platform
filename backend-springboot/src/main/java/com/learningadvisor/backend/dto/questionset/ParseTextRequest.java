package com.learningadvisor.backend.dto.questionset;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for parsing text into questions
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParseTextRequest {

    @NotBlank(message = "Text is required")
    private String text;

    @NotNull(message = "Format is required")
    @Pattern(regexp = "csv|lines", message = "Format must be 'csv' or 'lines'")
    private String format;
}
