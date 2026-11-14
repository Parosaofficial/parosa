import { createClient } from "@supabase/supabase-js";
import { accessOf } from "@/lib/plans";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { buildReceiptPdf, fetchLogo, receiptFileName, type ReceiptInput } from "@/lib/receipt";
import type { Restaurant } from "@/lib/types";

/*
 * Sends a paid bill to the guest on WhatsApp, from Parosa's number:
 *   the receipt PDF + "Thank you for dining at <restaurant>" + a "Rate us on Google" button.
 *
 * POST { kind: "order" | "session", id, phone? }   Authorization: Bearer <owner's access token>
 *   order   — one order (Orders & Bills)
 *   session — a whole table bill (Overview → close table)
 *   phone   — optional; otherwise the number the guest gave on the order
 *
 * Needs on the server (Vercel → Environment Variables), shared with the kitchen OTP:
 *   WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 *   WHATSAPP_BILL_TEMPLATE  approved Utility template (default: parosa_bill_receipt)
 *   WHATSAPP_BILL_LANG      optional language code (default: tries en, en_US, en_GB)
 * The template: document header, body {{1}} restaurant · {{2}} bill no · {{3}} amount,
 * URL button https://www.parosa.food/r/{{1}} (the restaurant's Google review page).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE = "https://www.parosa.food";

type Fail = "auth" | "plan" | "nophone" | "notfound" | "unpaid" | "notsent";
const fail = (error: Fail, status = 200) => Response.json({ ok: false, error }, { status });

type OrderRow = {
  id: string; restaurant_id: string; order_no: string | null; table_number: string | null; created_at: string;
  subtotal: number; gst: number; total: number; payment_status: string; payment_method: string | null;
  customer_phone: string | null; staff_name: string | null; session_id?: string | null;
};

const phone10 = (p?: string | null) => (p ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "").slice(-10);

export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return fail("auth", 401);
  let kind = "", id = "", given = "";
  try {
    const b = (await req.json()) as { kind?: string; id?: string; phone?: string };
    kind = String(b.kind ?? ""); id = String(b.id ?? ""); given = String(b.phone ?? "");
  } catch { /* fall through */ }
  if ((kind !== "order" && kind !== "session") || !id) return fail("notfound", 400);

  // Act as the signed-in owner: every read goes through their own access rules.
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: who } = await db.auth.getUser(token);
  const uid = who?.user?.id;
  if (!uid) return fail("auth", 401);

  // ---- the order(s) on this bill ----
  const cols = "id,restaurant_id,order_no,table_number,created_at,subtotal,gst,total,payment_status,payment_method,customer_phone,staff_name,session_id";
  let orders: OrderRow[] = [];
  let extras: { label: string; amount: number }[] = [];
  if (kind === "order") {
    const { data } = await db.from("orders").select(cols).eq("id", id).maybeSingle();
    if (data) orders = [data as OrderRow];
  } else {
    const { data } = await db.from("orders").select(cols).eq("session_id", id).order("created_at");
    orders = (data ?? []) as OrderRow[];
    const { data: s } = await db.from("table_sessions").select("booking_charge").eq("id", id).maybeSingle();
    const charge = Number((s as { booking_charge?: number } | null)?.booking_charge ?? 0);
    if (charge > 0) extras = [{ label: "Table booking", amount: charge }];
  }
  if (!orders.length) return fail("notfound", 404);

  const { data: rest } = await db.from("restaurants").select("*").eq("id", orders[0].restaurant_id).maybeSingle();
  const r = rest as (Restaurant & { owner_id: string | null }) | null;
  if (!r || r.owner_id !== uid) return fail("auth", 403);
  if (!accessOf(r).can("whatsappBill")) return fail("plan");
  if (orders.some((o) => o.payment_status !== "paid")) return fail("unpaid");

  const phone = phone10(given) || phone10(orders.find((o) => phone10(o.customer_phone))?.customer_phone);
  if (phone.length !== 10) return fail("nophone");
  // a number typed on Orders & Bills is kept on the order (stamp card, next bill)
  if (given && kind === "order" && phone10(orders[0].customer_phone) !== phone) {
    await db.from("orders").update({ customer_phone: phone }).eq("id", orders[0].id);
  }

  // ---- the receipt ----
  const { data: itemRows } = await db.from("order_items").select("order_id,name,qty,price").in("order_id", orders.map((o) => o.id));
  const merged = new Map<string, { name: string; qty: number; price: number }>();
  for (const it of (itemRows ?? []) as { name: string; qty: number; price: number }[]) {
    const k = `${it.name}@${it.price}`;
    const cur = merged.get(k);
    if (cur) cur.qty += it.qty; else merged.set(k, { name: it.name, qty: it.qty, price: it.price });
  }
  const sum = (f: (o: OrderRow) => number) => orders.reduce((a, o) => a + (Number(f(o)) || 0), 0);
  const last = orders[orders.length - 1];
  const billNo = orders.length === 1 ? (orders[0].order_no ?? orders[0].id.slice(0, 6)) : `${orders[0].order_no ?? ""}-${last.order_no ?? ""}`;
  const { data: tableRow } = last.table_number
    ? await db.from("restaurant_tables").select("name").eq("restaurant_id", r.id).eq("code", last.table_number).maybeSingle()
    : { data: null };
  const reviewUrl = `${SITE}/r/${r.slug}`;

  const input: ReceiptInput = {
    restaurant: { name: r.name, address: r.address, city: r.city, state: r.state, pincode: r.pincode, phone: r.phone, gstin: r.gstin, fssai: r.fssai },
    logo: await fetchLogo(r.logo_url),
    billNo,
    date: last.created_at,
    table: (tableRow as { name?: string } | null)?.name ?? last.table_number,
    waiter: orders.find((o) => o.staff_name)?.staff_name ?? null,
    items: [...merged.values()],
    extras,
    subtotal: sum((o) => o.subtotal),
    tax: sum((o) => o.gst),
    total: sum((o) => o.total) + extras.reduce((a, x) => a + x.amount, 0),
    paid: true,
    method: last.payment_method,
    reviewUrl,
  };
  const pdf = new Uint8Array(buildReceiptPdf(input).output("arraybuffer"));
  const filename = receiptFileName(r.name, billNo);

  const sent = await sendBill({ pdf, filename, phone, name: r.name, billNo, total: input.total, slug: r.slug });
  if (!sent) return fail("notsent");
  return Response.json({ ok: true, phone_end: phone.slice(-4) });
}

