"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Playfair_Display } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import { Seal } from "@/components/Logo";
import { authMessage, getCurrentUserId, signIn, signUpOwner } from "@/lib/auth";
import { createRestaurant, generateUniqueSlug, getRestaurantByOwner, staffLogin, updateRestaurant, uploadPhoto } from "@/lib/db";
import { saveStaffSession } from "@/lib/useStaff";
import { PLANS } from "@/lib/plans";
import "./login.css";

// headings + Owner/Staff tabs (Rozha One's Latin letters read too heavy here)
const serif = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-lg-serif", display: "swap" });

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

/*
 * Every screen has its own URL, and the URL is the source of truth for which
 * screen shows. Moving between screens uses history.pushState (which Next keeps
 * in sync with usePathname) instead of a page navigation, so this component
 * stays mounted — nothing typed into the signup form is lost, and the browser
 * Back button steps back through the screens.
 */
type Screen = "signin" | "staff" | "you" | "details" | "licences" | "plan";
const PATHS: Record<Screen, string> = {
  signin: "/login", staff: "/login/staff",
  you: "/signup", details: "/signup/details", licences: "/signup/licences", plan: "/signup/plan",
};
const TITLES: Record<Screen, string> = {
  signin: "Sign in", staff: "Staff login",
  you: "Create your restaurant", details: "About your place", licences: "Licences", plan: "Choose your plan",
};
const screenOf = (path: string): Screen =>
  (Object.keys(PATHS) as Screen[]).find((k) => PATHS[k] === path) ?? (path.startsWith("/signup") ? "you" : "signin");
const STEP_OF: Partial<Record<Screen, number>> = { you: 0, details: 1, licences: 2, plan: 3 };

