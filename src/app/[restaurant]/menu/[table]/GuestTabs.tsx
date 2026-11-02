"use client";

import { useEffect, useRef, useState } from "react";
import { StampStrip } from "@/components/MenuStamp";
import { createOrder } from "@/lib/db";
import { getPublicCard, rewardText } from "@/lib/loyalty";
import type { Order, Restaurant } from "@/lib/types";
import type { TableSessionState } from "./SessionGate";
import "./guesttabs.css";

/*
 * The guest's bottom bar on the QR menu: Menu · Custom · Loyalty · Waiter.
 * Custom sends a dish the menu doesn't have, at the guest's price; Loyalty
 * shows the stamp card and a scratch card that unlocks when it's full; Waiter
 * shows who's looking after the table and calls them.
 */

export type GuestTab = "menu" | "custom" | "loyalty" | "waiter";

const Icon = ({ d }: { d: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const TABS: { id: GuestTab; label: string; icon: React.ReactNode }[] = [
  { id: "menu", label: "Menu", icon: <><path d="M4 5h16M4 12h16M4 19h10" /></> },
  { id: "custom", label: "Custom", icon: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></> },
  { id: "loyalty", label: "Loyalty", icon: <><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9Z" /></> },
  { id: "waiter", label: "Waiter", icon: <><path d="M6 17h12M8 17a4 4 0 0 1 8 0" /><path d="M5 17a7 7 0 0 1 14 0" /><path d="M12 6V4M4 20h16" /></> },
];

export function GuestNav({ tab, onTab, waiterBusy }: { tab: GuestTab; onTab: (t: GuestTab) => void; waiterBusy?: boolean }) {
  return (
    <nav className="gt-nav" aria-label="Menu sections">
      {TABS.map((t) => (
        <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => onTab(t.id)} aria-current={tab === t.id ? "page" : undefined}>
          <Icon d={t.icon} />
          <span>{t.label}</span>
          {t.id === "waiter" && waiterBusy && <i className="gt-dot" aria-label="waiter called" />}
        </button>
      ))}
    </nav>
  );
}

/** Shown in a tab when ordering needs the table confirmed first. */
function ConfirmTable({ onAsk, text }: { onAsk: () => void; text: string }) {
  return (
    <div className="gt-confirm">
      <p>{text}</p>
      <button className="gt-btn" onClick={onAsk}>Confirm I&apos;m at the table</button>
    </div>
  );
}

/* ---------------- Custom: a dish that isn't on the menu ---------------- */

export function CustomPanel({ restaurant, table, ts, onAsk, onSent }: {
  restaurant: Restaurant; table: string; ts: TableSessionState; onAsk: () => void; onSent: (o: Order) => void;
}) {
  const [text, setText] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    const what = text.trim();
    if (what.length < 3) { setErr("Tell the kitchen what you'd like."); return; }
    const each = Math.max(0, Math.round(Number(price) || 0));
    setBusy(true); setErr("");
    try {
      const total = each * qty;
      const order = await createOrder({
        restaurantId: restaurant.id, table,
        items: [{ dish_id: null, name: `Custom: ${what.slice(0, 80)}`, qty, price: each }],
        subtotal: total, gst: 0, total,
        sessionId: ts.sessionId,
        note: each ? `Custom request at the guest's price ₹${each} each` : "Custom request — please set the price with the guest",
      });
      setText(""); setQty(1); setPrice("");
      onSent(order);
    } catch (e) {
      setErr(String((e as { message?: string })?.message ?? "").includes("session has ended")
        ? "Your table was reset. Please confirm your table again."
        : "Couldn't send it. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <section className="gt-panel" aria-labelledby="gt-custom-h">
      <h2 id="gt-custom-h">Ask for something special</h2>
      <p className="gt-sub">Don&apos;t see what you want? Write it here — the kitchen will make it if they can.</p>
      {!ts.canOrder ? (
        <ConfirmTable onAsk={onAsk} text="To send a custom order, first confirm you're at the table." />
      ) : (
        <div className="gt-form">
          <label>What would you like?
            <textarea rows={3} maxLength={160} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Jain paneer tikka, no onion no garlic" />
          </label>
          <div className="gt-row">
            <label className="gt-qty">How many
              <span className="gt-step">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One less">−</button>
                <b>{qty}</b>
                <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="One more">+</button>
              </span>
            </label>
            <label className="gt-price">Your price (each)
              <span className="gt-rs"><i>₹</i><input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Optional" /></span>
            </label>
          </div>
          <p className="gt-hint">{Number(price) > 0 ? `₹${Math.round(Number(price)) * qty} — the restaurant confirms before cooking.` : "Leave the price empty and the restaurant will tell you the price."}</p>
          {err && <p className="gt-err" role="alert">{err}</p>}
          <button className="gt-btn" onClick={send} disabled={busy}>{busy ? "Sending…" : "Send to kitchen"}</button>
        </div>
      )}
    </section>
  );
}

/* ---------------- Loyalty: stamps + a scratch card ---------------- */

export function LoyaltyPanel({ restaurant, enabled, goal, reward, token }: {
  restaurant: Restaurant; enabled: boolean; goal: number; reward?: string | null; token: string | null;
}) {
  const [stamps, setStamps] = useState(0);
  const [liveGoal, setLiveGoal] = useState(goal);
  useEffect(() => {
    if (!token) return;
    let live = true;
    getPublicCard(token).then((c) => { if (live && c) { setStamps(c.stamps); setLiveGoal(c.goal || goal); } });
    return () => { live = false; };
  }, [token, goal]);

  if (!enabled) {
    return (
      <section className="gt-panel">
        <h2>Loyalty</h2>
        <p className="gt-sub">{restaurant.name} hasn&apos;t started a stamp card yet. Check back on your next visit!</p>
      </section>
    );
  }
  const full = stamps >= liveGoal;
  const left = Math.max(0, liveGoal - stamps);
  return (
    <section className="gt-panel">
      <h2>Your stamp card</h2>
      <p className="gt-sub">{token ? `${Math.min(stamps, liveGoal)} of ${liveGoal} visits` : "Add your phone number when you order to start collecting stamps."}</p>
      <div className="gt-stamp"><StampStrip name={restaurant.name} goal={liveGoal} stamps={stamps} reward={reward} fresh={!token} /></div>
      <h3 className="gt-h3">Reward scratch card</h3>
      {full ? (
        <ScratchCard prize={rewardText(reward)} />
      ) : (
        <div className="gt-locked" aria-label="Scratch card locked">
          <span className="gt-lock" aria-hidden="true">🔒</span>
          <b>Locked</b>
          <span>{left} more {left === 1 ? "visit" : "visits"} to unlock your scratch card</span>
          <div className="gt-bar" role="progressbar" aria-valuemin={0} aria-valuemax={liveGoal} aria-valuenow={Math.min(stamps, liveGoal)}>
            <i style={{ width: `${Math.min(100, (stamps / Math.max(1, liveGoal)) * 100)}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}

/** Scratch with a finger (or mouse) to reveal the reward. */
function ScratchCard({ prize }: { prize: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);
  const drawing = useRef(false);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = r.width * dpr; c.height = r.height * dpr;
    const g = c.getContext("2d")!; g.scale(dpr, dpr);
    const grad = g.createLinearGradient(0, 0, r.width, r.height);
    grad.addColorStop(0, "#5C0F14"); grad.addColorStop(1, "#8A2A31");
    g.fillStyle = grad; g.fillRect(0, 0, r.width, r.height);
    g.fillStyle = "#F3D9A4"; g.font = "700 17px system-ui, sans-serif"; g.textAlign = "center";
    g.fillText("Scratch here ✨", r.width / 2, r.height / 2 + 6);
  }, []);

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || done) return;
    const c = ref.current!; const r = c.getBoundingClientRect(); const g = c.getContext("2d")!;
    g.globalCompositeOperation = "destination-out";
    g.beginPath(); g.arc(e.clientX - r.left, e.clientY - r.top, 22, 0, Math.PI * 2); g.fill();
    // check how much is cleared now and then
    if (Math.random() < 0.15) {
      const px = g.getImageData(0, 0, c.width, c.height).data;
      let clear = 0, n = 0;
      for (let i = 3; i < px.length; i += 64) { n++; if (px[i] === 0) clear++; }
      if (clear / n > 0.45) setDone(true);
    }
  };

  return (
    <div className={`gt-scratch${done ? " done" : ""}`}>
      <div className="gt-prize"><span>🎉 You won</span><b>{prize}</b><small>Show this to the staff to claim it.</small></div>
      <canvas
        ref={ref}
        aria-label="Scratch card — scratch to reveal your reward"
        onPointerDown={(e) => { drawing.current = true; (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); scratch(e); }}
        onPointerMove={scratch}
        onPointerUp={() => { drawing.current = false; }}
      />
      {!done && <button className="gt-reveal" onClick={() => setDone(true)}>Reveal</button>}
    </div>
  );
}

/* ---------------- Waiter: who's assigned + call ---------------- */

export function WaiterPanel({ ts, tableTitle, onAsk }: { ts: TableSessionState; tableTitle: string; onAsk: () => void }) {
  const [state, setState] = useState<"idle" | "calling" | "called">("idle");
  const [err, setErr] = useState("");
  const call = async () => {
    setState("calling"); setErr("");
    try { await ts.request("waiter"); setState("called"); setTimeout(() => setState("idle"), 60000); }
    catch { setErr("Couldn't reach the staff. Please try again."); setState("idle"); }
  };
  return (
    <section className="gt-panel gt-waiter">
      <span className="gt-avatar" aria-hidden="true">{ts.waiterName ? ts.waiterName.slice(0, 1).toUpperCase() : "🛎"}</span>
      <h2>{ts.waiterName ? `${ts.waiterName} is looking after you` : "Your waiter"}</h2>
      <p className="gt-sub">{ts.waiterName ? `${ts.waiterName} is your waiter for ${tableTitle}.` : `A waiter will be assigned to ${tableTitle} soon.`}</p>
      {!ts.sessionId ? (
        <ConfirmTable onAsk={onAsk} text="To call a waiter, first confirm you're at the table." />
      ) : (
        <>
          <button className={`gt-call${state === "called" ? " done" : ""}`} onClick={call} disabled={state !== "idle"}>
            {state === "called" ? "✓ Waiter is on the way" : state === "calling" ? "Calling…" : `🛎 Call ${ts.waiterName ?? "a waiter"}`}
          </button>
          <p className="gt-hint">{state === "called" ? "Their phone is buzzing now." : "Their phone will buzz and show your table."}</p>
        </>
      )}
      {err && <p className="gt-err" role="alert">{err}</p>}
    </section>
  );
}
