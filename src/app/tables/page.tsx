"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { QRCodeCanvas } from "qrcode.react";
import { Sidebar } from "@/components/Sidebar";
import { Seal } from "@/components/Logo";
import { RestaurantLogo } from "@/components/RestaurantLogo";
import { AppLoading } from "@/components/AppLoading";
import { setTablesCount } from "@/lib/db";
import { useOwner } from "@/lib/useOwner";
import { reviewLinkOf } from "@/lib/upi";
import "../dash.css";
import "./tables.css";

/* ---------- pure canvas helpers (no React) ---------- */
function loadImage(src: string, cross = false): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    if (cross) im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}
function initials(name?: string | null) {
  if (!name) return "•";
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.trim().slice(0, 2)).toUpperCase();
}
function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const r = size / 2, cx = x + r, cy = y + r;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = "#4A0C0D"; ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.05); ctx.strokeStyle = "#B58A3C";
  ctx.beginPath(); ctx.arc(cx, cy, r - ctx.lineWidth, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#D8B25E"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `${Math.round(size * 0.62)}px Georgia, serif`;
  ctx.fillText("प", cx, cy + size * 0.04);
  ctx.textBaseline = "top";
}
function drawLogo(ctx: CanvasRenderingContext2D, cx: number, top: number, size: number, img: HTMLImageElement | null, name: string) {
  const x = cx - size / 2, r = size * 0.24;
  if (img) {
    ctx.save(); rr(ctx, x, top, size, size, r); ctx.clip();
    ctx.drawImage(img, x, top, size, size); ctx.restore();
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(0,0,0,.1)"; rr(ctx, x, top, size, size, r); ctx.stroke();
  } else {
    ctx.fillStyle = "#6E1618"; rr(ctx, x, top, size, size, r); ctx.fill();
    ctx.fillStyle = "#CBA24E"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `${Math.round(size * 0.42)}px Georgia, serif`;
    ctx.fillText(initials(name), cx, top + size / 2 + 2);
    ctx.textBaseline = "top";
  }
}

