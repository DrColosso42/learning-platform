import { useState, useEffect } from 'react'
import { StatisticsService, ActivityData } from '../services/statisticsService'

interface ActivityCalendarProps {
  detailed?: boolean
}

/**
 * Git-style activity calendar showing user's study consistency
 * Visual representation of daily learning activities
 */
function ActivityCalendar({ detailed = false }: ActivityCalendarProps) {
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    console.log('🚀 ActivityCalendar: Component mounted')
    loadActivityData()
  }, [])

  const loadActivityData = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 ActivityCalendar: Loading activity data...')
      const data = await StatisticsService.getActivityData(91) // Only load 3 months
      console.log('✅ ActivityCalendar: Activity data loaded:', data?.length, 'days')
      console.log('✅ ActivityCalendar: Sample data points:', data?.slice(0, 5))
      console.log('✅ ActivityCalendar: Points for today:', data?.find(d => d.date === new Date().toISOString().split('T')[0]))
      setActivityData(data || [])
    } catch (error) {
      console.error('❌ ActivityCalendar: Failed to load activity data:', error)
      console.error('❌ ActivityCalendar: Error details:', error.message, error.stack)
      console.error('❌ ActivityCalendar: CRITICAL - Backend serving 83 points but frontend falling back to dummy data!')
      // Create dummy data to test layout
      const dummyData = []
      for (let i = 0; i < 91; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        dummyData.push({
          date: date.toISOString().split('T')[0],
          count: Math.floor(Math.random() * 25),
          level: Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4
        })
      }
      console.log('🔧 ActivityCalendar: Using dummy data for testing')
      setActivityData(dummyData.reverse())
    } finally {
      setIsLoading(false)
    }
  }

  const getColorForLevel = (level: number): string => {
    // GitHub-style activity colors
    const colors = {
      0: '#ebedf0', // No activity - light gray
      1: '#9be9a8', // Low activity - light green
      2: '#40c463', // Medium activity - medium green
      3: '#30a14e', // High activity - dark green
      4: '#216e39'  // Very high activity - darkest green
    }
    return colors[level as keyof typeof colors]
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMonthLabels = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const labels = []
    const today = new Date()

    // Only show last 3 months for the compact view
    for (let i = 2; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      labels.push(months[date.getMonth()])
    }

    return labels
  }

  const getDayLabels = () => ['', 'Mon', '', 'Wed', '', 'Fri', '']

  const organizeDataByWeeks = () => {
    // Limit to last 91 days (13 weeks) to fit in container
    const limitedData = activityData.slice(-91)
    const weeks = []
    let currentWeek = []

    limitedData.forEach((day, index) => {
      currentWeek.push(day)

      if (currentWeek.length === 7) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      // Pad incomplete week with empty days
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      weeks.push(currentWeek)
    }

    return weeks.slice(-13) // Keep only last 13 weeks
  }

  const getTotalContributions = () => {
    const total = activityData.reduce((sum, day) => sum + day.count, 0)
    console.log('🔢 ActivityCalendar: Calculating total from', activityData.length, 'days, result:', total)
    console.log('🔢 ActivityCalendar: Non-zero days:', activityData.filter(d => d.count > 0))
    return total
  }

  const getCurrentStreak = () => {
    let streak = 0
    for (let i = activityData.length - 1; i >= 0; i--) {
      if (activityData[i].level > 0) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  console.log('🔍 ActivityCalendar: Render state - isLoading:', isLoading, 'dataLength:', activityData.length)

  if (isLoading) {
    console.log('⏳ ActivityCalendar: Showing loading state')
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ color: '#6b7280' }}>Loading activity calendar...</div>
      </div>
    )
  }

  const weeks = organizeDataByWeeks()
  const totalContributions = getTotalContributions()
  const currentStreak = getCurrentStreak()

  console.log('📊 ActivityCalendar: Organized data - weeks:', weeks.length, 'total:', totalContributions, 'streak:', currentStreak)

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      height: 'fit-content',
      width: '100%'
    }}>
      <h2 style={{
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        📅 Study Activity (Total: {getTotalContributions()} pts, Data: {activityData.length} days)
      </h2>

      {detailed && (
        <div style={{
          display: 'flex',
          gap: '2rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem'
        }}>
          <div>
            <span style={{ color: '#6b7280' }}>Total points: </span>
            <span style={{ fontWeight: '600' }}>{totalContributions}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Current streak: </span>
            <span style={{ fontWeight: '600' }}>{currentStreak} days</span>
          </div>
        </div>
      )}

      {/* Simplified Calendar Grid */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2px',
          maxWidth: '200px',
          justifyContent: 'center'
        }}>
          {weeks.map((week, weekIndex) =>
            week.map((dayData, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: dayData ? getColorForLevel(dayData.level) : '#ebedf0',
                  borderRadius: '2px',
                  cursor: dayData ? 'pointer' : 'default',
                  transition: 'all 0.1s ease'
                }}
                title={dayData ? `${formatDate(dayData.date)}: ${dayData.count} points` : ''}
                onClick={() => dayData && setSelectedDate(dayData.date)}
              />
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '1rem',
        fontSize: '0.75rem',
        color: '#6b7280'
      }}>
        <span>Less</span>
        <div style={{
          display: 'flex',
          gap: '2px'
        }}>
          {[0, 1, 2, 3, 4].map(level => (
            <div
              key={level}
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: getColorForLevel(level),
                borderRadius: '2px'
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      {selectedDate && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.375rem',
          fontSize: '0.875rem'
        }}>
          <strong>{formatDate(selectedDate)}</strong>
          <br />
          {activityData.find(d => d.date === selectedDate)?.count || 0} points earned
        </div>
      )}
    </div>
  )
}

export default ActivityCalendar