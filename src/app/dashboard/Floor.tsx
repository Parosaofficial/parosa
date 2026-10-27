"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TableArt } from "@/components/TableArt";
import { playChime, primeAudio } from "@/lib/chime";
import { listStaff, type OrderWithItems } from "@/lib/db";
import { listReservations, timeLabel, type Reservation } from "@/lib/reserve";
import { supabase } from "@/lib/supabase";
import {
  assignWaiter, clearWaiterCall, closeSession, freeSession, listOpenSessions, listTables, tableLabel,
  type RestaurantTable, type TableSession,
} from "@/lib/tables";
import type { Restaurant, Staff } from "@/lib/types";
import "./floor.css";

/*
 * Live tables on the Overview (migration 0015): each table drawn from above in
 * its type's shape, the tabletop coloured by stage. Tap one to manage its
 * session — waiter, payment (closes the session), or free the table.
 */

type Stage = "free" | "seated" | "cooking" | "ready" | "bill";
const STAGE_LABEL: Record<Stage, string> = { free: "Free", seated: "Just seated", cooking: "Cooking", ready: "Food ready", bill: "Waiting to pay" };
const STATUS_LABEL: Record<string, string> = { new: "New", cooking: "Cooking", ready: "Ready", served: "Served" };

function stageOf(session: TableSession | undefined, orders: OrderWithItems[]): Stage {
  if (!session) return "free";
  if (orders.length === 0) return "seated";
  if (orders.some((o) => o.status === "new" || o.status === "cooking")) return "cooking";
  if (orders.some((o) => o.status === "ready")) return "ready";
  return "bill";
}

