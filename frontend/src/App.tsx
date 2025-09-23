import { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegistrationPage from './pages/RegistrationPage'
import DashboardPage from './pages/DashboardPage'
import { AuthService } from './services/authService'

type PageType = 'landing' | 'login' | 'register' | 'dashboard'

/**
 * Main application component
 * Handles routing between landing, login, and dashboard pages
 * Manages authentication state across the application
 */
function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated on app load
    if (AuthService.isAuthenticated()) {
      setCurrentPage('dashboard')
    }
    setIsLoading(false)
  }, [])

  const navigateToLogin = () => setCurrentPage('login')
  const navigateToRegister = () => setCurrentPage('register')
  const navigateToLanding = () => setCurrentPage('landing')
  const navigateToDashboard = () => setCurrentPage('dashboard')

  // Handle successful login
  const handleLoginSuccess = () => {
    navigateToDashboard()
  }

  // Handle successful registration
  const handleRegistrationSuccess = () => {
    navigateToDashboard()
  }

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎓</div>
          Loading Learning Advisor...
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      {currentPage === 'landing' && (
        <LandingPage onLoginClick={navigateToLogin} />
      )}
      {currentPage === 'login' && (
        <LoginPage
          onBack={navigateToLanding}
          onLoginSuccess={handleLoginSuccess}
          onRegisterClick={navigateToRegister}
        />
      )}
      {currentPage === 'register' && (
        <RegistrationPage
          onBack={navigateToLogin}
          onRegistrationSuccess={handleRegistrationSuccess}
        />
      )}
      {currentPage === 'dashboard' && (
        <DashboardPage />
      )}
    </div>
  )
}

export default App