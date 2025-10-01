package com.learningadvisor.backend.dto.questionset;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for individual questions
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionDTO {
    private Long id;
    private Long questionSetId;
    private String questionText;
    private String answerText;
    private Integer difficulty;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
