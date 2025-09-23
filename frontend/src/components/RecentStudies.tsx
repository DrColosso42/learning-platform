import { useState, useEffect } from 'react'
import { StatisticsService, RecentStudySession } from '../services/statisticsService'

/**
 * Recent Studies component shows user's latest study sessions
 * Helps users quickly resume their learning activities
 */
function RecentStudies() {
  const [sessions, setSessions] = useState<RecentStudySession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadRecentSessions()
  }, [])

  const loadRecentSessions = async () => {
    try {
      setIsLoading(true)
      const recentSessions = await StatisticsService.getRecentSessions(5)
      setSessions(recentSessions)
    } catch (error) {
      console.error('Failed to load recent sessions:', error)
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }

  const getCompletionPercentage = (answered: number, total: number) => {
    return Math.round((answered / total) * 100)
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#10b981' // green
    if (rating >= 3) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    }
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      height: 'fit-content'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          📚 Recent Studies
        </h2>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#f3f4f6',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          color: '#374151',
          cursor: 'pointer'
        }}>
          View All
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ color: '#6b7280' }}>Loading recent studies...</div>
        </div>
      ) : sessions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌟</div>
          <p>No study sessions yet.</p>
          <p style={{ fontSize: '0.875rem' }}>Start studying to see your progress here!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sessions.map(session => (
            <div
              key={session.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.5rem'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '0.25rem'
                  }}>
                    {session.projectName}
                  </h3>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    {session.questionSetName}
                  </p>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af'
                }}>
                  {formatDate(session.completedAt)}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#374151'
                  }}>
                    {session.questionsAnswered}/{session.totalQuestions} questions
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      color: getRatingColor(session.averageRating)
                    }}>
                      ★ {session.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#2563eb'
                }}>
                  {getCompletionPercentage(session.questionsAnswered, session.totalQuestions)}%
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#f3f4f6',
                borderRadius: '2px',
                marginTop: '0.75rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${getCompletionPercentage(session.questionsAnswered, session.totalQuestions)}%`,
                  height: '100%',
                  backgroundColor: '#2563eb',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecentStudies