"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";
import { authMessage, getCurrentUserId, requestResetOtp, sendPasswordReset, setNewPassword, signIn, verifyResetOtp } from "@/lib/auth";
import { getRestaurantByOwner, staffLogin } from "@/lib/db";
import { saveStaffSession } from "@/lib/useStaff";
import "./login.css";

function MailIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
}
function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>;
}
function Bloom({ className }: { className: string }) {
  const petals = Array.from({ length: 12 });
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        {petals.map((_, i) => <ellipse key={i} cx="0" cy="-58" rx="15" ry="40" transform={`rotate(${i * 30})`} />)}
        {petals.map((_, i) => <ellipse key={"b" + i} cx="0" cy="-40" rx="9" ry="24" transform={`rotate(${i * 30 + 15})`} />)}
        <circle r="15" /><circle r="7" />
      </g>
    </svg>
  );
}

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

/*
 * Every screen has its own URL, and the URL is the source of truth for which
 * screen shows. Switching between owner and staff uses history.pushState (which
 * Next keeps in sync with usePathname) instead of a page navigation, so this
 * component stays mounted and the browser Back button works.
 * Creating a restaurant lives in /signup (SignupFlow). "Forgot password?" is
 * /login/reset here; the emailed link opens /login/new-password.
 */
type Screen = "signin" | "staff" | "reset";
const PATHS: Record<Screen, string> = { signin: "/login", staff: "/login/staff", reset: "/login/reset" };
const TITLES: Record<Screen, string> = { signin: "Sign in", staff: "Staff login", reset: "Reset your password" };
const screenOf = (path: string): Screen => (path === PATHS.staff ? "staff" : path === PATHS.reset ? "reset" : "signin");

