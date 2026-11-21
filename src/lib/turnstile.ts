// Parosa — check a Cloudflare Turnstile token on the server.
// Switched on by TURNSTILE_SECRET_KEY (Vercel env, server only). Without it
// every request passes, so routes behave exactly as before.
import { clientIp } from "./rateLimit";

export const turnstileRequired = () => !!process.env.TURNSTILE_SECRET_KEY;

export async function verifyTurnstile(token: string | null | undefined, req: Request): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: clientIp(req) });
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const d = (await r.json()) as { success?: boolean };
    return d.success === true;
  } catch {
    return false;
  }
}

export const failedCheck = () => Response.json({ ok: false, error: "captcha" }, { status: 400 });
