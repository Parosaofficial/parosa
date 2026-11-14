// Parosa — the bill PDF, in the 80 mm receipt style (Template 2, Nov 2026).
// Works in the browser (Print / PDF) and on the server (WhatsApp bills): no
// DOM, no canvas. Lines without data (GSTIN, discount, free item, waiter…)
// simply don't print, so one layout fits every restaurant.

import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export type ReceiptLogo = { data: Uint8Array; format: "PNG" | "JPEG" };

export type ReceiptInput = {
  restaurant: {
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    phone?: string | null;
    gstin?: string | null;
    fssai?: string | null;
  };
  logo?: ReceiptLogo | null;
  billNo: string;
  date: string;                       // ISO time of the bill
  table?: string | null;              // "T4" / "Token 12"
  waiter?: string | null;
  items: { name: string; qty: number; price: number }[];
  free?: { name: string; qty: number; worth: number }[];   // loyalty rewards — printed at 0, never totalled
  discount?: { label: string; amount: number } | null;
  extras?: { label: string; amount: number }[];            // e.g. table booking charge
  subtotal: number;
  tax: number;                        // total GST
  taxRate?: number;                   // %, default 5
  total: number;
  paid: boolean;
  method?: string | null;
  reviewUrl?: string | null;          // "Rate us" QR
  payUrl?: string | null;             // UPI QR when unpaid
};

const W = 80;            // mm, a standard thermal roll
const M = 5;             // side margin
const CX = W / 2;
const INK: [number, number, number] = [36, 26, 26];
const money = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function initials(name: string) {
  const w = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "P") + (w[1]?.[0] ?? "")).toUpperCase();
}

/** Logo bytes → what jsPDF can draw (PNG / JPEG only; anything else falls back to initials). */
export function logoFromBytes(bytes: Uint8Array): ReceiptLogo | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { data: bytes, format: "PNG" };
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { data: bytes, format: "JPEG" };
  return null;
}

export async function fetchLogo(url?: string | null): Promise<ReceiptLogo | null> {
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return logoFromBytes(new Uint8Array(await r.arrayBuffer()));
  } catch { return null; }
}

function drawQr(doc: jsPDF, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size, m = size / n;
  doc.setFillColor(...INK);
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) { c++; continue; }
      const start = c;
      while (c < n && qr.modules.get(r, c)) c++;
      doc.rect(x + start * m, y + r * m, (c - start) * m + 0.02, m + 0.02, "F");
    }
  }
}

