"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { listOrdersWithItems, updateOrderStatus, type OrderWithItems } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import { setupChecklist } from "@/lib/profile";
import { listLoyaltyCards, loyaltyOf, type LoyaltyCard } from "@/lib/loyalty";
import { supabase } from "@/lib/supabase";
import { playChime, primeAudio } from "@/lib/chime";
import type { Order, OrderStatus } from "@/lib/types";
import "../dash.css";
import { Floor } from "./Floor";
import "./dashboard.css";

const NEXT: Record<OrderStatus, OrderStatus | null> = { new: "cooking", cooking: "ready", ready: "served", served: null };
const LABEL: Record<OrderStatus, string> = { new: "New", cooking: "Cooking", ready: "Ready", served: "Served" };
const BTN: Record<OrderStatus, string> = { new: "Start cooking", cooking: "Mark ready", ready: "Served", served: "Completed" };

const place = (o: Pick<Order, "table_number">) => `Table ${o.table_number ?? "—"}`;

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)}h ago`;
};

export default function Dashboard() {
  const { restaurant, ready } = useOwner();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);

  // ---- live order alerts (bell dropdown + sound + banner) ----
  const [soundOn, setSoundOn] = useState(false);
  const [alert, setAlert] = useState<{ table: string; total: number; order_no: string } | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const soundRef = useRef(false);
  const seen = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const s = localStorage.getItem("parosa-sound") === "1"; setSoundOn(s); soundRef.current = s; } catch {}
  }, []);

  // close the notification dropdown when clicking outside it
  useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e: MouseEvent) => { if (bellRef.current && !bellRef.current.contains(e.target as Node)) setNotifOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [notifOpen]);

  const acknowledge = useCallback(() => { setAlert(null); }, []);

  const openBell = () => { setNotifOpen((v) => !v); setUnread(0); };

  const toggleSound = () => {
    const next = !soundRef.current;
    soundRef.current = next;
    setSoundOn(next);
    try { localStorage.setItem("parosa-sound", next ? "1" : "0"); } catch {}
    if (next) {
      primeAudio();
      playChime(); // confirm it's working
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    }
  };

  // fires once per new order (de-duped by `seen`)
  const alertNewOrder = useCallback((o: Order) => {
    setAlert({ table: `Table ${o.table_number ?? "—"}`, total: o.total, order_no: o.order_no ?? "" });
    setUnread((c) => c + 1);
    if (soundRef.current) {
      playChime();
      if ("Notification" in window && Notification.permission === "granted") {
        const title = "New order · Table " + (o.table_number ?? "—");
        try { new Notification(title, { body: `₹${o.total} — tap to view on Parosa` }); } catch {}
      }
    }
  }, []);

  const loadOrders = useCallback(async (rid: string) => { setOrders(await listOrdersWithItems(rid)); }, []);

  useEffect(() => { if (restaurant) loadOrders(restaurant.id); }, [restaurant, loadOrders]);

  // realtime: a brand-new order rings the bell; any other change just refreshes.
  useEffect(() => {
    if (!restaurant) return;
    const ch = supabase
      .channel(`orders-${restaurant.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` }, (payload) => {
        const o = payload.new as Order;
        if (seen.current.has(o.id)) return;
        seen.current.add(o.id);
        loadOrders(restaurant.id);
        if (!firstLoad.current) alertNewOrder(o);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` }, () => loadOrders(restaurant.id))
      .subscribe();
    // after mount, allow alerts (so existing orders loaded on open don't ring)
    const t = setTimeout(() => { firstLoad.current = false; }, 1500);
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [restaurant, loadOrders, alertNewOrder]);

  const advance = async (id: string, status: OrderStatus) => {
    const nx = NEXT[status];
    if (!nx) return;
    if (status === "new") acknowledge(); // starting to cook = seen it
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status: nx } : o)));
    await updateOrderStatus(id, nx);
  };

  const [now] = useState(() => Date.now());
  const live = orders.filter((o) => o.status !== "served");
  const lanes: { key: OrderStatus; title: string; list: OrderWithItems[] }[] = [
    { key: "new", title: "New", list: live.filter((o) => o.status === "new") },
    { key: "cooking", title: "Cooking", list: live.filter((o) => o.status === "cooking") },
    { key: "ready", title: "Ready", list: live.filter((o) => o.status === "ready") },
  ];

  // Numbers are for today only (listOrdersWithItems returns every order ever).
  const today = useMemo(() => {
    const d = new Date(now).toDateString();
    return orders.filter((o) => new Date(o.created_at).toDateString() === d);
  }, [orders, now]);

  const kpis = useMemo(() => {
    const paid = today.filter((o) => o.payment_status === "paid");
    const unpaid = today.filter((o) => o.payment_status !== "paid");
    return {
      orders: today.length,
      revenue: paid.reduce((a, o) => a + o.total, 0),
      unpaid: unpaid.length,
      unpaidAmt: unpaid.reduce((a, o) => a + o.total, 0),
      aov: today.length ? Math.round(today.reduce((a, o) => a + o.total, 0) / today.length) : 0,
    };
  }, [today]);

  const best = useMemo(() => {
    const m: Record<string, number> = {};
    today.forEach((o) => o.items.forEach((it) => { m[it.name] = (m[it.name] ?? 0) + it.qty; }));
    const arr = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = arr[0]?.[1] ?? 1;
    return arr.map(([name, c]) => ({ name, c, w: Math.round((c / max) * 100) }));
  }, [today]);

  // stamp cards that are full and waiting for their reward
  const [rewards, setRewards] = useState<LoyaltyCard[]>([]);
  useEffect(() => {
    if (!restaurant || !loyaltyOf(restaurant).loyalty_enabled) return;
    const goal = loyaltyOf(restaurant).loyalty_goal;
    listLoyaltyCards(restaurant.id).then((cs) => setRewards(cs.filter((c) => c.stamps >= goal))).catch(() => {});
  }, [restaurant]);

  if (!ready || !restaurant) return <AppLoading label="Loading your dashboard…" />;

  const setup = setupChecklist(restaurant);
  const setupLeft = setup.filter((x) => !x.done).length;

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div>
            <h1>नमस्ते, {restaurant.name} 👋</h1>
            <p>{new Date(now).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · here&apos;s today so far</p>
          </div>
          <div className="db-acts ov-acts">
            <button className={`ov-sound${soundOn ? " on" : ""}`} onClick={toggleSound} title={soundOn ? "Order sound is on" : "Turn on order sound"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 5 6 9H2v6h4l5 4V5z" />{soundOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /> : <path d="m22 9-6 6M16 9l6 6" />}</svg>
              {soundOn ? "Sound on" : "Sound off"}
            </button>
            <div className="db-bell" ref={bellRef}>
              <button className={`db-icobtn${unread > 0 ? " on" : ""}`} onClick={openBell} aria-label="Notifications" title="Notifications">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                {unread > 0 && <span className="db-badge">{unread}</span>}
              </button>
              {notifOpen && (
                <div className="db-notif">
                  <div className="db-notif-hd"><b>Notifications</b>{orders.length > 0 && <Link href="/orders" onClick={() => setNotifOpen(false)}>All orders →</Link>}</div>
                  <div className="db-notif-list">
                    {orders.length === 0 ? (
                      <div className="db-notif-empty">No orders yet.<br />New scanned orders appear here instantly.</div>
                    ) : orders.slice(0, 12).map((o) => (
                      <div key={o.id} className="db-notif-item">
                        <span className={`db-notif-dot ${o.status}`} />
                        <div className="db-notif-tx"><b>{place(o)} · ₹{o.total}</b><span>#{o.order_no} · {o.items.reduce((a, i) => a + i.qty, 0)} items · {ago(o.created_at)}</span></div>
                        <span className={`db-pill ${o.status}`}>{LABEL[o.status]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link className="db-btn" href="/menu-editor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>Add dish</Link>
            <Link className="db-btn prime" href={`/${restaurant.slug}/menu/1`} target="_blank">View my menu</Link>
          </div>
        </div>

        <div className="db-content ov">
          {alert && (
            <div className="db-alert" role="alert">
              <span className="db-alert-ping" />
              <div className="db-alert-tx"><b>New order · {alert.table}</b><span>#{alert.order_no} · ₹{alert.total} — a customer just ordered</span></div>
              <button className="db-alert-btn" onClick={acknowledge}>Got it ✓</button>
            </div>
          )}

          <div className="ov-kpis">
            <div className="ov-kpi hero"><span>Collected today</span><b>₹{kpis.revenue.toLocaleString("en-IN")}</b><em>from paid bills</em></div>
            <div className="ov-kpi"><span>Orders today</span><b>{kpis.orders}</b><em>{live.length} still open</em></div>
            <div className="ov-kpi"><span>Unpaid bills</span><b>{kpis.unpaid}</b><em className={kpis.unpaid ? "w" : ""}>{kpis.unpaid ? `₹${kpis.unpaidAmt.toLocaleString("en-IN")} to collect` : "all settled"}</em></div>
            <div className="ov-kpi"><span>Average bill</span><b>₹{kpis.aov}</b><em>today</em></div>
          </div>

          <Floor restaurant={restaurant} orders={orders} />

          <div className="ov-grid">
            <section className="db-panel ov-live">
              <div className="db-ph"><h3><span className="ov-dot" />Live orders</h3><Link href="/orders" className="db-see">All orders →</Link></div>
              {live.length === 0 ? (
                <div className="ov-empty"><b>No open orders right now</b><span>New QR and staff orders land in the New column the moment they&apos;re placed.</span></div>
              ) : (
                <div className="ov-board">
                  {lanes.map((ln) => (
                    <div key={ln.key} className={`ov-lane ${ln.key}`}>
                      <div className="ov-lh">{ln.title}<b>{ln.list.length}</b></div>
                      {ln.list.map((o) => {
                        return (
                          <div key={o.id} className="ov-card">
                            <div className="r1"><span className="t">{place(o)}</span><span className="m">#{o.order_no} · {ago(o.created_at)}</span></div>
                            <div className="it">{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ") || "—"}</div>
                            <div className="r2">
                              <span className="amt">₹{o.total}{o.payment_status !== "paid" && <em>Unpaid</em>}</span>
                              <button className={`go${o.status === "new" ? "" : " o"}`} onClick={() => advance(o.id, o.status)} disabled={!NEXT[o.status]}>{BTN[o.status]}</button>
                            </div>
                          </div>
                        );
                      })}
                      {ln.list.length === 0 && <div className="ov-none">Nothing here</div>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="ov-rail">
              {setupLeft > 0 && (
                <section className="db-panel">
                  <div className="db-ph"><h3>Finish setting up</h3><span className="ov-count">{setup.length - setupLeft} of {setup.length}</span></div>
                  <div className="ov-setup">
                    <div className="ov-prog"><i style={{ width: `${Math.round(((setup.length - setupLeft) / setup.length) * 100)}%` }} /></div>
                    <ul>
                      {setup.map((st) => (
                        <li key={st.yes} className={st.done ? "ok" : ""}>
                          <span className="d" aria-hidden>{st.done ? "✓" : ""}</span>
                          {st.done ? st.yes : <Link href={`/settings/${st.to}`}>{st.todo}</Link>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
              {loyaltyOf(restaurant).loyalty_enabled && (
                <section className="db-panel">
                  <div className="db-ph"><h3>Rewards ready</h3><Link href="/loyalty" className="db-see">Loyalty →</Link></div>
                  {rewards.length === 0 ? (
                    <div className="ov-none pad">No full stamp cards yet.</div>
                  ) : rewards.slice(0, 4).map((c) => (
                    <div key={c.id} className="ov-rw">
                      <span className="av">★</span>
                      <div className="w"><b>+91 {c.phone.slice(0, 5)} •••••</b><span>{c.stamps} ticks · reward waiting</span></div>
                      <Link className="db-btn prime" href="/loyalty">Give</Link>
                    </div>
                  ))}
                </section>
              )}
              <section className="db-panel">
                <div className="db-ph"><h3>Top dishes today</h3><Link href="/menu-editor" className="db-see">Menu →</Link></div>
                {best.length === 0 ? (
                  <div className="ov-none pad">Your best sellers show up here after today&apos;s first orders.</div>
                ) : (
                  <div className="ov-top">
                    {best.map((b, i) => (
                      <div className="ov-dish" key={b.name}>
                        <span className="k">{i + 1}</span>
                        <div className="n">{b.name}<div className="bar"><i style={{ width: `${b.w}%` }} /></div></div>
                        <em>{b.c}</em>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>
    </div>
  );
}