async function sendBill(b: { pdf: Uint8Array; filename: string; phone: string; name: string; billNo: string; total: number; slug: string }): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const numberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !numberId) { console.error("[bill-wa] WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set"); return false; }
  const graph = "https://graph.facebook.com/v25.0";
  try {
    // 1) upload the PDF to WhatsApp (kept by Meta for 30 days; no public link needed)
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "application/pdf");
    form.append("file", new Blob([b.pdf as BlobPart], { type: "application/pdf" }), b.filename);
    const up = await fetch(`${graph}/${numberId}/media`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
    const upJson = (await up.json().catch(() => null)) as { id?: string; error?: { code?: number; message?: string } } | null;
    if (!up.ok || !upJson?.id) { console.error("[bill-wa] media upload failed", up.status, upJson?.error?.code, upJson?.error?.message); return false; }

    // 2) the approved template: PDF + thank-you text + "Rate us on Google" button
    const template = process.env.WHATSAPP_BILL_TEMPLATE || "parosa_bill_receipt";
    const langs = [...new Set([process.env.WHATSAPP_BILL_LANG || "en", "en_US", "en_GB"])];
    const amount = b.total.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    for (const lang of langs) {
      const r = await fetch(`${graph}/${numberId}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: `91${b.phone}`,
          type: "template",
          template: {
            name: template,
            language: { code: lang },
            components: [
              { type: "header", parameters: [{ type: "document", document: { id: upJson.id, filename: b.filename } }] },
              { type: "body", parameters: [{ type: "text", text: b.name }, { type: "text", text: b.billNo }, { type: "text", text: amount }] },
              { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: b.slug }] },
            ],
          },
        }),
      });
      if (r.ok) return true;
      const e = (await r.json().catch(() => null)) as { error?: { code?: number; message?: string } } | null;
      console.error("[bill-wa] send failed", template, lang, r.status, e?.error?.code, e?.error?.message);
      if (e?.error?.code !== 132001) return false; // only a wrong language is worth retrying
    }
    return false;
  } catch (err) {
    console.error("[bill-wa] send error", err instanceof Error ? err.message : err);
    return false;
  }
}
