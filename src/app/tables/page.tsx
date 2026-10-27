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
import { TABLE_KINDS, addTable, deleteTable, listTables, nextCode, shapeFor, tableLabel, updateTable, type RestaurantTable, type TableShape } from "@/lib/tables";
import { useOwner } from "@/lib/useOwner";
import { reviewLinkOf } from "@/lib/upi";
import { standeePng, standeeSvg } from "@/lib/standee";
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

type Design = "heritage" | "classic" | "branded";

function Seats({ n }: { n: number }) {
  return <span className="tb-seats" aria-label={`${n} seats`}>{Array.from({ length: Math.min(n, 10) }, (_, i) => <i key={i} />)}</span>;
}

type Draft = { name: string; kind: string; seats: number; shape: TableShape; area: string; custom: boolean };

export default function Tables() {
  const { restaurant, ready } = useOwner();
  const [origin, setOrigin] = useState("https://parosa.app");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false); // migration 0015 not applied yet
  const [kindFilter, setKindFilter] = useState("All");
  const [design, setDesign] = useState<Design>("heritage");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reviewBox = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2100); };

  useEffect(() => { try { const d = localStorage.getItem("parosa-standee"); if (d === "branded" || d === "classic" || d === "heritage") setDesign(d); } catch { /* ignore */ } }, []);
  useEffect(() => {
    if (!restaurant) return;
    listTables(restaurant.id)
      .then((t) => { setTables(t); setLoaded(true); })
      .catch(() => {
        // migration 0015 not run yet: show the old numbered tables so QRs stay downloadable
        const n = restaurant.tables_count ?? 0;
        setTables(Array.from({ length: n }, (_, i) => ({
          id: `legacy-${i + 1}`, restaurant_id: restaurant.id, code: String(i + 1), name: String(i + 1),
          kind: "4-seater", seats: 4, shape: "four" as const, area: null, active: true, sort: i + 1,
        })));
        setMissing(true); setLoaded(true);
      });
  }, [restaurant]);

  const pickDesign = (d: Design) => { setDesign(d); try { localStorage.setItem("parosa-standee", d); } catch { /* ignore */ } };

  if (!ready || !restaurant || !loaded) return <AppLoading label="Loading tables…" />;

  const BASE = `${origin}/${restaurant.slug}/menu`;
  const review = reviewLinkOf(restaurant);
  const kinds = Array.from(new Set([...TABLE_KINDS.map((k) => k.kind), ...tables.map((t) => t.kind)]));
  const areas = Array.from(new Set(tables.map((t) => t.area).filter(Boolean) as string[]));
  const shown = kindFilter === "All" ? tables : tables.filter((t) => t.kind === kindFilter);
  const active = tables.filter((t) => t.active);

  // keep the old count in step (sidebar, analytics) with the real list
  const syncCount = (list: RestaurantTable[]) => setTablesCount(restaurant.id, list.length).catch(() => {});

  const openNew = () => {
    const last = tables[tables.length - 1];
    const base = last ? TABLE_KINDS.find((k) => k.kind === last.kind) ?? TABLE_KINDS[1] : TABLE_KINDS[1];
    const prefix = base.shape === "sofa" ? "F" : "T";
    const n = tables.filter((t) => t.name.startsWith(prefix)).length + 1;
    setEditId(null);
    setDraft({ name: `${prefix}${n}`, kind: base.kind, seats: base.seats, shape: base.shape, area: last?.area ?? "", custom: false });
  };
  const openEdit = (t: RestaurantTable) => {
    setEditId(t.id);
    setDraft({ name: t.name, kind: t.kind, seats: t.seats, shape: t.shape, area: t.area ?? "", custom: !TABLE_KINDS.some((k) => k.kind === t.kind) });
  };
  const pickKind = (k: (typeof TABLE_KINDS)[number]) => setDraft((d) => d && { ...d, kind: k.kind, seats: k.seats, shape: k.shape, custom: false });

  const saveDraft = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    const kind = draft.kind.trim();
    if (!name) { showToast("Give the table a name, like T1"); return; }
    if (!kind) { showToast("Choose or type a table type"); return; }
    if (tables.some((t) => t.name.trim().toLowerCase() === name.toLowerCase() && t.id !== editId)) { showToast(`There's already a table called ${name}`); return; }
    const seats = Math.max(1, Math.min(30, Math.round(draft.seats) || 1));
    const shape = draft.custom ? shapeFor(seats) : draft.shape;
    setBusy(true);
    try {
      if (editId) {
        await updateTable(editId, { name, kind, seats, shape, area: draft.area.trim() || null });
        setTables((ts) => ts.map((t) => (t.id === editId ? { ...t, name, kind, seats, shape, area: draft.area.trim() || null } : t)));
        showToast(`${name} saved`);
      } else {
        const row = await addTable(restaurant.id, { code: nextCode(tables, restaurant.table_code_hi ?? 0), name, kind, seats, shape, area: draft.area.trim() || null, sort: tables.length + 1 });
        const next = [...tables, row];
        setTables(next); syncCount(next);
        showToast(`${name} added`);
      }
      setDraft(null); setEditId(null);
    } catch { showToast("Couldn't save — try again"); }
    finally { setBusy(false); }
  };

  const toggleActive = async (t: RestaurantTable) => {
    setTables((ts) => ts.map((x) => (x.id === t.id ? { ...x, active: !t.active } : x)));
    try { await updateTable(t.id, { active: !t.active }); showToast(t.active ? `${t.name} off — its QR says "not taking orders"` : `${t.name} on — same QR, taking orders`); }
    catch { setTables((ts) => ts.map((x) => (x.id === t.id ? { ...x, active: t.active } : x))); showToast("Couldn't update — try again"); }
  };
  const removeTable = async (t: RestaurantTable) => {
    if (!window.confirm(`Delete ${t.name}? Its printed QR will say "table not found", and its number is never reused. To pause a table, turn it off instead — the same QR works again when you turn it on.`)) return;
    try {
      await deleteTable(t.id);
      const next = tables.filter((x) => x.id !== t.id);
      setTables(next); syncCount(next);
      showToast(`${t.name} deleted`);
    } catch { showToast("Couldn't delete — try again"); }
  };

  /* ---------- build a printable standee PNG for one table ---------- */
  const buildPng = async (t: RestaurantTable): Promise<string> => {
    if (design === "heritage") return standeePng(`${BASE}/${t.code}`, tableLabel(t), document.querySelector(".db-app") ?? document.body);
    const qrDataUrl = await QRCode.toDataURL(`${BASE}/${t.code}`, { margin: 1, width: 520, color: { dark: "#4A0C0D", light: "#FBF4E2" } });
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
    ctx.fillText(branded ? `SCAN TO ORDER · ${tableLabel(t).toUpperCase()}` : "SCAN TO ORDER", cx, y);
    setLS("normal"); y += 18 + (branded ? 24 : 22);

    const qs = 430;
    ctx.drawImage(qrImg, cx - qs / 2, y, qs, qs); y += qs + (branded ? 16 : 18);

    if (!branded) {
      ctx.fillStyle = "#4A0C0D"; ctx.font = "60px Georgia, serif";
      ctx.fillText(tableLabel(t), cx, y); y += 60 + 22;
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

  const downloadTable = async (t: RestaurantTable) => {
    try {
      const dataUrl = await buildPng(t);
      const a = document.createElement("a");
      a.href = dataUrl; a.download = `${restaurant.slug}-${t.name.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
      document.body.appendChild(a); a.click(); a.remove();
      showToast(`${tableLabel(t)} QR downloaded`);
    } catch (e) { console.error(e); showToast("Couldn't build the PNG — try again"); }
  };
  const downloadAll = async () => {
    if (!active.length) return;
    showToast(`Downloading ${active.length} QR codes…`);
    for (const t of active) { await downloadTable(t); await new Promise((r) => setTimeout(r, 350)); }
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
          <div><h1>Tables &amp; QR</h1><p>Set up your tables by type, then print a QR for each one.</p></div>
          <div className="db-acts">
            <button className="db-btn" onClick={openNew} disabled={missing}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg> Add table</button>
            <button className="db-btn prime" disabled={active.length === 0} onClick={downloadAll}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg> Download all</button>
          </div>
        </div>
        <div className="db-content">
          {missing && (
            <div className="tb-missing"><b>One-time database update needed</b><span>Table types, areas and live sessions need migration 0015. Your {tables.length} tables and their QR codes below keep working meanwhile.</span></div>
          )}

          {/* ---- your tables ---- */}
          {!missing && (
            <div className="db-panel">
              <div className="db-ph">
                <h3>Your tables · {tables.length}</h3>
                <div className="tb-kinds">
                  {["All", ...kinds].map((k) => {
                    const n = k === "All" ? tables.length : tables.filter((t) => t.kind === k).length;
                    if (k !== "All" && n === 0) return null;
                    return <button key={k} className={kindFilter === k ? "on" : ""} onClick={() => setKindFilter(k)}>{k} · {n}</button>;
                  })}
                </div>
              </div>

              {draft && (
                <div className="tb-form">
                  <div className="db-field"><label>Table name</label><input value={draft.name} maxLength={20} placeholder="T1" onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
                  <div className="db-field"><label>Type</label>
                    <div className="tb-kpick">
                      {TABLE_KINDS.map((k) => <button key={k.kind} type="button" className={!draft.custom && draft.kind === k.kind ? "on" : ""} onClick={() => pickKind(k)}>{k.kind}</button>)}
                      <button type="button" className={draft.custom ? "on" : ""} onClick={() => setDraft({ ...draft, custom: true, kind: draft.custom ? draft.kind : "" })}>+ Custom</button>
                    </div>
                  </div>
                  {draft.custom && (
                    <div className="db-frow two">
                      <div className="db-field"><label>Custom type</label><input value={draft.kind} maxLength={24} placeholder="6-seater, Rooftop…" onChange={(e) => setDraft({ ...draft, kind: e.target.value })} /></div>
                      <div className="db-field"><label>Seats</label><input inputMode="numeric" value={draft.seats || ""} onChange={(e) => setDraft({ ...draft, seats: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></div>
                    </div>
                  )}
                  <div className="db-field"><label>Area <span className="tb-opt">· optional</span></label>
                    <input value={draft.area} maxLength={24} placeholder="Inside, Outside, Family hall…" list="tb-areas" onChange={(e) => setDraft({ ...draft, area: e.target.value })} />
                    <datalist id="tb-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
                  </div>
                  <div className="tb-formacts">
                    <button className="db-btn" onClick={() => { setDraft(null); setEditId(null); }} disabled={busy}>Cancel</button>
                    <button className="db-btn prime" onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : editId ? "Save table" : "Add table"}</button>
                  </div>
                </div>
              )}

              {tables.length === 0 ? (
                <div className="tb-none">No tables yet. <button className="db-see" onClick={openNew}>Add your first table →</button></div>
              ) : (
                <div className="tb-list">
                  <p className="tb-perm"><b>🔒 Every table&apos;s QR link is permanent.</b> Renaming, changing the type or turning a table off never changes it — an Off table&apos;s QR just says &ldquo;not taking orders&rdquo;.</p>
                  <div className="tb-lh"><span>Table</span><span>Type</span><span>Seats</span><span>Area</span><span>On</span><span /></div>
                  {shown.map((t) => (
                    <div key={t.id} className={`tb-li${t.active ? "" : " off"}`}>
                      <b>{t.name}</b>
                      <span>{t.kind}</span>
                      <span><Seats n={t.seats} /></span>
                      <span className="ar">{t.area || "—"}</span>
                      <button className={`tb-switch${t.active ? " on" : ""}`} onClick={() => toggleActive(t)} aria-label={t.active ? `Turn ${t.name} off` : `Turn ${t.name} on`}><span className="k" /></button>
                      <span className="acts">
                        <button className="db-btn" onClick={() => openEdit(t)}>Edit</button>
                        <button className="tb-x" onClick={() => removeTable(t)} aria-label={`Delete ${t.name}`} title={`Delete ${t.name}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {active.length > 0 && (
            <div className="tb-designbar">
              <span className="l">QR standee design</span>
              <div className="tb-seg">
                <button className={design === "heritage" ? "on" : ""} onClick={() => pickDesign("heritage")}>Heritage <i>the Parosa tent card</i></button>
                <button className={design === "classic" ? "on" : ""} onClick={() => pickDesign("classic")}>Classic <i>logo &amp; name in a row</i></button>
                <button className={design === "branded" ? "on" : ""} onClick={() => pickDesign("branded")}>Branded <i>your logo on top, Parosa below</i></button>
              </div>
            </div>
          )}

          {/* ---- one printable QR per active table ---- */}
          {active.length > 0 && (
            <div className={`tb-grid tb-${design}`}>
              {active.map((t) => {
                const url = `${BASE}/${t.code}`;
                const lbl = tableLabel(t);
                return (
                  <div key={t.id} className="tb-standee">
                    {design === "heritage" ? (
                      <div className="tb-hcard" dangerouslySetInnerHTML={{ __html: standeeSvg(url, lbl) }} />
                    ) : design === "classic" ? (
                      <>
                        <div className="tb-top"><RestaurantLogo restaurant={restaurant} size={30} /><span className="tb-bn">{restaurant.name}</span></div>
                        <div className="tb-scan">Scan to order</div>
                        <div className="tb-qbox"><QRCodeCanvas value={url} size={130} fgColor="#4A0C0D" bgColor="#FBF4E2" level="M" /></div>
                        <div className="tb-tno">{lbl}</div>
                        <div className="tb-brandfoot"><Seal size={15} /><span>Powered by <b>Parosa</b></span></div>
                      </>
                    ) : (
                      <>
                        <div className="tb-hero">
                          <RestaurantLogo restaurant={restaurant} size={54} />
                          <span className="tb-bn">{restaurant.name}</span>
                          <span className="tb-scan">Scan to order · {lbl}</span>
                        </div>
                        <div className="tb-qbox"><QRCodeCanvas value={url} size={130} fgColor="#4A0C0D" bgColor="#FBF4E2" level="M" /></div>
                        <div className="tb-noapp">No app needed — opens in the browser</div>
                        <div className="tb-brandband"><Seal size={22} /><div><b>परोसा · PAROSA</b><i>Scan · Serve · Savour</i></div></div>
                      </>
                    )}
                    <div className="tb-row">
                      <span className="tb-cap">{t.kind}{t.area ? ` · ${t.area}` : ""}</span>
                      <button className="tb-dl" onClick={() => downloadTable(t)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v11M8 10l4 4 4-4M5 20h14" /></svg>PNG</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Review QR — the link itself lives in Settings */}
          <div className="db-panel" style={{ marginTop: 18 }}>
            <div className="db-ph"><h3>Reviews · Rate us QR</h3><span className="tag">★ Get 5-star reviews</span></div>
            {review ? (
              <div className="db-pb" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                <div className="tb-qbox" ref={reviewBox}><QRCodeCanvas value={review} size={480} style={{ width: 120, height: 120 }} fgColor="#2A1414" bgColor="#FFFFFF" level="M" marginSize={2} /></div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>This QR is <b>already printed on every bill</b> and the link goes out with every WhatsApp bill. Download it for a table tent or the exit door too.</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button className="db-btn prime" onClick={downloadReviewQr}>Download PNG</button>
                    <a className="db-btn" href={review} target="_blank" rel="noopener noreferrer">Test link ↗</a>
                    <Link className="db-btn" href="/settings/payments">Change link</Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="db-pb" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240, fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
                  {restaurant.google_review_url ? <>Asking for reviews is <b>turned off</b>. Turn it on in Settings to put a &ldquo;Rate us on Google&rdquo; QR on every bill.</>
                    : <>Add your <b>Google review link</b> once — Parosa puts a &ldquo;Rate us on Google&rdquo; QR on every bill and the link in every WhatsApp bill.</>}
                </div>
                <Link className="db-btn prime" href="/settings/payments">{restaurant.google_review_url ? "Open Settings" : "Add review link"}</Link>
              </div>
            )}
          </div>
          <div style={{ height: 30 }} />
        </div>
      </main>
      <div className={`db-toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}
