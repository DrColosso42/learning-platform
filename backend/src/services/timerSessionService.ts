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
 * Service for managing timer sessions independently from deck studying progress
 * This ensures timer operations never interfere with question progress
 */
export class TimerSessionService {

  /**
   * Get or create active timer session for a deck session
   * This ensures timer operations are separate from deck progress
   */
  private async getOrCreateTimerSession(deckSessionId: number, userId: number, config?: Partial<TimerConfig>): Promise<number> {
    console.log('🔍 TimerSessionService: Getting or creating timer session for deckSessionId', deckSessionId);

    // First, check if there's an active timer session for this deck session
    let timerSession = await prisma.timerSession.findFirst({
      where: {
        deckSessionId,
        completedAt: null, // Only active timer sessions
      },
      select: { id: true }
    });

    // If no active timer session exists, create a new one
    if (!timerSession) {
      console.log('⚡ TimerSessionService: Creating new timer session for deckSessionId', deckSessionId);

      const newTimerSession = await prisma.timerSession.create({
        data: {
          deckSessionId,
          userId,
          workDuration: config?.workDuration || 1500, // Default 25 minutes
          restDuration: config?.restDuration || 300,  // Default 5 minutes
          isInfinite: config?.isInfinite || false,
        },
        select: { id: true }
      });

      timerSession = newTimerSession;
    }

    return timerSession.id;
  }

  /**
   * Start or resume timer for a deck session
   * This creates a new timer session linked to the deck session without affecting deck progress
   */
  async startTimer(deckSessionId: number, userId: number, config?: Partial<TimerConfig>): Promise<TimerState> {
    console.log('⏰ TimerSessionService: Starting timer for deckSessionId', deckSessionId, 'with config:', config);

    const timerSessionId = await this.getOrCreateTimerSession(deckSessionId, userId, config);

    // Get current timer session
    const timerSession = await prisma.timerSession.findUnique({
      where: { id: timerSessionId }
    });

    if (!timerSession) {
      throw new Error('Timer session not found');
    }

    const now = new Date();
    let updatedTimerSession;

    // If timer session is paused, resume it
    if (timerSession.currentPhase === 'paused') {
      const previousPhase = timerSession.previousPhase || 'work';

      // Calculate adjusted start time to account for elapsed time
      const elapsedTime = timerSession.elapsedTimeInPhase || 0;
      const adjustedStartTime = new Date(now.getTime() - (elapsedTime * 1000));

      updatedTimerSession = await prisma.timerSession.update({
        where: { id: timerSessionId },
        data: {
          currentPhase: previousPhase,
          phaseStartedAt: adjustedStartTime,
          previousPhase: null,
          elapsedTimeInPhase: 0,
        }
      });

      // Log resume event
      await this.logTimerEvent(timerSessionId, 'resume', 'paused', previousPhase);
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

      updatedTimerSession = await prisma.timerSession.update({
        where: { id: timerSessionId },
        data: updateData
      });

      // Log start event
      await this.logTimerEvent(timerSessionId, 'start', null, 'work');
    }

    return this.getTimerState(timerSessionId);
  }

  /**
   * Pause the timer session
   */
  async pauseTimer(deckSessionId: number): Promise<TimerState> {
    console.log('⏸️ TimerSessionService: Pausing timer for deckSessionId', deckSessionId);

    const timerSession = await this.getActiveTimerSession(deckSessionId);

    // Calculate time spent in current phase
    const timeSpentInPhase = timerSession.phaseStartedAt
      ? Math.floor((Date.now() - timerSession.phaseStartedAt.getTime()) / 1000)
      : 0;

    // Update timer session
    const updateData: any = {
      currentPhase: 'paused',
      previousPhase: timerSession.currentPhase,
      elapsedTimeInPhase: timeSpentInPhase,
      phaseStartedAt: null,
    };

    // Add to total time based on current phase
    if (timerSession.currentPhase === 'work') {
      updateData.totalWorkTime = timerSession.totalWorkTime + timeSpentInPhase;
    } else if (timerSession.currentPhase === 'rest') {
      updateData.totalRestTime = timerSession.totalRestTime + timeSpentInPhase;
    }

    await prisma.timerSession.update({
      where: { id: timerSession.id },
      data: updateData
    });

    // Log pause event
    await this.logTimerEvent(timerSession.id, 'pause', timerSession.currentPhase, 'paused', timeSpentInPhase);

    return this.getTimerState(timerSession.id);
  }

