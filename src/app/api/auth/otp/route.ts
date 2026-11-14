import { createHash, randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase";
import { sendOtpOnWhatsApp } from "@/lib/whatsappOtp";

/*
 * Owner "Forgot password?" by WhatsApp (0019 owner_otps).
 *
 * POST { step: "send", phone }          → a 6-digit code to that number on WhatsApp
 *   (only if it's a restaurant's registered mobile; the answer is the same either
 *    way, so nobody can test which numbers are Parosa owners)
 * POST { step: "verify", phone, code }   → { ok, token_hash } — the browser signs in with it
 *   (supabase.auth.verifyOtp), then sets a new password or skips.
 *
 * Limits: 5 codes an hour per number, 10 minutes each, 5 tries, codes stored hashed.
 * Needs SUPABASE_SERVICE_ROLE_KEY + the WhatsApp settings of the kitchen sign-in.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const p10 = (p: unknown) => String(p ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "").slice(-10);
const hash = (code: string, id: string) => createHash("sha256").update(`${id}:${code}`).digest("hex");

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key ? createClient(SUPABASE_URL, key, { auth: { persistSession: false } }) : null;
}

export async function POST(req: Request) {
  let body: { step?: string; phone?: string; code?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const phone = p10(body.phone);
  if (phone.length !== 10) return Response.json({ ok: false, error: "phone" });
  const db = admin();
  if (!db) { console.error("[owner-otp] SUPABASE_SERVICE_ROLE_KEY is not set"); return Response.json({ ok: false, error: "notsent" }); }

  if (body.step === "send") {
    const { count } = await db.from("owner_otps").select("id", { count: "exact", head: true })
      .eq("phone", phone).gt("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 5) return Response.json({ ok: false, error: "toomany" });

    // the owner whose restaurant has this registered mobile
    const { data: rows } = await db.from("restaurants").select("owner_id, phone").like("phone", `%${phone}`).not("owner_id", "is", null).limit(5);
    const owner = (rows ?? []).find((r: { owner_id: string | null; phone: string | null }) => p10(r.phone) === phone)?.owner_id as string | undefined;
    if (!owner) return Response.json({ ok: true }); // same answer as a real send

    await db.from("owner_otps").update({ used: true }).eq("phone", phone).eq("used", false);
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const { data: row, error } = await db.from("owner_otps").insert({ user_id: owner, phone, code_hash: "pending" }).select("id").single();
    if (error || !row) { console.error("[owner-otp] insert failed", error?.message); return Response.json({ ok: false, error: "notsent" }); }
    await db.from("owner_otps").update({ code_hash: hash(code, row.id) }).eq("id", row.id);

    if (!(await sendOtpOnWhatsApp(phone, code, "owner-otp"))) {
      await db.from("owner_otps").delete().eq("id", row.id); // unsent → doesn't count toward the limit
      return Response.json({ ok: false, error: "notsent" });
    }
    return Response.json({ ok: true });
  }

  if (body.step === "verify") {
    const code = String(body.code ?? "").replace(/\D/g, "");
    const { data: otp } = await db.from("owner_otps").select("*").eq("phone", phone).eq("used", false)
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!otp) return Response.json({ ok: false, error: "expired" });
    if (otp.code_hash !== hash(code, otp.id)) {
      const tries = otp.attempts + 1;
      await db.from("owner_otps").update({ attempts: tries, used: tries >= 5 }).eq("id", otp.id);
      return Response.json({ ok: false, error: tries >= 5 ? "expired" : "wrong", left: 5 - tries });
    }
    await db.from("owner_otps").update({ used: true }).eq("id", otp.id);

    // a one-time sign-in for that owner; the browser exchanges it for a session
    const { data: u } = await db.auth.admin.getUserById(otp.user_id);
    const email = u?.user?.email;
    if (!email) return Response.json({ ok: false, error: "expired" });
    const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link?.properties?.hashed_token;
    if (error || !tokenHash) { console.error("[owner-otp] sign-in link failed", error?.message); return Response.json({ ok: false, error: "notsent" }); }
    return Response.json({ ok: true, token_hash: tokenHash });
  }

  return Response.json({ ok: false, error: "phone" }, { status: 400 });
}
