"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Sidebar } from "@/components/Sidebar";
import { Seal } from "@/components/Logo";
import "../dash.css";
import "./tables.css";

// URL shape: {origin}/{restaurant}/menu/{table}. Uses whatever host serves
// the app — localhost / your Wi-Fi IP while testing, your real domain in production.
const SLUG = "raj-darbar";

export default function Tables() {
  const [origin, setOrigin] = useState("https://parosa.app");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const BASE = `${origin}/${SLUG}/menu`;

  const [tables, setTables] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i + 1));
  const [reviewUrl, setReviewUrl] = useState("https://g.page/r/raj-darbar/review");
  const [reviewPrompt, setReviewPrompt] = useState(true);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2100); };

  const addTable = () => { const next = (tables.length ? Math.max(...tables) : 0) + 1; setTables((t) => [...t, next]); showToast(`Table ${next} added`); };
  const removeTable = (n: number) => { setTables((t) => t.filter((x) => x !== n)); showToast(`Table ${n} removed`); };

  return (
    <div className="db-app">
      <Sidebar />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Tables &amp; QR</h1><p>One QR per table — same menu, table number baked in. Print &amp; place on every table.</p></div>
          <div className="db-acts">
            <button className="db-btn" onClick={() => showToast(`All ${tables.length} QR codes → downloaded (live app)`)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg> Download all</button>
            <button className="db-btn prime" onClick={() => showToast(`Print sheet for ${tables.length} tables → opened (live app)`)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg> Print all</button>
          </div>
        </div>
        <div className="db-content">
          <div className="db-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span>These QR codes are <b>real — scan any of them with your phone</b> to see the table-number URL. Download &amp; print work in the live app.</span>
          </div>

          <div className="db-panel">
            <div className="db-ph"><h3>Reviews · Rate us QR</h3><span className="tag">★ Get 5-star reviews</span></div>
            <div className="db-pb" style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div className="tb-qbox"><QRCodeCanvas value={reviewUrl} size={120} fgColor="#4A0C0D" bgColor="#FBF4E2" level="M" /></div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
                  Put this <b>&ldquo;Rate us ★&rdquo;</b> QR on the bill or at the exit. Happy customers scan it and land straight on your Google review page — more 5-star reviews, automatically.
                </div>
                <div className="db-field" style={{ marginTop: 12 }}>
                  <label>Your Google review link</label>
                  <input value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="https://g.page/r/…/review" />
                </div>
                <div className="db-togrow" style={{ borderTop: "1px solid var(--line)", marginTop: 4 }}>
                  <div>
                    <div className="tt">Ask for a review after the bill</div>
                    <div className="ts">Show a &ldquo;Rate your experience ★★★★★&rdquo; prompt when the order is done.</div>
                  </div>
                  <button className={`db-switch${reviewPrompt ? " on" : ""}`} onClick={() => setReviewPrompt((v) => !v)} />
                </div>
              </div>
            </div>
          </div>

          <div className="tb-urlbar">
            <div className="tb-u"><div className="l">Your menu link</div><div className="v">{origin.replace(/^https?:\/\//, "")}/{SLUG}/menu<span className="t">/7</span> &nbsp;<span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 12.5 }}>← only the table number changes</span></div></div>
            <div className="tb-stepper"><span className="lbl">Tables</span><button onClick={() => setTables((t) => t.length > 1 ? t.slice(0, -1) : t)}>−</button><span className="n">{tables.length}</span><button onClick={addTable}>+</button></div>
          </div>

          <div className="tb-grid">
            {tables.map((n) => (
              <div key={n} className="tb-standee">
                <button className="tb-del" onClick={() => removeTable(n)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
                <div className="tb-top"><Seal size={26} /><span className="tb-bn">Raj Darbar</span></div>
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
          <div style={{ height: 30 }} />
        </div>
      </main>
      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
