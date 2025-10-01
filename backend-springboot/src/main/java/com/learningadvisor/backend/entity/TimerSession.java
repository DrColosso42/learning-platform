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
 * TimerSession entity representing a Pomodoro-style timer session
 * Independent from deck studying to preserve progress
 */
@Entity
@Table(name = "timer_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimerSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "deck_session_id", nullable = false)
    private Long deckSessionId; // References StudySession

    @Column(name = "user_id", nullable = false)
    private Long userId; // Denormalized for easier querying

    // Timer configuration
    @Column(name = "work_duration", nullable = false)
    @Builder.Default
    private Integer workDuration = 1500; // Work time in seconds (default 25 minutes)

    @Column(name = "rest_duration", nullable = false)
    @Builder.Default
    private Integer restDuration = 300; // Rest time in seconds (default 5 minutes)

    @Column(name = "is_infinite", nullable = false)
    @Builder.Default
    private Boolean isInfinite = false; // Whether session runs indefinitely

    // Timer tracking
    @Column(name = "total_work_time", nullable = false)
    @Builder.Default
    private Integer totalWorkTime = 0; // Total work time spent in seconds

    @Column(name = "total_rest_time", nullable = false)
    @Builder.Default
    private Integer totalRestTime = 0; // Total rest time spent in seconds

    @Column(name = "cycles_completed", nullable = false)
    @Builder.Default
    private Integer cyclesCompleted = 0; // Number of work+rest cycles completed

    @Column(name = "current_phase", nullable = false)
    @Builder.Default
    private String currentPhase = "work"; // "work", "rest", "paused", "completed"

    @Column(name = "previous_phase")
    private String previousPhase; // Phase before pausing

    @Column(name = "elapsed_time_in_phase")
    @Builder.Default
    private Integer elapsedTimeInPhase = 0; // Elapsed seconds in current phase when paused

    @Column(name = "phase_started_at")
    private LocalDateTime phaseStartedAt; // When current phase started

    // Session lifecycle
    @Column(name = "started_at", nullable = false)
    @Builder.Default
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_session_id", insertable = false, updatable = false)
    private StudySession deckSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @OneToMany(mappedBy = "timerSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TimerEvent> timerEvents = new ArrayList<>();
}
