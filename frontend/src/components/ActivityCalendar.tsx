import { useState, useEffect } from 'react'
import { StatisticsService, ActivityData, TimeActivityData } from '../services/statisticsService'

interface ActivityCalendarProps {
  detailed?: boolean
}

/**
 * Git-style activity calendar showing user's study consistency
 * Visual representation of daily learning activities
 */
function ActivityCalendar({ detailed = false }: ActivityCalendarProps) {
  const [activityData, setActivityData] = useState<ActivityData[]>([])
  const [timeActivityData, setTimeActivityData] = useState<TimeActivityData[]>([])
  const [viewMode, setViewMode] = useState<'points' | 'time'>('points')
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

      // Load both points and time data simultaneously
      const [pointsData, timeData] = await Promise.all([
        StatisticsService.getActivityData(91),
        StatisticsService.getTimeActivityData(91)
      ])

      console.log('✅ ActivityCalendar: Points data loaded:', pointsData?.length, 'days')
      console.log('✅ ActivityCalendar: Time data loaded:', timeData?.length, 'days')
      console.log('✅ ActivityCalendar: Sample points:', pointsData?.slice(0, 3))
      console.log('✅ ActivityCalendar: Sample time:', timeData?.slice(0, 3))

      setActivityData(pointsData || [])
      setTimeActivityData(timeData || [])
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
    const displayData = getDisplayData()
    const limitedData = displayData.slice(-91)
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
    if (viewMode === 'points') {
      const total = activityData.reduce((sum, day) => sum + day.count, 0)
      console.log('🔢 ActivityCalendar: Points total from', activityData.length, 'days, result:', total)
      return total
    } else {
      const total = timeActivityData.reduce((sum, day) => sum + day.minutes, 0)
      console.log('🔢 ActivityCalendar: Time total from', timeActivityData.length, 'days, result:', total, 'minutes')
      return total
    }
  }

  const formatTotal = () => {
    const total = getTotalContributions()
    if (viewMode === 'points') {
      return `${total} pts`
    } else {
      if (total < 60) return `${total}m`
      const hours = Math.floor(total / 60)
      const mins = total % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
  }

  const getCurrentStreak = () => {
    const data = viewMode === 'points' ? activityData : timeActivityData
    let streak = 0
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].level > 0) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  const getDisplayData = () => {
    return viewMode === 'points' ? activityData : timeActivityData
  }

  const getActivityValue = (day: ActivityData | TimeActivityData) => {
    return viewMode === 'points'
      ? (day as ActivityData).count
      : (day as TimeActivityData).minutes
  }

  const getActivityUnit = () => {
    return viewMode === 'points' ? 'points' : 'minutes'
  }

  const formatActivityValue = (value: number) => {
    if (viewMode === 'points') {
      return `${value} points`
    } else {
      if (value < 60) return `${value}m`
      const hours = Math.floor(value / 60)
      const mins = value % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
  }

  console.log('🔍 ActivityCalendar: Render state - isLoading:', isLoading, 'pointsData:', activityData.length, 'timeData:', timeActivityData.length, 'viewMode:', viewMode)

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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#1f2937',
          margin: 0
        }}>
          📅 Study Activity
        </h2>

        {/* Toggle Switch */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '4px'
        }}>
          <button
            onClick={() => setViewMode('points')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: viewMode === 'points' ? '#3b82f6' : 'transparent',
              color: viewMode === 'points' ? 'white' : '#6b7280'
            }}
          >
            🎯 Points
          </button>
          <button
            onClick={() => setViewMode('time')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: viewMode === 'time' ? '#3b82f6' : 'transparent',
              color: viewMode === 'time' ? 'white' : '#6b7280'
            }}
          >
            ⏱️ Time
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{
        textAlign: 'center',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        Total: {formatTotal()}
      </div>

      {detailed && (
        <div style={{
          display: 'flex',
          gap: '2rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem'
        }}>
          <div>
            <span style={{ color: '#6b7280' }}>Total {viewMode}: </span>
            <span style={{ fontWeight: '600' }}>{formatTotal()}</span>
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
                title={dayData ? `${formatDate(dayData.date)}: ${formatActivityValue(getActivityValue(dayData))}` : ''}
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
          {
            (() => {
              const displayData = getDisplayData()
              const dayData = displayData.find(d => d.date === selectedDate)
              const value = dayData ? getActivityValue(dayData) : 0
              return formatActivityValue(value)
            })()
          } earned
        </div>
      )}
    </div>
  )
}

export default ActivityCalendar