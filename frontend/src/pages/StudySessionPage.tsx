import { useState, useEffect } from 'react'
import {
  StudySessionService,
  Question,
  SessionProgress,
  NextQuestionResponse
} from '../services/studySessionService'
import { AuthService } from '../services/authService'
import { TimerService } from '../services/timerService'
import { CompactTimer } from '../components/CompactTimer'
import { QuestionSidebar } from '../components/QuestionSidebar'

interface StudySessionPageProps {
  questionSetId: number
  questionSetName: string
  onBack: () => void
}

/**
 * Study session page with weighted question selection
 * Supports front-to-end and shuffle modes with confidence-based learning
 */
function StudySessionPage({ questionSetId, questionSetName, onBack }: StudySessionPageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [questionNumber, setQuestionNumber] = useState<number | null>(null)
  const [previousScore, setPreviousScore] = useState<number | null>(null)
  const [progress, setProgress] = useState<SessionProgress | null>(null)
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [selectedMode, setSelectedMode] = useState<'front-to-end' | 'shuffle'>('front-to-end')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true) // Default open on desktop
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0)
  const [hypotheticalRating, setHypotheticalRating] = useState<number | null>(null)
  const [hasTimerStarted, setHasTimerStarted] = useState(false)

  useEffect(() => {
    checkSessionStatus()
  }, [questionSetId])

  const checkSessionStatus = async () => {
    try {
      setIsLoading(true)

      // Check if user is authenticated (consistent with DashboardPage)
      const user = AuthService.getUser()
      if (!user || !AuthService.isAuthenticated()) {
        console.error('User is not authenticated')
        alert('You need to log in to start a study session')
        onBack()
        return
      }

      const status = await StudySessionService.getSessionStatus(questionSetId)
      setHasActiveSession(status.hasActiveSession)
      setProgress(status.progress)
      setSessionComplete(status.sessionComplete)

      if (status.hasActiveSession && !status.sessionComplete) {
        await loadNextQuestion()

        // Check if timer is already running from previous session
        try {
          await TimerService.getTimerState(questionSetId)
          setHasTimerStarted(true)
          console.log('Existing timer found on session resume')
        } catch (error) {
          setHasTimerStarted(false)
          console.log('No timer found - will start on first answer submission')
        }
      }
    } catch (error) {
      console.error('Failed to check session status:', error)
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        alert('Your session has expired. Please log in again.')
        AuthService.logout()
        window.location.reload()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const startNewSession = async () => {
    try {
      setIsLoading(true)

      const user = AuthService.getUser()
      if (!user || !AuthService.isAuthenticated()) {
        alert('You need to log in to start a study session')
        onBack()
        return
      }

      await StudySessionService.startSession({
        questionSetId,
        mode: selectedMode,
      })

      setHasActiveSession(true)
      setSessionComplete(false)
      await loadNextQuestion()

      // Start timer automatically when session begins
      try {
        await TimerService.startTimer(questionSetId, {
          workDuration: 25 * 60, // 25 minutes default
          restDuration: 5 * 60,  // 5 minutes default
          isInfinite: true       // Start in infinite mode
        })
        setHasTimerStarted(true)
        console.log('Timer started automatically with new session')
      } catch (timerError) {
        console.log('Timer auto-start failed (timer may already exist):', timerError)
        // Not critical - user can start timer manually
      }
    } catch (error) {
      console.error('Failed to start session:', error)
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        alert('Your session has expired. Please log in again.')
        AuthService.logout()
        window.location.reload()
      } else {
        alert('Failed to start study session. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadNextQuestion = async () => {
    try {
      const response: NextQuestionResponse = await StudySessionService.getNextQuestion(questionSetId)
      setCurrentQuestion(response.question)
      setQuestionNumber(response.questionNumber)
      setPreviousScore(response.previousScore)
      setProgress(response.progress)
      setSessionComplete(response.sessionComplete)
      setShowAnswer(false)
      setSelectedRating(null)
      setHypotheticalRating(null)
    } catch (error) {
      console.error('Failed to load next question:', error)
      alert('Failed to load next question. Please try again.')
    }
  }

  const submitAnswer = async () => {
    if (!currentQuestion || selectedRating === null) {
      alert('Please select a confidence rating')
      return
    }

    try {
      setIsSubmitting(true)

      await StudySessionService.submitAnswer(questionSetId, {
        questionId: currentQuestion.id,
        confidenceRating: selectedRating,
      })

      // Load next question
      await loadNextQuestion()

      // Refresh sidebar probabilities after submitting an answer
      setSidebarRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Failed to submit answer:', error)
      alert('Failed to submit answer. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const completeSession = async () => {
    try {
      await StudySessionService.completeSession(questionSetId)
      setHasActiveSession(false)
      setCurrentQuestion(null)
    } catch (error) {
      console.error('Failed to complete session:', error)
    }
  }

  const handleQuestionSelect = async (questionId: number) => {
    try {
      setIsLoading(true)
      const response = await StudySessionService.selectQuestion(questionSetId, questionId)

      setCurrentQuestion(response.question)
      setQuestionNumber(response.questionNumber)
      setPreviousScore(response.previousScore)
      setProgress(response.progress)
      setSessionComplete(response.sessionComplete)
      setSelectedRating(null)
      setShowAnswer(false)
      setHypotheticalRating(null)

      // Refresh sidebar to update current question highlighting
      setSidebarRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Failed to select question:', error)
      if (error instanceof Error) {
        alert(`Failed to select question: ${error.message}`)
      } else {
        alert('Failed to select question. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRatingSelect = (rating: number | null) => {
    if (!currentQuestion || !hasActiveSession) return

    setHypotheticalRating(rating)
  }

  const restartSession = async () => {
    try {
      setIsLoading(true)
      await StudySessionService.restartSession(questionSetId, selectedMode)
      setHasActiveSession(true)
      setSessionComplete(false)
      await loadNextQuestion()

      // Start timer automatically when session restarts
      try {
        await TimerService.startTimer(questionSetId, {
          workDuration: 25 * 60, // 25 minutes default
          restDuration: 5 * 60,  // 5 minutes default
          isInfinite: true       // Start in infinite mode
        })
        setHasTimerStarted(true)
        console.log('Timer started automatically with session restart')
      } catch (timerError) {
        console.log('Timer auto-start failed (timer may already exist):', timerError)
        // Not critical - user can start timer manually
      }
    } catch (error) {
      console.error('Failed to restart session:', error)
      alert('Failed to restart session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getProgressPercentage = () => {
    if (!progress) return 0
    return progress.maxPoints > 0 ? (progress.currentPoints / progress.maxPoints) * 100 : 0
  }

  const getConfidenceColor = (rating: number): string => {
    const colors = {
      1: '#ef4444', // red
      2: '#f97316', // orange
      3: '#eab308', // yellow
      4: '#22c55e', // green
      5: '#06b6d4', // cyan
    }
    return colors[rating as keyof typeof colors] || '#6b7280'
  }

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        Loading study session...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 0' }}>
      {/* Question Sidebar */}
      <QuestionSidebar
        questionSetId={questionSetId}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onQuestionSelect={handleQuestionSelect}
        currentQuestionId={currentQuestion?.id || null}
        refreshTrigger={sidebarRefreshTrigger}
        hypotheticalQuestionId={currentQuestion?.id || null}
        hypotheticalRating={hypotheticalRating}
      />

      <div className="container">
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer'
            }}
          >
            ←
          </button>
          <div>
            <h1 style={{
              fontSize: '1.875rem',
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '0.25rem'
            }}>
              🚀 Study Session
            </h1>
            <p style={{ color: '#6b7280' }}>
              {questionSetName}
            </p>
          </div>
        </div>

        {/* Compact Timer Component - Fixed Position */}
        <CompactTimer
          questionSetId={questionSetId}
          isVisible={hasActiveSession && !sessionComplete}
          onPhaseChange={(phase) => {
            console.log('Timer phase changed to:', phase);
          }}
          onCycleComplete={(cycles) => {
            console.log('Completed cycles:', cycles);
          }}
          onSessionReset={() => {
            // Refresh the session data after reset
            checkSessionStatus();
            setCurrentQuestion(null);
            setSessionComplete(false);
            setHasTimerStarted(false);
            console.log('Session reset - refreshing data');
          }}
        />

        {/* Progress Bar */}
        {progress && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Progress
              </h3>
              <span style={{
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                {progress.currentPoints}/{progress.maxPoints} points
              </span>
            </div>

            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${getProgressPercentage()}%`,
                height: '100%',
                backgroundColor: '#10b981',
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: '#6b7280'
            }}>
              <span>Answered: {progress.answeredQuestions}/{progress.totalQuestions}</span>
              <span>Mastered: {progress.masteredQuestions}</span>
              <span>{Math.round(getProgressPercentage())}% Complete</span>
            </div>
          </div>
        )}

        {/* Session Start/Complete State */}
        {(!hasActiveSession || sessionComplete) && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            {sessionComplete ? (
              <>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                  Session Complete!
                </h2>
                <p style={{
                  color: '#6b7280',
                  marginBottom: '2rem'
                }}>
                  You've mastered all questions in this set. Great job!
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => setSelectedMode('front-to-end')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: selectedMode === 'front-to-end' ? '#2563eb' : '#f3f4f6',
                      color: selectedMode === 'front-to-end' ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    Front to End
                  </button>
                  <button
                    onClick={() => setSelectedMode('shuffle')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: selectedMode === 'shuffle' ? '#2563eb' : '#f3f4f6',
                      color: selectedMode === 'shuffle' ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    Shuffle
                  </button>
                </div>

                <button
                  onClick={restartSession}
                  disabled={isLoading}
                  className="btn btn-primary"
                  style={{ marginTop: '1rem' }}
                >
                  {isLoading ? 'Starting...' : 'Restart Session'}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem'
                }}>
                  Ready to Study?
                </h2>
                <p style={{
                  color: '#6b7280',
                  marginBottom: '2rem'
                }}>
                  Choose your study mode and begin learning
                </p>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'center',
                  marginBottom: '2rem'
                }}>
                  <button
                    onClick={() => setSelectedMode('front-to-end')}
                    style={{
                      padding: '1rem 1.5rem',
                      backgroundColor: selectedMode === 'front-to-end' ? '#2563eb' : '#f3f4f6',
                      color: selectedMode === 'front-to-end' ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    📋 Front to End
                    <div style={{
                      fontSize: '0.75rem',
                      marginTop: '0.25rem',
                      opacity: 0.8
                    }}>
                      Sequential with focus on weak areas
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedMode('shuffle')}
                    style={{
                      padding: '1rem 1.5rem',
                      backgroundColor: selectedMode === 'shuffle' ? '#2563eb' : '#f3f4f6',
                      color: selectedMode === 'shuffle' ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    🎲 Shuffle
                    <div style={{
                      fontSize: '0.75rem',
                      marginTop: '0.25rem',
                      opacity: 0.8
                    }}>
                      Random with intelligent selection
                    </div>
                  </button>
                </div>

                <button
                  onClick={startNewSession}
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? 'Starting...' : 'Start Study Session'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Active Question */}
        {hasActiveSession && !sessionComplete && currentQuestion && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Question Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}>
                  {questionNumber}
                </div>
                <div>
                  <div style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Question {questionNumber}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    Question {questionNumber} of {progress?.totalQuestions}
                  </div>
                </div>
              </div>

              {previousScore && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db'
                }}>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    fontWeight: '500'
                  }}>
                    Previous Score:
                  </div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2.25rem',
                    height: '2.25rem',
                    borderRadius: '50%',
                    backgroundColor: getConfidenceColor(previousScore),
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    {previousScore}
                  </div>
                </div>
              )}

              {!previousScore && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fef3c7',
                  borderRadius: '0.5rem',
                  border: '1px solid #fcd34d'
                }}>
                  <div style={{
                    fontSize: '1rem'
                  }}>
                    ⭐
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#92400e',
                    fontWeight: '500'
                  }}>
                    New Question
                  </div>
                </div>
              )}
            </div>

            {/* Question */}
            <div style={{
              fontSize: '1.25rem',
              fontWeight: '500',
              color: '#1f2937',
              marginBottom: '2rem',
              lineHeight: '1.6'
            }}>
              {currentQuestion.questionText}
            </div>

            {/* Show Answer Button */}
            {!showAnswer && (
              <button
                onClick={() => setShowAnswer(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  marginBottom: '2rem'
                }}
              >
                Show Answer
              </button>
            )}

            {/* Answer */}
            {showAnswer && (
              <>
                {currentQuestion.answerText && (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    marginBottom: '2rem'
                  }}>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.75rem'
                    }}>
                      Answer:
                    </h4>
                    <div style={{
                      color: '#1f2937',
                      lineHeight: '1.6'
                    }}>
                      {currentQuestion.answerText}
                    </div>
                  </div>
                )}

                {/* Confidence Rating */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    How confident are you with this question?
                  </h4>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginBottom: '1rem',
                    textAlign: 'center'
                  }}>
                    Rate your confidence to earn points (1-5 points)
                  </p>

                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'center'
                  }}>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => {
                          setSelectedRating(rating)
                          handleRatingSelect(rating)
                        }}
                        style={{
                          width: '4rem',
                          height: '4rem',
                          borderRadius: '50%',
                          border: selectedRating === rating ? '3px solid #1f2937' : '2px solid #e5e7eb',
                          backgroundColor: getConfidenceColor(rating),
                          color: 'white',
                          fontSize: '1.25rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: selectedRating === rating ? 1 : 0.7,
                          transform: selectedRating === rating ? 'scale(1.1)' : 'scale(1)'
                        }}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    <span>Not confident (1 pt)</span>
                    <span>Very confident (5 pts)</span>
                  </div>
                </div>

                {/* Submit Button */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    onClick={submitAnswer}
                    disabled={selectedRating === null || isSubmitting}
                    className="btn btn-primary"
                  >
                    {isSubmitting ? 'Submitting...' : 'Next Question'}
                  </button>

                  <button
                    onClick={completeSession}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    End Session
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default StudySessionPage