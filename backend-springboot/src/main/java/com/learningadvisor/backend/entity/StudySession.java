package com.learningadvisor.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * StudySession entity representing a user's study session for a question set
 * Tracks progress through questions with weighted selection algorithm
 */
@Entity
@Table(name = "study_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "question_set_id", nullable = false)
    private Long questionSetId;

    @Column(nullable = false)
    @Builder.Default
    private String mode = "front-to-end"; // "front-to-end" or "shuffle"

    @Column(name = "started_at", nullable = false)
    @Builder.Default
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_set_id", insertable = false, updatable = false)
    private QuestionSet questionSet;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SessionAnswer> sessionAnswers = new ArrayList<>();

    @OneToMany(mappedBy = "deckSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TimerSession> timerSessions = new ArrayList<>();
}