/** Lays the receipt out on `doc`; returns the height used. Run once to measure, once to draw. */
function layout(doc: jsPDF, b: ReceiptInput): number {
  let y = 6;
  const r = b.restaurant;
  const font = (size: number, bold = false) => { doc.setFont("courier", bold ? "bold" : "normal"); doc.setFontSize(size); };
  const centre = (t: string, size: number, bold = false, gap = 3.6) => {
    font(size, bold);
    for (const line of doc.splitTextToSize(t, W - 2 * M) as string[]) { doc.text(line, CX, y, { align: "center" }); y += gap; }
  };
  const row = (l: string, rgt: string, size = 8.2, bold = false) => {
    font(size, bold);
    doc.text(l, M, y);
    doc.text(rgt, W - M, y, { align: "right" });
    y += size >= 10 ? 5 : 3.8;
  };
  const dash = () => {
    doc.setLineDashPattern([0.9, 0.7], 0); doc.setLineWidth(0.25); doc.setDrawColor(...INK);
    doc.line(M, y - 1.2, W - M, y - 1.2);
    doc.setLineDashPattern([], 0);
    y += 2.6;
  };

  doc.setTextColor(...INK);

  // ---- logo circle ----
  const R = 7;
  const cy = y + R;
  doc.setDrawColor(...INK); doc.setLineWidth(0.4);
  if (b.logo) {
    try {
      doc.saveGraphicsState();
      doc.circle(CX, cy, R, null); doc.clip(); doc.discardPath();
      doc.addImage(b.logo.data, b.logo.format, CX - R, cy - R, 2 * R, 2 * R);
      doc.restoreGraphicsState();
      doc.circle(CX, cy, R, "S");
    } catch { b = { ...b, logo: null }; }
  }
  if (!b.logo) {
    doc.setFillColor(92, 15, 20); doc.circle(CX, cy, R, "F");
    font(11, true); doc.setTextColor(243, 217, 164);
    doc.text(initials(r.name), CX, cy + 1.4, { align: "center" });
    doc.setTextColor(...INK);
  }
  y = cy + R + 5;

  // ---- who ----
  centre(r.name.toUpperCase(), 11, true, 4.6);
  const place = [r.address, r.city, [r.state, r.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  if (place) centre(place, 7.6);
  if (r.phone) centre(`Ph: ${r.phone}`, 7.6);
  if (r.gstin) centre(`GSTIN ${r.gstin}`, 7.6);
  if (r.fssai) centre(`FSSAI ${r.fssai}`, 7.6);
  y += 1;
  dash();
  centre(r.gstin ? "TAX INVOICE" : "BILL", 10, true, 4);
  y += 0.6;
  dash();

  // ---- bill details ----
  const d = new Date(b.date);
  const when = `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Kolkata" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })}`;
  row(`Bill: #${b.billNo}`, when);
  if (b.table || b.waiter) row(b.table ? `Table: ${b.table}` : "", b.waiter ? `Waiter: ${b.waiter.split(" ")[0]}` : "");
  dash();

  // ---- items ----
  font(8.2, true);
  doc.text("Item", M, y); doc.text("Qty", W - M - 20, y, { align: "right" }); doc.text("Amt", W - M, y, { align: "right" });
  y += 3.8;
  const nameW = W - 2 * M - 26;
  for (const it of b.items) {
    font(8.2);
    const lines = doc.splitTextToSize(`${it.name} @${it.price}`, nameW) as string[];
    lines.forEach((ln, i) => {
      doc.text(ln, M, y);
      if (i === 0) { doc.text(String(it.qty), W - M - 20, y, { align: "right" }); doc.text(money(it.qty * it.price), W - M, y, { align: "right" }); }
      y += 3.6;
    });
  }
  for (const f of b.free ?? []) {
    font(8.2, true);
    const lines = doc.splitTextToSize(`* ${f.name}`, nameW) as string[];
    lines.forEach((ln, i) => {
      doc.text(ln, M, y);
      if (i === 0) { doc.text(String(f.qty), W - M - 20, y, { align: "right" }); doc.text("FREE", W - M, y, { align: "right" }); }
      y += 3.6;
    });
    font(7.4); doc.text(`  (loyalty reward, worth ${money(f.worth)})`, M, y); y += 3.6;
  }
  y += 0.6;
  dash();

  // ---- totals ----
  row("Subtotal", money(b.subtotal));
  if (b.discount && b.discount.amount > 0) row(`Disc (${b.discount.label})`.slice(0, 26), `-${money(b.discount.amount)}`);
  for (const x of b.extras ?? []) if (x.amount) row(x.label, money(x.amount));
  const rate = b.taxRate ?? 5;
  if (b.tax > 0) {
    if (r.gstin) {
      const half = Math.round((b.tax / 2) * 100) / 100;
      row(`CGST @${rate / 2}%`, money(half));
      row(`SGST @${rate / 2}%`, money(b.tax - half));
    } else row(`Tax @${rate}%`, money(b.tax));
  }
  const before = b.subtotal - (b.discount?.amount ?? 0) + (b.extras ?? []).reduce((a, x) => a + x.amount, 0) + b.tax;
  const round = Math.round((b.total - before) * 100) / 100;
  if (Math.abs(round) >= 0.01) row("Round off", money(round));
  dash();
  row("TOTAL", `Rs ${money(b.total)}`, 11, true);
  dash();
  const count = b.items.reduce((a, i) => a + i.qty, 0);
  row(b.paid ? `Paid: ${b.method || "Cash"}` : "PAYMENT DUE", `Items: ${count}`);
  const saved = (b.discount?.amount ?? 0) + (b.free ?? []).reduce((a, f) => a + f.worth, 0);
  if (saved > 0) centre(`You saved Rs ${money(saved)} today`, 8.2);

  // ---- QR codes ----
  const qrs = [
    !b.paid && b.payUrl ? { text: b.payUrl, label: `Scan to pay Rs ${money(b.total)}` } : null,
    b.reviewUrl ? { text: b.reviewUrl, label: "Rate us on Google" } : null,
  ].filter(Boolean) as { text: string; label: string }[];
  if (qrs.length) {
    y += 1;
    dash();
    const size = 22, gap = 8;
    const totalW = qrs.length * size + (qrs.length - 1) * gap;
    qrs.forEach((q, i) => {
      const x = CX - totalW / 2 + i * (size + gap);
      drawQr(doc, q.text, x, y, size);
      font(6.8, true); doc.text(q.label, x + size / 2, y + size + 3, { align: "center" });
    });
    y += size + 7;
  }

  // ---- thank you ----
  dash();
  centre("** THANK YOU! VISIT AGAIN **", 9.4, true, 4.2);
  y += 1.4;
  centre("Computer-generated bill · Parosa", 6.8);
  return y + 3;
}

/** The finished receipt as a jsPDF document (80 mm wide, as tall as the bill). */
export function buildReceiptPdf(b: ReceiptInput): jsPDF {
  const probe = new jsPDF({ unit: "mm", format: [W, 2000] });
  const h = Math.max(110, Math.ceil(layout(probe, b)));
  const doc = new jsPDF({ unit: "mm", format: [W, h] });
  doc.setProperties({ title: `${b.restaurant.name} — Bill #${b.billNo}`, creator: "Parosa" });
  layout(doc, b);
  return doc;
}

export const receiptFileName = (restaurantName: string, billNo: string) =>
  `${restaurantName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-bill-${billNo}.pdf`;
