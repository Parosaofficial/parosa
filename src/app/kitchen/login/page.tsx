"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadKitchenSession, requestKitchenOtp, saveKitchenSession, verifyKitchenOtp } from "@/lib/kitchen";
import "../kitchen.css";
import "./kitchenlogin.css";

/*
 * Kitchen sign-in — separate from the owner and staff logins.
 * 1. Restaurant ID (the restaurant's web name) + its registered mobile number
 * 2. A 6-digit code sent on WhatsApp to that mobile (WhatsApp only)
 * The tablet then stays signed in until the owner removes it.
 */

const RESEND_S = 30;

export default function KitchenLogin() {
  const router = useRouter();
  const [step, setStep] = useState<"id" | "otp">("id");
  const [rid, setRid] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState<{ name: string; end: string } | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // already signed in on this tablet → straight to the kitchen
  useEffect(() => { if (loadKitchenSession()) router.replace("/kitchen"); }, [router]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const phone10 = phone.replace(/\D/g, "").slice(-10);

  const send = async () => {
    if (busy) return;
    if (!rid.trim()) { setErr("Enter your Restaurant ID"); return; }
    if (phone10.length !== 10) { setErr("Enter the 10-digit mobile number"); return; }
    setBusy(true); setErr("");
    const r = await requestKitchenOtp(rid.trim(), phone10);
    setBusy(false);
    if (!r.ok) {
      setErr(r.error === "toomany" ? "Too many codes asked for. Try again in an hour."
        : r.error === "offline" ? "Couldn't connect. Check the internet and try again."
        : r.error === "notsent" ? "Couldn't send the code on WhatsApp. Please try again in a minute."
        : "This Restaurant ID and mobile number don't match. Use the number registered with Parosa.");
      return;
    }
    setSent({ name: r.restaurant_name, end: r.phone_end });
    setStep("otp"); setCode(""); setWait(RESEND_S);
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const verify = async (c = code) => {
    if (busy || c.length !== 6) return;
    setBusy(true); setErr("");
    const r = await verifyKitchenOtp(rid.trim(), phone10, c);
    if (r.ok) { saveKitchenSession(r.session); router.replace("/kitchen"); return; }
    setBusy(false); setCode("");
    setErr(r.error === "expired" ? "This code has expired. Ask for a new one."
      : r.error === "offline" ? "Couldn't connect. Check the internet and try again."
      : r.error === "nomatch" ? "This Restaurant ID and mobile number don't match."
      : `Wrong code.${r.left != null ? ` ${r.left} ${r.left === 1 ? "try" : "tries"} left.` : ""}`);
    codeRef.current?.focus();
  };

  return (
    <div className="kd kd-center">
      <div className="kd-card kl">
        <span className="kd-chef" aria-hidden="true">👨‍🍳</span>
        <h1>Kitchen sign-in</h1>

        {step === "id" ? (
          <form className="kl-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <p>Sign this screen in to your restaurant&apos;s kitchen.</p>
            <label>Restaurant ID
              <input value={rid} onChange={(e) => setRid(e.target.value)} placeholder="e.g. sharma-ji-ka-dhaba"
                autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" maxLength={80} />
            </label>
            <label>Registered mobile number
              <span className="kl-phone"><b>+91</b>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, "").slice(0, 12))}
                  inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" />
              </span>
            </label>
            {err && <p className="kl-err" role="alert">{err}</p>}
            <button className="kd-btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Send code"}</button>
            <small>Your Restaurant ID is on the owner&apos;s Dashboard → Kitchen display.</small>
          </form>
        ) : (
          <form className="kl-form" onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <p>We sent a 6-digit code on WhatsApp to <b>+91 ••••••{sent?.end}</b> for <b>{sent?.name}</b>.</p>
            <label>6-digit code
              <input ref={codeRef} className="kl-code" value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                onChange={(e) => { const c = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(c); if (c.length === 6) verify(c); }}
                placeholder="••••••" aria-label="6-digit code" />
            </label>
            {err && <p className="kl-err" role="alert">{err}</p>}
            <button className="kd-btn" type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Sign in"}</button>
            <div className="kl-row">
              <button type="button" className="kd-out" onClick={() => { setStep("id"); setErr(""); }}>← Change details</button>
              <button type="button" className="kd-out" onClick={send} disabled={wait > 0 || busy}>{wait > 0 ? `Resend in ${wait}s` : "Resend code"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
