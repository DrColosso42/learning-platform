import { prisma } from '../config/database.js';

export interface UserStatistics {
  totalSessions: number;
  totalQuestions: number;
  averageRating: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number; // in minutes
  projectsCompleted: number;
  totalProjects: number;
}

export interface RecentStudySession {
  id: number;
  projectName: string;
  questionSetName: string;
  questionsAnswered: number;
  totalQuestions: number;
  averageRating: number;
  completedAt: string;
}

export interface ActivityData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

/**
 * Statistics service for user analytics and progress tracking
 * Aggregates data from study sessions and projects
 */
export class StatisticsService {
  /**
   * Get comprehensive user statistics
   */
  async getUserStatistics(userId: number): Promise<UserStatistics> {
    // Get all completed study sessions
    const completedSessions = await prisma.studySession.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      include: {
        sessionAnswers: true,
      },
    });

    // Get user's projects
    const userProjects = await prisma.project.findMany({
      where: { ownerId: userId },
      include: {
        questionSets: {
          include: {
            questions: true,
          },
        },
      },
    });

    // Calculate basic stats
    const totalSessions = completedSessions.length;
    const totalQuestions = completedSessions.reduce(
      (sum, session) => sum + session.sessionAnswers.length,
      0
    );

    // Calculate average rating
    const allRatings = completedSessions.flatMap(session =>
      session.sessionAnswers.map(answer => answer.userRating)
    );
    const averageRating = allRatings.length > 0
      ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length
      : 0;

    // Calculate projects completion
    const totalProjects = userProjects.length;
    const projectsCompleted = userProjects.filter(project => {
      const totalQuestions = project.questionSets.reduce(
        (sum, qs) => sum + qs.questions.length,
        0
      );
      return totalQuestions > 0; // For now, consider projects with questions as "started"
    }).length;

    // Calculate streaks
    const { currentStreak, longestStreak } = await this.calculateStreaks(userId);

    // Estimate study time (assume 30 seconds per question on average)
    const totalStudyTime = Math.round(totalQuestions * 0.5); // 0.5 minutes per question

    return {
      totalSessions,
      totalQuestions,
      averageRating,
      currentStreak,
      longestStreak,
      totalStudyTime,
      projectsCompleted,
      totalProjects,
    };
  }

  /**
   * Get recent study sessions for the user
   */
  async getRecentStudySessions(userId: number, limit: number = 10): Promise<RecentStudySession[]> {
    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      include: {
        questionSet: {
          include: {
            project: true,
            questions: true,
          },
        },
        sessionAnswers: true,
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });

    return sessions.map(session => {
      const averageRating = session.sessionAnswers.length > 0
        ? session.sessionAnswers.reduce((sum, answer) => sum + answer.userRating, 0) / session.sessionAnswers.length
        : 0;

      return {
        id: session.id,
        projectName: session.questionSet.project.name,
        questionSetName: session.questionSet.name,
        questionsAnswered: session.sessionAnswers.length,
        totalQuestions: session.questionSet.questions.length,
        averageRating,
        completedAt: session.completedAt!.toISOString(),
      };
    });
  }

  /**
   * Get activity data for calendar visualization
   */
  async getActivityData(userId: number, days: number = 365): Promise<ActivityData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get session counts by date
    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        completedAt: true,
      },
    });

    // Group sessions by date
    const sessionsByDate = new Map<string, number>();
    sessions.forEach(session => {
      if (session.completedAt) {
        const dateStr = session.completedAt.toISOString().split('T')[0];
        sessionsByDate.set(dateStr, (sessionsByDate.get(dateStr) || 0) + 1);
      }
    });

    // Generate activity data for all days
    const activityData: ActivityData[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const count = sessionsByDate.get(dateStr) || 0;
      let level: 0 | 1 | 2 | 3 | 4 = 0;

      // Convert count to activity level (0-4)
      if (count >= 4) level = 4;
      else if (count >= 3) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;

      activityData.push({
        date: dateStr,
        count,
        level,
      });
    }

    return activityData;
  }

  /**
   * Calculate current and longest streaks
   */
  private async calculateStreaks(userId: number): Promise<{ currentStreak: number; longestStreak: number }> {
    // Get all session dates in descending order
    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      select: {
        completedAt: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    if (sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Get unique dates
    const uniqueDates = Array.from(
      new Set(
        sessions.map(session =>
          session.completedAt!.toISOString().split('T')[0]
        )
      )
    ).sort().reverse();

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date();

    for (let i = 0; i < uniqueDates.length; i++) {
      const sessionDate = uniqueDates[i];
      const expectedDate = checkDate.toISOString().split('T')[0];

      if (sessionDate === expectedDate) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const previousDate = new Date(uniqueDates[i - 1]);
      const dayDiff = Math.abs(
        (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  }
}