package com.learningadvisor.backend.repository;

import com.learningadvisor.backend.entity.TimerEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for TimerEvent entity data access
 */
@Repository
public interface TimerEventRepository extends JpaRepository<TimerEvent, Long> {

    /**
     * Find all events for a timer session ordered by timestamp (ascending)
     */
    List<TimerEvent> findByTimerSessionIdOrderByTimestampAsc(Long timerSessionId);

    /**
     * Find all events for a timer session ordered by timestamp (descending)
     */
    List<TimerEvent> findByTimerSessionIdOrderByTimestampDesc(Long timerSessionId);

    /**
     * Count events for a timer session
     */
    long countByTimerSessionId(Long timerSessionId);
}
