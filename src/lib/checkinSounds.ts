let ctx: AudioContext | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, start: number, duration: number, type: OscillatorType, volume = 0.2) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

/** Bright two-note chime for a successful check-in. */
export function playSuccess() {
  tone(880, 0, 0.15, "sine");
  tone(1320, 0.12, 0.25, "sine");
}

/** Low buzz for duplicates or invalid passes. */
export function playError() {
  tone(180, 0, 0.18, "square", 0.12);
  tone(150, 0.2, 0.25, "square", 0.12);
}

/** Call from a user click to unlock audio on mobile browsers. */
export function unlockAudio() {
  getCtx();
}
