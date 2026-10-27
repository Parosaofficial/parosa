"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { currentLocation, joinSession, rememberSession, rememberedSession, requestHelp, sessionStatus, tableLabel, type JoinResult } from "@/lib/tables";
import "./sessiongate.css";

/*
 * Table sessions on the guest menu (migration 0015).
 *
 * A scan opens the table's session, or joins it when other phones at the table
 * already have one. Ordering needs the guest to be near the restaurant; the
 * check runs in the database. "See the menu only" lets anyone browse without
 * ordering. When the owner closes the session, the phone starts fresh.
 */

type Phase =
  | "off"        // no sessions here (food court, preview, or the database isn't updated yet)
  | "checking"   // first call to the database
  | "ask"        // need the phone's location
  | "locating"
  | "far"
  | "denied"     // location refused or unavailable
  | "joined"     // other phones already at this table → confirm joining
  | "ok"
  | "browse"     // menu only, no ordering
  | "closed"     // the owner turned this table off (same link — it works again when turned on)
  | "unknown"    // a QR for a table that no longer exists
  | "paid";      // the owner closed the session after payment

export type TableSessionState = {
  phase: Phase;
  sessionId: string | null;
  sessionCode: string | null;
  tableName: string | null;
  canOrder: boolean;
  /** The guest asked for the bill (from this phone or another at the table). */
  billAsked: boolean;
  /** Ring the staff: a waiter, or the bill. */
  request: (kind: "waiter" | "bill") => Promise<void>;
  /** Call when an order is refused because the session ended. */
  expired: () => void;
};

const POLL_MS = 30000;
const POLL_BILL_MS = 8000; // waiting for the owner to close the bill

export function useTableSession({ restaurantId, slug, table, enabled }: { restaurantId: string; slug: string; table: string; enabled: boolean }) {
  const [phase, setPhase] = useState<Phase>(enabled ? "checking" : "off");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [billAsked, setBillAsked] = useState(false);
  const [tableName, setTableName] = useState<string | null>(null);
  const [others, setOthers] = useState(0);
  const [distance, setDistance] = useState(0);
  const [denied, setDenied] = useState("");
  const alive = useRef(true);
  // set back to true on (re)mount — React's dev double-mount runs the cleanup once first
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const apply = useCallback((r: JoinResult | null) => {
    if (!alive.current) return;
    if (!r || r.status === "no_table") { setPhase("off"); return; }
    if (r.status === "unknown") { setPhase("unknown"); return; }
    if ("table_name" in r && r.table_name) setTableName(tableLabel({ name: r.table_name }));
    if (r.status === "off") { setPhase("closed"); return; }
    if (r.status === "need_location") { setPhase("ask"); return; }
    if (r.status === "far") { setDistance(r.distance_m); setPhase("far"); return; }
    setSessionId(r.session_id);
    setSessionCode(r.code);
    rememberSession(slug, table, r.session_id);
    if (r.status === "joined" && r.phones > 1) { setOthers(r.phones - 1); setPhase("joined"); }
    else setPhase("ok");
  }, [slug, table]);

  const start = useCallback(async (fresh = false) => {
    if (!enabled) return;
    const prev = fresh ? null : rememberedSession(slug, table);
    apply(await joinSession(restaurantId, table, null, prev));
  }, [enabled, restaurantId, slug, table, apply]);

  // first check when the menu opens
  useEffect(() => {
    if (!enabled) return;
    joinSession(restaurantId, table, null, rememberedSession(slug, table)).then(apply);
  }, [enabled, restaurantId, slug, table, apply]);

  const allow = useCallback(async () => {
    setPhase("locating");
    try {
      const at = await currentLocation();
      apply(await joinSession(restaurantId, table, at, rememberedSession(slug, table)));
    } catch (e) {
      const code = (e as GeolocationPositionError)?.code;
      setDenied(code === 1
        ? "Location is off for this site. Allow it in your browser settings to order."
        : "We couldn't get your location. Step near a window and try again.");
      setPhase("denied");
    }
  }, [restaurantId, slug, table, apply]);

  const reset = useCallback(() => {
    rememberSession(slug, table, null);
    setSessionId(null);
    setSessionCode(null);
    setBillAsked(false);
    setPhase("checking");
    start(true);
  }, [slug, table, start]);

  // the owner closes the session after payment → thank the guest and start fresh next time
  useEffect(() => {
    if (!sessionId || (phase !== "ok" && phase !== "joined")) return;
    const t = setInterval(async () => {
      const s = await sessionStatus(sessionId);
      if (!alive.current || !s) return;
      if (s.status !== "closed") { if (s.bill_asked) setBillAsked(true); return; }
      rememberSession(slug, table, null);
      setSessionId(null);
      setBillAsked(false);
      if (s.close_reason === "paid") setPhase("paid");
      else { setPhase("checking"); start(true); }
    }, billAsked ? POLL_BILL_MS : POLL_MS);
    return () => clearInterval(t);
  }, [sessionId, phase, slug, table, start, billAsked]);

  const request = useCallback(async (kind: "waiter" | "bill") => {
    if (!sessionId) throw new Error("no session");
    await requestHelp(sessionId, kind);
    if (kind === "bill") setBillAsked(true);
  }, [sessionId]);

  const state: TableSessionState = {
    phase,
    sessionId,
    sessionCode,
    tableName,
    canOrder: phase === "off" || phase === "ok",
    billAsked,
    request,
    expired: reset,
  };
  const ui = { phase, others, distance, denied, tableName, allow, browse: () => setPhase("browse"), join: () => setPhase("ok"), retry: () => { setPhase("checking"); start(); }, reset };
  return { state, ui };
}

