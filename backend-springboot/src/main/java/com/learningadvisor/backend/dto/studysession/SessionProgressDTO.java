package com.learningadvisor.backend.dto.studysession;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for study session progress information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionProgressDTO {
    private Integer totalQuestions;
    private Integer answeredQuestions;
    private Integer masteredQuestions; // Questions with rating 5
    private Integer currentPoints; // Sum of confidence ratings
    private Integer maxPoints; // totalQuestions * 5
}
