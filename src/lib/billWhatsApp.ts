// Parosa — ask the server to send a paid bill to the guest on WhatsApp (see /api/bill/whatsapp).
import { supabase } from "./supabase";

export type BillSend =
  | { ok: true; phone_end: string }
  | { ok: false; error: "auth" | "plan" | "nophone" | "notfound" | "unpaid" | "notsent" | "offline" };

/** kind "order" = one order (Orders & Bills); "session" = a whole table bill (Overview → close table). */
export async function sendBillOnWhatsApp(kind: "order" | "session", id: string, phone?: string): Promise<BillSend> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, error: "auth" };
    const r = await fetch("/api/bill/whatsapp", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, id, phone }),
    });
    return (await r.json()) as BillSend;
  } catch {
    return { ok: false, error: "offline" };
  }
}

/** One line for a toast after an automatic send — null when there's nothing worth saying. */
export function billSendNote(r: BillSend): string | null {
  if (r.ok) return `Bill sent on WhatsApp to ••••${r.phone_end} ✓`;
  if (r.error === "notsent" || r.error === "offline") return "Couldn't send the bill on WhatsApp — use Send on WhatsApp to try again";
  return null; // no number, not on the plan, etc. — stay quiet
}
