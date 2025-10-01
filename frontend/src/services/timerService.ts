import { AuthService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
 * Timer statistics interface
 */
export interface TimerStats {
  totalWorkTime: number;
  totalRestTime: number;
  totalTime: number;
  cyclesCompleted: number;
  workPercentage: number;
  currentPhase: string;
  events: TimerEvent[];
}

/**
 * Timer event interface
 */
export interface TimerEvent {
  id: number;
  eventType: string;
  fromPhase?: string;
  toPhase?: string;
  duration?: number;
  timestamp: Date;
}

/**
 * Service for managing study session timers
 */
export class TimerService {

  /**
   * Start or resume timer for a session
   */
  static async startTimer(questionSetId: number, config?: Partial<TimerConfig>): Promise<TimerState> {
    console.log('⏰ TimerService: Starting timer for questionSet', questionSetId, 'with config:', config);

    const authHeader = AuthService.getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/timer/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(config || {}),
    });

    const data = await response.json();
    console.log('✅ TimerService: Start timer response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to start timer');
    }

    const phaseStartedAt = this.parseTimestamp(data.timer.phaseStartedAt);

    // Debug logging to check for timestamp issues
    if (phaseStartedAt) {
      const elapsed = Math.floor((Date.now() - phaseStartedAt.getTime()) / 1000);
      console.log('🕐 Timer phase started at:', phaseStartedAt.toISOString());
      console.log('🕐 Current time:', new Date().toISOString());
      console.log('🕐 Elapsed seconds:', elapsed);
      if (elapsed > 60 || elapsed < 0) {
        console.warn('⚠️ Timer appears to have started', elapsed, 'seconds ago - possible timestamp issue');
      }
    }

    const timerState = {
      ...data.timer,
      phaseStartedAt,
    };

    return timerState;
  }

  /**
   * Parse timestamp from backend (handles LocalDateTime without timezone)
   */
  private static parseTimestamp(timestamp: string | null): Date | null {
    if (!timestamp) return null;

    // If timestamp doesn't end with Z or timezone offset, append Z to treat as UTC
    const isoTimestamp = timestamp.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(timestamp)
      ? timestamp
      : timestamp + 'Z';

    return new Date(isoTimestamp);
  }

  /**
   * Pause timer for a session
   */
  static async pauseTimer(questionSetId: number): Promise<TimerState> {
    console.log('⏸️ TimerService: Pausing timer for questionSet', questionSetId);

    const authHeader = AuthService.getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/timer/pause`, {
      method: 'POST',
      headers: {
        ...authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to pause timer');
    }

    return {
      ...data.timer,
      phaseStartedAt: this.parseTimestamp(data.timer.phaseStartedAt),
    };
  }

  /**
   * Advance to next phase (work -> rest -> work)
   */
  static async advancePhase(questionSetId: number): Promise<TimerState> {
    console.log('➡️ TimerService: Advancing phase for questionSet', questionSetId);

    const authHeader = AuthService.getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/timer/advance`, {
      method: 'POST',
      headers: {
        ...authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to advance phase');
    }

    return {
      ...data.timer,
      phaseStartedAt: this.parseTimestamp(data.timer.phaseStartedAt),
    };
  }

  /**
   * Stop timer and complete session
   */
  static async stopTimer(questionSetId: number): Promise<TimerState> {
    console.log('⏹️ TimerService: Stopping timer for questionSet', questionSetId);

    const authHeader = AuthService.getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/timer/stop`, {
      method: 'POST',
      headers: {
        ...authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to stop timer');
    }

    return {
      ...data.timer,
      phaseStartedAt: this.parseTimestamp(data.timer.phaseStartedAt),
    };
  }

  /**
   * Get current timer state
   * Returns null if no timer session exists yet
   */
  static async getTimerState(questionSetId: number): Promise<TimerState | null> {
    const authHeader = AuthService.getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/timer`, {
      method: 'GET',
      headers: {
        ...authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get timer state');
    }

    // Return null if no timer exists yet
    if (!data.timer) {
      return null;
    }

    return {
      ...data.timer,
      phaseStartedAt: this.parseTimestamp(data.timer.phaseStartedAt),
    };
  }

  /**
   * Get timer statistics for a session
   */
  static async getTimerStats(questionSetId: number): Promise<TimerStats> {
    const authHeader = AuthService.getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/timer/stats`, {
      method: 'GET',
      headers: {
        ...authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to get timer stats');
    }

    return {
      ...data.stats,
      events: data.stats.events.map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      })),
    };
  }

  /**
   * Update timer configuration
   */
  static async updateConfig(questionSetId: number, config: Partial<TimerConfig>): Promise<TimerState> {
    console.log('⚙️ TimerService: Updating config for questionSet', questionSetId, 'with:', config);

    const authHeader = AuthService.getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${questionSetId}/timer/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(config),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update timer config');
    }

    return {
      ...data.timer,
      phaseStartedAt: this.parseTimestamp(data.timer.phaseStartedAt),
    };
  }

  /**
   * Format duration in seconds to human readable format
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Format duration for timer display (MM:SS or HH:MM:SS)
   */
  static formatTimerDisplay(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Get the remaining time in current phase
   */
  static getRemainingTime(timerState: TimerState): number {
    if (!timerState.phaseStartedAt || timerState.currentPhase === 'paused' || timerState.currentPhase === 'completed') {
      return 0;
    }

    const elapsedTime = Math.floor((Date.now() - timerState.phaseStartedAt.getTime()) / 1000);
    const phaseDuration = timerState.currentPhase === 'work' ? timerState.workDuration : timerState.restDuration;

    return Math.max(0, phaseDuration - elapsedTime);
  }

  /**
   * Get the elapsed time in current phase
   * Returns seconds elapsed since phase started
   */
  static getElapsedTime(timerState: TimerState): number {
    if (!timerState.phaseStartedAt || timerState.currentPhase === 'paused' || timerState.currentPhase === 'completed') {
      return 0;
    }

    const elapsed = Math.floor((Date.now() - timerState.phaseStartedAt.getTime()) / 1000);
    // Return only positive elapsed time, bounded by reasonable limits
    return Math.max(0, Math.min(elapsed, 86400)); // Cap at 24 hours to prevent display issues
  }

  /**
   * Check if current phase should advance automatically
   */
  static shouldAdvancePhase(timerState: TimerState): boolean {
    return this.getRemainingTime(timerState) === 0 &&
           timerState.currentPhase !== 'paused' &&
           timerState.currentPhase !== 'completed';
  }
}