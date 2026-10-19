"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";
import { authMessage, getCurrentUserId, signIn } from "@/lib/auth";
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
 * Creating a restaurant lives in /signup (SignupFlow).
 */
type Screen = "signin" | "staff";
const PATHS: Record<Screen, string> = { signin: "/login", staff: "/login/staff" };
const TITLES: Record<Screen, string> = { signin: "Sign in", staff: "Staff login" };
const screenOf = (path: string): Screen => (path === PATHS.staff ? "staff" : "signin");

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
    } catch { setErr("Couldn't log in — please try again."); setBusy(false); }
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
          <button className={mode === "signin" ? "on" : ""} onClick={toSignin}>
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
              <p className="lg-alt lg-muted">Ask your manager for today&apos;s code.</p>
            </>
          ) : (
            <>
              <h1 className="lg-welcome">Welcome back</h1>
              <p className="lg-sub">Sign in to manage your restaurant</p>
              <div className="lg-field"><label>Email</label><div className="lg-inp"><MailIcon /><input type="email" autoComplete="email" placeholder="you@restaurant.com" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSignin()} /></div></div>
              <div className="lg-field"><label>Password</label><div className="lg-inp"><LockIcon /><input type="password" autoComplete="current-password" placeholder="Your password" value={siPass} onChange={(e) => setSiPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSignin()} /></div></div>
              {err && <div className="lg-err">{err}</div>}
              <button className="lg-prime" onClick={doSignin} disabled={busy}>{busy ? "Signing in…" : "Sign in →"}</button>
              <p className="lg-alt">New to Parosa? <a onClick={toCreate}>Create your restaurant</a></p>
            </>
          )}
        </div>

        <p className="lg-terms">By continuing you agree to Parosa&apos;s <a href="/terms" target="_blank">Terms</a> &amp; <a href="/privacy" target="_blank">Privacy</a>.</p>
      </div>
    </div>
  );
}
