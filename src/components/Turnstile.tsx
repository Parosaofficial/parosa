"use client";

import { useEffect, useRef } from "react";

/*
 * Cloudflare Turnstile — the invisible "are you human?" check (free).
 * Switched on by NEXT_PUBLIC_TURNSTILE_SITE_KEY (Vercel env). Without it this
 * renders nothing and forms work exactly as before.
 * onToken(token) when solved, onToken(null) when it expires / errors.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const turnstileOn = !!SITE_KEY;

type TS = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global { interface Window { turnstile?: TS } }

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => res();
    s.onerror = () => { loading = null; rej(new Error("turnstile")); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Change `resetKey` (e.g. after a failed submit) to get a fresh token — each token works once. */
export function Turnstile({ onToken, action, resetKey = 0 }: { onToken: (t: string | null) => void; action?: string; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  useEffect(() => { cb.current = onToken; }, [onToken]);

  useEffect(() => {
    if (!turnstileOn || !box.current) return;
    let id: string | undefined;
    let gone = false;
    loadScript().then(() => {
      if (gone || !box.current || !window.turnstile) return;
      id = window.turnstile.render(box.current, {
        sitekey: SITE_KEY,
        action,
        appearance: "interaction-only", // invisible unless Cloudflare needs a tap
        callback: (t: string) => cb.current(t),
        "expired-callback": () => cb.current(null),
        "error-callback": () => cb.current(null),
      });
    }).catch(() => cb.current(null));
    return () => { gone = true; cb.current(null); if (id && window.turnstile) window.turnstile.remove(id); };
  }, [action, resetKey]);

  if (!turnstileOn) return null;
  return <div ref={box} style={{ display: "flex", justifyContent: "center", margin: "6px 0" }} />;
}
