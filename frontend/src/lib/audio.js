/**
 * Synthesizes a high-tech alarm alert sound using Web Audio API.
 * This avoids requiring external audio asset files and guarantees immediate playback.
 */
export const playAlertSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    
    // Synth sound: dual-tone warning alarm
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
    osc1.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15); // A5 -> A4
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(554.37, audioCtx.currentTime); // C#5
    osc2.frequency.exponentialRampToValueAtTime(277.18, audioCtx.currentTime + 0.15); // C#5 -> C#4

    // Quick volume envelope to avoid clicking and make it sound like a ping
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.35);
    osc2.stop(audioCtx.currentTime + 0.35);
  } catch (error) {
    console.warn('Web Audio API failed to synthesize sound:', error);
  }
};
