"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AppLoading } from "@/components/AppLoading";
import { listOrdersWithItems, type OrderWithItems } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import "../dash.css";
import "./customers.css";

const dstr = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const tstr = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

type Customer = { phone: string; name: string; visits: number; spent: number; lastAt: string; orders: OrderWithItems[] };

export default function Customers() {
  const { restaurant, ready } = useOwner();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => { if (restaurant) { setOrders(await listOrdersWithItems(restaurant.id)); setLoading(false); } })();
  }, [restaurant]);

  const customers = useMemo(() => {
    const m: Record<string, Customer> = {};
    orders.forEach((o) => {
      const phone = (o.customer_phone || "").trim();
      if (!phone) return;
      const c = (m[phone] ??= { phone, name: "", visits: 0, spent: 0, lastAt: o.created_at, orders: [] });
      c.orders.push(o);
      c.visits += 1;
      if (o.payment_status === "paid") c.spent += o.total;
      if (o.customer_name && !c.name) c.name = o.customer_name; // orders are newest-first, keep the latest known name
      if (new Date(o.created_at) > new Date(c.lastAt)) c.lastAt = o.created_at;
    });
    return Object.values(m).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [orders]);

  const shown = customers.filter((c) => !q || `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  const totals = useMemo(() => ({ count: customers.length, repeat: customers.filter((c) => c.visits > 1).length, spent: customers.reduce((a, c) => a + c.spent, 0) }), [customers]);

  if (!ready || !restaurant) return <AppLoading label="Loading customers…" />;

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar"><div><h1>Customers</h1><p>Everyone who&apos;s ordered from you — saved automatically by phone number.</p></div></div>
        <div className="db-content">
          <div className="or-stats">
            <div className="or-stat"><div className="l">Customers</div><div className="v">{totals.count}</div></div>
            <div className="or-stat"><div className="l">Repeat customers</div><div className="v pos">{totals.repeat}</div></div>
            <div className="or-stat"><div className="l">Lifetime collected</div><div className="v">₹{totals.spent.toLocaleString("en-IN")}</div></div>
          </div>

          <div className="cu-bar">
            <div className="or-search" style={{ maxWidth: 340 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
              <input placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>Loading…</div>
          ) : customers.length === 0 ? (
            <div className="cu-empty">
              <h3>No customers yet</h3>
              <p>When a guest orders with a phone number — from the QR menu or from your staff POS — they&apos;ll appear here with their history.</p>
            </div>
          ) : (
            <div className="cu-list">
              <div className="cu-head"><span>Customer</span><span>Phone</span><span>Visits</span><span>Spent</span><span>Last visit</span></div>
              {shown.map((c) => (
                <div key={c.phone} className="cu-wrap">
                  <div className="cu-row" onClick={() => setOpen((o) => (o === c.phone ? null : c.phone))}>
                    <div className="cu-name"><span className="av">{(c.name || "#").trim().slice(0, 1).toUpperCase()}</span><b>{c.name || "Unknown name"}</b></div>
                    <div className="cu-ph">{c.phone}</div>
                    <div className="cu-v">{c.visits}</div>
                    <div className="cu-sp">₹{c.spent.toLocaleString("en-IN")}</div>
                    <div className="cu-last">{dstr(c.lastAt)} <span className="cu-caret">{open === c.phone ? "▾" : "›"}</span></div>
                  </div>
                  {open === c.phone && (
                    <div className="cu-orders">
                      {c.orders.map((o) => (
                        <div key={o.id} className="cu-o">
                          <div className="cu-o-l"><b>#{o.order_no}</b><span>{dstr(o.created_at)} · {tstr(o.created_at)} · Table {o.table_number}</span></div>
                          <div className="cu-o-items">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ") || "—"}</div>
                          <div className="cu-o-amt">₹{o.total}<span className={`cu-o-pay ${o.payment_status}`}>{o.payment_status === "paid" ? "Paid" : "Unpaid"}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ height: 30 }} />
        </div>
      </main>
    </div>
  );
}
