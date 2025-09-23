import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'

/**
 * Main application component
 * Handles routing between landing and login pages
 */
function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'login'>('landing')

  const navigateToLogin = () => setCurrentPage('login')
  const navigateToLanding = () => setCurrentPage('landing')

  return (
    <div className="App">
      {currentPage === 'landing' && (
        <LandingPage onLoginClick={navigateToLogin} />
      )}
      {currentPage === 'login' && (
        <LoginPage onBack={navigateToLanding} />
      )}
    </div>
  )
}

export default App