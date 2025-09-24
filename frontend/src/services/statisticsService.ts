import { AuthService } from './authService'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface UserStatistics {
  totalSessions: number
  totalQuestions: number
  averageRating: number
  currentStreak: number
  longestStreak: number
  totalStudyTime: number
  projectsCompleted: number
  totalProjects: number
}

export interface RecentStudySession {
  id: number
  questionSetId: number
  projectName: string
  questionSetName: string
  questionsAnswered: number
  totalQuestions: number
  averageRating: number
  completedAt: string
}

export interface ActivityData {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

export interface DashboardData {
  statistics: UserStatistics
  recentSessions: RecentStudySession[]
  activityData: ActivityData[]
}

/**
 * Statistics service for user analytics and progress tracking
 * Fetches dashboard data and learning metrics
 */
export class StatisticsService {
  /**
   * Get comprehensive user statistics
   */
  static async getUserStatistics(): Promise<UserStatistics> {
    const authHeader = AuthService.getAuthHeader()
    console.log('🔍 StatisticsService: Making request to /api/statistics/overview with auth:', !!authHeader.Authorization)

    const response = await fetch(`${API_BASE_URL}/api/statistics/overview`, {
      headers: {
        ...authHeader,
      },
    })

    const data = await response.json()
    console.log('📊 StatisticsService: Response status:', response.status, 'data:', data)

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch statistics')
    }

    return data.statistics
  }

  /**
   * Get recent study sessions
   */
  static async getRecentSessions(limit: number = 10): Promise<RecentStudySession[]> {
    const authHeader = AuthService.getAuthHeader()
    console.log('🔍 StatisticsService: Making request to /api/statistics/recent-sessions with auth:', !!authHeader.Authorization)

    const response = await fetch(`${API_BASE_URL}/api/statistics/recent-sessions?limit=${limit}`, {
      headers: {
        ...authHeader,
      },
    })

    const data = await response.json()
    console.log('📚 StatisticsService: Recent sessions response status:', response.status, 'data:', data)

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch recent sessions')
    }

    return data.sessions
  }

  /**
   * Get activity data for calendar
   */
  static async getActivityData(days: number = 365): Promise<ActivityData[]> {
    const authHeader = AuthService.getAuthHeader()
    console.log('🔍 StatisticsService: Making request to /api/statistics/activity with auth:', !!authHeader.Authorization)

    const response = await fetch(`${API_BASE_URL}/api/statistics/activity?days=${days}`, {
      headers: {
        ...authHeader,
      },
    })

    const data = await response.json()
    console.log('📅 StatisticsService: Activity data response status:', response.status, 'data length:', data.activityData?.length)
    console.log('📅 StatisticsService: Full response data:', JSON.stringify(data, null, 2))
    console.log('📅 StatisticsService: Activity data sample:', data.activityData?.slice(0, 3))

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch activity data')
    }

    return data.activityData
  }

  /**
   * Get all dashboard data in one request (more efficient)
   */
  static async getDashboardData(): Promise<DashboardData> {
    const response = await fetch(`${API_BASE_URL}/api/statistics/dashboard`, {
      headers: {
        ...AuthService.getAuthHeader(),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch dashboard data')
    }

    return data
  }
}