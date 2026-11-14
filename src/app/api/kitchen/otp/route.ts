import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/*
 * Kitchen sign-in, step 1: Restaurant ID + registered mobile → a 6-digit code.
 *
 * The database checks the pair and makes the code (kitchen_request_otp). The
 * code is sent ONLY on WhatsApp — it is never shown anywhere else. Needs these
 * on the server (Vercel → Settings → Environment Variables):
 *   WHATSAPP_TOKEN            Meta WhatsApp Cloud API access token
 *   WHATSAPP_PHONE_NUMBER_ID  the sending number's id
 *   WHATSAPP_OTP_TEMPLATE     an approved "authentication" template (default: parosa_kitchen_otp)
 *   WHATSAPP_OTP_LANG         optional: its language code (default: tries en, en_US, en_GB)
 *   SUPABASE_SERVICE_ROLE_KEY to read the code server-side (never sent to a browser)
 * If WhatsApp can't send, the code is deleted (so it doesn't use up the hourly
 * limit) and the tablet is told to try again.
 */

export const dynamic = "force-dynamic";

type Made = { ok: boolean; error?: string; otp_id?: string; restaurant_name?: string; phone_end?: string };

export async function POST(req: Request) {
  let id = "", phone = "";
  try {
    const b = (await req.json()) as { id?: unknown; phone?: unknown };
    id = String(b.id ?? "").trim().slice(0, 80);
    phone = String(b.phone ?? "").replace(/\D/g, "").slice(-10);
  } catch { /* fall through */ }
  if (!id || phone.length !== 10) return Response.json({ ok: false, error: "nomatch" });

  const { data, error } = await supabase.rpc("kitchen_request_otp", { p_slug: id, p_phone: phone });
  if (error || !data) return Response.json({ ok: false, error: "offline" });
  const made = data as Made;
  if (!made.ok || !made.otp_id) return Response.json({ ok: false, error: made.error === "toomany" ? "toomany" : "nomatch" });

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) {
    console.error("[kitchen-otp] SUPABASE_SERVICE_ROLE_KEY is not set");
    return Response.json({ ok: false, error: "notsent" });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cyyyrunhjwnadjnsrtog.supabase.co";
  const admin = createClient(url, service, { auth: { persistSession: false } });

  if (!(await sendOnWhatsApp(admin, made.otp_id, phone))) {
    await admin.from("kitchen_otps").delete().eq("id", made.otp_id); // unsent → doesn't count toward the limit
    return Response.json({ ok: false, error: "notsent" });
  }
  return Response.json({ ok: true, restaurant_name: made.restaurant_name, phone_end: made.phone_end });
}

async function sendOnWhatsApp(admin: SupabaseClient, otpId: string, phone10: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const numberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !numberId) {
    console.error("[kitchen-otp] WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set");
    return false;
  }
  try {
    const { data } = await admin.from("kitchen_otps").select("code").eq("id", otpId).single();
    if (!data?.code) return false;
    const template = process.env.WHATSAPP_OTP_TEMPLATE || "parosa_kitchen_otp";
    // A template is looked up by name + language. "English" is `en`, "English (US)" is `en_US`
    // and "English (UK)" is `en_GB` in WhatsApp Manager — try each until one exists (error 132001).
    const langs = [...new Set([process.env.WHATSAPP_OTP_LANG || "en", "en_US", "en_GB"])];
    let sent = false;
    for (const lang of langs) {
      const r = await fetch(`https://graph.facebook.com/v25.0/${numberId}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: `91${phone10}`,
          type: "template",
          template: {
            name: template,
            language: { code: lang },
            components: [
              { type: "body", parameters: [{ type: "text", text: data.code }] },
              { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: data.code }] },
            ],
          },
        }),
      });
      if (r.ok) { sent = true; break; }
      // Meta's error (no token or code in it) → Vercel logs, so a bad template/number is easy to spot.
      const e = (await r.json().catch(() => null)) as { error?: { code?: number; message?: string } } | null;
      console.error("[kitchen-otp] WhatsApp send failed", lang, r.status, e?.error?.code, e?.error?.message);
      if (e?.error?.code !== 132001) break; // only a wrong language is worth retrying
    }
    if (!sent) {
      // Which number is WHATSAPP_PHONE_NUMBER_ID? A template only works from a number in the same
      // WhatsApp account — e.g. Meta's +1 555 test number can't use Parosa's templates.
      const n = await fetch(`https://graph.facebook.com/v25.0/${numberId}?fields=display_phone_number,verified_name`, {
        headers: { authorization: `Bearer ${token}` },
      }).then((x) => x.json()).catch(() => null);
      console.error("[kitchen-otp] sending number", JSON.stringify(n));
      return false;
    }
    await admin.from("kitchen_otps").update({ sent_whatsapp: true }).eq("id", otpId);
    return true;
  } catch (err) {
    console.error("[kitchen-otp] WhatsApp send error", err instanceof Error ? err.message : err);
    return false;
  }
}