export default function Tables() {
  const { restaurant, ready } = useOwner();
  const [origin, setOrigin] = useState("https://parosa.app");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const [count, setCount] = useState(0);
  const [design, setDesign] = useState<"classic" | "branded">("classic");
  const [hidden, setHidden] = useState<number[]>([]); // deleted table numbers (device-local)
  const [paused, setPaused] = useState<number[]>([]); // turned-off table numbers (device-local)
  const reviewBox = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2100); };

  useEffect(() => { if (restaurant) setCount(restaurant.tables_count ?? 0); }, [restaurant]);
  useEffect(() => { try { const d = localStorage.getItem("parosa-standee"); if (d === "branded" || d === "classic") setDesign(d); } catch { /* ignore */ } }, []);
  useEffect(() => {
    if (!restaurant) return;
    try {
      const raw = localStorage.getItem(`parosa-tables-${restaurant.id}`);
      if (raw) { const o = JSON.parse(raw); setHidden(Array.isArray(o.hidden) ? o.hidden : []); setPaused(Array.isArray(o.paused) ? o.paused : []); }
    } catch { /* ignore */ }
  }, [restaurant]);

  const pickDesign = (d: "classic" | "branded") => { setDesign(d); try { localStorage.setItem("parosa-standee", d); } catch { /* ignore */ } };

  if (!ready || !restaurant) return <AppLoading label="Loading tables…" />;

  const BASE = `${origin}/${restaurant.slug}/menu`;
  const review = reviewLinkOf(restaurant);
  const tkey = `parosa-tables-${restaurant.id}`;
  const persist = (h: number[], p: number[]) => { try { localStorage.setItem(tkey, JSON.stringify({ hidden: h, paused: p })); } catch { /* ignore */ } };

  const visible = Array.from({ length: count }, (_, i) => i + 1).filter((n) => !hidden.includes(n));

  const changeCount = async (n: number) => {
    const c = Math.max(0, Math.min(99, n));
    setCount(c);
    await setTablesCount(restaurant.id, c);
  };
  const addTable = async () => { await changeCount(count + 1); showToast(`Table ${count + 1} added`); };

  const deleteTable = async (n: number) => {
    const nh = Array.from(new Set([...hidden, n])).sort((a, b) => a - b);
    const np = paused.filter((x) => x !== n);
    // keep tables_count equal to the highest still-active table; interior gaps live in `hidden`
    let c = count;
    while (c > 0 && nh.includes(c)) c--;
    const trimmed = nh.filter((x) => x <= c);
    setHidden(trimmed); setPaused(np); persist(trimmed, np);
    if (c !== count) await changeCount(c);
    showToast(`Table ${n} removed`);
  };
  const removeLast = async () => { if (visible.length) await deleteTable(visible[visible.length - 1]); };

  const togglePause = (n: number) => {
    const np = paused.includes(n) ? paused.filter((x) => x !== n) : [...paused, n];
    setPaused(np); persist(hidden, np);
    showToast(paused.includes(n) ? `Table ${n} turned on` : `Table ${n} turned off`);
  };

  /* ---------- build a printable standee PNG for one table ---------- */
  const buildPng = async (n: number): Promise<string> => {
    const qrDataUrl = await QRCode.toDataURL(`${BASE}/${n}`, { margin: 1, width: 520, color: { dark: "#4A0C0D", light: "#FBF4E2" } });
    const qrImg = await loadImage(qrDataUrl);
    let logoImg: HTMLImageElement | null = null;
    if (restaurant.logo_url) { try { logoImg = await loadImage(restaurant.logo_url, true); } catch { logoImg = null; } }

    const branded = design === "branded";
    const W = 760, H = branded ? 1040 : 940;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    const setLS = (v: string) => { try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = v; } catch { /* older browser */ } };

    ctx.fillStyle = "#FBF4E2"; rr(ctx, 0, 0, W, H, 30); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#E4CE97"; rr(ctx, 12, 12, W - 24, H - 24, 22); ctx.stroke();

    const cx = W / 2;
    let y = branded ? 60 : 70;
    const logoSize = branded ? 128 : 96;
    drawLogo(ctx, cx, y, logoSize, logoImg, restaurant.name);
    y += logoSize + 18;

    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillStyle = "#6E1618";
    ctx.font = `${branded ? 44 : 40}px Georgia, 'Times New Roman', serif`;
    const nm = restaurant.name.length > 22 ? restaurant.name.slice(0, 21) + "…" : restaurant.name;
    ctx.fillText(nm, cx, y); y += (branded ? 44 : 40) + 14;

    ctx.fillStyle = "#9C8A7E"; ctx.font = "600 18px Arial, sans-serif"; setLS("3px");
    ctx.fillText(branded ? `SCAN TO ORDER · TABLE ${n}` : "SCAN TO ORDER", cx, y);
    setLS("normal"); y += 18 + (branded ? 24 : 22);

    const qs = 430;
    ctx.drawImage(qrImg, cx - qs / 2, y, qs, qs); y += qs + (branded ? 16 : 18);

    if (!branded) {
      ctx.fillStyle = "#4A0C0D"; ctx.font = "60px Georgia, serif";
      ctx.fillText(`Table ${n}`, cx, y); y += 60 + 22;
      ctx.strokeStyle = "#EADFCE"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(120, y); ctx.lineTo(W - 120, y); ctx.stroke(); y += 16;
      drawSeal(ctx, cx - 78, y, 26);
      ctx.fillStyle = "#6A554B"; ctx.font = "17px Arial, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("Powered by Parosa", cx - 44, y + 4);
      ctx.textAlign = "center";
    } else {
      ctx.fillStyle = "#6A554B"; ctx.font = "17px Arial, sans-serif";
      ctx.fillText("No app needed — opens in the browser", cx, y);
      const bandH = 96, bandX = 40, bandW = W - 80, bandY = H - bandH - 26;
      ctx.fillStyle = "#6E1618"; rr(ctx, bandX, bandY, bandW, bandH, 16); ctx.fill();
      drawSeal(ctx, bandX + 28, bandY + bandH / 2 - 24, 48);
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillStyle = "#FFF4E6"; ctx.font = "30px Georgia, serif";
      ctx.fillText("परोसा · PAROSA", bandX + 96, bandY + 22);
      ctx.fillStyle = "#CBA24E"; ctx.font = "600 12px Arial, sans-serif"; setLS("3px");
      ctx.fillText("SCAN · SERVE · SAVOUR", bandX + 98, bandY + 60);
      setLS("normal"); ctx.textAlign = "center";
    }
    return cv.toDataURL("image/png");
  };

  const downloadTable = async (n: number) => {
    try {
      const dataUrl = await buildPng(n);
      const a = document.createElement("a");
      a.href = dataUrl; a.download = `${restaurant.slug}-table-${n}-qr.png`;
      document.body.appendChild(a); a.click(); a.remove();
      showToast(`Table ${n} QR downloaded`);
    } catch (e) { console.error(e); showToast("Couldn't build the PNG — try again"); }
  };
  const downloadAll = async () => {
    if (!visible.length) return;
    showToast(`Downloading ${visible.length} QR codes…`);
    for (const n of visible) { await downloadTable(n); await new Promise((r) => setTimeout(r, 350)); }
  };

  const downloadReviewQr = () => {
    const c = reviewBox.current?.querySelector("canvas");
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `${restaurant.slug}-google-review-qr.png`;
    a.click();
    showToast("Review QR downloaded");
  };

  return (
    <div className="db-app">
      <Sidebar restaurant={restaurant} />
      <main className="db-main">
        <div className="db-topbar">
          <div><h1>Tables &amp; QR</h1><p>Add a table to generate its QR — same menu, table number baked in. Download the PNG and print it for every table.</p></div>
          <div className="db-acts">
            <button className="db-btn prime" disabled={visible.length === 0} onClick={downloadAll}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg> Download all</button>
          </div>
        </div>
        <div className="db-content">
          <div className="db-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--maroon)" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            <span>Each QR is <b>real — scan it with your phone</b> to open that table&apos;s live menu. Turn a table off to hide it while it&apos;s not in use, or delete it entirely.</span>
          </div>

          <div className="tb-urlbar">
            <div className="tb-u"><div className="l">Your menu link</div><div className="v">{origin.replace(/^https?:\/\//, "")}/{restaurant.slug}/menu<span className="t">/7</span> &nbsp;<span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 12.5 }}>← only the table number changes</span></div></div>
            <div className="tb-stepper"><span className="lbl">Tables</span><button onClick={removeLast}>−</button><span className="n">{visible.length}</span><button onClick={addTable}>+</button></div>
          </div>

          {visible.length > 0 && (
            <div className="tb-designbar">
              <span className="l">QR standee design</span>
              <div className="tb-seg">
                <button className={design === "classic" ? "on" : ""} onClick={() => pickDesign("classic")}>Classic <i>logo &amp; name in a row</i></button>
                <button className={design === "branded" ? "on" : ""} onClick={() => pickDesign("branded")}>Branded <i>your logo on top, Parosa below</i></button>
              </div>
            </div>
          )}

          {/* Review QR — the link itself lives in Settings */}
          <div className="db-panel">
            <div className="db-ph"><h3>Reviews · Rate us QR</h3><span className="tag">★ Get 5-star reviews</span></div>
            {review ? (
              <div className="db-pb" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                <div className="tb-qbox" ref={reviewBox}><QRCodeCanvas value={review} size={480} style={{ width: 120, height: 120 }} fgColor="#2A1414" bgColor="#FFFFFF" level="M" marginSize={2} /></div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>This QR is <b>already printed on every bill</b> and the link goes out with every WhatsApp bill. Download it for a table tent or the exit door too.</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button className="db-btn prime" onClick={downloadReviewQr}>Download PNG</button>
                    <a className="db-btn" href={review} target="_blank" rel="noopener noreferrer">Test link ↗</a>
                    <Link className="db-btn" href="/settings#collect">Change link</Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="db-pb" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
                  {restaurant.google_review_url ? <>Asking for reviews is <b>turned off</b>. Turn it on in Settings to put a &ldquo;Rate us on Google&rdquo; QR on every bill.</>
                    : <>Add your <b>Google review link</b> once — Parosa puts a &ldquo;Rate us on Google&rdquo; QR on every bill and the link in every WhatsApp bill.</>}
                </div>
                <Link className="db-btn prime" href="/settings#collect">{restaurant.google_review_url ? "Open Settings" : "Add review link"}</Link>
              </div>
            )}
          </div>

          {/* Table QRs */}
          {visible.length === 0 ? (
            <div className="tb-empty">
              <div className="tb-emptyicon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><path d="M14 14h6v6h-6z" /></svg></div>
              <h3>No tables yet</h3>
              <p>Add your tables and Parosa generates a unique QR for each one. Download &amp; print them and place one on every table.</p>
              <button className="db-btn prime" onClick={addTable}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> Add your first table</button>
            </div>
          ) : (
            <div className={`tb-grid tb-${design}`}>
              {visible.map((n) => {
                const off = paused.includes(n);
                return (
                <div key={n} className={`tb-standee${off ? " paused" : ""}`}>
                  <button className="tb-del" onClick={() => deleteTable(n)} title={`Delete Table ${n}`} aria-label={`Delete Table ${n}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                  </button>
                  {off && <span className="tb-offtag">Off</span>}
                  {design === "classic" ? (
                    <>
                      <div className="tb-top"><RestaurantLogo restaurant={restaurant} size={30} /><span className="tb-bn">{restaurant.name}</span></div>
                      <div className="tb-scan">Scan to order</div>
                      <div className="tb-qbox"><QRCodeCanvas value={`${BASE}/${n}`} size={130} fgColor="#4A0C0D" bgColor="#FBF4E2" level="M" /></div>
                      <div className="tb-tno">Table {n}</div>
                      <div className="tb-brandfoot"><Seal size={15} /><span>Powered by <b>Parosa</b></span></div>
                    </>
                  ) : (
                    <>
                      <div className="tb-hero">
                        <RestaurantLogo restaurant={restaurant} size={54} />
                        <span className="tb-bn">{restaurant.name}</span>
                        <span className="tb-scan">Scan to order · Table {n}</span>
                      </div>
                      <div className="tb-qbox"><QRCodeCanvas value={`${BASE}/${n}`} size={130} fgColor="#4A0C0D" bgColor="#FBF4E2" level="M" /></div>
                      <div className="tb-noapp">No app needed — opens in the browser</div>
                      <div className="tb-brandband"><Seal size={22} /><div><b>परोसा · PAROSA</b><i>Scan · Serve · Savour</i></div></div>
                    </>
                  )}
                  <div className="tb-row">
                    <button className={`tb-switch${off ? "" : " on"}`} onClick={() => togglePause(n)} title={off ? "Turn table on" : "Turn table off"}>
                      <span className="k" /><b>{off ? "Off" : "On"}</b>
                    </button>
                    <button className="tb-dl" onClick={() => downloadTable(n)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v11M8 10l4 4 4-4M5 20h14" /></svg>PNG</button>
                  </div>
                </div>
                );
              })}
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
