import { useState, useEffect } from 'react'
import { StudySessionService, QuestionWithProbability, QuestionsWithProbabilitiesResponse } from '../services/studySessionService'

interface QuestionSidebarProps {
  questionSetId: number
  isOpen: boolean
  onToggle: () => void
  onQuestionSelect?: (questionId: number) => void
  currentQuestionId?: number | null
  refreshTrigger?: number // Used to trigger refresh when questions are answered
}

/**
 * Collapsible sidebar showing all questions with selection probabilities
 * Features: Color-coded rating circles, probability-based border colors, question selection
 */
export function QuestionSidebar({
  questionSetId,
  isOpen,
  onToggle,
  onQuestionSelect,
  currentQuestionId,
  refreshTrigger = 0
}: QuestionSidebarProps) {
  const [questionsData, setQuestionsData] = useState<QuestionsWithProbabilitiesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showLegend, setShowLegend] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadQuestionsWithProbabilities()
    }
  }, [questionSetId, isOpen, refreshTrigger])

  const loadQuestionsWithProbabilities = async () => {
    try {
      setIsLoading(true)
      const data = await StudySessionService.getQuestionsWithProbabilities(questionSetId)
      setQuestionsData(data)
    } catch (error) {
      console.error('Failed to load questions with probabilities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Color functions
  const getRatingColor = (rating: number | null): string => {
    if (!rating) return '#6b7280' // gray for unanswered
    const colors = {
      1: '#ef4444', // red (Don't know)
      2: '#f97316', // orange (Shaky)
      3: '#eab308', // yellow (Okay)
      4: '#22c55e', // green (Confident)
      5: '#06b6d4', // cyan (Mastered)
    }
    return colors[rating as keyof typeof colors] || '#6b7280'
  }

  const getProbabilityBorderColor = (probability: number): string => {
    if (probability === 0) return '#e5e7eb' // light gray (no chance)
    if (probability <= 20) return '#fecaca' // light red (very low)
    if (probability <= 40) return '#fed7aa' // light orange (low)
    if (probability <= 60) return '#fef3c7' // light yellow (medium)
    if (probability <= 80) return '#bbf7d0' // light green (high)
    return '#a7f3d0' // light green (very high)
  }

  const getProbabilityBorderWidth = (questionId: number): string => {
    return currentQuestionId === questionId ? '3px' : '2px'
  }

  const handleQuestionClick = (question: QuestionWithProbability) => {
    if (question.isSelectable && onQuestionSelect) {
      onQuestionSelect(question.id)
    }
  }

  const formatProbability = (probability: number): string => {
    return probability < 0.1 ? '<0.1%' : `${probability.toFixed(1)}%`
  }

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 1001,
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem',
          padding: '0.5rem',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{
          width: '24px',
          height: '18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ height: '2px', backgroundColor: '#374151', borderRadius: '1px' }} />
          <div style={{ height: '2px', backgroundColor: '#374151', borderRadius: '1px' }} />
          <div style={{ height: '2px', backgroundColor: '#374151', borderRadius: '1px' }} />
        </div>
      </button>

      {/* Sidebar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: isOpen ? 0 : '-320px',
        width: '320px',
        height: '100vh',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e7eb',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
        transition: 'left 0.3s ease-in-out',
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem',
          paddingTop: '4rem', // Add top padding to account for hamburger menu
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f8fafc',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0,
            }}>
              Questions {questionsData && `(${questionsData.questions.length})`}
            </h3>
            <button
              onClick={() => setShowLegend(!showLegend)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.25rem',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Show legend"
            >
              ?
            </button>
          </div>

          {/* Legend */}
          {showLegend && (
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              backgroundColor: '#f9fafb',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>Border Colors (Selection Probability):</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#e5e7eb', borderRadius: '2px' }} />
                  <span>0%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#fecaca', borderRadius: '2px' }} />
                  <span>1-20%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#fed7aa', borderRadius: '2px' }} />
                  <span>21-40%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#fef3c7', borderRadius: '2px' }} />
                  <span>41-60%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#bbf7d0', borderRadius: '2px' }} />
                  <span>61-80%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#a7f3d0', borderRadius: '2px' }} />
                  <span>81-100%</span>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', fontWeight: '600' }}>Circle Colors (Answer Rating):</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#6b7280', borderRadius: '50%' }} />
                  <span>Unanswered</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
                  <span>1 - Don't know</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#f97316', borderRadius: '50%' }} />
                  <span>2 - Shaky</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#eab308', borderRadius: '50%' }} />
                  <span>3 - Okay</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '50%' }} />
                  <span>4 - Confident</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#06b6d4', borderRadius: '50%' }} />
                  <span>5 - Mastered</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Question List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
        }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#6b7280',
            }}>
              Loading questions...
            </div>
          ) : questionsData ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {questionsData.questions.map((question) => (
                <div
                  key={question.id}
                  onClick={() => handleQuestionClick(question)}
                  style={{
                    border: `${getProbabilityBorderWidth(question.id)} solid ${getProbabilityBorderColor(question.selectionProbability)}`,
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: question.isSelectable ? 'white' : '#f9fafb',
                    cursor: question.isSelectable ? 'pointer' : 'default',
                    opacity: question.isSelectable ? 1 : 0.6,
                    transition: 'all 0.2s ease',
                    fontWeight: currentQuestionId === question.id ? 'bold' : 'normal',
                  }}
                  onMouseEnter={(e) => {
                    if (question.isSelectable) {
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}>
                    {/* Question Number Circle */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: getRatingColor(question.lastAttempt?.userRating || null),
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}>
                      {question.questionNumber}
                    </div>

                    {/* Question Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#1f2937',
                        lineHeight: '1.4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        marginBottom: '0.25rem',
                      }}>
                        {question.questionText}
                      </div>

                      <div style={{
                        fontSize: '0.75rem',
                        color: question.selectionProbability > 0 ? '#2563eb' : '#6b7280',
                        fontWeight: '600',
                      }}>
                        {formatProbability(question.selectionProbability)} chance
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#6b7280',
            }}>
              No questions available
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={onToggle}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            display: 'block',
          }}
        />
      )}
    </>
  )
}