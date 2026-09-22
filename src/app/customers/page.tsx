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
const money = (n: number) => "₹" + n.toLocaleString("en-IN");

/** "Today", "Yesterday", "5 days ago", "3 weeks ago" — easier to scan than a date. */
function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? "" : "s"} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${days < 60 ? "" : "s"} ago`;
  return `${Math.floor(days / 365)} year${days < 730 ? "" : "s"} ago`;
}

type Tier = "regular" | "repeat" | "new";
type Customer = { phone: string; name: string; visits: number; spent: number; unpaid: number; lastAt: string; firstAt: string; tier: Tier; fav: string; orders: OrderWithItems[] };

const TIER: Record<Tier, { label: string; hint: string }> = {
  regular: { label: "Regular", hint: "5+ visits" },
  repeat: { label: "Repeat", hint: "2–4 visits" },
  new: { label: "New", hint: "first visit" },
};
// the avatar colour is derived from the phone, so a customer always keeps the same one
const AV = ["#6E1618", "#8A4B12", "#3F6B3A", "#2F5A73", "#6B3A6B", "#8A5A16"];
const avatarColor = (phone: string) => AV[[...phone].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
const initials = (name: string, phone: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return phone.slice(-2);
  return (p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)).toUpperCase();
};
const waLink = (phone: string, text: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length === 10 ? "91" + d : d}?text=${encodeURIComponent(text)}`;
};

type SortKey = "recent" | "spent" | "visits";

