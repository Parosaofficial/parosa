"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";
import { authMessage, getCurrentUserId, signIn, signUpOwner } from "@/lib/auth";
import { createRestaurant, generateUniqueSlug, getRestaurantByOwner, uploadPhoto } from "@/lib/db";
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

const TYPES = ["Restaurant", "Dhaba", "Food truck", "Small cafe", "Other"];
const VISITORS = ["Less than 50", "50–100", "100–200", "200+"];
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

function Drop({ label, img, onPick, onRemove }: { label: string; img: string; onPick: (e: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  return (
    <div className="lg-field">
      <label>{label} <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label>
      {img ? (
        <div className="lg-logopreview"><div className="pv" style={{ backgroundImage: `url(${img})` }} /><button className="lg-choice" onClick={onRemove}>Remove</button></div>
      ) : (
        <label className="lg-drop"><input type="file" accept="image/*" hidden onChange={onPick} /><b>Click to upload</b><span>JPG/PNG image</span></label>
      )}
    </div>
  );
}

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "create">(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "create") return "create";
    return "signin";
  });
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");

  // create — step 0
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [logo, setLogo] = useState(""); const [logoFile, setLogoFile] = useState<File | null>(null);
  // step 1
  const [rtype, setRtype] = useState("Restaurant");
  const [visitors, setVisitors] = useState("50–100");
  // step 2
  const [gst, setGst] = useState(""); const [gstFile, setGstFile] = useState<File | null>(null);
  const [gstImg, setGstImg] = useState("");
  const [fssai, setFssai] = useState(""); const [fssaiFile, setFssaiFile] = useState<File | null>(null);
  const [fssaiImg, setFssaiImg] = useState("");
  const [notes, setNotes] = useState("");

  // already signed in? skip straight to the dashboard.
  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (uid) {
        const r = await getRestaurantByOwner(uid);
        router.replace(r ? "/dashboard" : "/login?mode=create");
        if (!r) { setMode("create"); setChecking(false); }
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  const toSignin = () => { setMode("signin"); setStep(0); setErr(""); };
  const toCreate = () => { setMode("create"); setStep(0); setErr(""); };
  const pickImg = (setPreview: (s: string) => void, setFile: (f: File | null) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setPreview(URL.createObjectURL(f)); setFile(f); }
  };

  const doSignin = async () => {
    setErr("");
    if (!emailOk(siEmail)) { setErr("Enter a valid email address."); return; }
    if (!siPass) { setErr("Enter your password."); return; }
    setBusy(true);
    try {
      await signIn(siEmail, siPass);
      router.replace("/dashboard");
    } catch (e) { setErr(authMessage(e)); setBusy(false); }
  };

  const step0Next = () => {
    setErr("");
    if (!name.trim()) { setErr("What's your restaurant called?"); return; }
    if (!ownerName.trim()) { setErr("Please add your name."); return; }
    if (!emailOk(email)) { setErr("Enter a valid email address."); return; }
    if (pass.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setStep(1);
  };

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      // 1) create the auth account
      const { hasSession } = await signUpOwner(email, pass);
      if (!hasSession) {
        setBusy(false);
        setErr("Almost there — check your inbox to confirm your email, then sign in.");
        setMode("signin"); setStep(0); setSiEmail(email);
        return;
      }
      // 2) upload any images (storage allows this now that we're signed in)
      const [logoUrl, gstinUrl, fssaiUrl] = await Promise.all([
        logoFile ? uploadPhoto("logos", logoFile) : Promise.resolve<string | null>(null),
        gstFile ? uploadPhoto("licences", gstFile) : Promise.resolve<string | null>(null),
        fssaiFile ? uploadPhoto("licences", fssaiFile) : Promise.resolve<string | null>(null),
      ]);
      // 3) create the restaurant workspace
      const uid = await getCurrentUserId();
      if (!uid) throw new Error("Session lost");
      const slug = await generateUniqueSlug(name);
      await createRestaurant({
        ownerId: uid, slug, name: name.trim(), ownerName: ownerName.trim(), ownerEmail: email.trim().toLowerCase(),
        phone: phone.trim(), type: rtype, visitors, logoUrl, gstin: gst.trim(), gstinUrl, fssai: fssai.trim(), fssaiUrl, notes: notes.trim(),
      });
      setBusy(false);
      setStep(3);
    } catch (e) {
      setBusy(false);
      setErr(authMessage(e));
    }
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

        <div className="lg-switch" key={mode === "create" ? `c${step}` : "s"}>
          {mode === "signin" ? (
            <>
              <h1 className="lg-welcome">Welcome back</h1>
              <p className="lg-sub">Sign in to manage your restaurant</p>
              <div className="lg-field"><label>Email</label><div className="lg-inp"><MailIcon /><input type="email" autoComplete="email" placeholder="you@restaurant.com" value={siEmail} onChange={(e) => setSiEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSignin()} /></div></div>
              <div className="lg-field"><label>Password</label><div className="lg-inp"><LockIcon /><input type="password" autoComplete="current-password" placeholder="Your password" value={siPass} onChange={(e) => setSiPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSignin()} /></div></div>
              {err && <div className="lg-err">{err}</div>}
              <button className="lg-prime" onClick={doSignin} disabled={busy}>{busy ? "Signing in…" : "Sign in →"}</button>
              <p className="lg-alt">New to Parosa? <a onClick={toCreate}>Create your restaurant</a></p>
            </>
          ) : (
            <>
              {step < 3 && <div className="lg-steps">{[0, 1, 2].map((i) => <span key={i} className={`s${i <= step ? " on" : ""}`} />)}</div>}

              {step === 0 && (
                <>
                  <h2 className="lg-h2">Create your account</h2>
                  <p className="lg-sub">Step 1 — you &amp; your restaurant</p>
                  <div className="lg-field"><label>Restaurant name</label><input type="text" placeholder="Raj Darbar" value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="lg-field"><label>Owner name</label><input type="text" placeholder="Your full name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></div>
                  <div className="lg-frow two">
                    <div className="lg-field"><label>Email</label><div className="lg-inp"><MailIcon /><input type="email" autoComplete="email" placeholder="you@restaurant.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
                    <div className="lg-field"><label>Phone number</label><input type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                  </div>
                  <div className="lg-field"><label>Password</label><div className="lg-inp"><LockIcon /><input type="password" autoComplete="new-password" placeholder="At least 6 characters" value={pass} onChange={(e) => setPass(e.target.value)} /></div></div>
                  <Drop label="Logo" img={logo} onPick={pickImg(setLogo, setLogoFile)} onRemove={() => { setLogo(""); setLogoFile(null); }} />
                  {err && <div className="lg-err">{err}</div>}
                  <button className="lg-prime" onClick={step0Next}>Continue →</button>
                  <p className="lg-alt">Already have a restaurant? <a onClick={toSignin}>Sign in</a></p>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="lg-h2">About your place</h2>
                  <p className="lg-sub">Step 2 — help us set you up right</p>
                  <div className="lg-field" style={{ marginTop: 16 }}>
                    <label>What type of place is it?</label>
                    <div className="lg-choices">{TYPES.map((t) => <button key={t} className={`lg-choice${rtype === t ? " on" : ""}`} onClick={() => setRtype(t)}>{t}</button>)}</div>
                  </div>
                  <div className="lg-field">
                    <label>Visitors per day</label>
                    <div className="lg-choices">{VISITORS.map((v) => <button key={v} className={`lg-choice${visitors === v ? " on" : ""}`} onClick={() => setVisitors(v)}>{v}</button>)}</div>
                  </div>
                  <div className="lg-stepnav"><button className="lg-back" onClick={() => setStep(0)}>Back</button><button className="lg-prime" onClick={() => setStep(2)}>Continue →</button></div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="lg-h2">Licences</h2>
                  <p className="lg-sub">Step 3 — GSTIN &amp; FSSAI <span style={{ color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>· optional, add later in Settings</span></p>
                  <div style={{ marginTop: 16 }}>
                    <div className="lg-field"><label>GSTIN <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label><input type="text" placeholder="06ABCDE1234F1Z5" value={gst} onChange={(e) => setGst(e.target.value)} /></div>
                    <Drop label="GSTIN certificate" img={gstImg} onPick={pickImg(setGstImg, setGstFile)} onRemove={() => { setGstImg(""); setGstFile(null); }} />
                    <div className="lg-field"><label>FSSAI Licence No. <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label><input type="text" placeholder="10012345000123" value={fssai} onChange={(e) => setFssai(e.target.value)} /></div>
                    <Drop label="FSSAI licence" img={fssaiImg} onPick={pickImg(setFssaiImg, setFssaiFile)} onRemove={() => { setFssaiImg(""); setFssaiFile(null); }} />
                    <div className="lg-field"><label>Anything else? <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label><textarea placeholder="Opening hours, special notes…" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                  </div>
                  {err && <div className="lg-err">{err}</div>}
                  <div className="lg-stepnav"><button className="lg-back" onClick={() => setStep(1)} disabled={busy}>Back</button><button className="lg-prime" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Submit & create →"}</button></div>
                </>
              )}

              {step === 3 && (
                <div className="lg-done">
                  <h2>स्वागत है! 🎉</h2>
                  <p><b>{name}</b> is ready on Parosa.<br />Your account is set up — let&apos;s build your menu.</p>
                  <button className="lg-prime" style={{ marginTop: 22 }} onClick={() => router.replace("/dashboard")}>Enter dashboard →</button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="lg-terms">By continuing you agree to Parosa&apos;s <a>Terms &amp; Privacy.</a></p>
      </div>
    </div>
  );
}
