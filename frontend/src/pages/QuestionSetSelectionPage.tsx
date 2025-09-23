import { useState, useEffect } from 'react'
import { QuestionService, QuestionSet } from '../services/questionService'

interface QuestionSetSelectionPageProps {
  projectId: number
  projectName: string
  onBack: () => void
  onSelectQuestionSet: (questionSetId: number, questionSetName: string) => void
}

/**
 * Question set selection page for starting study sessions
 * Allows users to choose which question set to study within a project
 */
function QuestionSetSelectionPage({
  projectId,
  projectName,
  onBack,
  onSelectQuestionSet
}: QuestionSetSelectionPageProps) {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadQuestionSets()
  }, [projectId])

  const loadQuestionSets = async () => {
    try {
      setIsLoading(true)
      const sets = await QuestionService.getQuestionSetsByProject(projectId)
      setQuestionSets(sets)
    } catch (error) {
      console.error('Failed to load question sets:', error)
    } finally {
      setIsLoading(false)
    }
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
        Loading question sets...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '2rem 0' }}>
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
              🚀 Start Study Session
            </h1>
            <p style={{ color: '#6b7280' }}>
              {projectName} - Choose a question set to study
            </p>
          </div>
        </div>

        {/* Question Sets Grid */}
        {questionSets.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            {questionSets.map(questionSet => (
              <div
                key={questionSet.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
                onClick={() => onSelectQuestionSet(questionSet.id, questionSet.name)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '0.5rem'
                  }}>
                    {questionSet.name}
                  </h3>
                  <div style={{
                    fontSize: '1.5rem',
                    color: '#10b981'
                  }}>
                    📝
                  </div>
                </div>

                {questionSet.description && (
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    lineHeight: '1.4',
                    marginBottom: '1rem'
                  }}>
                    {questionSet.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem'
                }}>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#374151',
                    fontWeight: '500'
                  }}>
                    {questionSet.questionCount} questions
                  </span>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#2563eb',
                    fontWeight: '600'
                  }}>
                    Start Study →
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '3rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              No Question Sets Available
            </h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '2rem'
            }}>
              You need to create question sets before you can start studying.
            </p>
            <button
              onClick={onBack}
              className="btn btn-primary"
            >
              Go Back to Projects
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuestionSetSelectionPage