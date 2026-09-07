"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { AppLoading } from "@/components/AppLoading";
import { Dialog } from "@/components/Dialog";
import { addItemToOrder, getMenu, listOrdersWithItems, markOrderPaid, type OrderWithItems } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import { buildBillText, billFileName, generateBillPdf } from "@/lib/bill";
import type { Dish } from "@/lib/types";
import "../dash.css";
import "./orders.css";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
const dateStr = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

type Line = { name: string; qty: number; price: number };
function aggregate(items: Line[]): Line[] {
  const m: Record<string, Line> = {};
  items.forEach((it) => { (m[it.name] ??= { name: it.name, qty: 0, price: it.price }).qty += it.qty; });
  return Object.values(m);
}
function waLink(number: string, text: string) {
  let d = number.replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

export default function Orders() {
  const { restaurant, ready } = useOwner();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "completed" | "all">("upcoming");
  const [q, setQ] = useState("");
  const [bill, setBill] = useState<OrderWithItems | null>(null);
  const [payVia, setPayVia] = useState<"Online" | "Cash">("Online");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickSearch, setPickSearch] = useState("");
  const [waOpen, setWaOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  useEffect(() => {
    (async () => {
      if (!restaurant) return;
      const [os, menu] = await Promise.all([listOrdersWithItems(restaurant.id), getMenu(restaurant.slug)]);
      setOrders(os);
      setDishes(menu?.dishes ?? []);
      setLoading(false);
    })();
  }, [restaurant]);

  const descByName = useMemo(() => {
    const m: Record<string, string> = {};
    dishes.forEach((d) => { if (d.description) m[d.name] = d.description; });
    return m;
  }, [dishes]);

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

  const addItem = async (dish: Dish) => {
    if (!bill) return;
    const items = [...bill.items, { name: dish.name, qty: 1, price: dish.price }];
    const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
    const gst = Math.round(subtotal * 0.05);
    const total = subtotal + gst;
    const updated = { ...bill, items, subtotal, gst, total };
    setBill(updated);
    setOrders((os) => os.map((o) => (o.id === bill.id ? updated : o)));
    setPickerOpen(false);
    setPickSearch("");
    try { await addItemToOrder(bill.id, dish, { subtotal, gst, total }); showToast(`Added ${dish.name}`); }
    catch { showToast("Could not add item — try again"); }
  };

  const printBill = async () => {
    if (!bill || !restaurant) return;
    setPrinting(true);
    try {
      const doc = await generateBillPdf(restaurant, bill);
      doc.save(billFileName(restaurant, bill));
      showToast("Bill PDF downloaded");
    } catch { showToast("Could not make the PDF — try again"); }
    finally { setPrinting(false); }
  };

  const sendWhatsApp = async (number: string) => {
    if (!bill || !restaurant || !number.replace(/\D/g, "")) { showToast("Enter a valid number"); return; }
    setWaOpen(false);
    try { const doc = await generateBillPdf(restaurant, bill); doc.save(billFileName(restaurant, bill)); } catch { /* still open chat */ }
    window.open(waLink(number, buildBillText(restaurant, bill)), "_blank");
    showToast("WhatsApp opened — attach the downloaded bill PDF, then Send");
  };

  if (!ready || !restaurant) return <AppLoading label="Loading orders…" />;

  const billItems = bill ? aggregate(bill.items) : [];
  const availableDishes = dishes.filter((d) => d.available && (!pickSearch || d.name.toLowerCase().includes(pickSearch.toLowerCase())));

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
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
                <div className="or-c-items">{aggregate(o.items).map((i) => `${i.qty}× ${i.name}`).join(" · ") || "—"}</div>
                <div className="or-c-amt">₹{o.total}</div>
                <div className="or-pills">
                  <span className={`or-pill ${o.status}`}>{o.status}</span>
                  <span className={`or-pay ${o.payment_status}`}>{o.payment_status === "paid" ? `Paid · ${o.payment_method}` : "Unpaid"}</span>
                </div>
                <button className="or-view" onClick={() => { setPayVia("Online"); setExpanded(null); setBill(o); }}>View bill</button>
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
              <RestaurantLogo restaurant={restaurant} size={44} />
              <div className="rn">{restaurant.name}</div>
              <div className="meta">{restaurant.address ?? ""}<br />GSTIN {restaurant.gstin ?? "—"} · FSSAI {restaurant.fssai ?? "—"}</div>
            </div>
            <div className="or-bbody">
              <div className="or-brow"><span>Bill No.</span><b>#{bill.order_no}</b></div>
              <div className="or-brow"><span>Table</span><b>{bill.table_number}</b></div>
              <div className="or-brow"><span>Date</span><b>{dateStr(bill.created_at)} · {time(bill.created_at)}</b></div>
              <div className="or-bdiv" />
              <div className="or-bhint">Tap an item to see what&apos;s in it.</div>
              {billItems.map((i) => (
                <div key={i.name}>
                  <div className="or-bitem tappable" onClick={() => setExpanded((e) => (e === i.name ? null : i.name))}>
                    <span><span className="q">{i.qty}×</span>{i.name}<span className="or-caret">{expanded === i.name ? "▾" : "›"}</span></span>
                    <span className="amt">₹{i.qty * i.price}</span>
                  </div>
                  {expanded === i.name && (
                    <div className="or-bdetail">{descByName[i.name] || "No details added yet — add them from Menu & Dishes."}</div>
                  )}
                </div>
              ))}
              <button className="or-additem" onClick={() => { setPickSearch(""); setPickerOpen(true); }}>+ Add item to this bill</button>
              <div className="or-bdiv" />
              <div className="or-btot"><span>Subtotal</span><span>₹{bill.subtotal}</span></div>
              <div className="or-btot"><span>GST (5%)</span><span>₹{bill.gst}</span></div>
              <div className="or-btot grand"><span>Total</span><span>₹{bill.total}</span></div>
              <div className={`or-bstat ${bill.payment_status}`}>{bill.payment_status === "paid" ? `Paid · ${bill.payment_method}` : "Payment pending"}</div>
            </div>
            <div className="or-bf">
              <div className="rowb">
                <button className="wa" onClick={() => setWaOpen(true)}>
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.2-1-.4-1.6-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.2.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.6-.1l.7-.9c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2Z" /></svg>
                  Send on WhatsApp
                </button>
                <button onClick={printBill} disabled={printing}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg>
                  {printing ? "Preparing…" : "Print / PDF"}
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

      {/* add-item picker */}
      <div className={`or-backdrop${pickerOpen ? " show" : ""}`} style={{ zIndex: 210 }} onClick={(e) => { if (e.target === e.currentTarget) setPickerOpen(false); }}>
        {pickerOpen && (
          <div className="or-picker">
            <div className="or-pk-hd"><h3>Add an item</h3><button className="or-bx" onClick={() => setPickerOpen(false)}>×</button></div>
            <div className="or-pk-search"><input autoFocus placeholder="Search your dishes…" value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} /></div>
            <div className="or-pk-list">
              {availableDishes.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No matching dishes.</div>
              ) : availableDishes.map((d) => (
                <button key={d.id} className="or-pk-item" onClick={() => addItem(d)}>
                  <span className={`or-pk-vd${d.is_veg ? "" : " nv"}`} />
                  <span className="nm">{d.name}</span>
                  <span className="pr">₹{d.price}</span>
                  <span className="add">+</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={waOpen}
        title="Send bill on WhatsApp"
        message="Enter the customer's WhatsApp number. We'll download the bill PDF and open their chat with the bill details — just attach the PDF and hit Send."
        input
        placeholder="e.g. 98765 43210"
        defaultValue={bill?.customer_phone ?? ""}
        confirmLabel="Open WhatsApp"
        onConfirm={sendWhatsApp}
        onCancel={() => setWaOpen(false)}
      />

      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