  /**
   * Advance to the next phase (work -> rest -> work)
   */
  async advancePhase(deckSessionId: number): Promise<TimerState> {
    console.log('➡️ TimerSessionService: Advancing phase for deckSessionId', deckSessionId);

    const timerSession = await this.getActiveTimerSession(deckSessionId);
    const now = new Date();

    // Calculate time spent in current phase
    const timeSpentInPhase = timerSession.phaseStartedAt
      ? Math.floor((now.getTime() - timerSession.phaseStartedAt.getTime()) / 1000)
      : 0;

    let nextPhase: 'work' | 'rest' | 'completed' = 'work';
    let cyclesCompleted = timerSession.cyclesCompleted;

    // Determine next phase
    if (timerSession.currentPhase === 'work') {
      nextPhase = 'rest';
    } else if (timerSession.currentPhase === 'rest') {
      nextPhase = 'work';
      cyclesCompleted = timerSession.cyclesCompleted + 1;

      // Log cycle completion
      await this.logTimerEvent(timerSession.id, 'cycle_complete', 'rest', 'work');
    }

    // Update timer session
    const updateData: any = {
      currentPhase: nextPhase,
      phaseStartedAt: now,
      cyclesCompleted,
    };

    // Update total time based on completed phase
    if (timerSession.currentPhase === 'work') {
      updateData.totalWorkTime = timerSession.totalWorkTime + timeSpentInPhase;
    } else if (timerSession.currentPhase === 'rest') {
      updateData.totalRestTime = timerSession.totalRestTime + timeSpentInPhase;
    }

    await prisma.timerSession.update({
      where: { id: timerSession.id },
      data: updateData
    });

    // Log phase change event
    await this.logTimerEvent(timerSession.id, 'phase_change', timerSession.currentPhase, nextPhase, timeSpentInPhase);

    return this.getTimerState(timerSession.id);
  }

  /**
   * Stop the timer session
   */
  async stopTimer(deckSessionId: number): Promise<TimerState> {
    console.log('⏹️ TimerSessionService: Stopping timer for deckSessionId', deckSessionId);

    const timerSession = await this.getActiveTimerSession(deckSessionId);
    const now = new Date();

    // Calculate time spent in current phase
    const timeSpentInPhase = timerSession.phaseStartedAt
      ? Math.floor((now.getTime() - timerSession.phaseStartedAt.getTime()) / 1000)
      : 0;

    // Update timer session
    const updateData: any = {
      currentPhase: 'completed',
      phaseStartedAt: null,
      completedAt: now,
    };

    // Update total time based on current phase
    if (timerSession.currentPhase === 'work') {
      updateData.totalWorkTime = timerSession.totalWorkTime + timeSpentInPhase;
    } else if (timerSession.currentPhase === 'rest') {
      updateData.totalRestTime = timerSession.totalRestTime + timeSpentInPhase;
    }

    await prisma.timerSession.update({
      where: { id: timerSession.id },
      data: updateData
    });

    // Log stop event
    await this.logTimerEvent(timerSession.id, 'stop', timerSession.currentPhase, 'completed', timeSpentInPhase);

    return this.getTimerState(timerSession.id);
  }