export default function Customers() {
  const { restaurant, ready } = useOwner();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | Tier>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => { if (restaurant) { setOrders(await listOrdersWithItems(restaurant.id)); setLoading(false); } })();
  }, [restaurant]);

  const customers = useMemo(() => {
    const m: Record<string, Customer> = {};
    orders.forEach((o) => {
      const phone = (o.customer_phone || "").trim();
      if (!phone) return;
      const c = (m[phone] ??= { phone, name: "", visits: 0, spent: 0, unpaid: 0, lastAt: o.created_at, firstAt: o.created_at, tier: "new", fav: "", orders: [] });
      c.orders.push(o);
      c.visits += 1;
      if (o.payment_status === "paid") c.spent += o.total; else c.unpaid += o.total;
      if (o.customer_name && !c.name) c.name = o.customer_name; // orders are newest-first, keep the latest known name
      if (new Date(o.created_at) > new Date(c.lastAt)) c.lastAt = o.created_at;
      if (new Date(o.created_at) < new Date(c.firstAt)) c.firstAt = o.created_at;
    });
    return Object.values(m).map((c) => {
      const count: Record<string, number> = {};
      c.orders.forEach((o) => o.items.forEach((i) => { count[i.name] = (count[i.name] ?? 0) + i.qty; }));
      const fav = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
      return { ...c, fav: fav?.[0] ?? "", tier: (c.visits >= 5 ? "regular" : c.visits > 1 ? "repeat" : "new") as Tier };
    });
  }, [orders]);

  const totals = useMemo(() => {
    const repeat = customers.filter((c) => c.visits > 1).length;
    const spent = customers.reduce((a, c) => a + c.spent, 0);
    return {
      count: customers.length,
      repeat,
      repeatPct: customers.length ? Math.round((repeat / customers.length) * 100) : 0,
      spent,
      avg: customers.length ? Math.round(spent / customers.length) : 0,
    };
  }, [customers]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = customers.filter((c) => (tab === "all" || c.tier === tab) && (!needle || `${c.name} ${c.phone}`.toLowerCase().includes(needle)));
    const by: Record<SortKey, (a: Customer, b: Customer) => number> = {
      recent: (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
      spent: (a, b) => b.spent - a.spent,
      visits: (a, b) => b.visits - a.visits,
    };
    return [...list].sort(by[sort]);
  }, [customers, q, tab, sort]);

  const exportCsv = () => {
    const rows = [["Name", "Phone", "Visits", "Spent", "Unpaid", "First visit", "Last visit", "Favourite"],
      ...shown.map((c) => [c.name || "", c.phone, c.visits, c.spent, c.unpaid, dstr(c.firstAt), dstr(c.lastAt), c.fav])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `${restaurant?.slug ?? "parosa"}-customers.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!ready || !restaurant) return <AppLoading label="Loading customers…" />;

  const counts = { all: customers.length, regular: customers.filter((c) => c.tier === "regular").length, repeat: customers.filter((c) => c.tier === "repeat").length, new: customers.filter((c) => c.tier === "new").length };

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Customers</h1><p>Everyone who&apos;s ordered from you — saved automatically by phone number.</p></div>
          {customers.length > 0 && (
            <div className="db-acts">
              <button className="db-btn" onClick={exportCsv}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg> Export CSV
              </button>
            </div>
          )}
        </div>

        <div className="db-content">
          {loading ? (
            <div className="cu-loading">Loading customers…</div>
          ) : customers.length === 0 ? (
            <div className="cu-empty">
              <div className="cu-empty-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9" /></svg>
              </div>
              <h3>No customers yet</h3>
              <p>When a guest orders with their phone number — from a table QR or from your staff — they appear here with every visit, what they spent and what they love ordering.</p>
              <ul className="cu-steps">
                <li><b>1</b> Print your table QR codes</li>
                <li><b>2</b> A guest scans and orders</li>
                <li><b>3</b> Their history builds here</li>
              </ul>
            </div>
          ) : (
            <>
              <div className="cu-stats">
                <div className="cu-stat"><div className="l">Customers</div><div className="v">{totals.count}</div><div className="s">{counts.new} new · {counts.repeat + counts.regular} returning</div></div>
                <div className="cu-stat"><div className="l">Repeat rate</div><div className="v pos">{totals.repeatPct}%</div><div className="s">{totals.repeat} came back</div></div>
                <div className="cu-stat"><div className="l">Lifetime collected</div><div className="v">{money(totals.spent)}</div><div className="s">paid bills only</div></div>
                <div className="cu-stat"><div className="l">Average per customer</div><div className="v">{money(totals.avg)}</div><div className="s">across all visits</div></div>
              </div>

              <div className="cu-bar">
                <div className="cu-tabs" role="tablist">
                  {([["all", "All"], ["regular", TIER.regular.label], ["repeat", TIER.repeat.label], ["new", TIER.new.label]] as const).map(([k, label]) => (
                    <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
                      {label} <span>{counts[k]}</span>
                    </button>
                  ))}
                </div>
                <div className="cu-tools">
                  <div className="cu-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
                    <input placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                  <label className="cu-sort">
                    Sort
                    <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                      <option value="recent">Recent visit</option>
                      <option value="spent">Highest spend</option>
                      <option value="visits">Most visits</option>
                    </select>
                  </label>
                </div>
              </div>

              {shown.length === 0 ? (
                <div className="cu-none">No customer matches “{q}”.</div>
              ) : (
                <div className="cu-list">
                  {shown.map((c) => {
                    const isOpen = open === c.phone;
                    return (
                      <div key={c.phone} className={`cu-card${isOpen ? " open" : ""}`}>
                        <button className="cu-row" onClick={() => setOpen(isOpen ? null : c.phone)} aria-expanded={isOpen}>
                          <span className="cu-who">
                            <span className="cu-av" style={{ background: avatarColor(c.phone) }}>{initials(c.name, c.phone)}</span>
                            <span className="cu-id">
                              <b>{c.name || "Unknown name"}<em className={`cu-tag ${c.tier}`}>{TIER[c.tier].label}</em></b>
                              <i>{c.phone}{c.fav && <> · loves <span>{c.fav}</span></>}</i>
                            </span>
                          </span>
                          <span className="cu-m visits"><em>{c.visits}</em><i>{c.visits === 1 ? "visit" : "visits"}</i></span>
                          <span className="cu-m spent"><em>{money(c.spent)}</em><i>{c.unpaid > 0 ? `${money(c.unpaid)} unpaid` : "collected"}</i></span>
                          <span className="cu-m last"><em>{ago(c.lastAt)}</em><i>{dstr(c.lastAt)}</i></span>
                          <span className="cu-chev" aria-hidden="true" />
                        </button>

                        {isOpen && (
                          <div className="cu-detail">
                            <div className="cu-actions">
                              <a className="cu-act wa" href={waLink(c.phone, `Namaste${c.name ? " " + c.name.split(" ")[0] : ""}! 🙏 ${restaurant.name} here.`)} target="_blank" rel="noopener">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.2-1-.4-1.6-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.2.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.6-.1l.7-.9c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2Z" /></svg>
                                WhatsApp
                              </a>
                              <a className="cu-act" href={`tel:${c.phone}`}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2Z" /></svg>
                                Call
                              </a>
                              <span className="cu-since">First visit {dstr(c.firstAt)}</span>
                            </div>
                            <div className="cu-orders">
                              {c.orders.map((o) => (
                                <div key={o.id} className="cu-o">
                                  <span className="cu-o-when"><b>#{o.order_no}</b><i>{dstr(o.created_at)} · {tstr(o.created_at)}</i></span>
                                  <span className="cu-o-items">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ") || "—"}</span>
                                  <span className="cu-o-meta">
                                    <i>Table {o.table_number}{o.staff_name ? ` · ${o.staff_name}` : " · QR"}</i>
                                    <b>{money(o.total)}</b>
                                    <em className={`cu-pay ${o.payment_status}`}>{o.payment_status === "paid" ? `Paid${o.payment_method ? " · " + o.payment_method : ""}` : "Unpaid"}</em>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <div style={{ height: 30 }} />
        </div>
      </main>
    </div>
  );
}
