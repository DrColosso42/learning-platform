package com.learningadvisor.backend.dto.studysession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for getting the next question in a study session
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NextQuestionResponse {
    private QuestionDTO question;
    private Integer questionNumber; // Position in question set (1-based)
    private Integer previousScore; // Previous confidence rating for this question
    private Boolean sessionComplete;
    private SessionProgressDTO progress;
}
