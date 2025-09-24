import { useState, useEffect } from 'react'
import { StatisticsService, UserStatistics, TimeStatistics } from '../services/statisticsService'

interface UserStatsProps {
  detailed?: boolean
}

/**
 * User statistics component showing learning progress metrics
 * Displays key performance indicators and achievements
 */
function UserStats({ detailed = false }: UserStatsProps) {
  const [stats, setStats] = useState<UserStatistics | null>(null)
  const [timeStats, setTimeStats] = useState<TimeStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUserStatistics()
  }, [])

  const loadUserStatistics = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 UserStats: Loading user statistics...')

      // Load both regular stats and time-based stats
      const [userStats, userTimeStats] = await Promise.all([
        StatisticsService.getUserStatistics(),
        StatisticsService.getTimeStatistics()
      ])

      console.log('✅ UserStats: Statistics loaded:', userStats)
      console.log('✅ UserStats: Time statistics loaded:', userTimeStats)

      setStats(userStats)
      setTimeStats(userTimeStats)
    } catch (error) {
      console.error('❌ UserStats: Failed to load user statistics:', error)
      setStats(null)
      setTimeStats(null)
    } finally {
      setIsLoading(false)
    }
  }

  const formatStudyTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours === 0) {
      return `${remainingMinutes}m`
    }
    return `${hours}h ${remainingMinutes}m`
  }

  const getRatingColor = (rating: number): string => {
    if (rating >= 4) return '#10b981'
    if (rating >= 3) return '#f59e0b'
    return '#ef4444'
  }

  const getStreakColor = (streak: number): string => {
    if (streak >= 7) return '#8b5cf6'
    if (streak >= 3) return '#06b6d4'
    return '#6b7280'
  }

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        Loading statistics...
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        No statistics available
      </div>
    )
  }

  const basicStats = [
    {
      icon: '🎯',
      label: 'Sessions',
      value: stats.totalSessions.toString(),
      color: '#2563eb'
    },
    {
      icon: '❓',
      label: 'Questions',
      value: stats.totalQuestions.toString(),
      color: '#7c3aed'
    },
    {
      icon: '⭐',
      label: 'Avg Rating',
      value: stats.averageRating.toFixed(1),
      color: getRatingColor(stats.averageRating)
    },
    {
      icon: '🔥',
      label: 'Streak',
      value: `${stats.currentStreak} days`,
      color: getStreakColor(stats.currentStreak)
    }
  ]

  // Enhanced detailed stats with time-based metrics
  const detailedStats = [
    {
      icon: '⏱️',
      label: 'Total Study Time',
      value: timeStats ? formatStudyTime(timeStats.totalStudyTimeMinutes) : formatStudyTime(stats.totalStudyTime),
      color: '#059669'
    },
    {
      icon: '📅',
      label: 'This Week',
      value: timeStats ? formatStudyTime(timeStats.totalStudyTimeThisWeek) : '-',
      color: '#3b82f6'
    },
    {
      icon: '📆',
      label: 'This Month',
      value: timeStats ? formatStudyTime(timeStats.totalStudyTimeThisMonth) : '-',
      color: '#8b5cf6'
    },
    {
      icon: '📈',
      label: 'Daily Average',
      value: timeStats ? formatStudyTime(timeStats.averageDailyStudyTime) : '-',
      color: '#06b6d4'
    },
    {
      icon: '🏆',
      label: 'Longest Streak',
      value: `${stats.longestStreak} days`,
      color: '#dc2626'
    },
    {
      icon: '📁',
      label: 'Projects',
      value: `${stats.projectsCompleted}/${stats.totalProjects}`,
      color: '#ea580c'
    }
  ]

  const allStats = detailed ? [...basicStats, ...detailedStats] : basicStats

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      height: 'fit-content'
    }}>
      <h2 style={{
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '1.5rem'
      }}>
        📊 Your Progress
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: detailed ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
        gap: '1rem'
      }}>
        {allStats.map((stat, index) => (
          <div
            key={index}
            style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              textAlign: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div style={{
              fontSize: '1.5rem',
              marginBottom: '0.5rem'
            }}>
              {stat.icon}
            </div>
            <div style={{
              fontSize: detailed ? '1.5rem' : '1.25rem',
              fontWeight: 'bold',
              color: stat.color,
              marginBottom: '0.25rem'
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {detailed && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '1rem'
          }}>
            Achievement Level
          </h3>

          <div style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '2rem',
              marginBottom: '0.5rem'
            }}>
              {stats.totalSessions >= 50 ? '🏆' : stats.totalSessions >= 20 ? '🥈' : stats.totalSessions >= 10 ? '🥉' : '🌱'}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: '#374151',
              fontWeight: '500'
            }}>
              {stats.totalSessions >= 50 ? 'Learning Master' :
               stats.totalSessions >= 20 ? 'Study Expert' :
               stats.totalSessions >= 10 ? 'Knowledge Seeker' : 'Getting Started'}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              {stats.totalSessions >= 50 ? 'You\'ve mastered the art of learning!' :
               stats.totalSessions >= 20 ? 'Keep up the excellent progress!' :
               stats.totalSessions >= 10 ? 'You\'re on the right track!' : 'Every expert was once a beginner!'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserStats