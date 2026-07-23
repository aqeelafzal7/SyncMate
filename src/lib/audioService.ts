// Audio synthesizer and speech helpers for SyncMate Phase 3

/**
 * Play a soothing double-chime bell sound using Web Audio API
 */
export function playCompletionChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    // First chime (A5 - 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 1.2);

    // Second chime (C#6 - 1108.73Hz) slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.18);
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 1.5);
  } catch (err) {
    console.warn('Audio synthesis non-critical error:', err);
  }
}

/**
 * Speak text using window.speechSynthesis
 */
export function speakResponse(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Strip JSON or code blocks before speaking
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\{[\s\S]*?\}/g, '')
    .trim();

  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.lang = 'en-US';

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('Speech synthesis error:', e);
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop speech synthesis
 */
export function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
