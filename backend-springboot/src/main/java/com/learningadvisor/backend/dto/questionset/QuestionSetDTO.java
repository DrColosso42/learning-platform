package com.learningadvisor.backend.dto.questionset;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for question set with questions
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionSetDTO {
    private Long id;
    private Long projectId;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<QuestionDTO> questions;
    private Integer questionCount;
}
