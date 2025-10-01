package com.learningadvisor.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * TimerEvent entity for tracking timer state changes
 * Provides audit trail for timer operations
 */
@Entity
@Table(name = "timer_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimerEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "timer_session_id", nullable = false)
    private Long timerSessionId;

    @Column(name = "event_type", nullable = false)
    private String eventType; // "start", "pause", "resume", "phase_change", "cycle_complete", "stop"

    @Column(name = "from_phase")
    private String fromPhase; // Previous phase

    @Column(name = "to_phase")
    private String toPhase; // New phase

    @Column
    @Builder.Default
    private Integer duration = 0; // Duration of previous phase in seconds

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timer_session_id", insertable = false, updatable = false)
    private TimerSession timerSession;
}
