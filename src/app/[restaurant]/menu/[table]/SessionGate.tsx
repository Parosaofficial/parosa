"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { currentLocation, joinSession, rememberSession, rememberedSession, sessionStatus, tableLabel, type JoinResult } from "@/lib/tables";
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
  | "paid";      // the owner closed the session after payment

export type TableSessionState = {
  phase: Phase;
  sessionId: string | null;
  tableName: string | null;
  canOrder: boolean;
  /** Call when an order is refused because the session ended. */
  expired: () => void;
};

const POLL_MS = 30000;

export function useTableSession({ restaurantId, slug, table, enabled }: { restaurantId: string; slug: string; table: string; enabled: boolean }) {
  const [phase, setPhase] = useState<Phase>(enabled ? "checking" : "off");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tableName, setTableName] = useState<string | null>(null);
  const [others, setOthers] = useState(0);
  const [distance, setDistance] = useState(0);
  const [denied, setDenied] = useState("");
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const apply = useCallback((r: JoinResult | null) => {
    if (!alive.current) return;
    if (!r || r.status === "no_table") { setPhase("off"); return; }
    if ("table_name" in r && r.table_name) setTableName(tableLabel({ name: r.table_name }));
    if (r.status === "need_location") { setPhase("ask"); return; }
    if (r.status === "far") { setDistance(r.distance_m); setPhase("far"); return; }
    setSessionId(r.session_id);
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
    setPhase("checking");
    start(true);
  }, [slug, table, start]);

  // the owner closes the session after payment → thank the guest and start fresh next time
  useEffect(() => {
    if (!sessionId || (phase !== "ok" && phase !== "joined")) return;
    const t = setInterval(async () => {
      const s = await sessionStatus(sessionId);
      if (!alive.current || !s || s.status !== "closed") return;
      rememberSession(slug, table, null);
      setSessionId(null);
      if (s.close_reason === "paid") setPhase("paid");
      else { setPhase("checking"); start(true); }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [sessionId, phase, slug, table, start]);

  const state: TableSessionState = {
    phase,
    sessionId,
    tableName,
    canOrder: phase === "off" || phase === "ok",
    expired: reset,
  };
  const ui = { phase, others, distance, denied, tableName, allow, browse: () => setPhase("browse"), join: () => setPhase("ok"), retry: () => { setPhase("checking"); start(); }, reset };
  return { state, ui };
}

type Ui = ReturnType<typeof useTableSession>["ui"];

/** Full-screen steps shown over the menu: location, too far, join the table, bill paid. */
export function SessionGate({ ui, restaurantName, reviewUrl }: { ui: Ui; restaurantName: string; reviewUrl?: string | null }) {
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

        {phase === "paid" && (
          <>
            <span className="sg-ic ok" aria-hidden="true">✓</span>
            <h2>Bill paid — thank you!</h2>
            <p className="sg-sub">We hope to see you again soon.</p>
            {reviewUrl && <a className="sg-btn" href={reviewUrl} target="_blank" rel="noopener noreferrer">Rate us on Google</a>}
            <button className="sg-link" onClick={ui.reset}>Start a new order</button>
          </>
        )}
      </div>
    </div>
  );
}
