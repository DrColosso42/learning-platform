package com.learningadvisor.backend.dto.studysession;

import com.learningadvisor.backend.entity.Question;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Question to avoid lazy loading issues
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
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Convert Question entity to DTO
     */
    public static QuestionDTO fromEntity(Question question) {
        return QuestionDTO.builder()
                .id(question.getId())
                .questionSetId(question.getQuestionSetId())
                .questionText(question.getQuestionText())
                .answerText(question.getAnswerText())
                .createdAt(question.getCreatedAt())
                .updatedAt(question.getUpdatedAt())
                .build();
    }
}
