import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Cleanup orphaned timer events that don't have a timerSessionId
 */
async function main() {
  console.log('🧹 Cleaning up orphaned timer events...');

  try {
    const orphanedEvents = await prisma.timerEvent.findMany({
      where: {
        timerSessionId: null
      }
    });

    console.log(`📋 Found ${orphanedEvents.length} orphaned timer events`);

    if (orphanedEvents.length > 0) {
      // Delete orphaned events
      const deleteResult = await prisma.timerEvent.deleteMany({
        where: {
          timerSessionId: null
        }
      });

      console.log(`🗑️  Deleted ${deleteResult.count} orphaned timer events`);
    }

    console.log('✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();