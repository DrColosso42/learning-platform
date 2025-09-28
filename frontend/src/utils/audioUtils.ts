/**
 * Audio notification utilities for timer events
 * Provides different sounds for work and rest period endings
 */

// Audio context for generating beep sounds
let audioContext: AudioContext | null = null;

/**
 * Initialize audio context (required for user interaction)
 */
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Generate a beep sound with specified frequency and duration
 */
const generateBeep = (frequency: number, duration: number, volume: number = 0.3) => {
  const ctx = initAudioContext();

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
};

/**
 * Play work period end sound (higher pitch, more urgent)
 */
export const playWorkEndSound = () => {
  try {
    // Three ascending beeps for work end
    generateBeep(800, 0.2); // High pitch
    setTimeout(() => generateBeep(1000, 0.2), 250);
    setTimeout(() => generateBeep(1200, 0.3), 500);
    console.log('🔔 Work period end sound played');
  } catch (error) {
    console.log('Could not play work end sound:', error);
  }
};

/**
 * Play rest period end sound (lower pitch, gentle)
 */
export const playRestEndSound = () => {
  try {
    // Two gentle beeps for rest end
    generateBeep(600, 0.3); // Lower pitch
    setTimeout(() => generateBeep(700, 0.4), 400);
    console.log('🔔 Rest period end sound played');
  } catch (error) {
    console.log('Could not play rest end sound:', error);
  }
};

/**
 * Play a simple notification beep
 */
export const playNotificationSound = () => {
  try {
    generateBeep(800, 0.2);
    console.log('🔔 Notification sound played');
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};

/**
 * Initialize audio on user interaction (required by browser policies)
 */
export const initializeAudio = () => {
  try {
    initAudioContext();
    // Play a silent sound to "unlock" audio for future use
    generateBeep(0, 0.001, 0);
    console.log('🔊 Audio system initialized');
  } catch (error) {
    console.log('Could not initialize audio:', error);
  }
};