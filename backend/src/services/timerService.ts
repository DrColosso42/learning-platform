import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Timer configuration interface
 */
export interface TimerConfig {
  workDuration: number;   // in seconds
  restDuration: number;   // in seconds
  isInfinite: boolean;
}

/**
 * Timer state interface
 */
export interface TimerState {
  currentPhase: 'work' | 'rest' | 'paused' | 'completed';
  phaseStartedAt: Date | null;
  cyclesCompleted: number;
  totalWorkTime: number;
  totalRestTime: number;
  workDuration: number;
  restDuration: number;
  isInfinite: boolean;
}

/**
 * Timer event types
 */
export type TimerEventType = 'start' | 'pause' | 'resume' | 'phase_change' | 'cycle_complete' | 'stop';

/**
 * Service for managing study session timers
 */
export class TimerService {

  /**
   * Start or resume a timer for a study session
   */
  async startTimer(sessionId: number, config?: Partial<TimerConfig>): Promise<TimerState> {
    console.log('⏰ TimerService: Starting timer for session', sessionId, 'with config:', config);

    // Get current session
    const session = await prisma.studySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const now = new Date();
    let updatedSession;

    // If session is paused, resume it
    if (session.currentPhase === 'paused') {
      const previousPhase = session.previousPhase || 'work'; // Default to work if no previous phase
      const elapsedTime = session.elapsedTimeInPhase || 0;

      // Calculate adjusted start time to account for elapsed time
      // If we had 10 minutes elapsed in a 25-minute phase, we should start
      // as if the phase began 10 minutes ago
      const adjustedStartTime = new Date(now.getTime() - (elapsedTime * 1000));

      updatedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          currentPhase: previousPhase, // Resume the phase we were in before pausing
          phaseStartedAt: adjustedStartTime, // Adjust start time to account for elapsed time
          previousPhase: null, // Clear previous phase since we're no longer paused
          elapsedTimeInPhase: 0, // Reset elapsed time since we're resuming
        }
      });

      // Log resume event
      await this.logTimerEvent(sessionId, 'resume', 'paused', previousPhase);
    } else {
      // Start new timer or update config
      const updateData: any = {
        currentPhase: 'work',
        phaseStartedAt: now,
      };

      // Apply config if provided
      if (config) {
        if (config.workDuration !== undefined) updateData.workDuration = config.workDuration;
        if (config.restDuration !== undefined) updateData.restDuration = config.restDuration;
        if (config.isInfinite !== undefined) updateData.isInfinite = config.isInfinite;
      }

      updatedSession = await prisma.studySession.update({
        where: { id: sessionId },
        data: updateData
      });

      // Log start event
      await this.logTimerEvent(sessionId, 'start', null, 'work');
    }

    return this.getTimerState(sessionId);
  }

  /**
   * Pause the timer
   */
  async pauseTimer(sessionId: number): Promise<TimerState> {
    console.log('⏸️ TimerService: Pausing timer for session', sessionId);

    const session = await prisma.studySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Calculate time spent in current phase
    const timeSpentInPhase = session.phaseStartedAt
      ? Math.floor((Date.now() - session.phaseStartedAt.getTime()) / 1000)
      : 0;

    // Update total time based on current phase
    const updateData: any = {
      currentPhase: 'paused',
      previousPhase: session.currentPhase, // Store the phase we're pausing from
      elapsedTimeInPhase: timeSpentInPhase, // Store elapsed time in current phase
      phaseStartedAt: null,
    };

    if (session.currentPhase === 'work') {
      updateData.totalWorkTime = session.totalWorkTime + timeSpentInPhase;
    } else if (session.currentPhase === 'rest') {
      updateData.totalRestTime = session.totalRestTime + timeSpentInPhase;
    }

    await prisma.studySession.update({
      where: { id: sessionId },
      data: updateData
    });

    // Log pause event
    await this.logTimerEvent(sessionId, 'pause', session.currentPhase, 'paused', timeSpentInPhase);

    return this.getTimerState(sessionId);
  }

  /**
   * Advance to the next phase (work -> rest -> work)
   */
  async advancePhase(sessionId: number): Promise<TimerState> {
    console.log('➡️ TimerService: Advancing phase for session', sessionId);

    const session = await prisma.studySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const now = new Date();

    // Calculate time spent in current phase
    const timeSpentInPhase = session.phaseStartedAt
      ? Math.floor((now.getTime() - session.phaseStartedAt.getTime()) / 1000)
      : 0;

    let nextPhase: 'work' | 'rest' | 'completed' = 'work';
    let cyclesCompleted = session.cyclesCompleted;

    // Determine next phase
    if (session.currentPhase === 'work') {
      nextPhase = 'rest';
    } else if (session.currentPhase === 'rest') {
      nextPhase = 'work';
      cyclesCompleted = session.cyclesCompleted + 1;

      // Log cycle completion
      await this.logTimerEvent(sessionId, 'cycle_complete', 'rest', 'work');
    }

    // Update session
    const updateData: any = {
      currentPhase: nextPhase,
      phaseStartedAt: now,
      cyclesCompleted,
    };

    // Update total time based on completed phase
    if (session.currentPhase === 'work') {
      updateData.totalWorkTime = session.totalWorkTime + timeSpentInPhase;
    } else if (session.currentPhase === 'rest') {
      updateData.totalRestTime = session.totalRestTime + timeSpentInPhase;
    }

    await prisma.studySession.update({
      where: { id: sessionId },
      data: updateData
    });

    // Log phase change event
    await this.logTimerEvent(sessionId, 'phase_change', session.currentPhase, nextPhase, timeSpentInPhase);

    return this.getTimerState(sessionId);
  }

  /**
   * Stop the timer and complete the session
   */
  async stopTimer(sessionId: number): Promise<TimerState> {
    console.log('⏹️ TimerService: Stopping timer for session', sessionId);

    const session = await prisma.studySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const now = new Date();

    // Calculate time spent in current phase
    const timeSpentInPhase = session.phaseStartedAt
      ? Math.floor((now.getTime() - session.phaseStartedAt.getTime()) / 1000)
      : 0;

    // Update session
    const updateData: any = {
      currentPhase: 'completed',
      phaseStartedAt: null,
      completedAt: now,
    };

    // Update total time based on current phase
    if (session.currentPhase === 'work') {
      updateData.totalWorkTime = session.totalWorkTime + timeSpentInPhase;
    } else if (session.currentPhase === 'rest') {
      updateData.totalRestTime = session.totalRestTime + timeSpentInPhase;
    }

    await prisma.studySession.update({
      where: { id: sessionId },
      data: updateData
    });

    // Log stop event
    await this.logTimerEvent(sessionId, 'stop', session.currentPhase, 'completed', timeSpentInPhase);

    return this.getTimerState(sessionId);
  }

  /**
   * Get current timer state for a session
   */
  async getTimerState(sessionId: number): Promise<TimerState> {
    const session = await prisma.studySession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return {
      currentPhase: session.currentPhase as 'work' | 'rest' | 'paused' | 'completed',
      phaseStartedAt: session.phaseStartedAt,
      cyclesCompleted: session.cyclesCompleted,
      totalWorkTime: session.totalWorkTime,
      totalRestTime: session.totalRestTime,
      workDuration: session.workDuration || 1500, // Default 25 minutes
      restDuration: session.restDuration || 300,  // Default 5 minutes
      isInfinite: session.isInfinite,
    };
  }

  /**
   * Get timer statistics for a session
   */
  async getTimerStats(sessionId: number) {
    const session = await prisma.studySession.findUnique({
      where: { id: sessionId },
      include: {
        timerEvents: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const totalTime = session.totalWorkTime + session.totalRestTime;
    const workPercentage = totalTime > 0 ? (session.totalWorkTime / totalTime) * 100 : 0;

    return {
      totalWorkTime: session.totalWorkTime,
      totalRestTime: session.totalRestTime,
      totalTime,
      cyclesCompleted: session.cyclesCompleted,
      workPercentage: Math.round(workPercentage),
      currentPhase: session.currentPhase,
      events: session.timerEvents,
    };
  }

  /**
   * Update timer configuration for a session
   */
  async updateConfig(sessionId: number, config: Partial<TimerConfig>): Promise<TimerState> {
    console.log('⚙️ TimerService: Updating config for session', sessionId, 'with:', config);

    await prisma.studySession.update({
      where: { id: sessionId },
      data: {
        workDuration: config.workDuration,
        restDuration: config.restDuration,
        isInfinite: config.isInfinite,
      }
    });

    return this.getTimerState(sessionId);
  }

  /**
   * Log a timer event
   */
  private async logTimerEvent(
    sessionId: number,
    eventType: TimerEventType,
    fromPhase?: string | null,
    toPhase?: string | null,
    duration?: number
  ): Promise<void> {
    await prisma.timerEvent.create({
      data: {
        sessionId,
        eventType,
        fromPhase,
        toPhase,
        duration,
      }
    });

    console.log(`📝 TimerEvent logged: ${eventType} (${fromPhase} → ${toPhase}) for session ${sessionId}`);
  }
}