export default function AuthScreen() {
  const router = useRouter();
  const path = usePathname();
  const mode = screenOf(path);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  // forgot password — WhatsApp code to the registered mobile (or an email link)
  const [rsSent, setRsSent] = useState("");
  const [rsVia, setRsVia] = useState<"wa" | "email">("wa");
  const [rsStep, setRsStep] = useState<"phone" | "code" | "newpass">("phone");
  const [rsPhone, setRsPhone] = useState("");
  const [rsCode, setRsCode] = useState("");
  const [rsPass, setRsPass] = useState("");
  const [rsWait, setRsWait] = useState(0);

  // staff sign in
  const [stPhone, setStPhone] = useState("");
  const [stCode, setStCode] = useState("");

  const go = (s: Screen) => {
    setErr("");
    window.history.pushState(null, "", PATHS[s]);
  };

  // Old links (/login?mode=create, /login?staff=1) → their new addresses.
  // A real router navigation here, not replaceState: on first mount Next's
  // router isn't listening to history yet, so the URL would change but the
  // screen wouldn't. Nothing is typed yet, so re-mounting loses nothing.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("mode") === "create") router.replace("/signup");
    else if (p.get("staff") === "1") router.replace(PATHS.staff);
  }, [router]);

  // Already signed in? Into the dashboard — or finish registering if there's no restaurant yet.
  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (uid) {
        router.replace((await getRestaurantByOwner(uid)) ? "/dashboard" : "/signup");
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  // Re-applied after the auth check settles: Next writes the route's static
  // title during hydration, which would otherwise overwrite this one.
  useEffect(() => { document.title = `${TITLES[mode]} · Parosa`; }, [mode, checking]);

  const toSignin = () => go("signin");
  const toCreate = () => router.push("/signup");
  const toStaff = () => go("staff");
  const toReset = () => { setRsSent(""); setRsVia("wa"); setRsStep("phone"); setRsCode(""); go("reset"); };

  // "Resend code" countdown
  useEffect(() => {
    if (rsWait <= 0) return;
    const t = setTimeout(() => setRsWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [rsWait]);

  const rsPhone10 = rsPhone.replace(/\D/g, "").slice(-10);
  const sendResetCode = async () => {
    setErr("");
    if (rsPhone10.length !== 10) { setErr("Enter your 10-digit registered mobile number."); return; }
    setBusy(true);
    const r = await requestResetOtp(rsPhone10);
    setBusy(false);
    if (!r.ok) {
      setErr(r.error === "toomany" ? "Too many codes asked for. Please try again in an hour."
        : r.error === "phone" ? "Enter your 10-digit registered mobile number."
        : "Couldn't send the code right now. Try again, or use email instead.");
      return;
    }
    setRsStep("code"); setRsCode(""); setRsWait(30);
  };
  const checkResetCode = async (code = rsCode) => {
    if (busy || code.length !== 6) return;
    setErr(""); setBusy(true);
    const r = await verifyResetOtp(rsPhone10, code);
    setBusy(false);
    if (r.ok) { setRsStep("newpass"); return; }
    setRsCode("");
    setErr(r.error === "wrong" ? `Wrong code.${r.left != null ? ` ${r.left} ${r.left === 1 ? "try" : "tries"} left.` : ""}`
      : r.error === "offline" ? "Couldn't connect. Check the internet and try again."
      : "This code has expired. Ask for a new one.");
  };
  const saveResetPass = async () => {
    setErr("");
    if (rsPass.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setBusy(true);
    try { await setNewPassword(rsPass); router.replace("/dashboard"); }
    catch (e) { setErr(authMessage(e)); setBusy(false); }
  };

  const doReset = async () => {
    setErr("");
    if (!emailOk(siEmail)) { setErr("Enter the email you signed up with."); return; }
    setBusy(true);
    try { await sendPasswordReset(siEmail); setRsSent(siEmail.trim().toLowerCase()); }
    catch (e) { setErr(authMessage(e)); }
    finally { setBusy(false); }
  };

  const doStaffLogin = async () => {
    setErr("");
    if (!stPhone.trim()) { setErr("Enter your phone number."); return; }
    if (!stCode.trim()) { setErr("Enter today's staff code."); return; }
    setBusy(true);
    try {
      const s = await staffLogin(stPhone, stCode);
      if (!s) { setErr("Wrong phone or code — check today's code with your manager."); setBusy(false); return; }
      saveStaffSession({ ...s, code: stCode.trim() });
      router.replace("/pos");
    } catch (e) {
      const why = String((e as { message?: string })?.message ?? "");
      setErr(why.includes("Too many wrong codes") ? why : "Couldn't log in — please try again.");
      setBusy(false);
    }
  };

  const doSignin = async () => {
    setErr("");
    if (!emailOk(siEmail)) { setErr("Enter a valid email address."); return; }
    if (!siPass) { setErr("Enter your password."); return; }
    setBusy(true);
    try {
      await signIn(siEmail, siPass);
      const uid = await getCurrentUserId();
      router.replace(uid && !(await getRestaurantByOwner(uid)) ? "/signup" : "/dashboard");
    } catch (e) { setErr(authMessage(e)); setBusy(false); }
  };

  if (checking) {
    return (
      <div className="lg-page">
        <div className="lg-card" style={{ display: "grid", placeItems: "center", minHeight: 320 }}>
          <div style={{ textAlign: "center" }}>
            <Seal size={58} />
            <div style={{ margin: "16px auto 0", height: 24, width: 24, borderRadius: "50%", border: "2px solid rgba(169,130,58,0.3)", borderTopColor: "var(--gold)", animation: "lgspin .8s linear infinite" }} />
          </div>
        </div>
        <style>{`@keyframes lgspin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="lg-page">
      <Bloom className="lg-bloom tl" />
      <Bloom className="lg-bloom r" />
      <Bloom className="lg-bloom bl" />

      <div className="lg-tag-tr">भारत के<br />हर रेस्टोरेंट के लिए<span className="u" /></div>
      <div className="lg-tag-br">GOOD FOOD<br />BUILDS<br />BETTER STORIES<span className="u" /></div>

      <div className="lg-card">
        <div className="lg-logo">
          <Seal size={66} />
          <div className="lg-wm">परोसा</div>
          <div className="lg-en">PAROSA</div>
          <div className="lg-portal">Restaurant Partner Portal</div>
          <div className="lg-div"><span className="ln" />❖<span className="ln" /></div>
        </div>

        <div className="lg-tabs">
          <button className={mode !== "staff" ? "on" : ""} onClick={toSignin}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6" /></svg>
            <span><b>Owner</b><i>Login / create account</i></span>
          </button>
          <button className={mode === "staff" ? "on" : ""} onClick={toStaff}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
            <span><b>Staff</b><i>Take orders</i></span>
          </button>
        </div>

        <div className="lg-switch" key={mode}>
          {mode === "staff" ? (
            <>
              <h1 className="lg-welcome">Staff login</h1>
              <p className="lg-sub">Enter your phone &amp; today&apos;s staff code to take orders</p>
              <div className="lg-field"><label>Your phone number</label><input type="tel" autoComplete="tel" placeholder="98765 43210" value={stPhone} onChange={(e) => setStPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doStaffLogin()} /></div>
              <div className="lg-field"><label>Today&apos;s staff code</label><input type="text" inputMode="numeric" placeholder="6-digit code from your manager" value={stCode} onChange={(e) => setStCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doStaffLogin()} /></div>
              {err && <div className="lg-err">{err}</div>}
              <button className="lg-prime" onClick={doStaffLogin} disabled={busy}>{busy ? "Logging in…" : "Start taking orders →"}</button>
              <p className="lg-alt lg-muted">Ask your manager for today&apos;s code. It changes every day.</p>
            </>
          ) : mode === "reset" && rsVia === "wa" ? (
            <>
              {rsStep === "phone" && (
                <>
                  <h1 className="lg-welcome">Forgot password?</h1>
                  <p className="lg-sub">We&apos;ll send a code on WhatsApp to your registered mobile</p>
                  <div className="lg-field"><label>Registered mobile number</label><input type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={rsPhone} onChange={(e) => setRsPhone(e.target.value.replace(/[^\d +]/g, "").slice(0, 14))} onKeyDown={(e) => e.key === "Enter" && sendResetCode()} /></div>
                  {err && <div className="lg-err">{err}</div>}
                  <button className="lg-prime" onClick={sendResetCode} disabled={busy}>{busy ? "Sending…" : "Send code on WhatsApp"}</button>
                </>
              )}
              {rsStep === "code" && (
                <>
                  <h1 className="lg-welcome">Enter the code</h1>
                  <p className="lg-sub">If +91 ••••••{rsPhone10.slice(-4)} is registered with Parosa, a 6-digit code is on WhatsApp now.</p>
                  <div className="lg-field"><label>6-digit code</label><input className="lg-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={rsCode}
                    onChange={(e) => { const c = e.target.value.replace(/\D/g, "").slice(0, 6); setRsCode(c); if (c.length === 6) checkResetCode(c); }} /></div>
                  {err && <div className="lg-err">{err}</div>}
                  <button className="lg-prime" onClick={() => checkResetCode()} disabled={busy || rsCode.length !== 6}>{busy ? "Checking…" : "Continue"}</button>
                  <p className="lg-alt"><a onClick={() => { setRsStep("phone"); setErr(""); }}>← Change number</a>{" · "}{rsWait > 0 ? <span className="lg-muted">Resend in {rsWait}s</span> : <a onClick={sendResetCode}>Resend code</a>}</p>
                </>
              )}
              {rsStep === "newpass" && (
                <>
                  <h1 className="lg-welcome">You&apos;re signed in ✓</h1>
                  <p className="lg-sub">Set a new password now, or skip and change it later in Settings</p>
                  <div className="lg-field"><label>New password</label><div className="lg-inp"><LockIcon /><input type={showPass ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" value={rsPass} onChange={(e) => setRsPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveResetPass()} /><button type="button" className="lg-eye" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Hide password" : "Show password"}>{showPass ? "Hide" : "Show"}</button></div></div>
                  {err && <div className="lg-err">{err}</div>}
                  <button className="lg-prime" onClick={saveResetPass} disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
                  <p className="lg-alt"><a onClick={() => router.replace("/dashboard")}>Skip — go to my dashboard</a></p>
                </>
              )}
              {rsStep !== "newpass" && <p className="lg-alt"><a onClick={() => { setRsVia("email"); setErr(""); }}>Use email instead</a> · <a onClick={toSignin}>← Back to sign in</a></p>}
            </>
          ) : mode === "reset" ? (
            <>
              <h1 className="lg-welcome">Reset your password</h1>
              <p className="lg-sub">We&apos;ll email you a link to set a new one</p>
              {rsSent ? (
                <div className="lg-ok" role="status">✓ Link sent to <b>{rsSent}</b>. Open it on this device to set a new password. Not there? Check spam.</div>
              ) : (
                <>
                  <div className="lg-field"><label>Email</label><div className="lg-inp"><MailIcon /><input type="email" autoComplete="email" placeholder="you@restaurant.com" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doReset()} /></div></div>
                  {err && <div className="lg-err">{err}</div>}
                  <button className="lg-prime" onClick={doReset} disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
                </>
              )}
              <p className="lg-alt"><a onClick={() => { setRsVia("wa"); setErr(""); }}>Use WhatsApp instead</a> · <a onClick={toSignin}>← Back to sign in</a></p>
            </>
          ) : (
            <>
              <h1 className="lg-welcome">Welcome back</h1>
              <p className="lg-sub">Sign in to manage your restaurant</p>
              <div className="lg-field"><label>Email</label><div className="lg-inp"><MailIcon /><input type="email" autoComplete="email" placeholder="you@restaurant.com" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSignin()} /></div></div>
              <div className="lg-field"><label>Password</label><div className="lg-inp"><LockIcon /><input type={showPass ? "text" : "password"} autoComplete="current-password" placeholder="Your password" value={siPass} onChange={(e) => setSiPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSignin()} /><button type="button" className="lg-eye" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? "Hide password" : "Show password"}>{showPass ? "Hide" : "Show"}</button></div></div>
              <p className="lg-forgot"><a onClick={toReset}>Forgot password?</a></p>
              {err && <div className="lg-err">{err}</div>}
              <button className="lg-prime" onClick={doSignin} disabled={busy}>{busy ? "Signing in…" : "Sign in →"}</button>
              <p className="lg-alt">New to Parosa? <a onClick={toCreate}>Create an account</a></p>
              <p className="lg-kitchen">Kitchen screen? <Link href="/kitchen/login">Kitchen sign-in →</Link></p>
            </>
          )}
        </div>

        <p className="lg-terms">By continuing you agree to Parosa&apos;s <a href="/terms" target="_blank">Terms</a> &amp; <a href="/privacy" target="_blank">Privacy</a>.</p>
      </div>
    </div>
  );
}
