import { PrismaClient } from '@prisma/client';
import { StudySessionService } from '../services/studySessionService.js';

const prisma = new PrismaClient();
const studySessionService = new StudySessionService();

/**
 * Test script to verify reset functionality maintains single session rule
 */
async function testResetFunctionality() {
  console.log('🧪 Testing reset functionality and single session rule...');

  try {
    const testUserId = 3; // Use existing user
    const testQuestionSetId = 1; // Use existing question set

    // Step 1: Check initial state
    console.log('\n📊 Step 1: Checking initial state');
    const initialSessions = await prisma.studySession.findMany({
      where: {
        userId: testUserId,
        questionSetId: testQuestionSetId,
      },
      include: {
        sessionAnswers: true,
        timerSessions: true,
      }
    });

    console.log(`Initial state: ${initialSessions.length} sessions found`);
    initialSessions.forEach((session, index) => {
      console.log(`  Session ${index + 1}: id=${session.id}, completed=${!!session.completedAt}, answers=${session.sessionAnswers.length}, timers=${session.timerSessions.length}`);
    });

    // Step 2: Create/get an active session
    console.log('\n📝 Step 2: Creating/getting active session');
    const activeSession = await studySessionService.startOrResumeSession(testUserId, {
      questionSetId: testQuestionSetId,
      mode: 'front-to-end'
    });

    console.log(`Active session created: id=${activeSession.id}`);

    // Step 3: Add some answers to simulate progress
    console.log('\n✏️ Step 3: Adding sample answers to simulate progress');
    await prisma.sessionAnswer.createMany({
      data: [
        {
          sessionId: activeSession.id,
          questionId: 1,
          userRating: 4,
        },
        {
          sessionId: activeSession.id,
          questionId: 2,
          userRating: 5,
        }
      ]
    });

    // Step 4: Check that only one active session exists
    console.log('\n🔍 Step 4: Verifying single active session rule');
    const activeSessions = await prisma.studySession.findMany({
      where: {
        userId: testUserId,
        questionSetId: testQuestionSetId,
        completedAt: null,
      },
      include: {
        sessionAnswers: true,
      }
    });

    console.log(`Active sessions found: ${activeSessions.length} (should be 1)`);
    if (activeSessions.length !== 1) {
      throw new Error(`Expected 1 active session, found ${activeSessions.length}`);
    }

    const sessionWithProgress = activeSessions[0];
    console.log(`Session ${sessionWithProgress.id} has ${sessionWithProgress.sessionAnswers.length} answers`);

    // Step 5: Reset the session
    console.log('\n🔄 Step 5: Resetting session');
    const resetSession = await studySessionService.resetSession(
      testUserId,
      testQuestionSetId,
      'front-to-end'
    );

    console.log(`Reset completed. New session id: ${resetSession.id}`);

    // Step 6: Verify reset results
    console.log('\n✅ Step 6: Verifying reset results');

    // Check that old session is completely deleted
    const oldSessionExists = await prisma.studySession.findUnique({
      where: { id: sessionWithProgress.id }
    });

    if (oldSessionExists) {
      throw new Error(`Old session ${sessionWithProgress.id} still exists after reset!`);
    }
    console.log(`✓ Old session ${sessionWithProgress.id} was properly deleted`);

    // Check that new session exists and is clean
    const newSession = await prisma.studySession.findUnique({
      where: { id: resetSession.id },
      include: {
        sessionAnswers: true,
        timerSessions: true,
      }
    });

    if (!newSession) {
      throw new Error('New session not found!');
    }

    console.log(`✓ New session ${newSession.id} created successfully`);
    console.log(`✓ New session has ${newSession.sessionAnswers.length} answers (should be 0)`);
    console.log(`✓ New session has ${newSession.timerSessions.length} timer sessions (should be 0)`);

    if (newSession.sessionAnswers.length !== 0) {
      throw new Error('New session should have 0 answers');
    }

    if (newSession.timerSessions.length !== 0) {
      throw new Error('New session should have 0 timer sessions');
    }

    // Step 7: Verify single session rule is maintained
    console.log('\n🔒 Step 7: Verifying single session rule is maintained');
    const finalActiveSessions = await prisma.studySession.findMany({
      where: {
        userId: testUserId,
        questionSetId: testQuestionSetId,
        completedAt: null,
      }
    });

    console.log(`Final active sessions: ${finalActiveSessions.length} (should be 1)`);
    if (finalActiveSessions.length !== 1) {
      throw new Error(`Expected 1 active session after reset, found ${finalActiveSessions.length}`);
    }

    if (finalActiveSessions[0].id !== resetSession.id) {
      throw new Error('Active session ID mismatch after reset');
    }

    console.log(`✓ Single session rule maintained - only session ${resetSession.id} is active`);

    // Step 8: Test that we can't create multiple sessions
    console.log('\n🚫 Step 8: Testing that multiple sessions aren\'t created');
    const anotherSession = await studySessionService.startOrResumeSession(testUserId, {
      questionSetId: testQuestionSetId,
      mode: 'shuffle'
    });

    if (anotherSession.id !== resetSession.id) {
      throw new Error('New session created instead of reusing existing one!');
    }

    console.log(`✓ Existing session reused - id ${anotherSession.id} matches expected ${resetSession.id}`);

    console.log('\n🎉 All tests passed! Reset functionality works correctly:');
    console.log('  ✅ Completely deletes old session and all associated data');
    console.log('  ✅ Creates fresh new session with clean state');
    console.log('  ✅ Maintains single active session rule');
    console.log('  ✅ Subsequent session creation reuses the existing session');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

testResetFunctionality();