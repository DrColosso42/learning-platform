package com.learningadvisor.backend.dto.studysession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for question with its selection probability
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionProbabilityDTO {
    private Long id;
    private String questionText;
    private Integer questionNumber;
    private LastAttemptDTO lastAttempt;
    private Double selectionProbability;
    private Double weight;
    private Boolean isSelectable;

    /**
     * DTO for last attempt information
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class LastAttemptDTO {
        private Integer userRating;
    }
}
