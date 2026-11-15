"use client";

import { useState, useSyncExternalStore } from "react";

/*
 * First scan at a restaurant: "Get your bill on WhatsApp" — the guest's number,
 * saved on this phone and sent with every order, so the owner can send the
 * bill PDF with one tap. The guest may skip (WhatsApp needs their consent).
 */

const KEY = (slug: string) => `parosa-wa-${slug}`;
const EVT = "parosa-wa";
const ok10 = (p: string) => { const d = p.replace(/\D/g, ""); return d.length >= 10 ? d.slice(-10) : ""; };

/** The saved WhatsApp number: "9876543210", "skip" (asked, declined), null (never asked), undefined (server). */
export function useSavedWhatsApp(slug: string): string | null | undefined {
  return useSyncExternalStore(
    (cb) => { window.addEventListener(EVT, cb); window.addEventListener("storage", cb); return () => { window.removeEventListener(EVT, cb); window.removeEventListener("storage", cb); }; },
    () => { try { return localStorage.getItem(KEY(slug)); } catch { return "skip"; } },
    () => undefined,
  );
}

export function saveWhatsApp(slug: string, value: string) {
  try { localStorage.setItem(KEY(slug), value); } catch { /* private mode: ask again next time */ }
  window.dispatchEvent(new Event(EVT));
}

/** The number to send with orders ("" when skipped / not given). */
export const whatsAppNumber = (saved: string | null | undefined) => (saved && saved !== "skip" ? ok10(saved) : "");

export function WhatsAppAsk({ slug, restaurantName }: { slug: string; restaurantName: string }) {
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const go = () => {
    const p = ok10(phone);
    if (!p) { setErr("Enter your 10-digit WhatsApp number"); return; }
    saveWhatsApp(slug, p);
  };
  return (
    <div className="sg-wrap solid" role="dialog" aria-modal="true" aria-label="Your WhatsApp number">
      <form className="sg-card" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <div className="sg-name">{restaurantName}</div>
        <span className="sg-ic wa" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.2-1-.4-1.6-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.2.2-.3.4-.1.7.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.6-.1l.7-.9c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2Z" /></svg>
        </span>
        <h2>Get your bill on WhatsApp</h2>
        <p className="sg-sub">Your bill and order updates arrive on WhatsApp — no paper, no waiting.</p>
        <label className="sg-phone">
          <b>+91</b>
          <input type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" maxLength={14} value={phone}
            onChange={(e) => { setPhone(e.target.value.replace(/[^\d ]/g, "")); setErr(""); }} aria-label="WhatsApp number" autoFocus />
        </label>
        {err && <p className="sg-err" role="alert">{err}</p>}
        <button className="sg-btn" type="submit">Continue to the menu</button>
        <button className="sg-link" type="button" onClick={() => saveWhatsApp(slug, "skip")}>Skip</button>
        <p className="sg-fine">By continuing you agree to get your bill from {restaurantName} on WhatsApp, sent via Parosa.</p>
      </form>
    </div>
  );
}
