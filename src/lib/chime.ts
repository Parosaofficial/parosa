// Parosa — order "ka-ching": the Cha-Ching sound in public/sounds/cha-ching.mp3,
// with a small Web Audio chime as the backup if the file can't play.
// Browsers block audio until a user gesture, so call primeAudio() from a click first.

let ctx: AudioContext | null = null;
let kaching: HTMLAudioElement | null = null;
const KACHING_SRC = "/sounds/cha-ching.mp3";

export function primeAudio(): AudioContext | null {
  try {
    // unlock the sound file too (a silent play during the click)
    if (!kaching && typeof Audio !== "undefined") {
      kaching = new Audio(KACHING_SRC);
      kaching.preload = "auto";
      kaching.volume = 0;
      kaching.play().then(() => { kaching!.pause(); kaching!.currentTime = 0; kaching!.volume = 1; }).catch(() => { if (kaching) kaching.volume = 1; });
    }
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

/** New order / guest call: the Cha-Ching sound; the synthesized chime if the file can't play. */
export function playChime() {
  try {
    const a = kaching ?? new Audio(KACHING_SRC);
    kaching = a;
    a.volume = 1;
    a.currentTime = 0;
    a.play().catch(() => synthChime());
  } catch {
    synthChime();
  }
}

/** The backup "ka-ching" — two quick bright notes rising, like a cash register ringing up a sale. */
function synthChime() {
  const c = primeAudio();
  if (!c) return;
  const t = c.currentTime;
  ding(c, 1046.5, t, 0.45, 0.16);       // C6 — short "ka"
  ding(c, 1568.0, t + 0.085, 0.5, 0.5); // G6 — ringing "ching"
}
