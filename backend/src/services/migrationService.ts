import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration service to transfer timer data from StudySession to TimerSession
 * This preserves deck progress while creating proper timer session separation
 */
export class MigrationService {
  /**
   * Migrate existing timer data from StudySession to TimerSession
   */
  static async migrateTimerData(): Promise<void> {
    console.log('🚀 Migration: Starting timer data migration...');

    try {
      // Find all StudySessions that have timer data
      const studySessions = await prisma.studySession.findMany({
        where: {
          OR: [
            { totalWorkTime: { gt: 0 } },
            { totalRestTime: { gt: 0 } },
            { cyclesCompleted: { gt: 0 } },
            { currentPhase: { not: 'work' } },
          ]
        },
        include: {
          timerEvents: true
        }
      });

      console.log(`📊 Migration: Found ${studySessions.length} sessions with timer data`);

      let migratedCount = 0;

      for (const studySession of studySessions) {
        console.log(`🔄 Migration: Processing StudySession ${studySession.id}...`);

        // Create a new TimerSession with the timer data from StudySession
        const timerSession = await prisma.timerSession.create({
          data: {
            deckSessionId: studySession.id,
            userId: studySession.userId,
            workDuration: studySession.workDuration || 1500,
            restDuration: studySession.restDuration || 300,
            isInfinite: studySession.isInfinite || false,
            totalWorkTime: studySession.totalWorkTime,
            totalRestTime: studySession.totalRestTime,
            cyclesCompleted: studySession.cyclesCompleted,
            currentPhase: studySession.currentPhase || 'work',
            previousPhase: studySession.previousPhase,
            elapsedTimeInPhase: studySession.elapsedTimeInPhase || 0,
            phaseStartedAt: studySession.phaseStartedAt,
            startedAt: studySession.startedAt,
            completedAt: studySession.currentPhase === 'completed' ? new Date() : null,
          }
        });

        console.log(`✅ Migration: Created TimerSession ${timerSession.id} for StudySession ${studySession.id}`);

        // Update TimerEvents to reference the new TimerSession
        if (studySession.timerEvents.length > 0) {
          await prisma.timerEvent.updateMany({
            where: {
              sessionId: studySession.id
            },
            data: {
              timerSessionId: timerSession.id
            }
          });

          console.log(`🔗 Migration: Updated ${studySession.timerEvents.length} timer events for TimerSession ${timerSession.id}`);
        }

        migratedCount++;
      }

      console.log(`🎉 Migration: Successfully migrated ${migratedCount} sessions to TimerSession model`);

      // Verify migration
      const timerSessionCount = await prisma.timerSession.count();
      const eventsWithTimerSession = await prisma.timerEvent.count({
        where: { timerSessionId: { not: null } }
      });

      console.log(`📋 Migration: Verification - ${timerSessionCount} TimerSessions created`);
      console.log(`📋 Migration: Verification - ${eventsWithTimerSession} TimerEvents linked to TimerSessions`);

    } catch (error) {
      console.error('❌ Migration: Failed to migrate timer data:', error);
      throw error;
    }
  }

  /**
   * Verify that all timer data has been properly migrated
   */
  static async verifyMigration(): Promise<void> {
    console.log('🔍 Migration: Verifying migration...');

    const studySessionsWithTimerData = await prisma.studySession.count({
      where: {
        OR: [
          { totalWorkTime: { gt: 0 } },
          { totalRestTime: { gt: 0 } },
          { cyclesCompleted: { gt: 0 } }
        ]
      }
    });

    const timerSessions = await prisma.timerSession.count();
    const orphanedEvents = await prisma.timerEvent.count({
      where: {
        sessionId: { not: null },
        timerSessionId: null
      }
    });

    console.log(`📊 Migration Verification:`);
    console.log(`  - StudySessions with timer data: ${studySessionsWithTimerData}`);
    console.log(`  - TimerSessions created: ${timerSessions}`);
    console.log(`  - Orphaned timer events: ${orphanedEvents}`);

    if (orphanedEvents > 0) {
      console.warn('⚠️  Migration: Warning - Some timer events are not linked to TimerSessions');
    }
  }

  /**
   * Cleanup old timer fields from StudySession after migration is verified
   * This is a separate step to ensure safe migration
   */
  static async cleanupOldTimerFields(): Promise<void> {
    console.log('🧹 Migration: Starting cleanup of old timer fields...');

    // Note: This would involve updating the Prisma schema to remove timer fields
    // from StudySession and then running prisma db push
    console.log('📝 Migration: Cleanup requires manual schema update and db push');
    console.log('   1. Remove timer fields from StudySession in schema.prisma');
    console.log('   2. Run: npx prisma db push --accept-data-loss');
  }
}