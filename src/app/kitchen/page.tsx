"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { playChime, primeAudio } from "@/lib/chime";
import {
  forStation, kitchenBoard, kitchenItemDone, kitchenSetStatus, orderSource, tableTitle,
  type KitchenBoard, type KitchenOrder, type KitchenStatus, type Station,
} from "@/lib/kitchen";
import { clearStaffSession, useStaff } from "@/lib/useStaff";
import "./kitchen.css";

/*
 * The kitchen screen (KDS). Runs all day on a tablet, old phone or TV:
 * every order arrives with the Cha-Ching sound, waits in New, moves to
 * Cooking and then Ready. Tickets turn amber and red as they wait. A station
 * screen (Tandoor, Chinese…) shows only its own dishes; the "All" screen is
 * the expo. Marking Ready tells the waiter's phone and the guest.
 */

const POLL_MS = 5000;
const STATION_KEY = "parosa-kds-station";
const LANES: { id: Exclude<KitchenStatus, "served">; title: string }[] = [
  { id: "new", title: "New" },
  { id: "cooking", title: "Cooking" },
  { id: "ready", title: "Ready to serve" },
];

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function Kitchen() {
  const router = useRouter();
  const { staff, ready } = useStaff("/kitchen");
  const [board, setBoard] = useState<KitchenBoard | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "signedout">("loading");
  const [started, setStarted] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  // this screen's station, remembered on the device ("" = All, the expo screen)
  const [station, setStation] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem(STATION_KEY) ?? ""; } catch { return ""; }
  });
  const [lane, setLane] = useState<Exclude<KitchenStatus, "served">>("new"); // phone: one lane at a time
  const [recallOpen, setRecallOpen] = useState(false);
  const [flash, setFlash] = useState<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef<Set<string> | null>(null);
  const soundRef = useRef(soundOn);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  const pickStation = (name: string) => {
    setStation(name);
    try { localStorage.setItem(STATION_KEY, name); } catch { /* private mode */ }
  };

  const load = useCallback(async () => {
    if (!staff) return;
    const b = await kitchenBoard(staff);
    if (!b) { setState("signedout"); return; }
    // new tickets: sound + a short flash
    const ids = b.orders.filter((o) => o.status === "new").map((o) => o.id);
    const fresh = seen.current ? ids.filter((id) => !seen.current!.has(id)) : [];
    seen.current = new Set(b.orders.map((o) => o.id));
    if (fresh.length) {
      if (soundRef.current) { primeAudio(); playChime(); }
      setFlash(fresh);
      setTimeout(() => setFlash([]), 4000);
    }
    setBoard(b);
    setState("ok");
  }, [staff]);

  useEffect(() => {
    if (!staff) return;
    const first = setTimeout(load, 0);
    const t = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const onShow = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearTimeout(first); clearInterval(t); clearInterval(tick); document.removeEventListener("visibilitychange", onShow); };
  }, [staff, load]);

  // keep the screen awake while the kitchen is open
  useEffect(() => {
    if (!started) return;
    let lock: { release: () => Promise<void> } | null = null;
    const ask = async () => {
      try { lock = await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null; } catch { /* not supported */ }
    };
    ask();
    const again = () => { if (document.visibilityState === "visible") ask(); };
    document.addEventListener("visibilitychange", again);
    return () => { document.removeEventListener("visibilitychange", again); lock?.release().catch(() => {}); };
  }, [started]);

  const stations: Station[] = board?.stations ?? [];
  const st = stations.find((s) => s.name === station) ?? null;

  // the orders this screen shows (a station only sees orders with its dishes)
  const orders = useMemo(() => (board?.orders ?? []).filter((o) => forStation(o, st).length > 0), [board, st]);
  // oldest first: new/cooking by order time, ready by when it became ready (serve that one first)
  const byLane = (id: KitchenStatus) => orders.filter((o) => o.status === id)
    .sort((a, b) => (id === "ready" ? (a.ready_at ?? a.created_at).localeCompare(b.ready_at ?? b.created_at) : a.created_at.localeCompare(b.created_at)));

  // "Cooking now": everything not yet done in New + Cooking, added up
  const allDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) {
      if (o.status !== "new" && o.status !== "cooking") continue;
      for (const i of forStation(o, st)) if (!i.done) m.set(i.name, (m.get(i.name) ?? 0) + i.qty);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [orders, st]);

  /* ---------- actions (instant on screen, saved in the background) ---------- */
  const setLocal = (fn: (o: KitchenOrder) => KitchenOrder) => setBoard((b) => b && { ...b, orders: b.orders.map(fn), recent: b.recent.map(fn) });

  const move = async (o: KitchenOrder, status: KitchenStatus) => {
    if (!staff) return;
    setLocal((x) => (x.id === o.id ? { ...x, status, cooking_at: status === "cooking" ? x.cooking_at ?? new Date().toISOString() : x.cooking_at, ready_at: status === "ready" ? new Date().toISOString() : x.ready_at } : x));
    if (status === "served") setBoard((b) => b && { ...b, orders: b.orders.filter((x) => x.id !== o.id), recent: [{ ...o, status: "served", served_at: new Date().toISOString() }, ...b.recent] });
    if (status !== "served" && o.status === "served") setBoard((b) => b && { ...b, recent: b.recent.filter((x) => x.id !== o.id), orders: [...b.orders, { ...o, status }] });
    try { await kitchenSetStatus(staff, o.id, status); } catch { /* the next refresh shows the truth */ }
    load();
  };

  const tick = async (o: KitchenOrder, itemId: string, done: boolean) => {
    if (!staff) return;
    const items = o.items.map((i) => (i.id === itemId ? { ...i, done } : i));
    setLocal((x) => (x.id === o.id ? { ...x, items } : x));
    try { await kitchenItemDone(staff, itemId, done); } catch { /* next refresh */ }
    // a station finishing the last open item of the order sends it to Ready
    if (done && items.every((i) => i.done) && o.status === "cooking") move({ ...o, items }, "ready");
  };

  /** Station screen: "Done" ticks all of this station's dishes. */
  const stationDone = async (o: KitchenOrder) => {
    if (!staff) return;
    const mine = forStation(o, st).filter((i) => !i.done);
    const items = o.items.map((i) => (mine.some((m) => m.id === i.id) ? { ...i, done: true } : i));
    setLocal((x) => (x.id === o.id ? { ...x, items } : x));
    await Promise.all(mine.map((i) => kitchenItemDone(staff, i.id, true).catch(() => {})));
    if (items.every((i) => i.done)) move({ ...o, items }, "ready");
    else load();
  };

  if (!ready || !staff) return <div className="kd kd-center"><span className="kd-spin" /></div>;

  if (state === "signedout") {
    return (
      <div className="kd kd-center">
        <div className="kd-card">
          <h1>Kitchen screen signed out</h1>
          <p>Today&apos;s staff code has changed (it&apos;s new every day). Sign in again with the new code.</p>
          <button className="kd-btn" onClick={() => { clearStaffSession(); router.replace("/login/staff?next=/kitchen"); }}>Sign in again</button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="kd kd-center">
        <div className="kd-card">
          <span className="kd-chef" aria-hidden="true">👨‍🍳</span>
          <h1>{staff.restaurant_name} · Kitchen</h1>
          <p>New orders appear here with a Cha-Ching sound. Leave this screen open on the kitchen tablet or TV.</p>
          <button className="kd-btn" onClick={() => {
            primeAudio(); setStarted(true);
            const el = document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> };
            el.requestFullscreen?.().catch(() => {});
          }}>Start kitchen screen</button>
          <small>Signed in as {staff.staff_name}</small>
        </div>
      </div>
    );
  }

  const amber = (board?.amber_min ?? 10) * 60000, red = (board?.red_min ?? 20) * 60000;

  const ticket = (o: KitchenOrder) => {
    const age = now - new Date(o.created_at).getTime();
    const tone = o.status === "ready" ? "ok" : age >= red ? "red" : age >= amber ? "amb" : "ok";
    const items = forStation(o, st);
    const others = o.items.length - items.length;
    const custom = items.filter((i) => i.name.startsWith("Custom: "));
    return (
      <article key={o.id} className={`kd-tk ${tone}${flash.includes(o.id) ? " flash" : ""}`} aria-label={`${tableTitle(o)}, order ${o.order_no ?? ""}`}>
        <header className="kd-tkh">
          <b>{tableTitle(o)}</b>
          <span className="kd-src">#{o.order_no} · {orderSource(o)}{o.waiter_name ? ` · ${o.waiter_name}` : ""}</span>
          <span className="kd-tm">{o.status === "ready" && o.ready_at ? `Ready ${clock(now - new Date(o.ready_at).getTime())}` : clock(age)}</span>
        </header>
        <ul className="kd-items">
          {items.map((i) => (
            <li key={i.id} className={i.done ? "done" : ""}>
              {o.status === "cooking" ? (
                <button onClick={() => tick(o, i.id, !i.done)} aria-pressed={i.done} aria-label={`${i.done ? "Undo" : "Done"}: ${i.qty} ${i.name}`}>
                  <i aria-hidden="true">{i.done ? "✓" : ""}</i><span className="q">{i.qty}×</span><span className="n">{i.name.replace(/^Custom: /, "")}</span>
                </button>
              ) : (
                <span className="kd-row"><span className="q">{i.qty}×</span><span className="n">{i.name.replace(/^Custom: /, "")}</span></span>
              )}
            </li>
          ))}
        </ul>
        {custom.length > 0 && <p className="kd-custom">★ Custom dish — made to the guest&apos;s request</p>}
        {o.note && <p className="kd-note">✎ {o.note}</p>}
        {st && others > 0 && <p className="kd-others">+ {others} {others === 1 ? "item" : "items"} at other stations</p>}
        <footer className="kd-tkf">
          {o.status === "new" && <button className="kd-act" onClick={() => move(o, "cooking")}>Start cooking</button>}
          {o.status === "cooking" && (st
            ? <button className="kd-act go" onClick={() => stationDone(o)}>{station} done ✓</button>
            : <button className="kd-act go" onClick={() => move(o, "ready")}>Ready ✓</button>)}
          {o.status === "ready" && (
            <>
              <button className="kd-act ghost" onClick={() => move(o, "cooking")} aria-label="Back to cooking">↺</button>
              <button className="kd-act ghost wide" onClick={() => move(o, "served")}>Served</button>
            </>
          )}
        </footer>
      </article>
    );
  };

  return (
    <div className="kd">
      <header className="kd-bar">
        <b className="kd-name">{staff.restaurant_name} · Kitchen</b>
        <nav className="kd-stations" aria-label="Station">
          <button className={!st ? "on" : ""} onClick={() => pickStation("")}>All</button>
          {stations.map((s) => <button key={s.name} className={st?.name === s.name ? "on" : ""} onClick={() => pickStation(s.name)}>{s.name}</button>)}
        </nav>
        <button className="kd-tool" onClick={() => setSoundOn((v) => !v)} aria-pressed={soundOn}>{soundOn ? "🔊 Sound on" : "🔇 Sound off"}</button>
        <button className="kd-tool" onClick={() => setRecallOpen(true)}>↺ Recall</button>
      </header>

      {allDay.length > 0 && (
        <div className="kd-allday" aria-label="Cooking now, all tickets">
          <span className="lbl">Cooking now</span>
          {allDay.map(([n, q]) => <span key={n} className="it"><b>{q}</b> {n.replace(/^Custom: /, "")}</span>)}
        </div>
      )}

      {/* phone: one lane at a time */}
      <nav className="kd-lanetabs" aria-label="Lanes">
        {LANES.map((l) => <button key={l.id} className={lane === l.id ? "on" : ""} onClick={() => setLane(l.id)}>{l.title} <b>{byLane(l.id).length}</b></button>)}
      </nav>

      <main className="kd-lanes">
        {LANES.map((l) => (
          <section key={l.id} className={`kd-lane ${l.id}${lane === l.id ? " shown" : ""}`} aria-label={l.title}>
            <h2>{l.title}<span>{byLane(l.id).length}</span></h2>
            {byLane(l.id).length === 0 ? <p className="kd-empty">{l.id === "new" ? "No new orders" : l.id === "cooking" ? "Nothing cooking" : "Nothing waiting"}</p> : byLane(l.id).map(ticket)}
          </section>
        ))}
      </main>

      {recallOpen && (
        <div className="kd-back" onClick={() => setRecallOpen(false)}>
          <div className="kd-recall" role="dialog" aria-label="Recall served orders" onClick={(e) => e.stopPropagation()}>
            <header><b>Served in the last 45 min</b><button onClick={() => setRecallOpen(false)} aria-label="Close">×</button></header>
            {(board?.recent ?? []).length === 0 ? <p className="kd-empty">Nothing served recently.</p> : (board?.recent ?? []).map((o) => (
              <div key={o.id} className="kd-rc">
                <span><b>{tableTitle(o)}</b> #{o.order_no} · {o.items.map((i) => `${i.qty}× ${i.name.replace(/^Custom: /, "")}`).join(", ")}</span>
                <button onClick={() => { move(o, "ready"); setRecallOpen(false); }}>Back to Ready</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
