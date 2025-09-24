import { useState, useEffect, useCallback } from 'react';
import { TimerService, TimerState, TimerConfig } from '../services/timerService';

interface TimerProps {
  questionSetId: number;
  isVisible: boolean;
  onPhaseChange?: (phase: string) => void;
  onCycleComplete?: (cycles: number) => void;
}

/**
 * Timer component for study sessions with work/rest cycles
 * Supports Pomodoro-style timing with configurable durations
 */
export function Timer({ questionSetId, isVisible, onPhaseChange, onCycleComplete }: TimerProps) {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Configuration state
  const [workDuration, setWorkDuration] = useState(25 * 60); // 25 minutes
  const [restDuration, setRestDuration] = useState(5 * 60);  // 5 minutes
  const [isInfinite, setIsInfinite] = useState(false);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (timerState && timerState.currentPhase !== 'paused' && timerState.currentPhase !== 'completed') {
        const remaining = TimerService.getRemainingTime(timerState);
        setCurrentTime(remaining);

        // Auto advance when time runs out
        if (TimerService.shouldAdvancePhase(timerState) && !isInfinite) {
          handleAdvancePhase();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState, isInfinite]);

  // Load initial timer state
  useEffect(() => {
    if (isVisible) {
      loadTimerState();
    }
  }, [isVisible, questionSetId]);

  const loadTimerState = async () => {
    try {
      const state = await TimerService.getTimerState(questionSetId);
      setTimerState(state);
      setWorkDuration(state.workDuration);
      setRestDuration(state.restDuration);
      setIsInfinite(state.isInfinite);

      const remaining = TimerService.getRemainingTime(state);
      setCurrentTime(remaining);
    } catch (error) {
      // Timer might not be started yet, that's okay
      console.log('Timer not started yet for questionSet', questionSetId);
    }
  };

  const handleStartTimer = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const config: Partial<TimerConfig> = {
        workDuration,
        restDuration,
        isInfinite,
      };

      const state = await TimerService.startTimer(questionSetId, config);
      setTimerState(state);

      const remaining = TimerService.getRemainingTime(state);
      setCurrentTime(remaining);

      onPhaseChange?.(state.currentPhase);
    } catch (error) {
      console.error('Failed to start timer:', error);
      alert('Failed to start timer');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseTimer = async () => {
    if (isLoading || !timerState) return;

    try {
      setIsLoading(true);
      const state = await TimerService.pauseTimer(questionSetId);
      setTimerState(state);
    } catch (error) {
      console.error('Failed to pause timer:', error);
      alert('Failed to pause timer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvancePhase = async () => {
    if (isLoading || !timerState) return;

    try {
      setIsLoading(true);
      const state = await TimerService.advancePhase(questionSetId);
      setTimerState(state);

      const remaining = TimerService.getRemainingTime(state);
      setCurrentTime(remaining);

      onPhaseChange?.(state.currentPhase);

      if (state.cyclesCompleted > (timerState.cyclesCompleted || 0)) {
        onCycleComplete?.(state.cyclesCompleted);
      }
    } catch (error) {
      console.error('Failed to advance phase:', error);
      alert('Failed to advance phase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTimer = async () => {
    if (isLoading || !timerState) return;

    try {
      setIsLoading(true);
      const state = await TimerService.stopTimer(questionSetId);
      setTimerState(state);
      setCurrentTime(0);
    } catch (error) {
      console.error('Failed to stop timer:', error);
      alert('Failed to stop timer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const config: Partial<TimerConfig> = {
        workDuration,
        restDuration,
        isInfinite,
      };

      if (timerState) {
        const state = await TimerService.updateConfig(questionSetId, config);
        setTimerState(state);
      }

      setShowConfig(false);
    } catch (error) {
      console.error('Failed to update config:', error);
      alert('Failed to update configuration');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  const getPhaseColor = () => {
    if (!timerState) return '#6b7280'; // gray

    switch (timerState.currentPhase) {
      case 'work': return '#ef4444'; // red
      case 'rest': return '#10b981'; // green
      case 'paused': return '#f59e0b'; // yellow
      case 'completed': return '#6366f1'; // purple
      default: return '#6b7280'; // gray
    }
  };

  const getPhaseIcon = () => {
    if (!timerState) return '⏱️';

    switch (timerState.currentPhase) {
      case 'work': return '🔥';
      case 'rest': return '😌';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      default: return '⏱️';
    }
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: `2px solid ${getPhaseColor()}`,
      padding: '1.5rem',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      marginBottom: '1.5rem',
    }}>
      {/* Timer Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>{getPhaseIcon()}</span>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: getPhaseColor(),
            margin: 0,
            textTransform: 'capitalize',
          }}>
            {timerState?.currentPhase || 'Ready'} Phase
          </h3>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: '#6b7280',
          }}
          title="Timer Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Timer Display */}
      <div style={{
        textAlign: 'center',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: getPhaseColor(),
          fontFamily: 'monospace',
          marginBottom: '0.5rem',
        }}>
          {isInfinite || !timerState ? '∞' : TimerService.formatTimerDisplay(currentTime)}
        </div>

        {timerState && (
          <div style={{
            color: '#6b7280',
            fontSize: '0.875rem',
          }}>
            Cycles completed: {timerState.cyclesCompleted} |
            Work: {TimerService.formatDuration(timerState.totalWorkTime)} |
            Rest: {TimerService.formatDuration(timerState.totalRestTime)}
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1rem',
          border: '1px solid #e2e8f0',
        }}>
          <h4 style={{
            margin: '0 0 1rem 0',
            fontSize: '1rem',
            fontWeight: '600',
            color: '#374151',
          }}>Timer Configuration</h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem',
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.25rem',
              }}>
                Work Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={Math.floor(workDuration / 60)}
                onChange={(e) => setWorkDuration(parseInt(e.target.value) * 60)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.25rem',
              }}>
                Rest Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={Math.floor(restDuration / 60)}
                onChange={(e) => setRestDuration(parseInt(e.target.value) * 60)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}>
            <input
              type="checkbox"
              id="infinite-mode"
              checked={isInfinite}
              onChange={(e) => setIsInfinite(e.target.checked)}
            />
            <label htmlFor="infinite-mode" style={{
              fontSize: '0.875rem',
              color: '#374151',
            }}>
              Infinite mode (no time limits)
            </label>
          </div>

          <button
            onClick={handleUpdateConfig}
            disabled={isLoading}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Updating...' : 'Update Settings'}
          </button>
        </div>
      )}

      {/* Timer Controls */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'center',
      }}>
        {!timerState || timerState.currentPhase === 'completed' ? (
          <button
            onClick={handleStartTimer}
            disabled={isLoading}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Starting...' : 'Start Timer'}
          </button>
        ) : (
          <>
            {timerState.currentPhase === 'paused' ? (
              <button
                onClick={handleStartTimer}
                disabled={isLoading}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? 'Resuming...' : 'Resume'}
              </button>
            ) : (
              <button
                onClick={handlePauseTimer}
                disabled={isLoading}
                style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? 'Pausing...' : 'Pause'}
              </button>
            )}

            {!isInfinite && (
              <button
                onClick={handleAdvancePhase}
                disabled={isLoading}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? 'Advancing...' : 'Next Phase'}
              </button>
            )}

            <button
              onClick={handleStopTimer}
              disabled={isLoading}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Stopping...' : 'Stop'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}