type Ui = ReturnType<typeof useTableSession>["ui"];

/** Full-screen steps shown over the menu: location, too far, join the table, table off, bill paid. */
export function SessionGate({ ui, restaurantName, reviewUrl, stamp }: { ui: Ui; restaurantName: string; reviewUrl?: string | null; stamp?: ReactNode }) {
  const { phase } = ui;
  if (phase === "off" || phase === "ok" || phase === "browse") return null;
  const where = ui.tableName ?? "your table";
  const km = ui.distance >= 1000 ? `${(ui.distance / 1000).toFixed(1)} km` : `${ui.distance} m`;

  return (
    <div className="sg-wrap" role="dialog" aria-modal="true" aria-label="Table check">
      <div className="sg-card">
        <div className="sg-name">{restaurantName}</div>
        {phase === "checking" && (<><span className="sg-spin" aria-hidden="true" /><p className="sg-sub">Getting {where} ready…</p></>)}

        {(phase === "ask" || phase === "locating") && (
          <>
            <span className="sg-ic" aria-hidden="true">📍</span>
            <h2>Confirm you&apos;re here</h2>
            <p className="sg-sub">We check your location once, so orders come only from guests at the table.</p>
            <button className="sg-btn" onClick={ui.allow} disabled={phase === "locating"}>{phase === "locating" ? "Checking…" : "Allow location"}</button>
            <button className="sg-link" onClick={ui.browse}>See the menu only</button>
          </>
        )}

        {phase === "far" && (
          <>
            <span className="sg-ic" aria-hidden="true">🧭</span>
            <h2>Please visit the restaurant</h2>
            <p className="sg-sub">You&apos;re about {km} away. Ordering works when you&apos;re at the table.</p>
            <button className="sg-btn" onClick={ui.allow}>Try again</button>
            <button className="sg-link" onClick={ui.browse}>See the menu only</button>
          </>
        )}

        {phase === "denied" && (
          <>
            <span className="sg-ic" aria-hidden="true">🔒</span>
            <h2>Location needed to order</h2>
            <p className="sg-sub">{ui.denied} You can still look at the menu.</p>
            <button className="sg-btn" onClick={ui.allow}>Try again</button>
            <button className="sg-link" onClick={ui.browse}>See the menu only</button>
          </>
        )}

        {phase === "joined" && (
          <>
            <span className="sg-ic" aria-hidden="true">👥</span>
            <h2>Join {where}&apos;s order?</h2>
            <p className="sg-sub">{ui.others === 1 ? "1 person at this table is" : `${ui.others} people at this table are`} already ordering. Anything you add goes on the same table bill.</p>
            <button className="sg-btn" onClick={ui.join}>Join table</button>
          </>
        )}

        {phase === "closed" && (
          <>
            <span className="sg-ic" aria-hidden="true">🍽</span>
            <h2>{where} isn&apos;t taking orders right now</h2>
            <p className="sg-sub">Please ask the staff — they&apos;ll seat you or take your order.</p>
            <button className="sg-btn" onClick={ui.browse}>See the menu</button>
          </>
        )}

        {phase === "unknown" && (
          <>
            <span className="sg-ic" aria-hidden="true">🔎</span>
            <h2>This table wasn&apos;t found</h2>
            <p className="sg-sub">This QR isn&apos;t linked to a table any more. Please ask the staff for help.</p>
            <button className="sg-btn" onClick={ui.browse}>See the menu</button>
          </>
        )}

        {phase === "paid" && (
          <>
            <span className="sg-ic ok" aria-hidden="true">✓</span>
            <h2>Bill paid — thank you!</h2>
            <p className="sg-sub">We hope to see you again soon.</p>
            {stamp}
            {reviewUrl && (
              <div className="sg-rate">
                <b>How was your meal?</b>
                <span className="sg-stars" aria-hidden="true">★★★★★</span>
                <a className="sg-btn" href={reviewUrl} target="_blank" rel="noopener noreferrer">Rate us on Google</a>
              </div>
            )}
            <button className="sg-link" onClick={ui.reset}>Start a new order</button>
          </>
        )}
      </div>
    </div>
  );
}
