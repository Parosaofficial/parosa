// Parosa — bill PDF (jsPDF) + WhatsApp text builder.
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { Restaurant } from "./types";
import { isValidUpi, payNote, reviewLinkOf, upiLink } from "./upi";

export type BillOrder = {
  id?: string;
  order_no?: string | null;
  table_number?: string | null;
  created_at: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  gst: number;
  total: number;
  payment_status: string;
  payment_method?: string | null;
  staff_name?: string | null;
};

type Agg = { name: string; qty: number; price: number };
function aggregate(items: { name: string; qty: number; price: number }[]): Agg[] {
  const m: Record<string, Agg> = {};
  items.forEach((it) => { (m[it.name] ??= { name: it.name, qty: 0, price: it.price }).qty += it.qty; });
  return Object.values(m);
}

async function toDataURL(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dim = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = data;
    });
    return { data, w: dim.w, h: dim.h };
  } catch { return null; }
}

/** Draw a QR as vector squares — crisp at any print size and ~1 KB, vs ~350 KB as an embedded PNG. */
function drawQr(doc: jsPDF, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size, m = size / n;
  doc.setFillColor(42, 20, 20);
  for (let r = 0; r < n; r++) {
    // merge runs of dark modules in a row into one rect
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) { c++; continue; }
      const start = c;
      while (c < n && qr.modules.get(r, c)) c++;
      doc.rect(x + start * m, y + r * m, (c - start) * m + 0.02, m + 0.02, "F");
    }
  }
}

/** Centred letter-spaced text. jsPDF's align:"center" ignores charSpace, which pushes spaced titles off-centre. */
function spacedCenter(doc: jsPDF, text: string, cx: number, y: number, charSpace: number) {
  const w = doc.getTextWidth(text) + charSpace * (text.length - 1);
  doc.text(text, cx - w / 2, y, { charSpace });
}

export function billFileName(r: Restaurant, o: BillOrder) {
  return `${r.name.replace(/[^a-z0-9]+/gi, "-")}-bill-${o.order_no ?? "order"}.pdf`;
}

const OX: [number, number, number] = [110, 22, 24];
const INK: [number, number, number] = [38, 32, 32];
const GRAY: [number, number, number] = [128, 128, 128];
const rs = (n: number) => "Rs " + n.toLocaleString("en-IN");

