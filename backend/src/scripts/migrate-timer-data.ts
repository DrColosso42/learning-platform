import { MigrationService } from '../services/migrationService.js';

/**
 * Script to migrate timer data from StudySession to TimerSession
 * Run with: npx tsx src/scripts/migrate-timer-data.ts
 */
async function main() {
  console.log('🔄 Starting timer data migration...');

  try {
    // Run the migration
    await MigrationService.migrateTimerData();

    // Verify the results
    await MigrationService.verifyMigration();

    console.log('✅ Migration completed successfully!');
    console.log('🔗 Timer data has been moved to TimerSession table');
    console.log('📊 Deck progress remains preserved in StudySession table');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();