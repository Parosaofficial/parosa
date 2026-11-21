import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";
import { rateLimit, tooMany } from "@/lib/rateLimit";
import { failedCheck, verifyTurnstile } from "@/lib/turnstile";

/*
 * Guest table booking (Seat Reserve). The guest's page posts here instead of
 * calling the database: we cap bookings per visitor, check the Turnstile bot
 * test (when switched on), then create the booking with reservation_create —
 * which after 0022 only the server may call.
 *
 * POST { restaurantId, tableId, at, people, name, phone, note?, captcha? }
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await rateLimit(req, "book", 10))) return tooMany();
  let b: { restaurantId?: string; tableId?: string; at?: string; people?: number; name?: string; phone?: string; note?: string; captcha?: string } = {};
  try { b = await req.json(); } catch { /* empty */ }
  if (!b.restaurantId || !b.tableId || !b.at) return Response.json({ ok: false, error: "Please pick a table and a time" }, { status: 400 });
  if (!(await verifyTurnstile(b.captcha, req))) return failedCheck();

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  const db = createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("reservation_create", {
    p_restaurant: b.restaurantId, p_table: b.tableId, p_at: b.at,
    p_people: b.people ?? 2, p_name: b.name ?? "", p_phone: b.phone ?? "", p_note: b.note || null,
  });
  // the database's own reason (table just taken, too many bookings…) goes back to the guest
  if (error) return Response.json({ ok: false, error: error.message || "Couldn't book" });
  return Response.json({ ok: true, booking: data });
}
