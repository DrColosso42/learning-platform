import { useState, useEffect, useCallback } from 'react';
import { TimerService, TimerState, TimerConfig } from '../services/timerService';
import { StudySessionService } from '../services/studySessionService';

interface CompactTimerProps {
  questionSetId: number;
  isVisible: boolean;
  onPhaseChange?: (phase: string) => void;
  onCycleComplete?: (cycles: number) => void;
  onSessionReset?: () => void;
}

/**
 * Compact timer component that doesn't distract from study content
 * Features minimal design with essential controls only
 */
export function CompactTimer({ questionSetId, isVisible, onPhaseChange, onCycleComplete, onSessionReset }: CompactTimerProps) {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
    } catch (error) {
      console.error('Failed to update config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      await StudySessionService.resetSession(questionSetId, 'front-to-end');

      // Clear timer state
      setTimerState(null);
      setCurrentTime(0);

      // Close modals
      setShowResetConfirm(false);
      setIsExpanded(false);

      // Notify parent component
      onSessionReset?.();

      console.log('Session reset successfully');
    } catch (error) {
      console.error('Failed to reset session:', error);
      alert('Failed to reset session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  const getPhaseColor = () => {
    if (!timerState) return '#9ca3af';
    switch (timerState.currentPhase) {
      case 'work': return '#ef4444';
      case 'rest': return '#10b981';
      case 'paused': return '#f59e0b';
      case 'completed': return '#6366f1';
      default: return '#9ca3af';
    }
  };

  const getPhaseIcon = () => {
    if (!timerState) return '⏱️';
    switch (timerState.currentPhase) {
      case 'work': return '🔥';
      case 'rest': return '🌿';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      default: return '⏱️';
    }
  };

  // Compact view (default)
  if (!isExpanded) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'white',
        borderRadius: '20px',
        border: `2px solid ${getPhaseColor()}`,
        padding: '8px 16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 1000,
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={() => setIsExpanded(true)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      >
        <span style={{ fontSize: '16px' }}>{getPhaseIcon()}</span>
        <span style={{
          fontFamily: 'monospace',
          fontWeight: '600',
          color: getPhaseColor(),
          minWidth: '45px',
        }}>
          {isInfinite || !timerState ? '∞' : TimerService.formatTimerDisplay(currentTime)}
        </span>
        {timerState && (
          <span style={{
            fontSize: '12px',
            color: '#6b7280',
            textTransform: 'capitalize',
          }}>
            {timerState.currentPhase}
          </span>
        )}
      </div>
    );
  }

  // Expanded view
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: 'white',
      borderRadius: '16px',
      border: `2px solid ${getPhaseColor()}`,
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      minWidth: '280px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '18px' }}>{getPhaseIcon()}</span>
          <span style={{
            fontSize: '16px',
            fontWeight: '600',
            color: getPhaseColor(),
            textTransform: 'capitalize',
          }}>
            {timerState?.currentPhase || 'Ready'}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Timer Display */}
      <div style={{
        textAlign: 'center',
        marginBottom: '12px',
      }}>
        <div style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: getPhaseColor(),
          fontFamily: 'monospace',
        }}>
          {isInfinite || !timerState ? '∞' : TimerService.formatTimerDisplay(currentTime)}
        </div>
        {timerState && (
          <div style={{
            color: '#6b7280',
            fontSize: '12px',
          }}>
            Cycles: {timerState.cyclesCompleted}
          </div>
        )}
      </div>

      {/* Quick Controls */}
      <div style={{
        display: 'flex',
        gap: '6px',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {!timerState || timerState.currentPhase === 'completed' ? (
          <button
            onClick={handleStartTimer}
            disabled={isLoading}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            Start
          </button>
        ) : (
          <>
            <button
              onClick={timerState.currentPhase === 'paused' ? handleStartTimer : handlePauseTimer}
              disabled={isLoading}
              style={{
                backgroundColor: timerState.currentPhase === 'paused' ? '#10b981' : '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {timerState.currentPhase === 'paused' ? 'Resume' : 'Pause'}
            </button>

            {!isInfinite && (
              <button
                onClick={handleAdvancePhase}
                disabled={isLoading}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                Next
              </button>
            )}

            <button
              onClick={handleStopTimer}
              disabled={isLoading}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              Stop
            </button>
          </>
        )}
      </div>

      {/* Quick Settings */}
      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#f8fafc',
        borderRadius: '6px',
        fontSize: '12px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}>
          <span>Work:</span>
          <input
            type="number"
            min="1"
            max="120"
            value={Math.floor(workDuration / 60)}
            onChange={(e) => setWorkDuration(parseInt(e.target.value) * 60)}
            style={{
              width: '50px',
              padding: '2px 4px',
              border: '1px solid #d1d5db',
              borderRadius: '3px',
              fontSize: '11px',
            }}
          />
          <span>min</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}>
          <span>Rest:</span>
          <input
            type="number"
            min="1"
            max="60"
            value={Math.floor(restDuration / 60)}
            onChange={(e) => setRestDuration(parseInt(e.target.value) * 60)}
            style={{
              width: '50px',
              padding: '2px 4px',
              border: '1px solid #d1d5db',
              borderRadius: '3px',
              fontSize: '11px',
            }}
          />
          <span>min</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span>Infinite:</span>
          <input
            type="checkbox"
            checked={isInfinite}
            onChange={(e) => setIsInfinite(e.target.checked)}
            style={{ transform: 'scale(0.8)' }}
          />
        </div>
        <button
          onClick={handleUpdateConfig}
          disabled={isLoading}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1,
            width: '100%',
          }}
        >
          Update
        </button>
      </div>

      {/* Reset Session Section */}
      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#fef2f2',
        borderRadius: '6px',
        border: '1px solid #fecaca',
      }}>
        {!showResetConfirm ? (
          <>
            <div style={{
              fontSize: '11px',
              color: '#991b1b',
              marginBottom: '6px',
              fontWeight: '500',
            }}>
              Reset Session
            </div>
            <div style={{
              fontSize: '10px',
              color: '#7f1d1d',
              marginBottom: '8px',
            }}>
              This will delete all progress and timer data permanently.
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Reset Session
            </button>
          </>
        ) : (
          <>
            <div style={{
              fontSize: '11px',
              color: '#991b1b',
              marginBottom: '8px',
              fontWeight: '600',
            }}>
              Are you sure?
            </div>
            <div style={{
              display: 'flex',
              gap: '4px',
            }}>
              <button
                onClick={handleResetSession}
                disabled={isLoading}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '10px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  flex: 1,
                }}
              >
                {isLoading ? 'Resetting...' : 'Yes, Reset'}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isLoading}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}