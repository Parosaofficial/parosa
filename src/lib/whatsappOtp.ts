// Parosa — send a 6-digit code on WhatsApp with the approved "authentication"
// template (server only: uses WHATSAPP_TOKEN). Same template as the kitchen
// sign-in: WHATSAPP_OTP_TEMPLATE (default parosa_kitchen_otp), WHATSAPP_OTP_LANG.

export async function sendOtpOnWhatsApp(phone10: string, code: string, tag: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const numberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !numberId) { console.error(`[${tag}] WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not set`); return false; }
  const template = process.env.WHATSAPP_OTP_TEMPLATE || "parosa_kitchen_otp";
  const langs = [...new Set([process.env.WHATSAPP_OTP_LANG || "en", "en_US", "en_GB"])];
  try {
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
              { type: "body", parameters: [{ type: "text", text: code }] },
              { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
            ],
          },
        }),
      });
      if (r.ok) return true;
      const e = (await r.json().catch(() => null)) as { error?: { code?: number; message?: string } } | null;
      console.error(`[${tag}] WhatsApp send failed`, template, lang, r.status, e?.error?.code, e?.error?.message);
      if (e?.error?.code !== 132001) return false; // only a wrong language is worth retrying
    }
    return false;
  } catch (err) {
    console.error(`[${tag}] WhatsApp send error`, err instanceof Error ? err.message : err);
    return false;
  }
}
