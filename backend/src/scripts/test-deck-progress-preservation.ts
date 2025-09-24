import { PrismaClient } from '@prisma/client';
import { TimerSessionService } from '../services/timerSessionService.js';

const prisma = new PrismaClient();
const timerService = new TimerSessionService();

/**
 * Test script to verify that deck progress is preserved during timer operations
 * This ensures that timer operations never interfere with question answering progress
 */
async function testDeckProgressPreservation() {
  console.log('🧪 Starting deck progress preservation test...');

  try {
    // Find an existing deck session with answers (progress)
    const existingSession = await prisma.studySession.findFirst({
      where: {
        sessionAnswers: {
          some: {}
        }
      },
      include: {
        sessionAnswers: {
          select: {
            id: true,
            questionId: true,
            userRating: true,
            answeredAt: true,
          }
        },
        timerSessions: true,
      }
    });

    if (!existingSession) {
      console.log('❌ No existing deck session with progress found');
      return;
    }

    console.log(`📊 Found deck session ${existingSession.id} with ${existingSession.sessionAnswers.length} answers`);
    console.log(`⏱️  Deck session has ${existingSession.timerSessions.length} timer sessions`);

    // Store original progress - focus on what matters: answer count and answer IDs
    const originalAnswersCount = existingSession.sessionAnswers.length;
    const originalAnswerIds = existingSession.sessionAnswers.map(a => a.id).sort();
    const originalCompletedAtTime = existingSession.completedAt?.getTime();
    const originalTimerSessionsCount = existingSession.timerSessions.length;

    console.log(`📝 Original deck state:`);
    console.log(`   - ${originalAnswersCount} answers with IDs: [${originalAnswerIds.slice(0, 3).join(', ')}...]`);
    console.log(`   - Completed: ${existingSession.completedAt ? 'Yes' : 'No'}`);
    console.log(`   - Timer sessions: ${originalTimerSessionsCount}`);

    console.log('\n🎯 Test 1: Starting timer should not affect deck progress');

    // Start a new timer session for this deck
    await timerService.startTimer(existingSession.id, existingSession.userId, {
      workDuration: 900, // 15 minutes
      restDuration: 300, // 5 minutes
      isInfinite: false
    });

    // Check deck session after starting timer
    const sessionAfterStart = await prisma.studySession.findUnique({
      where: { id: existingSession.id },
      include: {
        sessionAnswers: {
          select: {
            id: true,
            questionId: true,
            userRating: true,
            answeredAt: true,
          }
        },
        timerSessions: true,
      }
    });

    const newAnswerIds = sessionAfterStart?.sessionAnswers.map(a => a.id).sort();
    const currentCompletedAtTime = sessionAfterStart?.completedAt?.getTime();

    console.log(`✅ After starting timer:`);
    console.log(`   - Deck answers: ${sessionAfterStart?.sessionAnswers.length} (should be ${originalAnswersCount})`);
    console.log(`   - Completion status unchanged: ${currentCompletedAtTime === originalCompletedAtTime ? 'Yes' : 'No'}`);
    console.log(`   - Timer sessions: ${sessionAfterStart?.timerSessions.length} (should be ${originalTimerSessionsCount + 1})`);

    // Verify no changes to deck progress
    if (sessionAfterStart?.sessionAnswers.length !== originalAnswersCount) {
      throw new Error(`❌ Deck answer count changed! Expected ${originalAnswersCount}, got ${sessionAfterStart?.sessionAnswers.length}`);
    }

    if (JSON.stringify(newAnswerIds) !== JSON.stringify(originalAnswerIds)) {
      throw new Error(`❌ Deck answers changed! Original: [${originalAnswerIds.join(',')}], New: [${newAnswerIds?.join(',')}]`);
    }

    if (currentCompletedAtTime !== originalCompletedAtTime) {
      throw new Error(`❌ Deck completion status changed!`);
    }

    console.log('\n🎯 Test 2: Pausing timer should not affect deck progress');

    // Pause the timer
    await timerService.pauseTimer(existingSession.id);

    // Check deck session after pausing timer
    const sessionAfterPause = await prisma.studySession.findUnique({
      where: { id: existingSession.id },
      include: {
        sessionAnswers: true,
        timerSessions: true,
      }
    });

    console.log(`✅ After pausing timer:`);
    console.log(`   - Deck answers: ${sessionAfterPause?.sessionAnswers.length} (should be ${originalAnswersCount})`);
    console.log(`   - Deck completedAt: ${sessionAfterPause?.completedAt} (should be ${originalCompletedAt})`);

    // Verify no changes to deck progress
    if (sessionAfterPause?.sessionAnswers.length !== originalAnswersCount) {
      throw new Error(`❌ Deck progress changed after pause! Expected ${originalAnswersCount} answers, got ${sessionAfterPause?.sessionAnswers.length}`);
    }

    console.log('\n🎯 Test 3: Resuming timer should not affect deck progress');

    // Resume the timer
    await timerService.startTimer(existingSession.id, existingSession.userId);

    // Check deck session after resuming timer
    const sessionAfterResume = await prisma.studySession.findUnique({
      where: { id: existingSession.id },
      include: {
        sessionAnswers: true,
        timerSessions: true,
      }
    });

    console.log(`✅ After resuming timer:`);
    console.log(`   - Deck answers: ${sessionAfterResume?.sessionAnswers.length} (should be ${originalAnswersCount})`);
    console.log(`   - Deck completedAt: ${sessionAfterResume?.completedAt} (should be ${originalCompletedAt})`);

    // Verify no changes to deck progress
    if (sessionAfterResume?.sessionAnswers.length !== originalAnswersCount) {
      throw new Error(`❌ Deck progress changed after resume! Expected ${originalAnswersCount} answers, got ${sessionAfterResume?.sessionAnswers.length}`);
    }

    console.log('\n🎯 Test 4: Stopping timer should not affect deck progress');

    // Stop the timer
    await timerService.stopTimer(existingSession.id);

    // Check deck session after stopping timer
    const sessionAfterStop = await prisma.studySession.findUnique({
      where: { id: existingSession.id },
      include: {
        sessionAnswers: true,
        timerSessions: true,
      }
    });

    console.log(`✅ After stopping timer:`);
    console.log(`   - Deck answers: ${sessionAfterStop?.sessionAnswers.length} (should be ${originalAnswersCount})`);
    console.log(`   - Deck completedAt: ${sessionAfterStop?.completedAt} (should be ${originalCompletedAt})`);

    // Verify no changes to deck progress
    if (sessionAfterStop?.sessionAnswers.length !== originalAnswersCount) {
      throw new Error(`❌ Deck progress changed after stop! Expected ${originalAnswersCount} answers, got ${sessionAfterStop?.sessionAnswers.length}`);
    }

    console.log('\n🎯 Test 5: Creating multiple timer sessions for same deck');

    // Start another timer session for the same deck
    await timerService.startTimer(existingSession.id, existingSession.userId, {
      workDuration: 1200, // 20 minutes
      restDuration: 240,  // 4 minutes
      isInfinite: true
    });

    const sessionAfterSecondTimer = await prisma.studySession.findUnique({
      where: { id: existingSession.id },
      include: {
        sessionAnswers: true,
        timerSessions: true,
      }
    });

    console.log(`✅ After starting second timer session:`);
    console.log(`   - Deck answers: ${sessionAfterSecondTimer?.sessionAnswers.length} (should be ${originalAnswersCount})`);
    console.log(`   - Timer sessions: ${sessionAfterSecondTimer?.timerSessions.length} (should be ${originalTimerSessionsCount + 2})`);

    // Verify deck progress is still unchanged but timer sessions increased
    if (sessionAfterSecondTimer?.sessionAnswers.length !== originalAnswersCount) {
      throw new Error(`❌ Deck progress changed with multiple timers! Expected ${originalAnswersCount} answers, got ${sessionAfterSecondTimer?.sessionAnswers.length}`);
    }

    if (sessionAfterSecondTimer?.timerSessions.length !== originalTimerSessionsCount + 2) {
      console.log(`⚠️  Expected ${originalTimerSessionsCount + 2} timer sessions, got ${sessionAfterSecondTimer?.timerSessions.length}`);
    }

    console.log('\n✅ All tests passed! Deck progress is properly preserved during timer operations');
    console.log('🎉 Timer and deck sessions are successfully separated');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

testDeckProgressPreservation();