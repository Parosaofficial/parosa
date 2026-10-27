"use client";

import { useEffect, useState } from "react";
import { StampStrip } from "@/components/MenuStamp";
import { getPublicCard } from "@/lib/loyalty";
import { sessionBill, type SessionBill } from "@/lib/tables";
import "./thankyou.css";

/*
 * After a guest orders: a calm maroon-and-white screen with just three
 * choices — add more, call a waiter, or ask for the bill. The bill view shows
 * the whole table's orders; payment happens at the table or counter, and when
 * the owner closes the bill the menu shows "Bill paid" with the stamp card.
 */

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function ThankYou({ restaurantName, tableTitle, sessionId, sessionCode, order, billAsked, onRequest, onAddMore }: {
  restaurantName: string;
  tableTitle: string;
  sessionId: string | null;
  sessionCode: string | null;
  order: { no: string; total: number };
  billAsked: boolean;
  /** null when this menu has no table session (waiter / bill buttons hidden) */
  onRequest: ((kind: "waiter" | "bill") => Promise<void>) | null;
  onAddMore: () => void;
}) {
  const [view, setView] = useState<"thanks" | "bill">(billAsked ? "bill" : "thanks");
  const [bill, setBill] = useState<SessionBill | null>(null);
  const [waiterComing, setWaiterComing] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // keep the bill fresh while it's open (another phone at the table may order)
  useEffect(() => {
    if (view !== "bill" || !sessionId) return;
    let alive = true;
    const load = () => sessionBill(sessionId).then((b) => { if (alive && b) setBill(b); });
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [view, sessionId]);

  const ask = async (kind: "waiter" | "bill") => {
    if (!onRequest || busy) return;
    setBusy(kind); setErr("");
    try {
      await onRequest(kind);
      // "on the way" for a minute, then the guest can ring again
      if (kind === "waiter") { setWaiterComing(true); setTimeout(() => setWaiterComing(false), 60000); }
      else setView("bill");
    } catch {
      setErr("Couldn't reach the staff. Check your internet and try again.");
    } finally { setBusy(""); }
  };

  const total = bill ? bill.orders.reduce((a, o) => a + o.total, 0) + (bill.booking_charge || 0) : order.total;

  return (
    <div className="ty" role="dialog" aria-modal="true" aria-label="Order placed">
      <header className="ty-top">
        <b>{restaurantName}</b>
        <span>{tableTitle}{sessionCode ? ` · #${sessionCode}` : ""}</span>
      </header>

      {view === "thanks" ? (
        <div className="ty-body">
          <span className="ty-tick" aria-hidden="true">✓</span>
          <h2>Thank you! Your order is in</h2>
          <p className="ty-sub">Order #{order.no} · {rupees(order.total)} · the kitchen has it.</p>

          <div className="ty-acts">
            <button className="ty-act" onClick={onAddMore}>
              <i aria-hidden="true">＋</i><span>Want to add anything?<small>Back to the menu</small></span>
            </button>
            {onRequest && (
              <>
                <button className={`ty-act${waiterComing ? " done" : ""}`} onClick={() => ask("waiter")} disabled={!!busy || waiterComing}>
                  <i aria-hidden="true">{waiterComing ? "✓" : "🛎"}</i>
                  <span>{waiterComing ? "Waiter is on the way" : busy === "waiter" ? "Calling…" : "Call waiter"}<small>{waiterComing ? "Someone is coming to your table" : `A waiter comes to ${tableTitle}`}</small></span>
                </button>
                <button className="ty-act main" onClick={() => ask("bill")} disabled={!!busy}>
                  <i aria-hidden="true">₹</i>
                  <span>{busy === "bill" ? "Asking…" : "Bill my amount"}<small>See the table bill · the staff brings it</small></span>
                </button>
              </>
            )}
          </div>
          {err && <p className="ty-err">{err}</p>}
          {sessionCode && <p className="ty-sid">Session #{sessionCode}</p>}
        </div>
      ) : (
        <div className="ty-body bill">
          <h2>Your bill</h2>
          <div className="ty-bill">
            {!bill && <p className="ty-sub">Loading the table bill…</p>}
            {bill?.orders.map((o, i) => (
              <div key={i} className="ty-ord">
                <div className="ty-oh"><b>#{o.order_no}</b><b>{rupees(o.total)}</b></div>
                {o.items.map((it, j) => <div key={j} className="ty-it"><span>{it.qty} × {it.name}</span><span>{rupees(it.qty * it.price)}</span></div>)}
              </div>
            ))}
            {!!bill?.booking_charge && <div className="ty-it"><span>Table booking</span><span>{rupees(bill.booking_charge)}</span></div>}
            <div className="ty-total"><b>Total</b><b>{rupees(total)}</b></div>
            <p className="ty-gst">Order totals include 5% GST.</p>
          </div>
          <div className="ty-asked"><b>Bill requested ✓</b><span>The staff is bringing your bill. Pay by cash, card or UPI at your table or the counter.</span></div>
          <button className="ty-act" onClick={() => setView("thanks")}><i aria-hidden="true">←</i><span>Back<small>Add more or call a waiter</small></span></button>
          {sessionCode && <p className="ty-sid">Session #{sessionCode}</p>}
        </div>
      )}
    </div>
  );
}

/** The guest's stamp card on the "Bill paid" screen (the tick lands when the owner closes the bill). */
export function PaidStamp({ name, goal, reward, token }: { name: string; goal: number; reward?: string | null; token: string | null }) {
  const [stamps, setStamps] = useState<number | null>(null);
  const [liveGoal, setLiveGoal] = useState(goal);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    // the database adds the tick a moment after the bill closes
    const t = setTimeout(() => getPublicCard(token).then((c) => { if (alive && c) { setStamps(c.stamps); setLiveGoal(c.goal || goal); } }), 1200);
    return () => { alive = false; clearTimeout(t); };
  }, [token, goal]);
  if (!token) return <StampStrip name={name} goal={goal} stamps={0} reward={reward} fresh />;
  return <StampStrip name={name} goal={liveGoal} stamps={stamps ?? 0} reward={reward} />;
}
