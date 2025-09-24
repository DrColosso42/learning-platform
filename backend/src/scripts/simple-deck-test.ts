import { PrismaClient } from '@prisma/client';
import { TimerSessionService } from '../services/timerSessionService.js';

const prisma = new PrismaClient();
const timerService = new TimerSessionService();

/**
 * Simple test to verify deck progress is preserved during timer operations
 */
async function simpleTest() {
  console.log('🧪 Simple deck progress preservation test...');

  try {
    // Find a deck session with answers
    const session = await prisma.studySession.findFirst({
      where: {
        sessionAnswers: { some: {} }
      },
      include: {
        sessionAnswers: true,
        timerSessions: true,
      }
    });

    if (!session) {
      console.log('❌ No deck session with answers found');
      return;
    }

    console.log(`📊 Testing with deck session ${session.id}`);
    console.log(`📝 Current state: ${session.sessionAnswers.length} answers, ${session.timerSessions.length} timer sessions`);

    const originalAnswerCount = session.sessionAnswers.length;

    // Test: Start timer
    console.log('\n🔄 Starting timer...');
    await timerService.startTimer(session.id, session.userId, {
      workDuration: 900,
      restDuration: 300,
      isInfinite: false
    });

    // Check answers are unchanged
    const afterStart = await prisma.studySession.findUnique({
      where: { id: session.id },
      select: {
        sessionAnswers: { select: { id: true } },
        timerSessions: { select: { id: true } }
      }
    });

    console.log(`✅ After starting: ${afterStart?.sessionAnswers.length} answers (expected: ${originalAnswerCount})`);
    if (afterStart?.sessionAnswers.length !== originalAnswerCount) {
      throw new Error('❌ Answer count changed!');
    }

    // Test: Pause timer
    console.log('\n⏸️ Pausing timer...');
    await timerService.pauseTimer(session.id);

    const afterPause = await prisma.studySession.findUnique({
      where: { id: session.id },
      select: { sessionAnswers: { select: { id: true } } }
    });

    console.log(`✅ After pausing: ${afterPause?.sessionAnswers.length} answers (expected: ${originalAnswerCount})`);
    if (afterPause?.sessionAnswers.length !== originalAnswerCount) {
      throw new Error('❌ Answer count changed after pause!');
    }

    // Test: Resume timer
    console.log('\n▶️ Resuming timer...');
    await timerService.startTimer(session.id, session.userId);

    const afterResume = await prisma.studySession.findUnique({
      where: { id: session.id },
      select: { sessionAnswers: { select: { id: true } } }
    });

    console.log(`✅ After resuming: ${afterResume?.sessionAnswers.length} answers (expected: ${originalAnswerCount})`);
    if (afterResume?.sessionAnswers.length !== originalAnswerCount) {
      throw new Error('❌ Answer count changed after resume!');
    }

    // Test: Stop timer
    console.log('\n⏹️ Stopping timer...');
    await timerService.stopTimer(session.id);

    const afterStop = await prisma.studySession.findUnique({
      where: { id: session.id },
      select: {
        sessionAnswers: { select: { id: true } },
        timerSessions: { select: { id: true } }
      }
    });

    console.log(`✅ After stopping: ${afterStop?.sessionAnswers.length} answers (expected: ${originalAnswerCount})`);
    console.log(`🔢 Timer sessions created: ${afterStop?.timerSessions.length}`);

    if (afterStop?.sessionAnswers.length !== originalAnswerCount) {
      throw new Error('❌ Answer count changed after stop!');
    }

    console.log('\n🎉 SUCCESS! All timer operations preserved deck progress');
    console.log('✅ Deck session and timer session are properly separated');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

simpleTest();