export default function AuthScreen() {
  const router = useRouter();
  const path = usePathname();
  const screen = screenOf(path);
  const mode = screen === "signin" || screen === "staff" ? screen : "create";
  const step = STEP_OF[screen] ?? 0;
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");

  // staff sign in
  const [stPhone, setStPhone] = useState("");
  const [stCode, setStCode] = useState("");

  // create — step 0
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [logo, setLogo] = useState(""); const [logoFile, setLogoFile] = useState<File | null>(null);
  // step 1
  const [rtype, setRtype] = useState("Restaurant");
  const [visitors, setVisitors] = useState("50–100");
  // step 2 — plan
  const [plan, setPlan] = useState("growth");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  // step 3
  const [gst, setGst] = useState(""); const [gstFile, setGstFile] = useState<File | null>(null);
  const [gstImg, setGstImg] = useState("");
  const [fssai, setFssai] = useState(""); const [fssaiFile, setFssaiFile] = useState<File | null>(null);
  const [fssaiImg, setFssaiImg] = useState("");
  const [notes, setNotes] = useState("");
  // post-creation plan step
  const [createdRid, setCreatedRid] = useState<string | null>(null);

  const go = (s: Screen, replace = false) => {
    setErr("");
    window.history[replace ? "replaceState" : "pushState"](null, "", PATHS[s]);
  };

  // Old links (/login?mode=create, /login?staff=1) → their new addresses.
  // A real router navigation here, not replaceState: on first mount Next's
  // router isn't listening to history yet, so the URL would change but the
  // screen wouldn't. Nothing is typed yet, so re-mounting loses nothing.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("mode") === "create") router.replace(PATHS.you);
    else if (p.get("staff") === "1") router.replace(PATHS.staff);
  }, [router]);

  // Already signed in? Skip to the dashboard — except on /signup/plan, where a
  // freshly created owner (or one who refreshed that page) still picks a plan.
  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (uid) {
        const r = await getRestaurantByOwner(uid);
        if (r && screenOf(window.location.pathname) === "plan") {
          setCreatedRid(r.id); setName(r.name); setPlan(r.plan ?? "growth"); setChecking(false);
          return;
        }
        if (r) { router.replace("/dashboard"); return; }
        window.history.replaceState(null, "", PATHS.you);
      }
      setChecking(false);
    })();
  }, [router]);

  // A signup step opened directly (refresh, shared link) without the earlier
  // answers goes back to the first step instead of showing a half-empty form.
  const step0Valid = !!(name.trim() && ownerName.trim() && emailOk(email) && pass.length >= 6 && address.trim() && city.trim());
  useEffect(() => {
    if (checking) return;
    const needsStep0 = screen === "details" || screen === "licences";
    if ((needsStep0 && !step0Valid) || (screen === "plan" && !createdRid) || (screen === "you" && path !== PATHS.you)) {
      window.history.replaceState(null, "", PATHS.you);
    }
  }, [checking, screen, path, step0Valid, createdRid]);

  // Re-applied after the auth check settles: Next writes the route's static
  // title during hydration, which would otherwise overwrite this one.
  useEffect(() => { document.title = `${TITLES[screen]} · Parosa`; }, [screen, checking]);

  const toSignin = () => go("signin");
  const toCreate = () => go("you");
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
    if (!address.trim()) { setErr("Add your restaurant address (it prints on the bill)."); return; }
    if (!city.trim()) { setErr("Which city are you in?"); return; }
    go("details");
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
        go("signin"); setSiEmail(email);
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
      const created = await createRestaurant({
        ownerId: uid, slug, name: name.trim(), ownerName: ownerName.trim(), ownerEmail: email.trim().toLowerCase(),
        phone: phone.trim(), address: address.trim(), city: city.trim(), pincode: pincode.trim(),
        type: rtype, visitors, logoUrl, gstin: gst.trim(), gstinUrl, fssai: fssai.trim(), fssaiUrl, notes: notes.trim(),
      });
      setCreatedRid(created.id);
      setBusy(false);
      go("plan", true); // account created — now pick a plan (replace, so Back can't re-submit the form)
    } catch (e) {
      setBusy(false);
      setErr(authMessage(e));
    }
  };

  // after account creation: save the chosen plan, then into the dashboard.
  const choosePlanAndGo = async () => {
    setBusy(true);
    try { if (createdRid) await updateRestaurant(createdRid, { plan }); } catch { /* still proceed */ }
    router.replace("/dashboard");
  };

  if (checking) {
    return (
      <div className={`lg-page ${serif.variable}`}>
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
    <div className={`lg-page ${serif.variable}`}>
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

        {(mode === "signin" || mode === "staff") && (
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
        )}

        <div className="lg-switch" key={mode === "create" ? `c${step}` : mode}>
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
          ) : mode === "signin" ? (
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
                  <p className="lg-sub">Step 1 of 3 — you &amp; your restaurant</p>
                  <div className="lg-field"><label>Restaurant name</label><input type="text" placeholder="Raj Darbar" value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="lg-field"><label>Owner name</label><input type="text" placeholder="Your full name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></div>
                  <div className="lg-frow two">
                    <div className="lg-field"><label>Email</label><div className="lg-inp"><MailIcon /><input type="email" autoComplete="email" placeholder="you@restaurant.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
                    <div className="lg-field"><label>Phone number</label><input type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                  </div>
                  <div className="lg-field"><label>Password</label><div className="lg-inp"><LockIcon /><input type="password" autoComplete="new-password" placeholder="At least 6 characters" value={pass} onChange={(e) => setPass(e.target.value)} /></div></div>
                  <div className="lg-field"><label>Restaurant address</label><input type="text" placeholder="Shop no, street, area" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                  <div className="lg-frow two">
                    <div className="lg-field"><label>City</label><input type="text" placeholder="Gurugram" value={city} onChange={(e) => setCity(e.target.value)} /></div>
                    <div className="lg-field"><label>Pincode <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label><input type="text" inputMode="numeric" placeholder="122004" value={pincode} onChange={(e) => setPincode(e.target.value)} /></div>
                  </div>
                  <Drop label="Logo" img={logo} onPick={pickImg(setLogo, setLogoFile)} onRemove={() => { setLogo(""); setLogoFile(null); }} />
                  {err && <div className="lg-err">{err}</div>}
                  <button className="lg-prime" onClick={step0Next}>Continue →</button>
                  <p className="lg-alt">Already have a restaurant? <a onClick={toSignin}>Sign in</a></p>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="lg-h2">About your place</h2>
                  <p className="lg-sub">Step 2 of 3 — help us set you up right</p>
                  <div className="lg-field" style={{ marginTop: 16 }}>
                    <label>What type of place is it?</label>
                    <div className="lg-choices">{TYPES.map((t) => <button key={t} className={`lg-choice${rtype === t ? " on" : ""}`} onClick={() => setRtype(t)}>{t}</button>)}</div>
                  </div>
                  <div className="lg-field">
                    <label>Visitors per day</label>
                    <div className="lg-choices">{VISITORS.map((v) => <button key={v} className={`lg-choice${visitors === v ? " on" : ""}`} onClick={() => setVisitors(v)}>{v}</button>)}</div>
                  </div>
                  <div className="lg-stepnav"><button className="lg-back" onClick={() => go("you")}>Back</button><button className="lg-prime" onClick={() => go("licences")}>Continue →</button></div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="lg-h2">Licences</h2>
                  <p className="lg-sub">Step 3 of 3 — GSTIN &amp; FSSAI <span style={{ color: "var(--muted)", textTransform: "none", letterSpacing: 0 }}>· optional, add later in Settings</span></p>
                  <div style={{ marginTop: 16 }}>
                    <div className="lg-field"><label>GSTIN <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label><input type="text" placeholder="06ABCDE1234F1Z5" value={gst} onChange={(e) => setGst(e.target.value)} /></div>
                    <Drop label="GSTIN certificate" img={gstImg} onPick={pickImg(setGstImg, setGstFile)} onRemove={() => { setGstImg(""); setGstFile(null); }} />
                    <div className="lg-field"><label>FSSAI Licence No. <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label><input type="text" placeholder="10012345000123" value={fssai} onChange={(e) => setFssai(e.target.value)} /></div>
                    <Drop label="FSSAI licence" img={fssaiImg} onPick={pickImg(setFssaiImg, setFssaiFile)} onRemove={() => { setFssaiImg(""); setFssaiFile(null); }} />
                    <div className="lg-field"><label>Anything else? <span style={{ color: "var(--muted)", fontWeight: 400, letterSpacing: 0, textTransform: "none" }}>· optional</span></label><textarea placeholder="Opening hours, special notes…" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                  </div>
                  {err && <div className="lg-err">{err}</div>}
                  <div className="lg-stepnav"><button className="lg-back" onClick={() => go("details")} disabled={busy}>Back</button><button className="lg-prime" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create my account →"}</button></div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="lg-h2">स्वागत है! 🎉 Choose your plan</h2>
                  <p className="lg-sub"><b>{name}</b> is created. Pick a plan to start — no card needed, free during early access.</p>
                  <div className="lg-billing">
                    <button className={billing === "monthly" ? "on" : ""} onClick={() => setBilling("monthly")}>Monthly</button>
                    <button className={billing === "yearly" ? "on" : ""} onClick={() => setBilling("yearly")}>Yearly · save 17%</button>
                  </div>
                  <div className="lg-plans">
                    {PLANS.map((p) => (
                      <button key={p.id} type="button" className={`lg-plan${plan === p.id ? " on" : ""}`} onClick={() => setPlan(p.id)}>
                        {p.popular && <span className="pop-tag">Popular</span>}
                        <span className="pn">{p.name}</span>
                        <span className="pp">₹{billing === "monthly" ? p.price : Math.round(p.yearly / 12)}<small>/mo</small></span>
                        <span className="py">{billing === "yearly" ? `billed ₹${p.yearly}/yr` : "billed monthly"}</span>
                        <span className="pb">{p.blurb}</span>
                        <span className="pcheck" aria-hidden>{plan === p.id ? "●" : "○"}</span>
                      </button>
                    ))}
                  </div>
                  <p className="lg-planfoot">0% commission on every plan. Change it anytime in Settings.</p>
                  <button className="lg-prime" onClick={choosePlanAndGo} disabled={busy}>{busy ? "Setting up…" : `Continue with ${PLANS.find((p) => p.id === plan)?.name ?? "plan"} → Dashboard`}</button>
                </>
              )}
            </>
          )}
        </div>

        <p className="lg-terms">By continuing you agree to Parosa&apos;s <a href="/terms" target="_blank">Terms</a> &amp; <a href="/privacy" target="_blank">Privacy</a>.</p>
      </div>
    </div>
  );
}
