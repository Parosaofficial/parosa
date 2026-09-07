// Parosa — order "ka-ching" (cash-register / Shopify-style sale sound).
// Web Audio, no asset file. Browsers block audio until a user gesture,
// so call primeAudio() from a click first.

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

// one bright bell hit (triangle + sine partial, fast attack, ringing decay)
function ding(c: AudioContext, freq: number, t: number, gain = 0.5, dur = 0.42) {
  [{ type: "triangle" as OscillatorType, g: gain }, { type: "sine" as OscillatorType, g: gain * 0.5, mul: 2.01 }].forEach((p) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = p.type;
    o.frequency.value = freq * (p.mul ?? 1);
    o.connect(g);
    g.connect(c.destination);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(p.g, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  });
}

/** The "ka-ching" — two quick bright notes rising, like a cash register ringing up a sale. */
export function playChime() {
  const c = primeAudio();
  if (!c) return;
  const t = c.currentTime;
  ding(c, 1046.5, t, 0.45, 0.16);       // C6 — short "ka"
  ding(c, 1568.0, t + 0.085, 0.5, 0.5); // G6 — ringing "ching"
}
