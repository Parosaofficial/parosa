// Parosa — per-visitor rate limits for server routes (0022 parosa_rate_hit).
// Server only: uses SUPABASE_SERVICE_ROLE_KEY. Fails open (allows) if the
// database or key is unavailable, so a hiccup never locks real users out.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./supabase";

/** The visitor's IP as Vercel reports it. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return (fwd.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/** true = allowed. `name` groups the limit (e.g. "auth-otp"); limit per `windowSec` per IP. */
export async function rateLimit(req: Request, name: string, limit: number, windowSec = 60): Promise<boolean> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return true;
  try {
    const db = createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
    const { data, error } = await db.rpc("parosa_rate_hit", { p_key: `${name}:${clientIp(req)}`, p_limit: limit, p_window_s: windowSec });
    if (error) return true; // database without 0022 → no limit
    return data !== false;
  } catch {
    return true;
  }
}

export const tooMany = () => Response.json({ ok: false, error: "toomany" }, { status: 429 });
