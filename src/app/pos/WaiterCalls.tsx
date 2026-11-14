"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playChime, primeAudio } from "@/lib/chime";
import { staffReady, staffServed, type ReadyFood } from "@/lib/kitchen";
import { staffAcceptSession, staffCallSeen, staffCalls, staffPendingTables, type PendingTable, type StaffCall } from "@/lib/tables";
import type { StaffSession } from "@/lib/types";
import "./waitercalls.css";

/*
 * The waiter's phone: when a guest taps "Call waiter" on the QR menu, the
 * table shows up here — "T5 is calling you" — and the phone vibrates and
 * rings. Calls for this waiter's tables, plus tables nobody is assigned to.
 * "On my way" clears the call (and takes an unassigned table).
 * Food the kitchen marked Ready shows here too — "T5 food is ready" — until
 * the waiter taps Served. New tables waiting to be accepted (owner setting,
 * 0019) show as "T5 new guests — Accept".
 */

const POLL_MS = 7000;
const mins = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export function WaiterCalls({ staff }: { staff: StaffSession }) {
  const [calls, setCalls] = useState<StaffCall[]>([]);
  const [food, setFood] = useState<ReadyFood[]>([]);
  const [pending, setPending] = useState<PendingTable[]>([]);
  const [busy, setBusy] = useState("");
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const [list, ready, waiting] = await Promise.all([
      staffCalls(staff.restaurant_id, staff.code, staff.staff_id), staffReady(staff),
      staffPendingTables(staff.restaurant_id, staff.code, staff.staff_id),
    ]);
    setCalls(list);
    setFood(ready);
    setPending(waiting);
    const keys = new Set([...list.map((c) => c.session_id + c.called_at), ...ready.map((f) => "food" + f.order_id + f.ready_at), ...waiting.map((p) => "new" + p.session_id)]);
    const fresh = seen.current ? [...keys].some((k) => !seen.current!.has(k)) : false;
    seen.current = keys;
    if (fresh) {
      try { navigator.vibrate?.([400, 150, 400, 150, 400]); } catch { /* not supported (iPhone) */ }
      primeAudio(); playChime();
    }
  }, [staff]);

  useEffect(() => {
    // the first check runs on the next tick so state isn't set during the effect
    const first = setTimeout(load, 0);
    const t = setInterval(load, POLL_MS);
    const onShow = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearTimeout(first); clearInterval(t); document.removeEventListener("visibilitychange", onShow); };
  }, [load]);

  if (calls.length === 0 && food.length === 0 && pending.length === 0) return null;

  const accept = async (p: PendingTable) => {
    setBusy(p.session_id);
    try { await staffAcceptSession(staff.restaurant_id, staff.code, staff.staff_id, p.session_id); setPending((l) => l.filter((x) => x.session_id !== p.session_id)); }
    catch { /* the next check shows it again */ }
    finally { setBusy(""); }
  };

  const onMyWay = async (c: StaffCall) => {
    setBusy(c.session_id);
    try { await staffCallSeen(staff.restaurant_id, staff.code, staff.staff_id, c.session_id); setCalls((l) => l.filter((x) => x.session_id !== c.session_id)); }
    catch { /* the next check shows it again */ }
    finally { setBusy(""); }
  };
  const served = async (f: ReadyFood) => {
    setBusy(f.order_id);
    try { await staffServed(staff, f.order_id); setFood((l) => l.filter((x) => x.order_id !== f.order_id)); }
    catch { /* the next check shows it again */ }
    finally { setBusy(""); }
  };

  return (
    <div className="wc-wrap" role="alert" aria-live="assertive">
      {pending.map((p) => (
        <div key={p.session_id} className="wc-call wc-new">
          <span className="wc-bell" aria-hidden="true">🆕</span>
          <div className="wc-tx">
            <b>{p.table_name} — new guests</b>
            <span>#{p.code} · check they&apos;re seated, then accept so they can order</span>
          </div>
          <button onClick={() => accept(p)} disabled={busy === p.session_id}>{busy === p.session_id ? "…" : "Accept"}</button>
        </div>
      ))}
      {calls.map((c) => (
        <div key={c.session_id} className="wc-call">
          <span className="wc-bell" aria-hidden="true">🛎</span>
          <div className="wc-tx">
            <b>{c.table_name} is calling {c.mine ? "you" : "a waiter"}</b>
            <span>#{c.code} · {mins(c.called_at) === 0 ? "just now" : `${mins(c.called_at)} min ago`}{c.mine ? "" : " · no waiter assigned"}</span>
          </div>
          <button onClick={() => onMyWay(c)} disabled={busy === c.session_id}>{busy === c.session_id ? "…" : "On my way"}</button>
        </div>
      ))}
      {food.map((f) => (
        <div key={f.order_id} className="wc-call wc-food">
          <span className="wc-bell" aria-hidden="true">🍽</span>
          <div className="wc-tx">
            <b>{f.table_name ?? "A table"} food is ready</b>
            <span>#{f.order_no} · pick it up from the kitchen{f.mine ? "" : " · no waiter assigned"}</span>
          </div>
          <button onClick={() => served(f)} disabled={busy === f.order_id}>{busy === f.order_id ? "…" : "Served"}</button>
        </div>
      ))}
    </div>
  );
}
