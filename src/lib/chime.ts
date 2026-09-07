// Parosa — order alert chime (Web Audio, no asset file needed).
// Browsers block audio until a user gesture, so call primeAudio() from a click first.

type Ctx = AudioContext & { webkitAudioContext?: never };
let ctx: AudioContext | null = null;

export function primeAudio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** A warm two-note "ding-dong" — the sound a new order makes. */
export function playChime() {
  const c = primeAudio();
  if (!c) return;
  const now = c.currentTime;
  const notes = [880, 1174.7]; // A5 → D6
  notes.forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = f;
    o.connect(g);
    g.connect(c.destination);
    const t = now + i * 0.19;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.start(t);
    o.stop(t + 0.65);
  });
}

export type { Ctx };
