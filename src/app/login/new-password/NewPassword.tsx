"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";
import { authMessage, setNewPassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import "../login.css";

/*
 * Opened from the "reset your password" email. Supabase signs the owner in
 * from the link; they choose a new password and go to the dashboard.
 */
export default function NewPassword() {
  const router = useRouter();
  const [phase, setPhase] = useState<"checking" | "ready" | "expired">("checking");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let done = false;
    const ready = () => { done = true; setPhase("ready"); };
    // the link may say it has expired or was already used
    const linkError = /error_description|error=/.test(window.location.hash + window.location.search);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) ready(); });
    supabase.auth.getSession().then(({ data }) => { if (data.session) ready(); });
    const t = setTimeout(() => { if (!done) setPhase("expired"); }, linkError ? 0 : 5000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const save = async () => {
    setErr("");
    if (pass.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pass !== pass2) { setErr("The two passwords don't match."); return; }
    setBusy(true);
    try { await setNewPassword(pass); router.replace("/dashboard"); }
    catch (e) { setErr(authMessage(e)); setBusy(false); }
  };

  return (
    <div className="lg-page">
      <div className="lg-card">
        <div className="lg-logo">
          <Seal size={66} />
          <div className="lg-en">PAROSA</div>
          <div className="lg-div"><span className="ln" />❖<span className="ln" /></div>
        </div>
        <div className="lg-switch">
          {phase === "checking" && <p className="lg-sub" role="status">Opening your reset link…</p>}
          {phase === "expired" && (
            <>
              <h1 className="lg-welcome">This link has expired</h1>
              <p className="lg-sub">Reset links work once and for a short time. Ask for a new one.</p>
              <Link href="/login/reset" className="lg-prime" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>Send a new link</Link>
              <p className="lg-alt"><Link href="/login">← Back to sign in</Link></p>
            </>
          )}
          {phase === "ready" && (
            <form onSubmit={(e) => { e.preventDefault(); save(); }}>
              <h1 className="lg-welcome">Set a new password</h1>
              <p className="lg-sub">Use at least 8 characters</p>
              <div className="lg-field"><label htmlFor="np1">New password</label><div className="lg-inp"><input id="np1" type={show ? "text" : "password"} autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} style={{ paddingLeft: 16 }} /><button type="button" className="lg-eye" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button></div></div>
              <div className="lg-field"><label htmlFor="np2">Type it again</label><input id="np2" type={show ? "text" : "password"} autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} /></div>
              {err && <div className="lg-err">{err}</div>}
              <button className="lg-prime" type="submit" disabled={busy}>{busy ? "Saving…" : "Save & sign in"}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
