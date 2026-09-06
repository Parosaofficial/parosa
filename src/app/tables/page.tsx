"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Sidebar } from "@/components/Sidebar";
import { Seal } from "@/components/Logo";
import { AppLoading } from "@/components/AppLoading";
import { setTablesCount } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import "../dash.css";
import "./tables.css";

export default function Tables() {
  const { restaurant, ready } = useOwner();
  const [origin, setOrigin] = useState("https://parosa.app");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const [count, setCount] = useState(0);
  const [reviewUrl, setReviewUrl] = useState("");
  const [reviewPrompt, setReviewPrompt] = useState(true);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2100); };

  useEffect(() => { if (restaurant) setCount(restaurant.tables_count ?? 0); }, [restaurant]);

  if (!ready || !restaurant) return <AppLoading label="Loading tables…" />;

  const BASE = `${origin}/${restaurant.slug}/menu`;
  const tables = Array.from({ length: count }, (_, i) => i + 1);

  const changeCount = async (n: number) => {
    const c = Math.max(0, Math.min(99, n));
    setCount(c);
    if (restaurant) await setTablesCount(restaurant.id, c);
  };
  const addTable = async () => { await changeCount(count + 1); showToast(`Table ${count + 1} added`); };
  const removeTable = async () => { if (count > 0) { await changeCount(count - 1); showToast(`Table ${count} removed`); } };

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Tables &amp; QR</h1><p>Add a table to generate its QR — same menu, table number baked in. Print &amp; place on every table.</p></div>
          <div className="db-acts">
            <button className="db-btn" disabled={count === 0} onClick={() => showToast(`All ${count} QR codes → downloaded (live app)`)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg> Download all</button>
            <button className="db-btn prime" disabled={count === 0} onClick={() => showToast(`Print sheet for ${count} tables → opened (live app)`)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg> Print all</button>
          </div>
        </div>
        <div className="db-content">
          <div className="db-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span>Each QR is <b>real — scan it with your phone</b> to open that table&apos;s live menu. Download &amp; print work in the live app.</span>
          </div>

          <div className="tb-urlbar">
            <div className="tb-u"><div className="l">Your menu link</div><div className="v">{origin.replace(/^https?:\/\//, "")}/{restaurant.slug}/menu<span className="t">/7</span> &nbsp;<span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 12.5 }}>← only the table number changes</span></div></div>
            <div className="tb-stepper"><span className="lbl">Tables</span><button onClick={removeTable}>−</button><span className="n">{count}</span><button onClick={addTable}>+</button></div>
          </div>

          {/* Review QR */}
          <div className="db-panel">
            <div className="db-ph"><h3>Reviews · Rate us QR</h3><span className="tag">★ Get 5-star reviews</span></div>
            <div className="db-pb" style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div className="tb-qbox"><QRCodeCanvas value={reviewUrl} size={120} fgColor="#4A0C0D" bgColor="#FBF4E2" level="M" /></div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>Put this <b>&ldquo;Rate us ★&rdquo;</b> QR on the bill or at the exit. Happy customers scan it and land on your Google review page.</div>
                <div className="db-field" style={{ marginTop: 12 }}><label>Your Google review link</label><input value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="https://g.page/r/…/review" /></div>
                <div className="db-togrow" style={{ borderTop: "1px solid var(--line)", marginTop: 4 }}>
                  <div><div className="tt">Ask for a review after the bill</div><div className="ts">Show a &ldquo;Rate your experience ★★★★★&rdquo; prompt when the order is done.</div></div>
                  <button className={`db-switch${reviewPrompt ? " on" : ""}`} onClick={() => setReviewPrompt((v) => !v)} />
                </div>
              </div>
            </div>
          </div>

          {/* Table QRs */}
          {count === 0 ? (
            <div className="tb-empty">
              <div className="tb-emptyicon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><path d="M14 14h6v6h-6z" /></svg></div>
              <h3>No tables yet</h3>
              <p>Add your tables and Parosa generates a unique QR for each one. Print them and place one on every table.</p>
              <button className="db-btn prime" onClick={addTable}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> Add your first table</button>
            </div>
          ) : (
            <div className="tb-grid">
              {tables.map((n) => (
                <div key={n} className="tb-standee">
                  <div className="tb-top"><Seal size={26} /><span className="tb-bn">{restaurant.name}</span></div>
                  <div className="tb-scan">Scan to order</div>
                  <div className="tb-qbox"><QRCodeCanvas value={`${BASE}/${n}`} size={130} fgColor="#4A0C0D" bgColor="#FBF4E2" level="M" /></div>
                  <div className="tb-tno">Table {n}</div>
                  <div className="tb-noapp">No app needed</div>
                  <div className="tb-row">
                    <button onClick={() => showToast(`Table ${n} QR → PNG (live app)`)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v11M8 10l4 4 4-4M5 20h14" /></svg>PNG</button>
                    <button onClick={() => showToast(`Table ${n} QR → printer (live app)`)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V3h12v6M6 18H4V10h16v8h-2M6 14h12v6H6z" /></svg>Print</button>
                  </div>
                </div>
              ))}
              <button className="tb-add" onClick={addTable}><div className="in"><span className="tb-plus">+</span>Add table</div></button>
            </div>
          )}
          <div style={{ height: 30 }} />
        </div>
      </main>
      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
