"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Seal } from "@/components/Logo";
import { getRestaurantBySlug, listOrdersWithItems, markOrderPaid, type OrderWithItems } from "@/lib/db";
import type { Restaurant } from "@/lib/types";
import "../dash.css";
import "./orders.css";

const SLUG = "raj-darbar";
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function Orders() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "completed" | "all">("upcoming");
  const [q, setQ] = useState("");
  const [bill, setBill] = useState<OrderWithItems | null>(null);
  const [payVia, setPayVia] = useState<"Online" | "Cash">("Online");
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  const load = async () => {
    const r = await getRestaurantBySlug(SLUG);
    setRestaurant(r);
    if (r) setOrders(await listOrdersWithItems(r.id));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.payment_status === "paid");
    const unpaid = orders.filter((o) => o.payment_status === "unpaid");
    return { total: orders.length, paid: paid.length, unpaid: unpaid.length, revenue: paid.reduce((a, o) => a + o.total, 0) };
  }, [orders]);

  const shown = orders.filter((o) => {
    const st = filter === "all" ? true : filter === "completed" ? o.status === "served" : o.status !== "served";
    return st && (!q || `${o.order_no} ${o.table_number}`.toLowerCase().includes(q.toLowerCase()));
  });

  const doMarkPaid = async (id: string) => {
    const method = payVia === "Online" ? "UPI" : "Cash";
    await markOrderPaid(id, method);
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, payment_status: "paid", payment_method: method } : o)));
    setBill((b) => (b && b.id === id ? { ...b, payment_status: "paid", payment_method: method } : b));
    showToast(`Bill marked as paid · ${method} ✓`);
  };

  return (
    <div className="db-app">
      <Sidebar />
      <main className="db-main">
        <div className="db-topbar"><div><h1>Orders &amp; Bills</h1><p>Every order and its bill — status, payment and history.</p></div></div>

        <div className="db-content">
          <div className="or-stats">
            <div className="or-stat"><div className="l">Orders today</div><div className="v">{stats.total}</div></div>
            <div className="or-stat"><div className="l">Paid bills</div><div className="v pos">{stats.paid}</div></div>
            <div className="or-stat"><div className="l">Unpaid bills</div><div className="v neg">{stats.unpaid}</div></div>
            <div className="or-stat"><div className="l">Collected</div><div className="v">₹{stats.revenue.toLocaleString("en-IN")}</div></div>
          </div>

          <div className="or-bar">
            <div className="or-tabs">
              {(["upcoming", "completed", "all"] as const).map((f) => (
                <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
            <div className="or-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
              <input placeholder="Search order # or table…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          <div className="or-list">
            <div className="or-head"><span>Order</span><span>Items</span><span>Amount</span><span>Status</span><span></span></div>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading orders…</div>
            ) : shown.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No orders here yet.</div>
            ) : shown.map((o) => (
              <div className="or-row" key={o.id}>
                <div className="or-id"><b>#{o.order_no}</b><span>Table {o.table_number} · {time(o.created_at)}</span></div>
                <div className="or-c-items">{o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ") || "—"}</div>
                <div className="or-c-amt">₹{o.total}</div>
                <div className="or-pills">
                  <span className={`or-pill ${o.status}`}>{o.status}</span>
                  <span className={`or-pay ${o.payment_status}`}>{o.payment_status === "paid" ? `Paid · ${o.payment_method}` : "Unpaid"}</span>
                </div>
                <button className="or-view" onClick={() => { setPayVia("Online"); setBill(o); }}>View bill</button>
              </div>
            ))}
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>

      <div className={`or-backdrop${bill ? " show" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setBill(null); }}>
        {bill && (
          <div className="or-bill">
            <button className="or-bx" onClick={() => setBill(null)}>×</button>
            <div className="or-bh">
              <Seal size={40} />
              <div className="rn">{restaurant?.name ?? "Raj Darbar"}</div>
              <div className="meta">{restaurant?.address ?? ""}<br />GSTIN {restaurant?.gstin ?? "—"} · FSSAI {restaurant?.fssai ?? "—"}</div>
            </div>
            <div className="or-bbody">
              <div className="or-brow"><span>Bill No.</span><b>#{bill.order_no}</b></div>
              <div className="or-brow"><span>Table</span><b>{bill.table_number}</b></div>
              <div className="or-brow"><span>Date</span><b>{dateStr(bill.created_at)} · {time(bill.created_at)}</b></div>
              <div className="or-bdiv" />
              {bill.items.map((i, k) => (<div className="or-bitem" key={k}><span><span className="q">{i.qty}×</span>{i.name}</span><span className="amt">₹{i.qty * i.price}</span></div>))}
              <div className="or-bdiv" />
              <div className="or-btot"><span>Subtotal</span><span>₹{bill.subtotal}</span></div>
              <div className="or-btot"><span>GST (5%)</span><span>₹{bill.gst}</span></div>
              <div className="or-btot grand"><span>Total</span><span>₹{bill.total}</span></div>
              <div className={`or-bstat ${bill.payment_status}`}>{bill.payment_status === "paid" ? `Paid · ${bill.payment_method}` : "Payment pending"}</div>
            </div>
            <div className="or-bf">
              <div className="rowb">
                <button className="wa" onClick={() => showToast("Bill sent on WhatsApp ✓")}>
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.2-1-.4-1.6-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.2.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.6-.1l.7-.9c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2Z" /></svg>
                  Send on WhatsApp
                </button>
                <button onClick={() => showToast("Sent to printer")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg>
                  Print
                </button>
              </div>
              {bill.payment_status === "unpaid" && (
                <>
                  <div className="or-payvia">
                    <button className={payVia === "Online" ? "on" : ""} onClick={() => setPayVia("Online")}>Online · UPI</button>
                    <button className={payVia === "Cash" ? "on" : ""} onClick={() => setPayVia("Cash")}>Cash</button>
                  </div>
                  <button className="pay" onClick={() => doMarkPaid(bill.id)}>Mark as paid</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
