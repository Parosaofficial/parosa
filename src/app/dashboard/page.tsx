"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { listOrdersWithItems, updateOrderStatus, type OrderWithItems } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import { supabase } from "@/lib/supabase";
import { playChime, primeAudio } from "@/lib/chime";
import type { Order, OrderStatus } from "@/lib/types";
import "../dash.css";
import "./dashboard.css";

const NEXT: Record<OrderStatus, OrderStatus | null> = { new: "cooking", cooking: "ready", ready: "served", served: null };
const LABEL: Record<OrderStatus, string> = { new: "New", cooking: "Cooking", ready: "Ready", served: "Served" };
const BTN: Record<OrderStatus, string> = { new: "Start cooking →", cooking: "Mark ready →", ready: "Mark served →", served: "Completed" };

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)}h ago`;
};

function Spark() {
  return <svg className="db-spark" viewBox="0 0 86 32" fill="none" aria-hidden><polyline points="0,26 12,20 24,23 36,13 48,17 60,9 72,12 86,4" stroke="#8C2A28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

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
    setAlert({ table: o.table_number ?? "—", total: o.total, order_no: o.order_no ?? "" });
    setUnread((c) => c + 1);
    if (soundRef.current) {
      playChime();
      if ("Notification" in window && Notification.permission === "granted") {
        try { new Notification("New order · Table " + (o.table_number ?? "—"), { body: `₹${o.total} — tap to view on Parosa` }); } catch {}
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

  const live = orders.filter((o) => o.status !== "served");

  const kpis = useMemo(() => {
    const paid = orders.filter((o) => o.payment_status === "paid");
    const revenue = paid.reduce((a, o) => a + o.total, 0);
    const liveTables = new Set(live.map((o) => o.table_number)).size;
    const aov = orders.length ? Math.round(orders.reduce((a, o) => a + o.total, 0) / orders.length) : 0;
    return { orders: orders.length, revenue, liveTables, aov };
  }, [orders, live]);

  const best = useMemo(() => {
    const m: Record<string, number> = {};
    orders.forEach((o) => o.items.forEach((it) => { m[it.name] = (m[it.name] ?? 0) + it.qty; }));
    const arr = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = arr[0]?.[1] ?? 1;
    return arr.map(([name, c]) => ({ name, c, w: Math.round((c / max) * 100) }));
  }, [orders]);

  if (!ready || !restaurant) return <AppLoading label="Loading your dashboard…" />;

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div>
            <h1>नमस्ते, {restaurant.name} 👋</h1>
            <p>Here&apos;s how your restaurant is doing today.</p>
          </div>
          <div className="db-topright">
            <div className="db-toprow">
              <span className="db-date">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
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
                          <div className="db-notif-tx"><b>Table {o.table_number} · ₹{o.total}</b><span>#{o.order_no} · {o.items.reduce((a, i) => a + i.qty, 0)} items · {ago(o.created_at)}</span></div>
                          <span className={`db-pill ${o.status}`}>{LABEL[o.status]}</span>
                        </div>
                      ))}
                    </div>
                    <button className="db-notif-sound" onClick={toggleSound}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="16" height="16"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></svg>
                      <span style={{ flex: 1, textAlign: "left" }}>{soundOn ? "Order sound is on" : "Turn on order sound"}</span>
                      <span className={`db-mini-switch${soundOn ? " on" : ""}`} />
                    </button>
                  </div>
                )}
              </div>
              <button className="db-user"><span className="av">{(restaurant.name || "प").trim().slice(0, 1).toUpperCase()}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m6 9 6 6 6-6" /></svg></button>
            </div>
            <div className="db-acts">
              <Link className="db-btn" href="/menu-editor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> Add dish</Link>
              <Link className="db-btn prime" href={`/${restaurant.slug}/menu/1`} target="_blank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /></svg> View live menu</Link>
            </div>
          </div>
        </div>

        <div className="db-content">
          {alert && (
            <div className="db-alert" role="alert">
              <span className="db-alert-ping" />
              <div className="db-alert-tx"><b>New order · Table {alert.table}</b><span>#{alert.order_no} · ₹{alert.total} — a customer just ordered</span></div>
              <button className="db-alert-btn" onClick={acknowledge}>Got it ✓</button>
            </div>
          )}
          {!soundOn && (
            <div className="db-note db-soundnudge" onClick={toggleSound} role="button">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></svg>
              <span><b>Turn on order sound</b> — click here so Parosa rings a bell the moment a customer places an order. (Your browser needs one click to allow sound.)</span>
            </div>
          )}
          <div className="db-kpis">
            <div className="db-kpi"><div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2l1.5 3h9L18 2M4 7h16l-1.5 13a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8Z" /></svg></div><div className="db-kl">Today&apos;s Orders</div><div className="db-kv">{kpis.orders}</div><div className="db-kd up">▲ live</div><Spark /></div>
            <div className="db-kpi"><div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div><div className="db-kl">Collected</div><div className="db-kv">₹{kpis.revenue.toLocaleString("en-IN")}</div><div className="db-kd up">▲ paid bills</div><Spark /></div>
            <div className="db-kpi"><div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="8" width="18" height="10" rx="2" /><path d="M7 8V6a5 5 0 0 1 10 0v2" /></svg></div><div className="db-kl">Live Tables</div><div className="db-kv">{kpis.liveTables}</div><div className="db-kd flat">◷ awaiting food</div></div>
            <div className="db-kpi"><div className="db-ki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18" /><path d="M7 14l3-4 4 3 4-6" /></svg></div><div className="db-kl">Avg Order Value</div><div className="db-kv">₹{kpis.aov}</div><div className="db-kd up">▲</div><Spark /></div>
          </div>

          <div className="db-note" style={{ marginTop: 18 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><path d="M9 3h6M10 9h4M12 3v3M7 21a5 5 0 0 1-1-9l0-3h12l0 3a5 5 0 0 1-1 9Z" /></svg>
            <span><b>Live</b> — new scanned orders appear here automatically. Advance an order (New → Cooking → Ready → Served) and it updates in real time.</span>
          </div>

          <div className="db-grid2">
            <div className="db-panel">
              <div className="db-ph"><h3>Live Orders</h3><div style={{ display: "flex", alignItems: "center", gap: 16 }}><span className="db-live"><span className="d" /> Real-time</span><Link href="/orders" className="db-see">View all orders →</Link></div></div>
              <div className="db-pb">
                {live.length === 0 ? (
                  <div style={{ padding: "26px 4px", textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>No live orders right now. Scan a table QR and place one to see it appear here instantly.</div>
                ) : live.map((o) => (
                  <div key={o.id} className="db-ticket" data-s={o.status}>
                    <div className="db-tt"><span className="db-tbl">Table {o.table_number} <small>· {ago(o.created_at)}</small></span><span className={`db-pill ${o.status}`}>{LABEL[o.status]}</span></div>
                    <div className="db-items">{o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ") || "—"}</div>
                    <div className="db-tf"><span className="db-amt">₹{o.total}</span><button className={`db-adv${o.status === "new" ? " prime" : ""}`} onClick={() => advance(o.id, o.status)} disabled={!NEXT[o.status]}>{BTN[o.status]}</button></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="db-panel">
              <div className="db-ph"><h3>Today&apos;s Bestsellers</h3><Link href="/menu-editor" className="db-see">Edit menu →</Link></div>
              <div className="db-pb">
                {best.length === 0 ? (
                  <div style={{ padding: "20px 4px", color: "var(--muted)", fontSize: 13 }}>No sales yet — bestsellers appear as orders come in.</div>
                ) : (
                  <div className="db-best">
                    {best.map((b, i) => (
                      <div className="db-bi" key={b.name}>
                        <span className="db-rk">{i + 1}</span>
                        <span className="db-bt">🍽️</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="db-bn"><span>{b.name}</span><span className="c">{b.c}</span></div>
                          <div className="db-bar"><span style={{ width: `${b.w}%` }} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="db-tip">
                <span className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="18" height="18"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" /></svg></span>
                <div style={{ flex: 1 }}><h4>Tip for higher revenue</h4><p>Add combo meals to your menu. Restaurants see up to 20% higher order value with combos.</p></div>
                <span className="ch">›</span>
              </div>
            </div>
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>
    </div>
  );
}
