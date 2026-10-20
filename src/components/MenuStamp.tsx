"use client";

import { useEffect, useState } from "react";
import { getPublicCard, rewardText } from "@/lib/loyalty";
import "./menustamp.css";

/*
 * The maroon stamp card at the top of the QR menu.
 * Starts folded as one line with a bouncing arrow; tapping opens the card.
 * Ticks come only from paid bills (the database adds them), so an order that
 * isn't paid yet shows as a dotted "pending" circle.
 */

const PENDING_KEY = "parosa-stamp-pending";
const DAY = 86400000;

/** Remember that this phone just ordered with a number, so the next tick shows as pending. */
export function markStampPending(slug: string) {
  try {
    const m = JSON.parse(localStorage.getItem(PENDING_KEY) || "{}");
    m[slug] = new Date().toISOString();
    localStorage.setItem(PENDING_KEY, JSON.stringify(m));
  } catch { /* private mode */ }
}
function pendingSince(slug: string): string | null {
  try { return (JSON.parse(localStorage.getItem(PENDING_KEY) || "{}") as Record<string, string>)[slug] ?? null; } catch { return null; }
}

/** The tick row + caption. Shared by the menu and the owner's preview. */
export function StampStrip({ name, goal, stamps, reward, pending = false, fresh = false }: {
  name: string; goal: number; stamps: number; reward?: string | null; pending?: boolean; fresh?: boolean;
}) {
  const g = Math.max(2, goal);
  const have = Math.min(stamps, g);
  const full = stamps >= g;
  const left = Math.max(0, g - stamps);
  const prize = rewardText(reward);
  return (
    <div className={`ms-card${full ? " full" : ""}`}>
      <div className="ms-hd">
        <b>{name}</b>
        <span>{fresh ? "Stamp card" : `${have} of ${g} ✓`}</span>
      </div>
      <div className="ms-ticks" style={{ gridTemplateColumns: `repeat(${g <= 10 ? g : Math.ceil(g / 2)}, minmax(0, 1fr))` }}>
        {Array.from({ length: g }, (_, i) => {
          const on = i < have;
          const pend = pending && !full && i === have;
          return (
            <span key={i} className={on ? "on" : pend ? "pend" : ""} aria-hidden>
              {on && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
            </span>
          );
        })}
      </div>
      <p className="ms-cap">
        {full ? <>Card full! Show this at the counter for <b>{prize}</b>.</>
          : fresh ? <>Order, add your number at checkout and pay — you get your first tick. {g} ticks = <b>{prize}</b>.</>
          : pending ? <>Your new tick lands once your bill is paid. {left} more for <b>{prize}</b>.</>
          : <>{left} more visit{left === 1 ? "" : "s"} for <b>{prize}</b>.</>}
      </p>
    </div>
  );
}

export function MenuStampCard({ slug, name, goal, reward, token }: {
  slug: string; name: string; goal: number; reward?: string | null; token: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [stamps, setStamps] = useState(0);
  const [pending, setPending] = useState(false);
  const [liveGoal, setLiveGoal] = useState(goal);

  useEffect(() => {
    let alive = true;
    (async () => {
      const since = pendingSince(slug);
      const recent = !!since && Date.now() - new Date(since).getTime() < DAY;
      if (!token) { if (alive) setPending(false); return; }
      const c = await getPublicCard(token);
      if (!alive || !c) return;
      setStamps(c.stamps);
      setLiveGoal(c.goal || goal);
      // Pending until a stamp newer than the order arrives.
      setPending(recent && (!c.last_stamp_at || new Date(c.last_stamp_at) < new Date(since!)));
    })();
    return () => { alive = false; };
  }, [slug, token, goal]);

  const fresh = !token;
  const full = stamps >= liveGoal;
  const teaser = fresh ? `Collect stamps · ${liveGoal} visits = ${rewardText(reward)}`
    : full ? "Your reward is ready 🎉"
    : `Your stamp card · ${Math.min(stamps, liveGoal)}/${liveGoal}${pending ? " · 1 on the way" : ""}`;

  return (
    <section className={`ms-wrap${open ? " open" : ""}`}>
      <button className="ms-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="star" aria-hidden>★</span>
        <span className="tx">{teaser}</span>
        <svg className="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <div className="ms-drop" hidden={!open}>
        <StampStrip name={name} goal={liveGoal} stamps={stamps} reward={reward} pending={pending} fresh={fresh} />
        {token && <a className="ms-link" href={`/${slug}/card/${token}`}>Open my full card →</a>}
      </div>
    </section>
  );
}
