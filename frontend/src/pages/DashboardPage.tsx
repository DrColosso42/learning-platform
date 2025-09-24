import { useState } from 'react'
import { AuthService } from '../services/authService'
import RecentStudies from '../components/RecentStudies'
import ProjectManagement from '../components/ProjectManagement'
import ActivityCalendar from '../components/ActivityCalendar'
import UserStats from '../components/UserStats'
import QuestionManagementPage from './QuestionManagementPage'
import StudySessionPage from './StudySessionPage'
import QuestionSetSelectionPage from './QuestionSetSelectionPage'

/**
 * Main dashboard page showing user's learning overview
 * Features: recent studies, project management, activity calendar, stats
 */
function DashboardPage() {
  const user = AuthService.getUser()
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'stats'>('overview')
  const [questionManagement, setQuestionManagement] = useState<{
    projectId: number
    projectName: string
  } | null>(null)
  const [questionSetSelection, setQuestionSetSelection] = useState<{
    projectId: number
    projectName: string
  } | null>(null)
  const [studySession, setStudySession] = useState<{
    questionSetId: number
    questionSetName: string
  } | null>(null)

  const handleLogout = () => {
    AuthService.logout()
    window.location.reload() // Simple reload to reset app state
  }

  const handleManageQuestions = (projectId: number, projectName: string) => {
    setQuestionManagement({ projectId, projectName })
  }

  const handleBackFromQuestions = () => {
    setQuestionManagement(null)
    setActiveTab('projects') // Go back to projects tab
  }

  const handleStartStudy = (projectId: number, projectName: string) => {
    setQuestionSetSelection({ projectId, projectName })
  }

  const handleBackFromQuestionSetSelection = () => {
    setQuestionSetSelection(null)
    setActiveTab('projects') // Go back to projects tab
  }

  const handleSelectQuestionSet = (questionSetId: number, questionSetName: string) => {
    setQuestionSetSelection(null)
    setStudySession({ questionSetId, questionSetName })
  }

  const handleResumeStudy = (questionSetId: number, questionSetName: string) => {
    setStudySession({ questionSetId, questionSetName })
  }

  const handleBackFromStudy = () => {
    setStudySession(null)
    setActiveTab('projects') // Go back to projects tab
  }

  if (!user) {
    return <div>Please log in to access the dashboard.</div>
  }

  // Show question management if selected
  if (questionManagement) {
    return (
      <QuestionManagementPage
        projectId={questionManagement.projectId}
        projectName={questionManagement.projectName}
        onBack={handleBackFromQuestions}
      />
    )
  }

  // Show question set selection if selected
  if (questionSetSelection) {
    return (
      <QuestionSetSelectionPage
        projectId={questionSetSelection.projectId}
        projectName={questionSetSelection.projectName}
        onBack={handleBackFromQuestionSetSelection}
        onSelectQuestionSet={handleSelectQuestionSet}
      />
    )
  }

  // Show study session if selected
  if (studySession) {
    return (
      <StudySessionPage
        questionSetId={studySession.questionSetId}
        questionSetName={studySession.questionSetName}
        onBack={handleBackFromStudy}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 0'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🎓</span>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              Learning Advisor
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#6b7280' }}>Welcome, {user.name}</span>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '0.375rem',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'projects', label: 'Projects', icon: '📁' },
              { id: 'stats', label: 'Statistics', icon: '📈' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                  color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? '600' : '400'
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '2rem 0' }}>
        <div className="container">
          {activeTab === 'overview' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}>
              <RecentStudies onResumeStudy={handleResumeStudy} />
              <ActivityCalendar />
              <UserStats />
            </div>
          )}

          {activeTab === 'projects' && (
            <ProjectManagement
              onManageQuestions={handleManageQuestions}
              onStartStudy={handleStartStudy}
            />
          )}

          {activeTab === 'stats' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: '2rem'
            }}>
              <UserStats detailed />
              <ActivityCalendar detailed />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default DashboardPage