import { useState, useEffect } from 'react'

interface ActivityData {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4 // 0 = no activity, 4 = most active
}

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
    // Generate mock activity data for the last 365 days
    const generateActivityData = (): ActivityData[] => {
      const data: ActivityData[] = []
      const today = new Date()

      for (let i = 364; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)

        // Generate random activity levels with some patterns
        let level: 0 | 1 | 2 | 3 | 4 = 0
        const random = Math.random()

        // Simulate lower activity on weekends
        const isWeekend = date.getDay() === 0 || date.getDay() === 6
        const weekendMultiplier = isWeekend ? 0.3 : 1

        if (random * weekendMultiplier > 0.7) level = 4
        else if (random * weekendMultiplier > 0.5) level = 3
        else if (random * weekendMultiplier > 0.3) level = 2
        else if (random * weekendMultiplier > 0.15) level = 1

        data.push({
          date: date.toISOString().split('T')[0],
          count: level * Math.floor(Math.random() * 5) + level,
          level
        })
      }

      return data
    }

    setTimeout(() => {
      setActivityData(generateActivityData())
      setIsLoading(false)
    }, 300)
  }, [])

  const getColorForLevel = (level: number): string => {
    const colors = {
      0: '#ebedf0',
      1: '#9be9a8',
      2: '#40c463',
      3: '#30a14e',
      4: '#216e39'
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

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      labels.push(months[date.getMonth()])
    }

    return labels
  }

  const getDayLabels = () => ['', 'Mon', '', 'Wed', '', 'Fri', '']

  const organizeDataByWeeks = () => {
    const weeks = []
    let currentWeek = []

    activityData.forEach((day, index) => {
      currentWeek.push(day)

      if (currentWeek.length === 7) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks
  }

  const getTotalContributions = () => {
    return activityData.reduce((sum, day) => sum + day.count, 0)
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

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        Loading activity calendar...
      </div>
    )
  }

  const weeks = organizeDataByWeeks()
  const totalContributions = getTotalContributions()
  const currentStreak = getCurrentStreak()

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
        marginBottom: '1rem'
      }}>
        📅 Study Activity
      </h2>

      {detailed && (
        <div style={{
          display: 'flex',
          gap: '2rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem'
        }}>
          <div>
            <span style={{ color: '#6b7280' }}>Total sessions: </span>
            <span style={{ fontWeight: '600' }}>{totalContributions}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Current streak: </span>
            <span style={{ fontWeight: '600' }}>{currentStreak} days</span>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div style={{ overflowX: 'auto' }}>
        {/* Month labels */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `20px repeat(${weeks.length}, 12px)`,
          gap: '2px',
          marginBottom: '4px',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          <div></div>
          {getMonthLabels().map((month, index) => (
            <div key={index} style={{
              gridColumn: `span ${Math.ceil(weeks.length / 12)}`,
              textAlign: 'left'
            }}>
              {month}
            </div>
          ))}
        </div>

        {/* Day labels and activity grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `20px repeat(${weeks.length}, 12px)`,
          gap: '2px'
        }}>
          {/* Day labels */}
          <div style={{
            display: 'grid',
            gridTemplateRows: 'repeat(7, 12px)',
            gap: '2px',
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            {getDayLabels().map((day, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '4px'
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Activity squares */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} style={{
              display: 'grid',
              gridTemplateRows: 'repeat(7, 12px)',
              gap: '2px'
            }}>
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const dayData = week[dayIndex]
                return (
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
                    title={dayData ? `${formatDate(dayData.date)}: ${dayData.count} sessions` : ''}
                    onClick={() => dayData && setSelectedDate(dayData.date)}
                    onMouseEnter={(e) => {
                      if (dayData) {
                        e.currentTarget.style.outline = '1px solid #374151'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.outline = 'none'
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
          {activityData.find(d => d.date === selectedDate)?.count || 0} study sessions
        </div>
      )}
    </div>
  )
}

export default ActivityCalendar