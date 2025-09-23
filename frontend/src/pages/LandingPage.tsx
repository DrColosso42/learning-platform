interface LandingPageProps {
  onLoginClick: () => void
}

/**
 * Simple landing page with app branding and login option
 * Clean, minimal design with clear call-to-action
 */
function LandingPage({ onLoginClick }: LandingPageProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem'
    }}>
      <div style={{
        textAlign: 'center',
        background: 'white',
        borderRadius: '1rem',
        padding: '3rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        {/* App Icon */}
        <div style={{
          fontSize: '4rem',
          marginBottom: '1.5rem'
        }}>
          🎓
        </div>

        {/* App Title */}
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '1rem'
        }}>
          Learning Advisor
        </h1>

        {/* App Description */}
        <p style={{
          fontSize: '1.125rem',
          color: '#6b7280',
          marginBottom: '2.5rem',
          lineHeight: '1.7'
        }}>
          Master your knowledge with personalized study sessions.
          Create question sets, practice regularly, and track your progress
          with intelligent spaced repetition.
        </p>

        {/* Login Button */}
        <button
          onClick={onLoginClick}
          className="btn btn-primary"
          style={{
            width: '100%',
            fontSize: '1.125rem',
            padding: '1rem'
          }}
        >
          Get Started
        </button>

        {/* Footer text */}
        <p style={{
          marginTop: '1.5rem',
          fontSize: '0.875rem',
          color: '#9ca3af'
        }}>
          Ready to boost your learning? Login to continue.
        </p>
      </div>
    </div>
  )
}

export default LandingPage