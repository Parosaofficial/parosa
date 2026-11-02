"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playChime, primeAudio } from "@/lib/chime";
import { staffCallSeen, staffCalls, type StaffCall } from "@/lib/tables";
import type { StaffSession } from "@/lib/types";
import "./waitercalls.css";

/*
 * The waiter's phone: when a guest taps "Call waiter" on the QR menu, the
 * table shows up here — "T5 is calling you" — and the phone vibrates and
 * rings. Calls for this waiter's tables, plus tables nobody is assigned to.
 * "On my way" clears the call (and takes an unassigned table).
 */

const POLL_MS = 7000;
const mins = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export function WaiterCalls({ staff }: { staff: StaffSession }) {
  const [calls, setCalls] = useState<StaffCall[]>([]);
  const [busy, setBusy] = useState("");
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    const list = await staffCalls(staff.restaurant_id, staff.code, staff.staff_id);
    setCalls(list);
    const keys = new Set(list.map((c) => c.session_id + c.called_at));
    const fresh = seen.current ? list.some((c) => !seen.current!.has(c.session_id + c.called_at)) : false;
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

  if (calls.length === 0) return null;

  const onMyWay = async (c: StaffCall) => {
    setBusy(c.session_id);
    try { await staffCallSeen(staff.restaurant_id, staff.code, staff.staff_id, c.session_id); setCalls((l) => l.filter((x) => x.session_id !== c.session_id)); }
    catch { /* the next check shows it again */ }
    finally { setBusy(""); }
  };

  return (
    <div className="wc-wrap" role="alert" aria-live="assertive">
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
    </div>
  );
}