/** Build a clean A5 bill as a jsPDF document. */
export async function generateBillPdf(r: Restaurant, o: BillOrder): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a5", compress: true });
  const W = 148, M = 14, R = W - M;
  let y = 16;
  // A5 is 210 mm tall. Start a new page when `need` mm won't fit, with a small
  // "continued" line so page 2 isn't an orphan.
  const ensure = (need: number) => {
    if (y + need <= 204) return;
    doc.addPage(); y = 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRAY);
    doc.text(`${r.name} · Bill #${o.order_no ?? "-"} (continued)`, W / 2, y, { align: "center" });
    y += 9;
  };

  // ---- logo ----
  if (r.logo_url) {
    const img = await toDataURL(r.logo_url);
    if (img && img.w) {
      const h = 20, w = Math.min(46, (img.w / img.h) * h);
      const fmt = img.data.includes("image/png") ? "PNG" : "JPEG";
      try { doc.addImage(img.data, fmt, (W - w) / 2, y, w, h); y += h + 5; } catch { /* ignore */ }
    }
  }

  // ---- name + contact ----
  doc.setFont("helvetica", "bold"); doc.setFontSize(21); doc.setTextColor(...OX);
  doc.text(r.name, W / 2, y, { align: "center" }); y += 6.5;

  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
  const contact = [r.address, [r.city, r.pincode].filter(Boolean).join(" "), r.phone ? `Ph: ${r.phone}` : ""].filter(Boolean);
  contact.forEach((line) => { doc.text(String(line), W / 2, y, { align: "center" }); y += 4; });
  const gl = [r.gstin ? `GSTIN: ${r.gstin}` : "", r.fssai ? `FSSAI: ${r.fssai}` : ""].filter(Boolean).join("     ");
  if (gl) { doc.text(gl, W / 2, y, { align: "center" }); y += 4; }

  // ---- rule + TAX INVOICE ----
  y += 2;
  doc.setFillColor(...OX); doc.rect(M, y, R - M, 0.8, "F"); y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...OX);
  spacedCenter(doc, "TAX INVOICE", W / 2, y, 1.2); y += 7;

  // ---- meta (two columns) ----
  doc.setFontSize(9); doc.setTextColor(...INK);
  const metaRow = (lL: string, vL: string, lR: string, vR: string) => {
    doc.setFont("helvetica", "normal"); doc.setTextColor(...GRAY);
    doc.text(lL, M, y); doc.text(lR, W / 2 + 4, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...INK);
    doc.text(vL, M + 20, y); doc.text(vR, W / 2 + 24, y);
    y += 5.4;
  };
  const dt = new Date(o.created_at);
  metaRow("Bill No.", `#${o.order_no ?? "-"}`, "Table", String(o.table_number ?? "-"));
  metaRow("Date", dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), "Time", dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }));
  metaRow("Order via", o.staff_name ? `Staff` : "QR menu", o.staff_name ? "By" : "", o.staff_name ?? "");

  // ---- items table ----
  y += 2;
  const qtyX = R - 52, rateX = R - 26, amtX = R;
  doc.setFillColor(246, 240, 224); doc.rect(M, y - 4, R - M, 7, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...OX);
  doc.text("ITEM", M + 2, y); doc.text("QTY", qtyX, y, { align: "right" }); doc.text("RATE", rateX, y, { align: "right" }); doc.text("AMOUNT", amtX, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...INK);
  aggregate(o.items).forEach((it) => {
    ensure(6);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...INK);
    const name = it.name.length > 30 ? it.name.slice(0, 29) + "…" : it.name;
    doc.text(name, M + 2, y);
    doc.text(String(it.qty), qtyX, y, { align: "right" });
    doc.text(String(it.price), rateX, y, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.text(String(it.qty * it.price), amtX, y, { align: "right" }); doc.setFont("helvetica", "normal");
    y += 5.6;
    doc.setDrawColor(232, 228, 216); doc.setLineWidth(0.2); doc.line(M, y - 2.3, R, y - 2.3);
  });

  // ---- bottom block: QRs on the left, totals on the right ----
  // Side by side (not stacked) so an ordinary 8–10 dish bill stays on one page.
  const paid = o.payment_status === "paid";
  const qrs: { text: string; title: string; sub: string; sub2?: string }[] = [];
  if (!paid && r.upi_id && isValidUpi(r.upi_id)) {
    const link = upiLink({ upi: r.upi_id, name: r.name, amount: o.total, note: payNote(r.name, o.order_no, o.table_number) });
    qrs.push({ text: link, title: "SCAN TO PAY", sub: `${rs(o.total)} · any UPI app`, sub2: r.upi_id });
  }
  const review = reviewLinkOf(r);
  if (review) qrs.push({ text: review, title: "RATE US ON GOOGLE", sub: "Scan & tap the stars" });

  const S = 24; // QR size, mm
  ensure((qrs.length ? S + 16 : 32) + 16); // block + footer stay together
  const y0 = y + 3;

  // left: QRs
  qrs.forEach((q, i) => {
    const x = M + i * (S + 12), cx = x + S / 2;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...OX);
    spacedCenter(doc, q.title, cx, y0, 0.4);
    doc.setDrawColor(226, 214, 190); doc.setLineWidth(0.3);
    doc.roundedRect(x - 1.5, y0 + 1.5, S + 3, S + 3, 2, 2, "S");
    drawQr(doc, q.text, x, y0 + 3, S);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); doc.setTextColor(...GRAY);
    doc.text(q.sub, cx, y0 + S + 8, { align: "center" });
    if (q.sub2) doc.text(q.sub2, cx, y0 + S + 11.3, { align: "center" });
  });
  const leftEnd = qrs.length ? y0 + S + (qrs.some((q) => q.sub2) ? 13 : 10) : y0;

  // right: totals + status
  y = y0;
  const labelX = R - 44;
  doc.setFontSize(9.5); doc.setTextColor(...INK);
  const tline = (l: string, v: string) => { doc.setFont("helvetica", "normal"); doc.text(l, labelX, y); doc.text(v, amtX, y, { align: "right" }); y += 5.4; };
  tline("Subtotal", rs(o.subtotal));
  tline("GST (5%)", rs(o.gst));
  y += 1.5;
  doc.setFillColor(...OX); doc.roundedRect(labelX - 6, y - 4.6, R - (labelX - 6), 9, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", labelX - 2, y); doc.text(rs(o.total), amtX - 2, y, { align: "right" });
  y += 11;
  const label = paid ? `PAID${o.payment_method ? " · " + o.payment_method.toUpperCase() : ""}` : "PAYMENT PENDING";
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  const cw = doc.getTextWidth(label) + 12;
  if (paid) { doc.setFillColor(226, 243, 230); doc.setTextColor(22, 110, 60); } else { doc.setFillColor(253, 236, 210); doc.setTextColor(170, 110, 20); }
  doc.roundedRect(R - cw, y - 4.5, cw, 7, 3.5, 3.5, "F");
  doc.text(label, R - cw / 2, y, { align: "center" });
  const rightEnd = y + 4;

  y = Math.max(leftEnd, rightEnd) + 8;

  // ---- footer ----
  doc.setDrawColor(225, 225, 225); doc.setLineWidth(0.3); doc.line(M, y, R, y); y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...OX);
  doc.text("Thank you! Please visit again.", W / 2, y, { align: "center" }); y += 5;
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...GRAY);
  doc.text("Billed with Parosa · Scan · Serve · Savour", W / 2, y, { align: "center" });

  return doc;
}

/**
 * Plain-text bill for WhatsApp.
 * payUrl must be https — WhatsApp only makes http(s) links tappable, never upi://.
 */
export function buildBillText(r: Restaurant, o: BillOrder, opts: { payUrl?: string } = {}): string {
  const lines = aggregate(o.items).map((it) => `• ${it.qty}× ${it.name} — ₹${it.qty * it.price}`);
  const paid = o.payment_status === "paid";
  const canPay = !paid && !!opts.payUrl && !!r.upi_id && isValidUpi(r.upi_id);
  const review = reviewLinkOf(r);

  const out: string[] = [`*${r.name}* — Bill`];
  const meta = [o.order_no ? `Bill #${o.order_no}` : "", o.table_number ? `Table ${o.table_number}` : ""].filter(Boolean).join(" · ");
  if (meta) out.push(meta);
  out.push("", ...lines, "", `Subtotal: ₹${o.subtotal}`, `GST (5%): ₹${o.gst}`, `*Total: ₹${o.total}*`, "");

  if (paid) out.push(`✅ Paid${o.payment_method ? " · " + o.payment_method : ""}`);
  else if (canPay) out.push(`💳 *Pay ₹${o.total} via UPI* — tap the link:`, opts.payUrl!);
  else out.push("Payment pending");

  if (review) out.push("", "⭐ Enjoyed your meal? Rate us on Google — it really helps us:", review);
  out.push("", "Thank you, visit again! 🙏");
  return out.join("\n");
}