const mins = (iso: string, now: number) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function Floor({ restaurant, orders }: { restaurant: Restaurant; orders: OrderWithItems[] }) {
  const [tables, setTables] = useState<RestaurantTable[] | null>(null); // null = migration 0015 not applied
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [view, setView] = useState<"floor" | "list">("floor");
  const [kind, setKind] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [bookings, setBookings] = useState<Reservation[]>([]);

  const loadSessions = useCallback(() => {
    listOpenSessions(restaurant.id).then(setSessions).catch(() => {});
  }, [restaurant.id]);
  // today's upcoming bookings (Seat Reserve) — a table turns purple 30 minutes before
  const loadBookings = useCallback(() => {
    const from = new Date(Date.now() - 30 * 60000), to = new Date(Date.now() + 12 * 3600000);
    listReservations(restaurant.id, from, to).then((b) => setBookings(b.filter((x) => x.status === "booked"))).catch(() => {});
  }, [restaurant.id]);

  useEffect(() => {
    listTables(restaurant.id).then((t) => setTables(t.filter((x) => x.active))).catch(() => setTables(null));
    listStaff(restaurant.id).then((s) => setStaff(s.filter((x) => x.active))).catch(() => {});
    loadSessions();
    const ch = supabase
      .channel(`tsess-${restaurant.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_sessions", filter: `restaurant_id=eq.${restaurant.id}` }, loadSessions)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `restaurant_id=eq.${restaurant.id}` }, loadBookings)
      .subscribe();
    loadBookings();
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => { supabase.removeChannel(ch); clearInterval(tick); };
  }, [restaurant.id, loadSessions, loadBookings]);

  // an order arriving for a table we don't have an open session for yet → refresh sessions
  useEffect(() => { loadSessions(); }, [orders.length, loadSessions]);

  const rows = useMemo(() => (tables ?? []).map((t) => {
    const session = sessions.find((s) => s.table_code === t.code);
    const sOrders = session ? orders.filter((o) => o.session_id === session.id) : [];
    const booking = session ? undefined : bookings.find((b) => b.table_id === t.id && new Date(b.starts_at).getTime() - now < 30 * 60000);
    return {
      t, session, orders: sOrders, stage: stageOf(session, sOrders), booking,
      bill: sOrders.reduce((a, o) => a + o.total, 0) + (session?.booking_charge ?? 0),
      waiter: !!session?.waiter_call_at, billAsked: !!session?.bill_asked_at,
    };
  }), [tables, sessions, orders, bookings, now]);

  // ring when a guest calls a waiter or asks for the bill
  const calls = rows.filter((r) => r.waiter).map((r) => `w${r.session!.id}${r.session!.waiter_call_at}`)
    .concat(rows.filter((r) => r.billAsked).map((r) => `b${r.session!.id}`)).join("|");
  const seen = useRef<string | null>(null);
  useEffect(() => {
    const prev = seen.current;
    seen.current = calls;
    if (prev === null || !calls) return;
    if (calls.split("|").some((c) => !prev.split("|").includes(c))) { primeAudio(); playChime(); }
  }, [calls]);

  if (!tables || tables.length === 0) {
    if (tables && tables.length === 0) {
      return (
        <section className="db-panel fl">
          <div className="db-ph"><h3>Tables right now</h3></div>
          <div className="fl-empty">Add your tables with their types to see them live here. <Link href="/tables" className="db-see">Set up tables →</Link></div>
        </section>
      );
    }
    return null;
  }

  const kinds = Array.from(new Set(tables.map((t) => t.kind)));
  const shown = kind === "All" ? rows : rows.filter((r) => r.t.kind === kind);
  const count = (s: Stage) => rows.filter((r) => r.stage === s).length;
  const areas = Array.from(new Set(shown.map((r) => r.t.area || ""))).sort((a, b) => (a ? 0 : 1) - (b ? 0 : 1));
  const waiterName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? null;
  const open = rows.find((r) => r.t.id === openId) ?? null;

  const act = async (what: string, fn: () => Promise<void>) => {
    setBusy(what);
    try { await fn(); loadSessions(); }
    catch { window.alert("Couldn't update the table. Check your internet and try again."); }
    finally { setBusy(""); }
  };

  const info = (r: (typeof rows)[number]) => (
    <div className="fl-inf">
      <span className="st">{STAGE_LABEL[r.stage]}{r.session ? ` · ${mins(r.session.opened_at, now)} min` : ""}</span>
      {r.waiter && <span className="fl-call w">🛎 Waiter called · {mins(r.session!.waiter_call_at!, now)} min</span>}
      {r.billAsked && <span className="fl-call b">₹ Bill asked · {mins(r.session!.bill_asked_at!, now)} min</span>}
      {r.booking && <span className="fl-call r">Booked {timeLabel(r.booking.starts_at)} · {r.booking.guest_name}</span>}
      {r.session ? (
        <>
          <span className="sid">#{r.session.code} · {r.session.phones} {r.session.phones === 1 ? "phone" : "phones"}</span>
          <span className="kv">{r.bill ? rupees(r.bill) : "No order yet"} · {waiterName(r.session.waiter_id) ?? <em>Assign waiter</em>}</span>
        </>
      ) : (
        <span className="kv">{r.t.kind}{r.t.seats ? ` · ${r.t.seats} seats` : ""}</span>
      )}
    </div>
  );

  return (
    <section className="db-panel fl">
      <div className="db-ph">
        <h3>Tables right now</h3>
        <div className="fl-tools">
          <div className="fl-seg"><button className={view === "floor" ? "on" : ""} onClick={() => setView("floor")}>Floor</button><button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>List</button></div>
          {kinds.length > 1 && (
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Table type">
              <option value="All">All types</option>
              {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
        </div>
      </div>
      <div className="fl-counts">
        <span className="c free">Free {count("free")}</span>
        <span className="c seated">Just seated {count("seated")}</span>
        <span className="c cooking">Cooking {count("cooking")}</span>
        <span className="c ready">Food ready {count("ready")}</span>
        <span className="c bill">Waiting to pay {count("bill")}</span>
        {rows.some((r) => r.waiter || r.billAsked) && <span className="c call">🛎 Calls {rows.filter((r) => r.waiter || r.billAsked).length}</span>}
      </div>

      {view === "floor" ? (
        <div className="fl-zones">
          {areas.map((a) => {
            const inArea = shown.filter((r) => (r.t.area || "") === a);
            const sofas = inArea.filter((r) => r.t.shape === "sofa");
            const small = inArea.filter((r) => r.t.shape !== "sofa");
            return (
              <div key={a || "-"} className="fl-zone">
                {areas.length > 1 || a ? <div className="fl-zh">{a || "Other tables"}</div> : null}
                {small.length > 0 && (
                  <div className="fl-floor">
                    {small.map((r) => (
                      <button key={r.t.id} className={`fl-t ${r.stage}${r.waiter || r.billAsked ? " alert" : ""}${r.booking ? " booked" : ""}`} onClick={() => setOpenId(r.t.id)} aria-label={`${tableLabel(r.t)}, ${STAGE_LABEL[r.stage]}`}>
                        <TableArt shape={r.t.shape} name={r.t.name} seated={!!r.session} />
                        {info(r)}
                      </button>
                    ))}
                  </div>
                )}
                {sofas.length > 0 && (
                  <div className="fl-floor wide">
                    {sofas.map((r) => (
                      <button key={r.t.id} className={`fl-t ${r.stage}${r.waiter || r.billAsked ? " alert" : ""}${r.booking ? " booked" : ""}`} onClick={() => setOpenId(r.t.id)} aria-label={`${tableLabel(r.t)}, ${STAGE_LABEL[r.stage]}`}>
                        <TableArt shape="sofa" name={r.t.name} seated={!!r.session} />
                        {info(r)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="fl-list">
          {shown.map((r) => (
            <button key={r.t.id} className={`fl-li ${r.stage}`} onClick={() => setOpenId(r.t.id)}>
              <b>{r.t.name}</b><span className="st">{STAGE_LABEL[r.stage]}</span>
              <span>{r.t.kind}{r.t.area ? ` · ${r.t.area}` : ""}</span>
              <span>{r.session ? `#${r.session.code} · ${mins(r.session.opened_at, now)} min` : "—"}</span>
              <span>{r.bill ? rupees(r.bill) : "—"}</span>
              <span>{r.session ? waiterName(r.session.waiter_id) ?? "No waiter" : ""}</span>
            </button>
          ))}
        </div>
      )}

      {/* ---- table panel ---- */}
      {open && (
        <div className="fl-back" onClick={() => setOpenId(null)}>
          <div className="fl-panel" role="dialog" aria-label={`${tableLabel(open.t)} details`} onClick={(e) => e.stopPropagation()}>
            <div className="fl-ph">
              <div><h4>{tableLabel(open.t)} <small>· {open.t.kind}{open.t.area ? ` · ${open.t.area}` : ""}</small></h4>
                {open.session
                  ? <p>Session #{open.session.code} · started {new Date(open.session.opened_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · {open.session.phones} {open.session.phones === 1 ? "phone" : "phones"} · last activity {mins(open.session.last_activity_at, now)} min ago</p>
                  : <p>No guests at this table.</p>}
              </div>
              <span className={`fl-badge ${open.stage}`}>{STAGE_LABEL[open.stage]}</span>
              <button className="fl-x" onClick={() => setOpenId(null)} aria-label="Close">×</button>
            </div>

            {open.session && (
              <div className="fl-pb">
                <div className="fl-box">
                  <b className="fl-bt">Orders in this session</b>
                  {open.orders.length === 0 && <p className="fl-muted">No orders yet.</p>}
                  {open.orders.map((o) => (
                    <div key={o.id} className="fl-item">
                      <span>#{o.order_no} · {o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}{o.note && <em className="fl-note">✎ {o.note}</em>}</span>
                      <span className={`fl-os ${o.status}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                    </div>
                  ))}
                  {!!open.session.booking_charge && <div className="fl-item"><span>Table booking</span><span>{rupees(open.session.booking_charge)}</span></div>}
                  <div className="fl-item tot"><b>Table bill</b><b>{rupees(open.bill)}</b></div>
                </div>

                <div className="fl-side">
                  {(open.waiter || open.billAsked) && (
                    <div className="fl-box fl-req">
                      <b className="fl-bt">Guest asked</b>
                      {open.waiter && (
                        <div className="fl-reqrow"><span>🛎 Call waiter · {mins(open.session.waiter_call_at!, now)} min ago</span>
                          <button disabled={!!busy} onClick={() => act("seen", () => clearWaiterCall(open.session!.id))}>{busy === "seen" ? "…" : "Mark attended"}</button></div>
                      )}
                      {open.billAsked && <div className="fl-reqrow"><span>₹ Bill my amount · {mins(open.session.bill_asked_at!, now)} min ago</span></div>}
                    </div>
                  )}
                  <div className="fl-box">
                    <b className="fl-bt">Waiter</b>
                    {staff.length === 0 ? <p className="fl-muted">Add staff in <Link href="/staff">Staff &amp; Admin</Link> to assign them.</p> : (
                      <div className="fl-chips">
                        {staff.map((s) => (
                          <button key={s.id} className={open.session!.waiter_id === s.id ? "on" : ""} disabled={!!busy}
                            onClick={() => act("waiter", () => assignWaiter(open.session!.id, open.session!.waiter_id === s.id ? null : s.id))}>{s.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="fl-box">
                    <b className="fl-bt">Payment received</b>
                    <div className="fl-pay">
                      <button disabled={!!busy || open.orders.length === 0} onClick={() => act("upi", async () => { await closeSession(open.session!.id, "UPI"); setOpenId(null); })}>{busy === "upi" ? "Closing…" : "UPI ✓ · close table"}</button>
                      <button disabled={!!busy || open.orders.length === 0} onClick={() => act("cash", async () => { await closeSession(open.session!.id, "Cash"); setOpenId(null); })}>{busy === "cash" ? "Closing…" : "Cash ✓ · close table"}</button>
                    </div>
                    <p className="fl-muted">Marks every order paid, adds stamp-card ticks, and frees the table for the next guests.</p>
                  </div>
                  <div className="fl-box">
                    <b className="fl-bt">Other</b>
                    <div className="fl-chips">
                      <Link href="/orders" className="fl-lnk">Bills &amp; WhatsApp →</Link>
                      <button className="danger" disabled={!!busy} onClick={() => {
                        if (!window.confirm(`Free ${tableLabel(open.t)} without payment? Its orders stay in Orders as unpaid.`)) return;
                        act("free", async () => { await freeSession(open.session!.id); setOpenId(null); });
                      }}>Free this table</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