  /**
   * Get current timer state for a deck session
   */
  async getTimerState(timerSessionId: number): Promise<TimerState> {
    const timerSession = await prisma.timerSession.findUnique({
      where: { id: timerSessionId }
    });

    if (!timerSession) {
      throw new Error('Timer session not found');
    }

    return {
      currentPhase: timerSession.currentPhase as 'work' | 'rest' | 'paused' | 'completed',
      phaseStartedAt: timerSession.phaseStartedAt,
      cyclesCompleted: timerSession.cyclesCompleted,
      totalWorkTime: timerSession.totalWorkTime,
      totalRestTime: timerSession.totalRestTime,
      workDuration: timerSession.workDuration,
      restDuration: timerSession.restDuration,
      isInfinite: timerSession.isInfinite,
    };
  }

  /**
   * Get timer state by deck session ID
   */
  async getTimerStateByDeckSession(deckSessionId: number): Promise<TimerState | null> {
    const timerSession = await prisma.timerSession.findFirst({
      where: {
        deckSessionId,
        completedAt: null
      }
    });

    if (!timerSession) {
      return null;
    }

    return this.getTimerState(timerSession.id);
  }

  /**
   * Get timer statistics for a deck session
   */
  async getTimerStats(deckSessionId: number) {
    // Get all timer sessions for this deck session (multiple timer sessions per deck)
    const timerSessions = await prisma.timerSession.findMany({
      where: { deckSessionId },
      include: {
        timerEvents: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (timerSessions.length === 0) {
      throw new Error('No timer sessions found for this deck session');
    }

    // Aggregate stats across all timer sessions for this deck
    const totalWorkTime = timerSessions.reduce((sum, session) => sum + session.totalWorkTime, 0);
    const totalRestTime = timerSessions.reduce((sum, session) => sum + session.totalRestTime, 0);
    const totalTime = totalWorkTime + totalRestTime;
    const cyclesCompleted = timerSessions.reduce((sum, session) => sum + session.cyclesCompleted, 0);
    const workPercentage = totalTime > 0 ? (totalWorkTime / totalTime) * 100 : 0;

    // Get current phase from active timer session
    const activeTimerSession = timerSessions.find(session => !session.completedAt);
    const currentPhase = activeTimerSession?.currentPhase || 'completed';

    // Combine all timer events
    const allEvents = timerSessions.flatMap(session => session.timerEvents);

    return {
      totalWorkTime,
      totalRestTime,
      totalTime,
      cyclesCompleted,
      workPercentage: Math.round(workPercentage),
      currentPhase,
      events: allEvents,
    };
  }

  /**
   * Update timer configuration for active timer session
   */
  async updateConfig(deckSessionId: number, config: Partial<TimerConfig>): Promise<TimerState> {
    console.log('⚙️ TimerSessionService: Updating config for deckSessionId', deckSessionId, 'with:', config);

    const timerSession = await this.getActiveTimerSession(deckSessionId);

    await prisma.timerSession.update({
      where: { id: timerSession.id },
      data: {
        workDuration: config.workDuration,
        restDuration: config.restDuration,
        isInfinite: config.isInfinite,
      }
    });

    return this.getTimerState(timerSession.id);
  }

  /**
   * Get active timer session for a deck session
   */
  private async getActiveTimerSession(deckSessionId: number) {
    const timerSession = await prisma.timerSession.findFirst({
      where: {
        deckSessionId,
        completedAt: null
      }
    });

    if (!timerSession) {
      throw new Error('No active timer session found for this deck session');
    }

    return timerSession;
  }

  /**
   * Log a timer event
   */
  private async logTimerEvent(
    timerSessionId: number,
    eventType: TimerEventType,
    fromPhase?: string | null,
    toPhase?: string | null,
    duration?: number
  ): Promise<void> {
    await prisma.timerEvent.create({
      data: {
        timerSessionId,
        eventType,
        fromPhase,
        toPhase,
        duration,
      }
    });

    console.log(`📝 TimerEvent logged: ${eventType} (${fromPhase} → ${toPhase}) for timerSession ${timerSessionId}`);
  }
}