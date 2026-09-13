// Parosa — bill PDF (jsPDF) + WhatsApp text builder.
import { jsPDF } from "jspdf";
import type { Restaurant } from "./types";

export type BillOrder = {
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

export function billFileName(r: Restaurant, o: BillOrder) {
  return `${r.name.replace(/[^a-z0-9]+/gi, "-")}-bill-${o.order_no ?? "order"}.pdf`;
}

/** Build the bill as a jsPDF document (A5). Caller can .save() or get a blob. */
export async function generateBillPdf(r: Restaurant, o: BillOrder): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const W = 148, M = 12;
  let y = 14;

  if (r.logo_url) {
    const img = await toDataURL(r.logo_url);
    if (img && img.w) {
      const h = 18, w = (img.w / img.h) * h;
      const fmt = img.data.includes("image/png") ? "PNG" : "JPEG";
      try { doc.addImage(img.data, fmt, (W - w) / 2, y, w, h); y += h + 4; } catch { /* ignore */ }
    }
  }

  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(110, 22, 24);
  doc.text(r.name, W / 2, y, { align: "center" }); y += 6;

  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(90, 90, 90);
  const meta = [r.address, [r.city, r.pincode].filter(Boolean).join(" "), r.phone ? `Ph: ${r.phone}` : ""].filter(Boolean);
  meta.forEach((line) => { doc.text(String(line), W / 2, y, { align: "center" }); y += 4; });
  const gl = [r.gstin ? `GSTIN: ${r.gstin}` : "", r.fssai ? `FSSAI: ${r.fssai}` : ""].filter(Boolean).join("    ");
  if (gl) { doc.text(gl, W / 2, y, { align: "center" }); y += 4; }

  y += 2; doc.setDrawColor(200, 180, 120); doc.line(M, y, W - M, y); y += 6;

  doc.setFontSize(9); doc.setTextColor(40, 40, 40);
  const dt = new Date(o.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  doc.text(`Bill #${o.order_no ?? "-"}`, M, y); doc.text(`Table ${o.table_number ?? "-"}`, W - M, y, { align: "right" }); y += 5;
  doc.text(dt, M, y); doc.text(o.staff_name ? `By ${o.staff_name}` : "Via QR", W - M, y, { align: "right" }); y += 6;

  doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 5;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
  doc.text("Item", M, y); doc.text("Qty", W - 44, y, { align: "right" }); doc.text("Rate", W - 27, y, { align: "right" }); doc.text("Amount", W - M, y, { align: "right" }); y += 2;
  doc.line(M, y, W - M, y); y += 5;

  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  aggregate(o.items).forEach((it) => {
    doc.text(it.name.length > 30 ? it.name.slice(0, 29) + "…" : it.name, M, y);
    doc.text(String(it.qty), W - 44, y, { align: "right" });
    doc.text(String(it.price), W - 27, y, { align: "right" });
    doc.text(String(it.qty * it.price), W - M, y, { align: "right" });
    y += 5.5;
  });

  y += 1; doc.line(M, y, W - M, y); y += 6;
  const tot = (label: string, val: number, bold: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, W - 48, y); doc.text(`Rs ${val}`, W - M, y, { align: "right" }); y += 5.5;
  };
  tot("Subtotal", o.subtotal, false);
  tot("GST (5%)", o.gst, false);
  doc.setFontSize(11); tot("Total", o.total, true); doc.setFontSize(9);

  y += 2;
  const paid = o.payment_status === "paid";
  doc.setTextColor(paid ? 20 : 150, paid ? 110 : 30, paid ? 60 : 40);
  doc.text(paid ? `PAID${o.payment_method ? " · " + o.payment_method : ""}` : "PAYMENT PENDING", W / 2, y, { align: "center" }); y += 9;
  doc.setTextColor(150, 150, 150); doc.setFontSize(8);
  doc.text("Thank you! Please visit again.", W / 2, y, { align: "center" }); y += 4;
  doc.text("Billed with Parosa", W / 2, y, { align: "center" });

  return doc;
}

/** Plain-text bill for WhatsApp. */
export function buildBillText(r: Restaurant, o: BillOrder): string {
  const lines = aggregate(o.items).map((it) => `• ${it.qty}× ${it.name} — ₹${it.qty * it.price}`);
  return [
    `*${r.name}* — Bill`,
    o.order_no ? `Bill #${o.order_no}` : "",
    o.table_number ? `Table ${o.table_number}` : "",
    "",
    ...lines,
    "",
    `Subtotal: ₹${o.subtotal}`,
    `GST (5%): ₹${o.gst}`,
    `*Total: ₹${o.total}*`,
    "",
    o.payment_status === "paid" ? `Paid${o.payment_method ? " · " + o.payment_method : ""}` : "Payment pending",
    "Thank you! 🙏",
  ].filter((l) => l !== "").join("\n");
}
