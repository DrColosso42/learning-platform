package com.learningadvisor.backend.dto.studysession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for questions with their selection probabilities
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionProbabilitiesResponse {
    private List<QuestionProbabilityDTO> questions;
    private Double totalWeight;
    private Long currentQuestionId;
}
