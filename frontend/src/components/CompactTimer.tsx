import { useState, useEffect, useCallback } from 'react';
import { TimerService, TimerState, TimerConfig } from '../services/timerService';
import { StudySessionService } from '../services/studySessionService';
import { playWorkEndSound, playRestEndSound, initializeAudio } from '../utils/audioUtils';

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
  const [isInfinite, setIsInfinite] = useState(true); // Default to infinite/continuous mode
  const [soundEnabled, setSoundEnabled] = useState(true); // Audio notifications enabled by default
  const [lastAdvanceTime, setLastAdvanceTime] = useState<number>(0); // Prevent rapid advancement

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (timerState && timerState.currentPhase !== 'paused' && timerState.currentPhase !== 'completed') {
        // For infinite mode, show elapsed time instead of remaining time
        const time = isInfinite
          ? TimerService.getElapsedTime(timerState)
          : TimerService.getRemainingTime(timerState);
        setCurrentTime(time);

        // Auto advance when time runs out in Pomodoro mode
        // Only in non-infinite mode and when timer should advance
        if (!isInfinite && TimerService.shouldAdvancePhase(timerState)) {
          const now = Date.now();

          // Prevent rapid advancement (only advance once per 3 seconds)
          // This prevents multiple rapid calls if backend is slow to respond
          if (now - lastAdvanceTime > 3000) {
            console.log('⏰ Auto-advancing phase - time expired');
            setLastAdvanceTime(now);

            // Play sound before advancing
            if (soundEnabled) {
              if (timerState.currentPhase === 'work') {
                playWorkEndSound();
              } else if (timerState.currentPhase === 'rest') {
                playRestEndSound();
              }
            }

            // Small delay to let sound play before advancing
            setTimeout(() => handleAdvancePhase(), 100);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState, isInfinite, lastAdvanceTime, soundEnabled]);

  // Load initial timer state and poll for updates
  useEffect(() => {
    if (!isVisible) return;

    // Load immediately
    loadTimerState();

    // Poll every 2 seconds to detect newly created timers
    const pollInterval = setInterval(() => {
      loadTimerState();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isVisible, questionSetId]);

  const loadTimerState = async () => {
    try {
      const state = await TimerService.getTimerState(questionSetId);

      // If no timer exists yet, auto-start it with default config
      if (!state) {
        console.log('No timer found - auto-starting timer for questionSet', questionSetId);
        await handleStartTimer();
        return;
      }

      setTimerState(state);
      setWorkDuration(state.workDuration);
      setRestDuration(state.restDuration);
      setIsInfinite(state.isInfinite);

      // Calculate appropriate time based on mode
      let time = 0;
      if (state.isInfinite) {
        // In infinite mode, show elapsed time
        time = TimerService.getElapsedTime(state);
      } else {
        // In timed mode, show remaining time
        time = TimerService.getRemainingTime(state);
      }

      setCurrentTime(time);
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  };

  const handleStartTimer = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Initialize audio on first user interaction
      if (soundEnabled) {
        initializeAudio();
      }

      const config: Partial<TimerConfig> = {
        workDuration,
        restDuration,
        isInfinite,
      };

      const state = await TimerService.startTimer(questionSetId, config);
      setTimerState(state);

      // For infinite mode, show elapsed time instead of remaining time
      const time = isInfinite
        ? TimerService.getElapsedTime(state)
        : TimerService.getRemainingTime(state);
      setCurrentTime(time);

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

      // For infinite mode, show elapsed time instead of remaining time
      const time = isInfinite
        ? TimerService.getElapsedTime(state)
        : TimerService.getRemainingTime(state);
      setCurrentTime(time);

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
          {!timerState ? '∞' : TimerService.formatTimerDisplay(currentTime)}
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
          {!timerState ? '∞' : TimerService.formatTimerDisplay(currentTime)}
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
              {timerState?.currentPhase === 'work' ? '→ Rest' : '→ Work'}
            </button>

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

      {/* Timer Settings */}
      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#f8fafc',
        borderRadius: '6px',
        fontSize: '12px',
      }}>
        {/* Timer Mode Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          padding: '6px',
          backgroundColor: isInfinite ? '#f0f9ff' : '#fef7ed',
          borderRadius: '4px',
          border: `1px solid ${isInfinite ? '#e0f2fe' : '#fed7aa'}`,
        }}>
          <span style={{ fontWeight: '600', color: isInfinite ? '#0c4a6e' : '#9a3412' }}>
            {isInfinite ? '🕐 Continuous Mode' : '⏰ Pomodoro Mode'}
          </span>
          <input
            type="checkbox"
            checked={isInfinite}
            onChange={async (e) => {
              const newInfiniteMode = e.target.checked;
              setIsInfinite(newInfiniteMode);

              // If timer is running, update the configuration immediately
              if (timerState) {
                try {
                  const config = {
                    workDuration,
                    restDuration,
                    isInfinite: newInfiniteMode,
                  };
                  const updatedState = await TimerService.updateConfig(questionSetId, config);
                  setTimerState(updatedState);

                  // Reset current time display when switching modes
                  // This prevents showing stale elapsed time values
                  const time = newInfiniteMode
                    ? TimerService.getElapsedTime(updatedState)
                    : TimerService.getRemainingTime(updatedState);
                  setCurrentTime(time);

                  console.log(`Timer mode switched to ${newInfiniteMode ? 'Continuous' : 'Pomodoro'}`);
                } catch (error) {
                  console.error('Failed to update timer mode:', error);
                }
              }
            }}
            style={{ transform: 'scale(0.9)' }}
          />
        </div>

        {/* Mode Description */}
        <div style={{
          fontSize: '10px',
          color: isInfinite ? '#0369a1' : '#9a3412',
          textAlign: 'center',
          marginBottom: '8px',
          lineHeight: '1.3',
        }}>
          {isInfinite
            ? 'Timer runs continuously. Switch phases manually when ready.'
            : 'Traditional intervals with automatic phase switching.'
          }
        </div>

        {/* Interval Settings (only show in Pomodoro mode) */}
        {!isInfinite && (
          <>
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
              marginBottom: '8px'
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
          </>
        )}

        {/* Sound Settings */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#1e40af',
          marginBottom: '6px',
        }}>
          <span>Sound Notifications:</span>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => {
              setSoundEnabled(e.target.checked);
              if (e.target.checked) {
                initializeAudio();
              }
            }}
            style={{ transform: 'scale(0.8)' }}
          />
        </div>

        {/* Current Phase Display */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#1e40af',
          marginBottom: isInfinite ? '0' : '8px',
        }}>
          <span>Current Phase:</span>
          <span style={{
            fontWeight: '600',
            textTransform: 'capitalize',
            color: getPhaseColor(),
          }}>
            {timerState?.currentPhase || 'Ready'}
          </span>
        </div>

        {/* Update Button (only show in Pomodoro mode or when changes need to be applied) */}
        {!isInfinite && (
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
            Update Settings
          </button>
        )}
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