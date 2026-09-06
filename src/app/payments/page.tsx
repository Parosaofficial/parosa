"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { listOrders } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import type { Order } from "@/lib/types";
import "../dash.css";
import "./payments.css";

const localDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA"); // YYYY-MM-DD
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

export default function Payments() {
  const { restaurant, ready } = useOwner();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));

  useEffect(() => {
    (async () => {
      if (restaurant) { setOrders(await listOrders(restaurant.id)); setLoading(false); }
    })();
  }, [restaurant]);

  const rows = useMemo(
    () => orders.filter((o) => o.payment_status === "paid" && localDate(o.created_at) === date),
    [orders, date]
  );
  const stats = useMemo(() => {
    const total = rows.reduce((a, p) => a + p.total, 0);
    const upi = rows.filter((p) => p.payment_method === "UPI").reduce((a, p) => a + p.total, 0);
    const cash = rows.filter((p) => p.payment_method === "Cash").reduce((a, p) => a + p.total, 0);
    return { total, upi, cash, count: rows.length };
  }, [rows]);

  const pretty = new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  if (!ready || !restaurant) return <AppLoading label="Loading payments…" />;

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar"><div><h1>Payments</h1><p>Your collection history — pick any date to see its bills.</p></div></div>
        <div className="db-content">
          <div className="pay-datebar">
            <label htmlFor="pd">Payments on</label>
            <input id="pd" className="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="pay-stats">
            <div className="pay-stat big"><div className="l">Collected</div><div className="v">₹{stats.total.toLocaleString("en-IN")}</div></div>
            <div className="pay-stat"><div className="l">Via UPI</div><div className="v">₹{stats.upi.toLocaleString("en-IN")}</div></div>
            <div className="pay-stat"><div className="l">Via Cash</div><div className="v">₹{stats.cash.toLocaleString("en-IN")}</div></div>
            <div className="pay-stat"><div className="l">Bills paid</div><div className="v">{stats.count}</div></div>
          </div>

          <div className="db-panel" style={{ marginBottom: 0 }}>
            <div className="db-ph"><h3>Payments · {pretty}</h3><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{stats.count} bills</span></div>
            <div className="pay-list">
              <div className="head"><span>Order</span><span>Time</span><span>Method</span><span>Amount</span></div>
              {loading ? (
                <div className="pay-empty">Loading…</div>
              ) : rows.length === 0 ? (
                <div className="pay-empty">No payments on this date.</div>
              ) : rows.map((p) => (
                <div className="r" key={p.id}>
                  <div className="pay-oid"><b>#{p.order_no}</b><span>Table {p.table_number}</span></div>
                  <div className="pay-time">{time(p.created_at)}</div>
                  <div><span className={`pay-method ${(p.payment_method ?? "upi").toLowerCase()}`}>{p.payment_method}</span></div>
                  <div className="pay-amt">₹{p.total}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>
    </div>
  );
}
