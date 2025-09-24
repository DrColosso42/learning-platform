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
  questionSetId: number;
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
    console.log('🔍 StatisticsService: Getting statistics for user', userId);

    // Get all study sessions (completed and incomplete)
    const userSessions = await prisma.studySession.findMany({
      where: {
        userId,
      },
      include: {
        sessionAnswers: true,
      },
    });

    // Filter sessions that have answers (this includes both completed and ongoing sessions)
    const sessionsWithAnswers = userSessions.filter(session => session.sessionAnswers.length > 0);

    console.log('📊 StatisticsService: Found', sessionsWithAnswers.length, 'sessions with answers');
    console.log('🔍 StatisticsService: Total sessions for user:', userSessions.length);
    userSessions.forEach((session, index) => {
      console.log(`  Session ${index + 1}: completed=${!!session.completedAt}, answers=${session.sessionAnswers.length}`);
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

    // Calculate basic stats from sessions with answers (both completed and ongoing)
    const totalSessions = sessionsWithAnswers.length;
    const totalQuestions = sessionsWithAnswers.reduce(
      (sum, session) => sum + session.sessionAnswers.length,
      0
    );

    // Calculate average rating from all answered questions
    const allRatings = sessionsWithAnswers.flatMap(session =>
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
   * Get recent study sessions for the user (including ongoing sessions with data)
   */
  async getRecentStudySessions(userId: number, limit: number = 10): Promise<RecentStudySession[]> {
    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
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
      orderBy: { startedAt: 'desc' }, // Order by start time instead of completion time
      take: limit * 2, // Get more to filter for sessions with answers
    });

    // Filter for sessions that have answers and take the limit
    const sessionsWithAnswers = sessions
      .filter(session => session.sessionAnswers.length > 0)
      .slice(0, limit);

    return sessionsWithAnswers.map(session => {
      const averageRating = session.sessionAnswers.length > 0
        ? session.sessionAnswers.reduce((sum, answer) => sum + answer.userRating, 0) / session.sessionAnswers.length
        : 0;

      return {
        id: session.id,
        questionSetId: session.questionSetId,
        projectName: session.questionSet.project.name,
        questionSetName: session.questionSet.name,
        questionsAnswered: session.sessionAnswers.length,
        totalQuestions: session.questionSet.questions.length,
        averageRating,
        completedAt: (session.completedAt || session.startedAt).toISOString(),
      };
    });
  }

  /**
   * Get activity data for calendar visualization based on points earned
   */
  async getActivityData(userId: number, days: number = 365): Promise<ActivityData[]> {
    console.log('🔍 ActivityData: Getting activity for user', userId, 'for', days, 'days');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    console.log('📅 ActivityData: Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);

    // Get sessions with answers for the date range
    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        sessionAnswers: true,
      },
    });

    console.log('🎯 ActivityData: Found', sessions.length, 'sessions in date range');

    // Group points by date (sum of all confidence ratings per day)
    const pointsByDate = new Map<string, number>();
    sessions.forEach((session, sessionIndex) => {
      console.log(`  Session ${sessionIndex + 1}: id=${session.id}, answers=${session.sessionAnswers.length}`);
      session.sessionAnswers.forEach((answer, answerIndex) => {
        const dateStr = answer.answeredAt.toISOString().split('T')[0];
        console.log(`    Answer ${answerIndex + 1}: date=${dateStr}, rating=${answer.userRating}`);
        pointsByDate.set(dateStr, (pointsByDate.get(dateStr) || 0) + answer.userRating);
      });
    });

    console.log('📊 ActivityData: Points by date:', Array.from(pointsByDate.entries()));

    // Generate activity data for all days
    const activityData: ActivityData[] = [];
    console.log('🔄 ActivityData: Generating activity array for', days, 'days from', startDate.toISOString().split('T')[0]);

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const points = pointsByDate.get(dateStr) || 0;
      let level: 0 | 1 | 2 | 3 | 4 = 0;

      // Convert points to activity level (0-4) based on confidence ratings
      // Since ratings are 1-5, reasonable thresholds might be:
      if (points >= 20) level = 4;      // 4+ high-confidence answers or many answers
      else if (points >= 15) level = 3; // 3+ good answers
      else if (points >= 10) level = 2; // 2+ decent answers
      else if (points >= 5) level = 1;  // 1+ answer
      // else level = 0 (no activity)

      if (points > 0) {
        console.log(`📍 ActivityData: Day ${i}: ${dateStr} = ${points} points, level ${level}`);
      }

      activityData.push({
        date: dateStr,
        count: points, // Now represents points instead of session count
        level,
      });
    }

    console.log('✅ ActivityData: Generated', activityData.length, 'days, non-zero days:', activityData.filter(d => d.count > 0).length);

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